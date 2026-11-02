import { API_BASE_URL } from '../constants/config';
import { request } from '../utils/request';
import { uploadImageToPresignedUrl } from '../api/auth';
import * as FileSystem from 'expo-file-system/legacy';

// Usta (mutaxassis) API'si: barcha so'rovlar Bearer token bilan, javob `response_data` ochilgan holda.
const u = (path) => `${API_BASE_URL}/api/v1${path}`;
const qs = (params = {}) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
};
const get = (path, params) => request(u(path) + qs(params));
const send = (method, path, body) => request(u(path), { method, body });
const post = (path, body) => send('POST', path, body ?? {});

// ── Profil ──
export const getMe = () => get('/workers/me');
export const patchMe = (body) => send('PATCH', '/workers/me', body);
export const getStatus = () => get('/workers/me/status');
export const setAvailability = (body) => send('PATCH', '/workers/me/online', body);
export const getStats = (days) => get('/workers/me/stats', { days });
export const heartbeat = () => post('/workers/me/seen');
export const getCalendar = (month) => get('/workers/me/calendar', { month });
export const saveSchedule = (body) => send('PUT', '/workers/me/schedule', body);
export const toggleOffDate = (day, off) => post('/workers/me/off-dates', { day, off });
export const addMyCategory = (body) => post('/workers/me/categories', body);
export const updateMyCategory = (id, body) => send('PATCH', `/workers/me/categories/${id}`, body);
export const removeMyCategory = (id) => send('DELETE', `/workers/me/categories/${id}`);
export const getMyReviews = (workerId, limit = 20) =>
  get(`/workers/${workerId}/reviews`, { limit });
export const getMyCertificates = () => get('/workers/me/certificates');

// ── Ma'lumotnomalar ──
export const getCategories = () => get('/categories');
export const getRegions = () => get('/regions');
export const getDistricts = (regionId) => get(`/regions/${regionId}/districts`);
export const getPriceTypes = () => get('/price-types');

// ── Buyurtmalar ──
export const getOrders = ({
  scope = 'assigned',
  status,
  limit = 30,
  offset = 0,
  allRegions,
} = {}) => get('/orders/me/worker', { scope, status, limit, offset, all_regions: allRegions });
export const getOpenCount = () => get('/orders/me/worker/open-count');
export const getRejectedOrders = (limit = 30, offset = 0) =>
  get('/orders/me/worker/rejected', { limit, offset });
export const getMyOffers = ({ status, limit = 30, offset = 0 } = {}) =>
  get('/orders/me/offers', { status, limit, offset });
export const getOrder = (id) => get(`/orders/${id}`);
export const getMatchQuote = (id) => get(`/orders/${id}/match-quote`);
export const sendOffer = (id, body) => post(`/orders/${id}/offers`, body);
export const withdrawOffer = (id) => post(`/orders/${id}/offers/withdraw`);
export const repriceMyOffer = (id, body) => post(`/orders/${id}/offers/price`, body);
export const acceptOrder = (id) => post(`/orders/${id}/accept`);
export const offerPrice = (id, body) => post(`/orders/${id}/offer`, body);
export const agreeOrder = (id, body) => post(`/orders/${id}/agree`, body);
export const declineOrder = (id, reason) => post(`/orders/${id}/decline`, reason ? { reason } : {});
export const rejectOrder = (id, reason) => post(`/orders/${id}/reject`, reason ? { reason } : {});
export const skipOrder = (id, reason) => post(`/orders/${id}/skip`, { reason });
export const unskipOrder = (id) => send('DELETE', `/orders/${id}/skip`);
export const workDone = (id) => post(`/orders/${id}/work-done`);
export const cancelByWorker = (id, reason) => post(`/orders/${id}/cancel-by-worker`, { reason });
export const getChat = (id) => get(`/orders/${id}/chat`);
export const sendChat = (id, body) => post(`/orders/${id}/chat`, { body });
export const markChatRead = (id) => post(`/orders/${id}/chat/read`);

// ── E'lonlar ──
export const getMyListings = ({ isActive, limit = 50, offset = 0 } = {}) =>
  get('/workers/me/listings', { is_active: isActive, limit, offset });
export const createListing = (body) => post('/workers/me/listings', body);
export const updateListing = (id, body) => send('PATCH', `/workers/me/listings/${id}`, body);
export const deleteListing = (id) => send('DELETE', `/workers/me/listings/${id}`);
export const requestListingPhotoUpload = (contentType) =>
  post('/workers/me/listings/photos/upload-url', { content_type: contentType });

// ── Hamyon ──
export const getBalance = () => get('/wallet/me/balance');
export const getTransactions = (limit = 40, offset = 0) =>
  get('/wallet/me/transactions', { limit, offset });
export const getWithdrawals = (limit = 20, offset = 0) =>
  get('/wallet/me/withdrawals', { limit, offset });
