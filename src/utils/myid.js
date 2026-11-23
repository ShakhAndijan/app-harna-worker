import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { queryClient } from '../queries/client';
import { ApiError } from './request';
import {
  abandonMyIdCheck,
  completeMyIdCheck,
  getIdentityStatus,
  startMyIdCheck,
} from '../api/account';
import {
  clearMyIdPending,
  getMyIdView,
  readMyIdPending,
  saveMyIdPending,
  showMyId,
} from './myidPending';

// MyID WebSDK (backend dasturchisining mobile-shared/src/lib/myid.ts): tekshiruvni ochish, MyID javobini
// qabul qilish va yakuniy tugma.
//
// Yo'li: `POST /auth/verify/myid/start` (`return_to: 'app'`) → `open_url` (saytning /myid/boshlash sahifasi,
// u shu brauzerni ilovaniki deb belgilab MyID'ga o'tkazadi) → MyID yuzni tekshiradi → sayt `/myid/qaytish`
// javobni ilovaga sxema orqali uzatadi: `harnaworker://cabinet/verify?session_id&status&auth_code`.
// Javob ilovaga uch yo'l bilan kelishi mumkin (auth sessiya natijasi, link hodisasi, route parametrlari) —
// ko'pincha ikkitasi bitta qaytish uchun; hammasi `receiveMyIdReturn` ga tushadi va har sessiya bir marta
// ishlanadi. Yakuniy tugma hech qachon foydalanuvchi o'rniga bosilmaydi (MyID shartlari).

// Sayt qaytish sahifasi javobni faqat belgilangan sxemaga beradi; usta ilovasi — `harnaworker`.
export const MYID_RETURN_LINK = 'harnaworker://cabinet/verify';

const LATE_LINK_MS = 2000; // sahifa yopildi, javob kelmadi: kech keladigan link uchun shuncha kutiladi
const SLOW_MS = 8000;
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 60000;
const BROWSERS = ['com.android.chrome', 'com.sec.android.app.sbrowser'];

const LOOKALIKES = {
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
};

export const PINFL_PATTERN = /^\d{14}$/;
export const PASSPORT_PATTERN = /^[A-Z]{2}\d{7}$/;

export const normalisePinfl = (raw) => raw.replace(/\s+/g, '');
/** Seriya va raqam: bo'shliqsiz, katta, lotin (kirill o'xshash harflar lotinga o'tadi). */
export const normalisePassport = (raw) =>
  raw
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[АВЕКМНОРСТХ]/g, (ch) => LOOKALIKES[ch] ?? ch);

/** Hozir tasdiqlangan: approved, muddati o'tmagan va bekor qilinmagan. */
export const isVerifiedNow = (status) =>
  status?.submission_status === 'approved' && !status.expired && !status.revoked_reason;

const REASON_KEYS = {
  myid_failed: 'reasonMyidFailed',
  myid_code_invalid: 'reasonCodeInvalid',
  myid_identity_mismatch: 'reasonMismatch',
  myid_identity_incomplete: 'reasonIncomplete',
  identity_pinfl_mismatch: 'reasonOtherPerson',
  identity_pinfl_revoked: 'reasonPinflRevoked',
  pinfl_already_used: 'reasonPinfl',
  verification_returned_elsewhere: 'reasonElsewhere',
  verification_attempt_expired: 'reasonExpired',
  state_expired: 'reasonExpired',
  verification_state_expired: 'reasonExpired',
};
/** Rad etilgan tekshiruv kodi (`rejected_reason`) uchun matn kaliti. */
export const reasonKey = (code) => REASON_KEYS[code ?? ''] ?? 'providerFailed';

/** MyID kodsiz qaytargan sabab (uning statusi bo'yicha). */
export function failureKey(status) {
  if (status === '2') return 'failedPassport';
  if (status === '34') return 'failedDocExpired';
  return 'failedGeneric';
}

const one = (v) => {
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === 'string' && first !== '' ? first : null;
};

/** Route parametrlaridan MyID javobi; yo'q bo'lsa null. */
export function myIdReturnFromParams(params) {
  const session = one(params?.session_id);
  return session
    ? { session_id: session, status: one(params.status), auth_code: one(params.auth_code) }
    : null;
}

