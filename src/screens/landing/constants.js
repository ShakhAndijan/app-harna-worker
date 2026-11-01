// Kirmagan usta bosh sahifasi uchun doimiy ma'lumotlar. Matnlar `ustaLanding.*` tarjimalarida.

export const STEPS = [
  { num: 1, key: 'step1', icon: 'account-plus-outline' },
  { num: 2, key: 'step2', icon: 'card-account-details-outline' },
  { num: 3, key: 'step3', icon: 'briefcase-check-outline' },
];

export const BENEFITS = [
  { icon: 'clipboard-list-outline', color: '#3b82f6', key: 'orders' },
  { icon: 'cash-multiple', color: '#2ecc71', key: 'price' },
  { icon: 'star-circle-outline', color: '#f5b81f', key: 'reputation' },
];

export const TRUST_ITEMS = [
  { icon: 'clipboard-list-outline', color: '#3b82f6', key: 'orders' },
  { icon: 'calendar-clock', color: '#2ecc71', key: 'schedule' },
  { icon: 'star-circle-outline', color: '#f5b81f', key: 'rating' },
];

// Statistika yuklanmaguncha (yoki xatoda) ko'rinadigan boshlang'ich qiymatlar.
export const DEFAULT_STATS = [
  { value: '1 200+', key: 'workers' },
  { value: '8 500+', key: 'completedJobs' },
  { value: '4.8★', key: 'avgRating' },
];

// "Ilovada nimalar bor" kartalari (matnlar `ustaLanding.features.<key>Title/Desc`).
export const FEATURES_LIST = [
  { key: 'orders', icon: 'clipboard-list-outline', color: '#3b82f6' },
  { key: 'chat', icon: 'chat-processing-outline', color: '#8b5cf6' },
  { key: 'schedule', icon: 'calendar-clock', color: '#2ecc71' },
  { key: 'wallet', icon: 'wallet-outline', color: '#f5b81f' },
  { key: 'portfolio', icon: 'image-multiple-outline', color: '#ec4899' },
  { key: 'listings', icon: 'bullhorn-outline', color: '#e87a45' },
  { key: 'pro', icon: 'crown-outline', color: '#f59e0b' },
  { key: 'referral', icon: 'account-multiple-plus-outline', color: '#14b8a6' },
];

// "Daromad qanday shakllanadi" qatorlari (`ustaLanding.earn.<key>Title/Desc`).
export const EARN_ITEMS = [
  { key: 'price', icon: 'tag-outline', color: '#3b82f6' },
  { key: 'fee', icon: 'shield-check-outline', color: '#2ecc71' },
  { key: 'payout', icon: 'cash-fast', color: '#f5b81f' },
];

// "Harna'siz va Harna bilan" juftliklari: `ustaLanding.compare.before<N>` / `after<N>`.
export const COMPARE_KEYS = [1, 2, 3];

// Maqomlar (`ustaLanding.levels.<key>` / `<key>Req`).
export const LEVELS = [
  { key: 'bronze', color: '#cd7f32' },
  { key: 'silver', color: '#a8b3c2' },
  { key: 'gold', color: '#f5b81f' },
];
