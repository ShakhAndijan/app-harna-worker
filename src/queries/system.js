import { useQuery } from '@tanstack/react-query';
import { getOrderTiming, getSiteConfig, getSystemInfo } from '../api/system';
import { getTelegramConfig } from '../api/auth';

const HOUR = 60 * 60 * 1000;

// Server yuboradigan boshlang'ich qiymatlar: o'zining javobi kelguncha (yoki o'qilmasa) shular ishlaydi.
export const DEFAULT_ORDER_TIMING = {
  arrival_window_minutes: 60,
  window_first_hour: 8,
  window_last_hour: 20,
  urgent_auto_hours: 3,
  urgent_day_ends: '21:00',
};

const whole = (v, min, max, fallback) =>
  Number.isInteger(v) && v >= min && v <= max ? v : fallback;

/** Kelish oralig'i qoidalari (admin sozlamasi). Javob kelmaguncha — server standarti. */
export function useOrderTiming() {
  const q = useQuery({
    queryKey: ['system', 'orderTiming'],
    queryFn: getOrderTiming,
    staleTime: HOUR,
    retry: 1,
  });
  const raw = q.data;
  const base = DEFAULT_ORDER_TIMING;
  const first = whole(raw?.window_first_hour, 0, 23, base.window_first_hour);
  return {
    ...base,
    arrival_window_minutes: whole(
      raw?.arrival_window_minutes,
      1,
      1440,
      base.arrival_window_minutes
    ),
    window_first_hour: first,
    window_last_hour: whole(
      raw?.window_last_hour,
      first,
      23,
      Math.max(first, base.window_last_hour)
    ),
  };
}

/**
 * Kirish ekrani uchun: qaysi usullar yoqilgan. Javob kelmaguncha va xatoda hammasi ko'rsatiladi
 * (server o'zi rad etadi) — faqat server aniq «yo'q» desa yashiriladi.
 */
export function useLoginMethods() {
  const { data } = useQuery({
    queryKey: ['system', 'info'],
    queryFn: getSystemInfo,
    staleTime: HOUR,
    retry: 1,
  });
  return {
    google: data?.google_login !== false,
    telegram: !Array.isArray(data?.otp_channels) || data.otp_channels.includes('telegram'),
  };
}

/** Telegram bilan kirish (oauth.telegram.org): bot sozlangan bo'lsa `{ enabled, botId }`. Xatoda — o'chiq. */
export function useTelegramConfig() {
  const { data } = useQuery({
    queryKey: ['system', 'telegramConfig'],
    queryFn: getTelegramConfig,
    staleTime: HOUR,
    retry: 1,
  });
  return { enabled: !!data?.enabled && data.botId != null, botId: data?.botId ?? null };
}

/** Cloudflare Turnstile kaliti (saytning config.json faylidan); bo'sh — captcha yoqilmagan. */
export function useTurnstileSiteKey() {
  const { data } = useQuery({
    queryKey: ['system', 'siteConfig'],
    queryFn: getSiteConfig,
    staleTime: HOUR,
    retry: 1,
  });
  return data?.turnstileSiteKey ?? '';
}
