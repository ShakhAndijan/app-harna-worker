import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import { ENDPOINTS } from '../constants/config';
import { devLog } from '../utils/log';
import { getToken, getRefreshToken } from '../utils/token';
import { request } from '../utils/request';

const logReq = (name) => devLog(`[auth] → ${name}`);
// Javob konsolga chiqadi (faqat dev); tokenlar to'liq ko'rsatilmaydi.
const SECRET_KEYS = ['access_token', 'refresh_token'];
const redact = (data) =>
  data && typeof data === 'object'
    ? Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, SECRET_KEYS.includes(k) && v ? '***' : v])
      )
    : data;
const logOk = (name, data) => devLog(`[auth] ✓ ${name}`, JSON.stringify(redact(data), null, 2));
const logErr = (name, err) => devLog(`[auth] ✗ ${name}`, err?.message || err);

// Kirish oqimidagi so'rovlar: token yo'q (auth: false), xato ApiError bo'lib chiqadi.
async function authPost(name, url, body, fallbackMessage) {
  logReq(name);
  try {
    const data = await request(url, { method: 'POST', body, auth: false, fallbackMessage });
    logOk(name, data);
    return data;
  } catch (err) {
    logErr(name, err);
    throw err;
  }
}

export async function uploadImageToPresignedUrl(uploadUrl, imageUri, contentType) {
  const ct = contentType || 'image/jpeg';

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // base64 → binary bytes (React Native da data: URI yo'q, XHR kerak)
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', ct);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Rasmni yuklashda xatolik: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Rasmni yuklashda tarmoq xatosi'));
    xhr.send(bytes.buffer);
  });
}

/**
 * Parol bilan kirish. `identifier` — "+998..." telefon yoki tasdiqlangan email (server `@` bo'yicha ajratadi).
 * Telefon uchun eski `phone` maydoni yuboriladi (mobil ilovalar shartnomasi).
 * Xatolar: `invalid_credentials` (parol noto'g'ri / o'rnatilmagan / hisob yo'q — bitta xabar),
 * `account_locked_minutes` (qolgan daqiqalar `public_data.minutes` da).
 */
export async function loginWorker(identifier, password, consentVersion) {
  const target = identifier.includes('@') ? { identifier } : { phone: identifier };
  return authPost(
    'loginWorker',
    ENDPOINTS.WORKER_LOGIN,
    { ...target, password, consent_version: consentVersion },
    'Kirishda xatolik yuz berdi'
  );
}

/**
 * Telefon/emailga tasdiqlash kodini yuboradi. Hisob mavjudligidan qat'i nazar
 * javob har doim bir xil (200) — bu raqamni "bazada bormi yo'qmi" deb sinab
 * ko'rishning oldini oladi.
 * @returns {Promise<{ sent: boolean, dev_code?: string }>}
 */
export async function startWorkerAuth(identifier, channel = 'sms') {
  return authPost(
    'startWorkerAuth',
    ENDPOINTS.AUTH_WORKER_START,
    { identifier, channel },
    'Kod yuborishda xatolik yuz berdi'
  );
}

/**
 * Kodni tasdiqlaydi. Ikki xil natija bo'lishi mumkin (AuthVerifyOut):
 * - hisob mavjud: access_token/refresh_token qaytadi, shu bilan kirish tugaydi;
 * - hisob topilmadi (`status: 'needs_name'`), `ticket` qaytadi (tasdiqlangan
 *   kodning isboti). Agar shu bilan birga `suggested_first_name`/
 *   `suggested_last_name` ham qaytgan bo'lsa (masalan avval usta sifatida
 *   ro'yxatdan o'tgan bo'lsa, ismi ma'lum), foydalanuvchidan qayta
 *   so'ramasdan shu qiymatlar bilan completeWorkerAuth avtomatik
 *   chaqiriladi; aks holda ism-familiya so'raladi va shu bilan
 *   completeWorkerAuth chaqiriladi.
 * @returns {Promise<{ access_token: string|null, refresh_token: string|null, status?: string, ticket?: string, suggested_first_name?: string, suggested_last_name?: string }>}
 */
export async function verifyWorkerAuth(identifier, code, consentVersion) {
  return authPost(
    'verifyWorkerAuth',
    ENDPOINTS.AUTH_WORKER_VERIFY,
    { identifier, code, consent_version: consentVersion },
    'Kodni tasdiqlashda xatolik yuz berdi'
  );
}

/**
 * Yangi usta hisobini yaratadi va kirishni yakunlaydi. Verify hisobni
 * topa olmagan (`needs_name`) yoki hisob faqat mijoz tomonida topilgan (`other_actor`) holatda chaqiriladi — `ticket` allaqachon tasdiqlangan kodning
 * isboti bo'lgani uchun kod qayta so'ralmaydi, faqat ism-familiya kerak.
 * `consentVersion` — foydalanuvchi belgilagan shaxsiy ma'lumotlarga rozilik matni versiyasi; yangi hisob
 * uchun majburiy (400 `consent_required` / `consent_outdated`).
 * @returns {Promise<{ access_token: string, refresh_token: string }>}
 */
export async function completeWorkerAuth(ticket, firstName, lastName, consentVersion) {
  return authPost(
    'completeWorkerAuth',
    ENDPOINTS.AUTH_WORKER_COMPLETE,
    {
      ticket,
      // Ism ixtiyoriy: yuborilmasa server uni ikkinchi tomondagi (mijoz) hisobdan oladi.
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      consent_version: consentVersion,
    },
    'Hisob yaratishda xatolik yuz berdi'
  );
}

export async function requestResetPasswordOtp(phone) {
  return authPost(
    'requestResetPasswordOtp',
    ENDPOINTS.RESET_PASSWORD_REQUEST_OTP,
    { phone, actor_type: 'worker' },
    'Kod yuborishda xatolik yuz berdi'
  );
}

export async function verifyResetPasswordOtp(phone, code, newPassword) {
  return authPost(
    'verifyResetPasswordOtp',
    ENDPOINTS.RESET_PASSWORD_VERIFY_OTP,
    { phone, actor_type: 'worker', code, new_password: newPassword },
    'Parolni saqlashda xatolik yuz berdi'
  );
}

export async function googleLogin(actorType = 'worker') {
  const redirectUri = Linking.createURL('auth/callback');
  const loginUrl =
    `${ENDPOINTS.AUTH_GOOGLE_LOGIN}?actor_type=${actorType}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  logReq('googleLogin');
  const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

  if (result.type !== 'success') {
    logErr('googleLogin', 'cancelled');
    throw new Error('cancelled');
  }

  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};
  const token = params.token || params.access_token;

  if (!token) {
    logErr('googleLogin', 'token topilmadi');
    throw new Error('Tokenni olishda xatolik');
  }

  logOk('googleLogin', { hasToken: !!token, hasRefreshToken: !!params.refresh_token });
  return { token, refreshToken: params.refresh_token };
}

/**
 * Chiqishda refresh tokenni serverda bekor qiladi (POST /auth/logout). Server tomoni idempotent,
 * foydalanuvchi baribir chiqadi — shuning uchun xato yoki tarmoq yo'qligi e'tiborga olinmaydi.
 */
export async function revokeSession() {
  const [token, refreshToken] = await Promise.all([getToken(), getRefreshToken()]);
  if (!refreshToken) return;
  try {
    await request(ENDPOINTS.AUTH_LOGOUT, {
      method: 'POST',
      body: { refresh_token: refreshToken },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      auth: false,
      timeout: 4000,
    });
  } catch {
    // Chiqishga to'sqinlik qilmaydi.
  }
}