export const requestWithdrawal = (body) => post('/wallet/me/withdrawals', body);
export const getPaymentProviders = () => get('/payments/providers');
export const createTopupIntent = (amountUzs, provider, locale) =>
  request(u('/wallet/topup/intent'), {
    method: 'POST',
    body: { amount_uzs: amountUzs, provider, locale },
    headers: { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` },
  });

// ── Rasm yuklash (presigned PUT) ──
const guessType = (uri) =>
  /\.png$/i.test(uri) ? 'image/png' : /\.webp$/i.test(uri) ? 'image/webp' : 'image/jpeg';

export async function uploadAvatar(uri) {
  const contentType = guessType(uri);
  const { upload_url, temp_key } = await post('/workers/me/avatar/upload-url', {
    content_type: contentType,
  });
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return post('/workers/me/avatar/confirm', { temp_key });
}

// E'lon rasmi: har biri uchun alohida havola; qaytgan `temp_key` lar e'lon yaratishda yuboriladi.
export async function uploadListingPhoto(uri) {
  const contentType = guessType(uri);
  const { upload_url, temp_key } = await requestListingPhotoUpload(contentType);
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return temp_key;
}

// ── Referal, Pro, portfolio ──
export const getReferrals = () => get('/referrals/me');
export const getPro = () => get('/pro');
export const subscribePro = (months) => post('/pro/subscribe', { months });
// Portfolio alohida GET ga ega emas — `WorkerMe.portfolio` ichida keladi.
export const getPortfolio = () => getMe().then((me) => me?.portfolio || []);
export const setCapacity = (dailyCapacity) =>
  send('PUT', '/workers/me/capacity', { daily_capacity: dailyCapacity });
export const setPreferences = (body) => send('PATCH', '/auth/preferences', body);
export const setPassword = (body) => post('/auth/set-password', body);

// ── TOP xizmati va brigada ──
export const getPromotionOptions = () => get('/promotions/options');
export const getMyPromotions = () => get('/promotions/mine');
export const buyPromotion = (body) => post('/promotions', body);
export const getMyBrigade = () => get('/brigades/me');
export const createBrigade = (body) => post('/brigades', body);
export const leaveBrigade = () => post('/brigades/leave');
export const acceptBrigadeInvite = (memberId) => post(`/brigades/invites/${memberId}/accept`);
export const declineBrigadeInvite = (memberId) => post(`/brigades/invites/${memberId}/decline`);

// ── Shikoyatlar va akkaunt ──
export const getComplaints = () => get('/workers/me/complaints');
export const replyComplaint = (id, body) =>
  send('PUT', `/workers/me/complaints/${id}/reply`, { body });
export const getTelegramStatus = () => get('/auth/telegram/status');
export const getDeletionPreview = () => get('/auth/account/deletion');
export const deleteAccount = () => post('/auth/account/delete');

// ── Status, tanlov, Telegram, portfolio, sertifikat ──
export const getBadgeLevels = () => get('/badges/levels');
export const getContestMe = () => get('/contest/me');
export const linkTelegram = () => post('/auth/telegram/link');
export const unlinkTelegram = () => send('DELETE', '/auth/telegram/link');
export const deletePortfolio = (id) => send('DELETE', `/workers/me/portfolio/${id}/with-photos`);
export const addCertificate = (body) => post('/workers/me/certificates', body);
export const deleteCertificate = (id) => send('DELETE', `/workers/me/certificates/${id}`);

// Portfolio: har bir rasm uchun alohida havola, so'ng temp_key lar bilan element yaratiladi.
export async function addPortfolioItem({ title, description, workDate, uris }) {
  const keys = [];
  for (const uri of uris) {
    const contentType = guessType(uri);
    const { upload_url, temp_key } = await post('/workers/me/portfolio/upload-url', {
      content_type: contentType,
    });
    await uploadImageToPresignedUrl(upload_url, uri, contentType);
    keys.push(temp_key);
  }
  return post('/workers/me/portfolio/from-uploads', {
    title,
    description: description || null,
    work_date: workDate || null,
    photo_temp_keys: keys,
  });
}

// ── Reyting, raqiblar, Pro, referal, tanlov g'oliblari, vitrina ──
export const getReviewsPage = (workerId, { page = 1, size = 20, categoryId } = {}) =>
  get(`/workers/${workerId}/reviews`, { page, size, category_id: categoryId });
export const getCompetitorListings = (page = 1, size = 20) =>
  get('/workers/me/listings/competitors', { page, size });
export const getMediaLimits = () => get('/listings/media-limits');
export const getProHistory = () => get('/pro/history');
export const setProAutoRenew = (autoRenew) => post('/pro/auto-renew', { auto_renew: autoRenew });
export const claimReferral = (code) => post('/referrals/claim', { code });
export const getContestWinners = (region) => get('/contest/winners', { region, limit: 30 });
export const setShowcasePhoto = (photoUrl) =>
  send('PUT', '/workers/me/showcase-photo', { photo_url: photoUrl });

// E'lon videosi: bitta MP4/MOV. Katta fayl bo'lgani uchun base64 emas, to'g'ridan-to'g'ri yuklanadi.
export async function uploadListingVideo({ uri, contentType, sizeBytes, durationSeconds }) {
  const { upload_url, temp_key } = await post('/workers/me/listings/video/upload-url', {
    content_type: contentType,
    size_bytes: sizeBytes,
    duration_seconds: durationSeconds ?? null,
  });
  const res = await FileSystem.uploadAsync(upload_url, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
  return temp_key;
}

// Sertifikat hujjati (rasm): havola → yuklash → tasdiqlash bilan birga yaratiladi.
export async function addCertificateWithDocument({ uri, ...fields }) {
  const contentType = guessType(uri);
  const { upload_url, temp_key } = await post('/workers/me/documents/upload-url', {
    content_type: contentType,
  });
  await uploadImageToPresignedUrl(upload_url, uri, contentType);
  return post('/workers/me/documents/confirm', { temp_key, ...fields });
}
export const getDocumentUrl = (certId) => get(`/workers/me/documents/${certId}/download-url`);
