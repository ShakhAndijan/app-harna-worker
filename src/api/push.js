import { ENDPOINTS } from '../constants/config';
import { request } from '../utils/request';

// Mobil push (FCM): qurilma tokenini backendga bog'lash. Backend tokenni foydalanuvchiga biriktiradi
// va hodisa bo'lganda FCM orqali yuboradi, shuning uchun ilova yopiq bo'lsa ham xabar keladi.

/**
 * Tokenni saqlaydi (token bo'yicha upsert); javob `{ devices }` — foydalanuvchining qurilmalari soni.
 * `format: 'expo'` — FCM faqat ma'lumot yuboradi, `expo-notifications` o'qiydigan ko'rinishda; xabarni
 * ilova o'zi ko'rsatadi (Harna ilovalari shunday, backend dasturchisining mobile-shared/src/lib/push.ts kabi).
 * `locale` — xabar matni tili.
 */
export function registerPushDevice({ token, platform, locale, appVersion, appId }) {
  return request(ENDPOINTS.PUSH_DEVICES, {
    method: 'POST',
    body: {
      token,
      platform,
      format: 'expo',
      locale,
      app_version: appVersion,
      // Ilovaning o'z id si (Android paketi / iOS bundle id): APNs va Push Kit tokenni faqat o'z ilovasi nomi ostida qabul qiladi.
      app_id: appId,
    },
    timeout: 10000,
    fallbackMessage: 'Push qurilmasi saqlanmadi',
  });
}

/** Chiqishda tokenni o'chiradi: boshqa foydalanuvchi shu qurilmada xabar olmasligi uchun. */
export function unregisterPushDevice(token) {
  return request(ENDPOINTS.PUSH_DEVICES_REMOVE, {
    method: 'POST',
    body: { token },
    timeout: 5000,
    fallbackMessage: "Push qurilmasi o'chirilmadi",
  });
}
