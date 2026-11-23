import { ENDPOINTS } from '../constants/config';
import { request } from '../utils/request';

// ─── Mijoz statusi (Bronza / Kumush / Oltin) ─────────────────────

/**
 * Status darajalari qoidalari (ochiq endpoint):
 * `{ customer: { bronze: { min_orders, max_cancel_pct, min_rating }, silver, gold }, worker }`.
 */
export const getBadgeLevels = () =>
  request(ENDPOINTS.BADGE_LEVELS, { fallbackMessage: 'Status qoidalari yuklanmadi' });

// ─── Ustalar mijozga bergan baholar ──────────────────────────────

/** Mijoz haqida ustalar qoldirgan baholar: `[{ id, rating, comment, created_at }]`. */
export async function getCustomerReviews(customerId, limit = 20) {
  const data = await request(ENDPOINTS.CUSTOMER_REVIEWS(customerId, limit), {
    fallbackMessage: 'Baholar yuklanmadi',
  });
  const list = Array.isArray(data) ? data : (data?.items ?? []);
  return list.map((r) => ({
    id: r.id,
    rating: Number(r.rating) || 0,
    comment: (r.comment ?? '').trim(),
    createdAt: r.created_at ?? null,
  }));
}

// ─── Shaxsni tasdiqlash ──────────────────────────────────────────

/**
 * @returns {Promise<{ submission_status: 'not_submitted'|'pending'|'approved'|'rejected',
 *   rejected_reason?: string|null, available_providers?: string[] }>}
 */
export const getIdentityStatus = () =>
  request(ENDPOINTS.VERIFY_STATUS, { fallbackMessage: 'Tasdiqlash holati yuklanmadi' });

/**
 * MyID WebSDK (yagona usul): tekshiruvni boshlaydi. Tana: `birth_date` (YYYY-MM-DD) va `pinfl` YOKI `pass_data`,
 * `return_to: 'app'`, `app_id` (ilovaning o'z id si). Javob: `open_url`, `session_id`, `nonce`, `expires_in`.
 */
export const startMyIdCheck = (body) =>
  request(ENDPOINTS.MYID_START, {
    method: 'POST',
    body,
    fallbackMessage: 'Tasdiqlashni boshlab bo‘lmadi',
  });

/** Yakuniy tugma: MyID qaytargan `auth_code` bilan. Server MyID javobini ~1 daqiqagacha kutadi. */
export const completeMyIdCheck = ({ session_id, auth_code, nonce }) =>
  request(ENDPOINTS.MYID_COMPLETE, {
    method: 'POST',
    body: { session_id, auth_code, nonce },
    timeout: 90000,
    fallbackMessage: 'Tasdiqlashni yakunlab bo‘lmadi',
  });

/** MyID kodsiz qaytardi: urinish yopiladi. */
export const abandonMyIdCheck = ({ session_id, nonce }) =>
  request(ENDPOINTS.MYID_ABANDON, {
    method: 'POST',
    body: { session_id, nonce },
    fallbackMessage: 'Urinish yopilmadi',
  });

// ─── Email tasdiqlash ────────────────────────────────────────────

/** Email manziliga tasdiqlash kodi yuboradi (boshqa manzil kiritilsa, tasdiqlangach hisobdagi email almashadi). */
export const requestEmailOtp = (email) =>
  request(ENDPOINTS.VERIFY_EMAIL_REQUEST_OTP, {
    method: 'POST',
    body: { email },
    fallbackMessage: 'Kod yuborib bo‘lmadi',
  });

export const verifyEmailOtp = (email, code) =>
  request(ENDPOINTS.VERIFY_EMAIL_VERIFY_OTP, {
    method: 'POST',
    body: { email, code },
    fallbackMessage: 'Kodni tasdiqlab bo‘lmadi',
  });

// ─── Telegram ulash ──────────────────────────────────────────────

/** `{ enabled: boolean, linked: boolean }` — `enabled` false bo'lsa Telegram bu muhitda o'chiq. */
export const getTelegramStatus = () =>
  request(ENDPOINTS.TELEGRAM_LINK_STATUS, { fallbackMessage: 'Telegram holati yuklanmadi' });

/** Botga o'tish havolasi (bir martalik, bir necha daqiqada eskiradi): `{ url }`. */
export const createTelegramLink = () =>
  request(ENDPOINTS.TELEGRAM_LINK, {
    method: 'POST',
    body: {},
    fallbackMessage: 'Telegram havolasi olinmadi',
  });

export async function unlinkTelegram() {
  await request(ENDPOINTS.TELEGRAM_LINK, {
    method: 'DELETE',
    fallbackMessage: 'Telegramni uzib bo‘lmadi',
  });
}
