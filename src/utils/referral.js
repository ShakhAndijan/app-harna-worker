import * as SecureStore from 'expo-secure-store';
import { claimReferral } from '../worker/api';

// Telefonda ochilgan referal havolasi (saytning rememberReferral / useReferralClaim): kod 30 kun
// saqlanadi va usta kirgach o'zi qabul qilinadi. Hech qachon o'zgarmaydigan rad (kod yo'q, o'zining
// kodi, allaqachon qabul qilingan, muddat o'tgan) kodni o'chiradi.
const KEY = 'harna_ref';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const FINAL = new Set([
  'referral_code_not_found',
  'referral_self',
  'referral_already_claimed',
  'referral_window_closed',
]);

export async function rememberReferral(code) {
  try {
    await SecureStore.setItemAsync(
      KEY,
      JSON.stringify({ code: String(code).trim().toUpperCase(), at: Date.now() })
    );
  } catch {
    // Kodni "Do'st taklif qilish" ekranida qo'lda ham kiritish mumkin.
  }
}

async function pendingReferral() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!code || typeof at !== 'number' || Date.now() - at > KEEP_MS) {
      await SecureStore.deleteItemAsync(KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

// Saqlangan kod bo'lsa qabul qiladi; muvaffaqiyatda `true` qaytaradi.
export async function claimPendingReferral() {
  const code = await pendingReferral();
  if (!code) return false;
  try {
    await claimReferral(code);
    await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
    return true;
  } catch (e) {
    if (e?.code && FINAL.has(e.code)) await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
    return false;
  }
}
