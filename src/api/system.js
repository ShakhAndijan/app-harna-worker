import { API_BASE_URL, SITE_URL } from '../constants/config';
import { request } from '../utils/request';

// Ochiq endpointlar (token kerak emas): hamma uchun bir xil, admin sozlamalari.

/**
 * GET /system/info — shu o'rnatma nimani qila oladi: `otp_channels` (kod qaysi kanallarda yetkaziladi,
 * masalan ['sms','telegram']) va `google_login` (Google bilan kirish sozlanganmi).
 */
export async function getSystemInfo() {
  return (
    (await request(`${API_BASE_URL}/api/v1/system/info`, { auth: false, timeout: 8000 })) ?? null
  );
}

/**
 * GET /system/order-timing — kelish oralig'i qoidalari: `arrival_window_minutes` (oraliq uzunligi, admin
 * belgilaydi), `window_first_hour`/`window_last_hour` (oraliq boshlanishi mumkin bo'lgan soatlar),
 * `urgent_auto_hours`, `urgent_day_ends`.
 */
export async function getOrderTiming() {
  return (
    (await request(`${API_BASE_URL}/api/v1/system/order-timing`, { auth: false, timeout: 8000 })) ??
    null
  );
}

/** Saytning ish vaqtidagi sozlamasi (`{SITE_URL}/config.json`): hozircha faqat Turnstile kaliti kerak. */
export async function getSiteConfig() {
  try {
    const res = await fetch(`${SITE_URL}/config.json`, { cache: 'no-store' });
    const raw = res.ok ? await res.json() : null;
    const key = raw?.turnstileSiteKey;
    return { turnstileSiteKey: typeof key === 'string' ? key.trim() : '' };
  } catch {
    return { turnstileSiteKey: '' };
  }
}
