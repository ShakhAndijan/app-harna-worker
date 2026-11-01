import { API_BASE_URL } from '../constants/config';
import { request } from '../utils/request';

// Usta ilovasining asosiy endpointlari (Swagger: Workers / Orders / Wallet). Javoblar
// konvertdan ochilgan `response_data` holida qaytadi; pul qiymatlari satr (Decimal) bo'lib keladi.
const V1 = `${API_BASE_URL}/api/v1`;

const qs = (params) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

const call = (path, fallbackMessage, opts = {}) =>
  request(`${V1}${path}`, { fallbackMessage, ...opts });

// Idempotency-Key: takroriy bosishda bir xil amal ikki marta bajarilmasligi uchun.
export const newIdempotencyKey = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ── Profil ────────────────────────────────────────────────────────────────────
export const getWorkerMe = () => call('/workers/me', 'Profil yuklanmadi');
export const updateWorkerMe = (payload) =>
  call('/workers/me', "Profilni saqlab bo'lmadi", { method: 'PATCH', body: payload });
/** availability: 'online' | 'busy'; "Bandman" uchun ixtiyoriy busy_from / busy_until. */
export const setAvailability = (availability, extra = {}) =>
  call('/workers/me/online', "Holatni o'zgartirib bo'lmadi", {
    method: 'PATCH',
    body: { availability, ...extra },
  });
export const getWorkerStats = (days = 30) =>
  call(`/workers/me/stats${qs({ days })}`, 'Statistika yuklanmadi');
export const getMyCategories = () => call('/workers/me/categories', "Yo'nalishlar yuklanmadi");
export const getMyPortfolio = () => call('/workers/me/portfolio', 'Portfolio yuklanmadi');
export const getMyCertificates = () => call('/workers/me/certificates', 'Sertifikatlar yuklanmadi');
export const getMySchedule = () => call('/workers/me/schedule', 'Jadval yuklanmadi');
export const getMyCalendar = (params = {}) =>
  call(`/workers/me/calendar${qs(params)}`, 'Kalendar yuklanmadi');
export const getMyComplaints = () => call('/workers/me/complaints', 'Shikoyatlar yuklanmadi');

// ── Buyurtmalar ───────────────────────────────────────────────────────────────
/** scope: 'assigned' (menga biriktirilgan) | 'open' (olish mumkin bo'lganlar). */
export const getWorkerOrders = ({
  scope = 'assigned',
  status,
  limit = 30,
  offset = 0,
  allRegions,
} = {}) =>
  call(
    `/orders/me/worker${qs({ scope, status, limit, offset, all_regions: allRegions })}`,
    'Buyurtmalar yuklanmadi'
  );
export const getOpenOrderCount = () =>
  call('/orders/me/worker/open-count', 'Buyurtmalar soni yuklanmadi');
export const getMyOffers = () => call('/orders/me/offers', 'Takliflar yuklanmadi');
export const getRejectedOrders = () =>
  call('/orders/me/worker/rejected', 'Rad etilganlar yuklanmadi');
export const getOrder = (orderId) => call(`/orders/${orderId}`, 'Buyurtma yuklanmadi');

const orderAction = (orderId, action, fallbackMessage, body = {}) =>
  call(`/orders/${orderId}/${action}`, fallbackMessage, { method: 'POST', body });

/** Ochiq buyurtmaga taklif yuborish (komissiya zaxiralanadi, mijoz tanlagach `agree` bilan olinadi). */
export const sendOffer = (orderId, payload) =>
  call(`/orders/${orderId}/offers`, "Taklif yuborib bo'lmadi", {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
export const withdrawOffer = (orderId) =>
  orderAction(orderId, 'offers/withdraw', "Taklifni qaytarib bo'lmadi");
export const repriceOffer = (orderId, payload) =>
  orderAction(orderId, 'offers/price', "Narxni o'zgartirib bo'lmadi", payload);
export const acceptOrder = (orderId) =>
  orderAction(orderId, 'accept', "Buyurtmani qabul qilib bo'lmadi");
export const counterOffer = (orderId, payload) =>
  orderAction(orderId, 'offer', "Taklif yuborib bo'lmadi", payload);
export const agreeOrder = (orderId) =>
  orderAction(orderId, 'agree', "Kelishuvni tasdiqlab bo'lmadi");
export const declineOrder = (orderId) => orderAction(orderId, 'decline', "Rad etib bo'lmadi");
export const rejectOrder = (orderId) => orderAction(orderId, 'reject', "Rad etib bo'lmadi");
export const skipOrder = (orderId, reason) =>
  orderAction(orderId, 'skip', "O'tkazib yuborib bo'lmadi", { reason });
export const workDone = (orderId) => orderAction(orderId, 'work-done', "Ishni yakunlab bo'lmadi");
export const cancelByWorker = (orderId, payload) =>
  orderAction(orderId, 'cancel-by-worker', "Bekor qilib bo'lmadi", payload);

// ── Hamyon ────────────────────────────────────────────────────────────────────
export const getBalance = () => call('/wallet/me/balance', 'Balans yuklanmadi');
export const getTransactions = ({ limit = 30, offset = 0 } = {}) =>
  call(`/wallet/me/transactions${qs({ limit, offset })}`, 'Operatsiyalar yuklanmadi');
export const getWithdrawals = () => call('/wallet/me/withdrawals', "So'rovlar yuklanmadi");
export const requestWithdrawal = (payload) =>
  call('/wallet/me/withdrawals', "Yechish so'rovi yuborilmadi", {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });

// ── E'lonlar (ustaning o'z e'lonlari) ─────────────────────────────────────────
export const getMyListings = () => call('/workers/me/listings', "E'lonlar yuklanmadi");
export const createListing = (payload) =>
  call('/workers/me/listings', "E'lon yaratilmadi", {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': newIdempotencyKey() },
  });
export const updateListing = (id, payload) =>
  call(`/workers/me/listings/${id}`, "E'lon saqlanmadi", { method: 'PATCH', body: payload });
export const deleteListing = (id) =>
  call(`/workers/me/listings/${id}`, "E'lonni o'chirib bo'lmadi", { method: 'DELETE' });

// ── Qo'shimcha ────────────────────────────────────────────────────────────────
export const getPro = () => call('/pro', 'Pro holati yuklanmadi');
export const getReferral = () => call('/referrals/me', "Referal ma'lumoti yuklanmadi");
export const getContest = () => call('/contest/me', "Tanlov ma'lumoti yuklanmadi");
export const getMyBrigade = () => call('/brigades/me', 'Brigada yuklanmadi');
