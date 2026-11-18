import { API_BASE_URL } from '../constants/config';
import { request } from '../utils/request';
import { uploadImageToPresignedUrl } from './auth';

// Mijoz tomonidagi buyurtma oqimi (sayt bilan bir xil): to'lov, omonat, kelish tekshiruvi,
// shikoyatga javob, kafolat da'vosi, sharh va yakuniy izoh.
const V1 = `${API_BASE_URL}/api/v1`;

const call = (path, fallbackMessage, opts = {}) =>
  request(`${V1}${path}`, { fallbackMessage, ...opts });
const post = (path, body, fallbackMessage) => call(path, fallbackMessage, { method: 'POST', body });

// Saytdagi filtr: paynet / uzumbank to'lov tugmalari sifatida ko'rsatilmaydi.
const HIDDEN = ['paynet', 'uzumbank'];
const ORDER = ['payme', 'click', 'uzum'];
const rank = (p) => (ORDER.includes(p) ? ORDER.indexOf(p) : ORDER.length);
const sortProviders = (list) => [...list].sort((a, b) => rank(a) - rank(b));

export async function getPaymentProviders() {
  const d = await call('/payments/providers', "To'lov tizimlari yuklanmadi");
  const account = d?.account_providers ?? [];
  const ok = (p) => typeof p === 'string' && p && !HIDDEN.includes(p) && !account.includes(p);
  const base = (d?.providers ?? []).filter(ok);
  return {
    orderProviders: sortProviders((d?.order_providers ?? base).filter(ok)),
    depositProviders: sortProviders((d?.deposit_providers ?? []).filter(ok)),
    depositEnabled: typeof d?.deposit_enabled === 'boolean' ? d.deposit_enabled : null,
    labels: d?.labels ?? {},
    guaranteeCap: Number(d?.guarantee_cap) || 0,
  };
}

const LABELS = { payme: 'Payme', click: 'Click', uzum: 'Uzum (karta)' };
export const providerLabel = (p, labels) =>
  (typeof labels?.[p] === 'string' && labels[p].trim()) || LABELS[p] || p;
// Faqat uzum sahifasi tilni qabul qiladi.
export const paymentLocale = (provider, language) =>
  provider === 'uzum' && (language === 'ru' || language === 'en') ? language : 'uz';

export const getOrderPayment = (orderId) => call(`/orders/${orderId}/payment`, "To'lov yuklanmadi");
export const startOrderPayment = (orderId, amount, provider, locale) =>
  post(
    `/orders/${orderId}/payment`,
    { amount_uzs: amount, provider, locale },
    "To'lovni boshlab bo'lmadi"
  );
export const payDeposit = (orderId, provider, locale) =>
  post(
    `/orders/${orderId}/deposit/pay`,
    { provider, ...(locale ? { locale } : {}), return_to: 'web' },
    "Omonatni to'lab bo'lmadi"
  );

/** answer: 'on_time' | 'late' | 'no_show'. */
export const answerArrivalCheck = (orderId, answer) =>
  post(`/orders/${orderId}/arrival-check`, { answer }, "Javobni yuborib bo'lmadi");
/** Usta shikoyatiga javob: reached=true ("bog'langanmiz"/ish qildirilgan) | false (shikoyat to'g'ri). */
export const answerComplaint = (orderId, reached) =>
  post(`/orders/${orderId}/complaint/answer`, { reached: !!reached }, "Javobni yuborib bo'lmadi");

/** Kafolat da'vosi rasmlari ish suratlari kabi `work-photos/upload-slot` orqali yuklanadi. */
export async function uploadOrderWorkPhoto(orderId, uri, contentType = 'image/jpeg') {
  const { upload_url, temp_key } = await post(
    `/orders/${orderId}/work-photos/upload-slot`,
    { content_type: contentType },
    "Rasmni yuklab bo'lmadi"
  );
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return temp_key;
}
export const fileGuaranteeClaim = (orderId, description, photoKeys = []) =>
  post(
    `/orders/${orderId}/guarantee-claim`,
    { description, photo_temp_keys: photoKeys },
    "Murojaatni yuborib bo'lmadi"
  );
/** Usta "tuzatdim" degach mijoz tekshiradi: fixed=true (tuzatildi) | false (tuzatilmadi → operator). */
export const checkGuaranteeFix = (orderId, fixed) =>
  post(`/orders/${orderId}/guarantee-claim/check`, { fixed: !!fixed }, "Javobni yuborib bo'lmadi");

export async function uploadReviewPhoto(uri, contentType = 'image/jpeg') {
  const { upload_url, temp_key } = await post(
    '/reviews/photos/upload-url',
    { content_type: contentType },
    "Rasmni yuklab bo'lmadi"
  );
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return temp_key;
}
/** Sharh: `photosPublic` — suratlar ustaning ochiq profilida ko'rinsin. */
export const submitReview = (orderId, { rating, comment, photoKeys = [], photosPublic = false }) =>
  post(
    `/reviews/orders/${orderId}`,
    {
      rating,
      comment: comment?.trim() || null,
      photo_temp_keys: photoKeys,
      photos_public: !!photosPublic,
    },
    "Sharhni yuborib bo'lmadi"
  );

/** Yakuniy izoh (bir marta, ≤1000). */
export const sendFinalComment = (orderId, comment) =>
  post(`/orders/${orderId}/final-comment`, { comment: comment.trim() }, "Izohni saqlab bo'lmadi");
