import { API_BASE_URL } from '../constants/config';
import { request } from '../utils/request';
import { uploadImageToPresignedUrl } from './auth';

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

// Tugagan buyurtma bo'yicha mijozni baholash (har bir buyurtmaga bir marta, keyin o'zgartirib bo'lmaydi).
export const rateCustomer = (orderId, { rating, comment }) =>
  call(`/reviews/orders/${orderId}/customer`, "Bahoni yuborib bo'lmadi", {
    method: 'POST',
    body: { rating, comment: comment?.trim() || undefined },
  });

// Qo'shimcha ish: usta mijozga narx bilan taklif qiladi; mijoz rozi bo'lsa jami narxga qo'shiladi.
export const proposeExtra = (orderId, { description, price }) =>
  call(`/orders/${orderId}/extras`, "Taklifni yuborib bo'lmadi", {
    method: 'POST',
    body: { description: description?.trim() || null, price: String(price) },
  });

// Buyurtma bosqichlari (etaplar): usta rejalaydi va "bajarildi" deb belgilaydi, mijoz tasdiqlaydi.
// Holatlar: pending → done → confirmed. Rejalashda faqat `pending` bosqichlar yuboriladi.
export const getOrderStages = (orderId) =>
  call(`/orders/${orderId}/stages`, 'Bosqichlar yuklanmadi');
export const planOrderStages = (orderId, stages) =>
  call(`/orders/${orderId}/stages`, "Bosqichlarni saqlab bo'lmadi", {
    method: 'PUT',
    body: { stages },
  });
export const markStageDone = (orderId, stageId) =>
  call(`/orders/${orderId}/stages/${stageId}/done`, "Bosqichni belgilab bo'lmadi", {
    method: 'POST',
    body: {},
  });

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
// Sayt "Ish bajarildi" tugmasini kamida bitta "ishdan keyingi" foto bo'lmasa o'chirib qo'yadi;
// foto `work-photos/upload-slot` orqali yuklanib, `temp_key` lari bilan yuboriladi.
export const workDone = (orderId, afterPhotoKeys = []) =>
  orderAction(
    orderId,
    'work-done',
    "Ishni yakunlab bo'lmadi",
    afterPhotoKeys.length ? { after_photo_temp_keys: afterPhotoKeys } : {}
  );
export const uploadWorkPhoto = async (orderId, uri, contentType = 'image/jpeg') => {
  const { upload_url, temp_key } = await call(
    `/orders/${orderId}/work-photos/upload-slot`,
    "Rasmni yuklab bo'lmadi",
    { method: 'POST', body: { content_type: contentType } }
  );
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return temp_key;
};
/** Ishdan oldingi suratlar (nizoda himoya): avval `uploadWorkPhoto`, so'ng shu yerda temp_key lar. */
export const addBeforePhotos = (orderId, tempKeys) =>
  orderAction(orderId, 'work-photos', "Suratlarni qo'shib bo'lmadi", {
    kind: 'before',
    temp_keys: tempKeys,
  });
/** Buyurtmada xarita nuqtasi yo'q: mijozdan nuqta so'raladi; javobda `next_request_at` (qayta so'rash vaqti). */
export const requestLocation = (orderId) =>
  orderAction(orderId, 'location/request', "So'rovni yuborib bo'lmadi");
/** "Yetib keldim":qurilma joylashuvi mijoz nuqtasi bilan solishtiriladi. */
export const markArrived = (orderId, { lat, lng, accuracy_m }) =>
  orderAction(orderId, 'arrived', "Yetib kelganingizni belgilab bo'lmadi", {
    lat,
    lng,
    accuracy_m,
  });
/** kind: 'no_contact' (mijoz bilan bog'lana olmadim) | 'no_work' (kelganimda ish qildirmadi). */
export const fileComplaint = (orderId, { note, kind = 'no_contact' }) =>
  orderAction(orderId, 'complaint', "Shikoyatni yuborib bo'lmadi", {
    note: note?.trim() || null,
    kind,
  });
/** Mijoz "usta kelmadi" deb bildirganda usta javobi: came=true (keldim) | false (kelmadim → bekor). */
export const answerNoShow = (orderId, came) =>
  orderAction(orderId, 'no-show/answer', "Javobni yuborib bo'lmadi", { came: !!came });
/** Kafolat da'vosiga javob: fix=true (tuzatib beraman) | false (rad etaman, operator hal qiladi). */
export const answerGuaranteeClaim = (orderId, fix) =>
  orderAction(orderId, 'guarantee-claim/answer', "Javobni yuborib bo'lmadi", { fix: !!fix });
/** "Tuzatdim": mijozga tekshirish uchun yuboriladi. */
export const reportGuaranteeFixed = (orderId) =>
  orderAction(orderId, 'guarantee-claim/fixed', "Yuborib bo'lmadi");
/** Tugagan buyurtma uchun yakuniy izoh (bir marta, ≤1000 belgi). */
export const sendFinalComment = (orderId, comment) =>
  orderAction(orderId, 'final-comment', "Izohni saqlab bo'lmadi", { comment: comment.trim() });
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