/** Ilovaga kirgan linkdan MyID javobi; boshqa link uchun null. */
export function myIdReturnFromUrl(url) {
  if (!url) return null;
  const at = url.indexOf('?');
  const head = at >= 0 ? url.slice(0, at) : url;
  if (!/(^|[/:])cabinet\/verify\/?$/.test(head)) return null;
  const query = {};
  for (const pair of (at >= 0 ? url.slice(at + 1) : '').split('#')[0].split('&')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    try {
      query[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(
        pair.slice(eq + 1).replace(/\+/g, ' ')
      );
    } catch {
      // Buzuq belgi: bu juft tashlab yuboriladi.
    }
  }
  return myIdReturnFromParams(query);
}

/** MyID haqiqatan bergan kod (xato chiqishlarida kod yo'q yoki "undefined"/"null" so'zi keladi). */
export const usableCode = (code) => {
  const v = (code ?? '').trim();
  return v !== '' && v !== 'undefined' && v !== 'null';
};

const seen = new Set(); // shu ishga tushirishda ishlangan sessiyalar
let lateLink = null;
let returnWatch = null;
let inBrowser = false;

const current = () => getMyIdView();
const pressing = (sessionId) => {
  const v = current();
  return v.kind === 'finishing' && v.sessionId === sessionId;
};

function stopWaiting() {
  if (lateLink) clearTimeout(lateLink);
  lateLink = null;
  returnWatch?.remove();
  returnWatch = null;
}

// Tasdiq holati o'zgardi: ochiq ekranlar qayta o'qiydi (muvaffaqiyatda MyID ismlari yozilgan profil ham).
export function noteVerificationChange() {
  queryClient.invalidateQueries({ queryKey: ['identity'] });
  queryClient.invalidateQueries({
    predicate: (q) => q.queryKey[0] === 'worker' || q.queryKey[0] === 'w',
  });
}
function settled(view) {
  showMyId(view);
  noteVerificationChange();
}

function afterClose() {
  const kind = current().kind;
  if (kind !== 'opening' && kind !== 'waiting') return;
  showMyId({ kind: 'waiting' });
  if (lateLink) clearTimeout(lateLink);
  lateLink = setTimeout(() => {
    lateLink = null;
    if (current().kind === 'waiting') settled({ kind: 'unfinished' });
  }, LATE_LINK_MS);
}

// Android'dagi ilova ichi brauzeri alohida task: qaytish — ilovaning oldinga chiqishi.
function watchReturn() {
  returnWatch?.remove();
  let away = AppState.currentState !== 'active';
  returnWatch = AppState.addEventListener('change', (state) => {
    if (state !== 'active') {
      away = true;
      return;
    }
    if (!away) return;
    returnWatch?.remove();
    returnWatch = null;
    afterClose();
  });
}

async function androidBrowser() {
  if (Platform.OS !== 'android') return undefined;
  try {
    const { browserPackages } = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
    return BROWSERS.find((name) => browserPackages.includes(name));
  } catch {
    return undefined;
  }
}

async function openPage(url, requested) {
  // iPhone'da javob sxema orqali faqat uni ochgan auth sessiyaga yetadi: brauzer rejimi o'rniga auth sessiya.
  const mode = requested === 'browser' && Platform.OS === 'ios' ? 'auth_session' : requested;
  const browserPackage = await androidBrowser();
  inBrowser = mode === 'browser';
  if (mode === 'browser') {
    const result = await WebBrowser.openBrowserAsync(url, { browserPackage });
    if (result.type === 'opened') watchReturn();
    else afterClose();
    return;
  }
  const result = await WebBrowser.openAuthSessionAsync(url, MYID_RETURN_LINK, {
    preferEphemeralSession: true,
    browserPackage,
  });
  if (result.type === 'success') await receiveMyIdReturn(myIdReturnFromUrl(result.url));
  afterClose();
}

function closeBrowser() {
  if (!inBrowser) return;
  inBrowser = false;
  try {
    Promise.resolve(WebBrowser.dismissBrowser()).catch(() => undefined);
  } catch {
    // Android yopa olmaydi: foydalanuvchi o'zi yopadi.
  }
}

// Ilovaning o'z id si (Android paketi / iOS bundle id): server MyID javobi shu ilovaga qaytishi uchun saytga aytadi.
function ownAppId() {
  const app = Constants.expoConfig;
  return (Platform.OS === 'ios' ? app?.ios?.bundleIdentifier : app?.android?.package) ?? undefined;
}

/**
 * Tekshiruvni ochadi. `body`: `{ birth_date, pinfl }` yoki `{ birth_date, pass_data }`; `mode` — statusdagi
 * `app_open_mode`. Boshlashni rad etgan xatoni (yoki brauzer xatosini) tashlaydi — forma ko'rsatadi.
 */
export async function startMyId(body, mode) {
  stopWaiting();
  showMyId({ kind: 'opening' });
  try {
    const started = await startMyIdCheck({ ...body, return_to: 'app', app_id: ownAppId() });
    await saveMyIdPending({
      session_id: started.session_id,
      nonce: started.nonce,
      expires_at: Date.now() + started.expires_in * 1000,
    });
    await openPage(started.open_url, mode);
  } catch (e) {
    if (current().kind === 'opening') showMyId({ kind: 'idle' });
    throw e;
  }
}

/**
 * MyID javobi qaysi yo'l bilan kelmasin, shu yerda ishlanadi — har sessiya bir marta. Faqat shu telefon
 * boshlagan, muddati o'tmagan tekshiruv davom etadi; eski yoki begona link hech narsani tugatmaydi.
 */
export async function receiveMyIdReturn(back) {
  if (!back || seen.has(back.session_id)) return;
  seen.add(back.session_id);
  const pending = await readMyIdPending();
  if (!pending || pending.session_id !== back.session_id) return;
  stopWaiting();
  closeBrowser();
  if (pending.expires_at < Date.now()) {
    await clearMyIdPending();
    settled({ kind: 'refused', reason: 'verification_attempt_expired' });
    return;
  }
  if (usableCode(back.auth_code) && back.status !== 'error') {
    showMyId({
      kind: 'final',
      sessionId: back.session_id,
      authCode: back.auth_code,
      nonce: pending.nonce,
    });
    return;
  }
  // Kodsiz qaytdi (yuz mos kelmadi, bekor qilindi, MyID xatosi): urinish yopiladi.
  showMyId({ kind: 'failed', status: back.status });
  try {
    await abandonMyIdCheck({ session_id: back.session_id, nonce: pending.nonce });
  } catch {
    // Server MyID sessiyasi tugagach o'zi yopadi.
  }
  await clearMyIdPending();
  noteVerificationChange();
}

// Qayta bosish yordam berishi mumkin: MyID jim (503), tarmoq yo'q, limit, server xatosi.
// 404, 409 yoki rad etilgan tana — yakuniy.
const worthRetrying = (error) =>
  !(error instanceof ApiError) || error.status === 0 || error.status === 429 || error.status >= 500;

async function succeeded(sessionId, identity, status) {
  await clearMyIdPending();
  if (pressing(sessionId)) settled({ kind: 'done', identity, status });
  else noteVerificationChange();
}
async function refused(sessionId, why) {
  await clearMyIdPending();
  if (pressing(sessionId)) settled({ kind: 'refused', ...why });
  else noteVerificationChange();
}

// 409 `verification_in_progress`: boshqa bosish (ikkinchi tap) shu tekshiruvni tugatyapti — holat har 3 s
// da, 1 daqiqagacha so'raladi.
async function waitForVerdict(press, before) {
  const until = Date.now() + POLL_FOR_MS;
  while (Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
    if (!pressing(press.sessionId)) return undefined;
    let now;
    try {
      now = await getIdentityStatus();
    } catch {
      continue;
    }
    if (!pressing(press.sessionId)) return undefined;
    if (now.submission_status === 'pending') continue;
    if (now.submission_status === 'rejected') {
      return refused(press.sessionId, { reason: now.rejected_reason ?? null });
    }
    const wasApproved = before?.submission_status === 'approved';
    if (
      now.submission_status === 'approved' &&
      (!wasApproved || now.verified_at !== before?.verified_at)
    ) {
      try {
        const out = await completeMyIdCheck({
          session_id: press.sessionId,
          auth_code: press.authCode,
          nonce: press.nonce,
        });
        return succeeded(press.sessionId, out.identity, out.status);
      } catch {
        return succeeded(press.sessionId, null, now);
      }
    }
    if (now.submission_status === 'not_submitted' && !wasApproved) {
      return refused(press.sessionId, { reason: null });
    }
  }
  if (pressing(press.sessionId)) {
    showMyId({
      kind: 'final',
      ...press,
      error: new ApiError({ status: 409, code: 'verification_in_progress' }),
    });
  }
  return undefined;
}

/** «Tasdiqlashni yakunlash» — faqat foydalanuvchining o'z bosishi. `before` — ekran ko'rsatgan holat. */
export async function finishMyId(before) {
  const view = current();
  if (view.kind !== 'final') return;
  const press = { sessionId: view.sessionId, authCode: view.authCode, nonce: view.nonce };
  showMyId({ kind: 'finishing', ...press, slow: false });
  const slow = setTimeout(() => {
    const now = current();
    if (now.kind === 'finishing' && now.sessionId === press.sessionId) {
      showMyId({ ...now, slow: true });
    }
  }, SLOW_MS);
  try {
    const out = await completeMyIdCheck({
      session_id: press.sessionId,
      auth_code: press.authCode,
      nonce: press.nonce,
    });
    await succeeded(press.sessionId, out.identity, out.status);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.code === 'verification_in_progress') {
      await waitForVerdict(press, before);
    } else if (worthRetrying(e)) {
      if (pressing(press.sessionId)) showMyId({ kind: 'final', ...press, error: e });
    } else {
      await refused(press.sessionId, { error: e });
    }
  } finally {
    clearTimeout(slow);
  }
}

/** «Qaytadan boshlash»: formaga qaytish. Serverda ochiq qolgan urinish keyingisi bilan almashadi. */
export function restartMyId() {
  stopWaiting();
  showMyId({ kind: 'idle' });
}

/** Ekrandan chiqish: ko'rsatilgan natija qayta ko'rsatilmaydi; davom etayotgan tekshiruv saqlanadi. */
export function leaveMyId() {
  const kind = current().kind;
  if (kind === 'done' || kind === 'failed' || kind === 'refused' || kind === 'unfinished') {
    showMyId({ kind: 'idle' });
  }
}
