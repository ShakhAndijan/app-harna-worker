import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { getWorkersPresence } from '../api/workers';

// «Onlayn», «Band» va «Dam olishda» — ekrandagi ustalar uchun doim yangi (sayt `store/presence`,
// backend dasturchisining `mobile-shared/src/lib/presence.ts`). Karta yuklangan paytdagi holatni
// ko'rsatadi, ustalar esa kelib-ketadi, «Bandman» bosadi yoki ish vaqti boshlanadi, «Onlayn» 15 daqiqadan
// keyin o'zi o'chadi — bularning hech biri ekranga o'zi kelmaydi. Shuning uchun har bir ekrandagi usta
// ro'yxatga olinadi va bitta umumiy taymer hammasini birdan har 2 daqiqada so'raydi (`GET /workers/presence`,
// bir so'rovda 100 tagacha), ilova oldinga qaytganda ham.
const EVERY_MS = 2 * 60 * 1000;
const FRESH_MS = 30 * 1000; // oxirgi so'rovdan beri shuncha o'tmagan bo'lsa, qaytganda qayta so'ramaymiz
const BATCH = 100;

let live = {}; // { [id]: { is_online, availability, busy_until, at } }
const watched = new Map(); // id -> nechta karta kuzatyapti
const listeners = new Set();
let timer = null;
let appSub = null;
let lastLook = 0;

const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

async function look() {
  if (AppState.currentState !== 'active' || watched.size === 0) return;
  lastLook = Date.now();
  const ids = [...watched.keys()];
  for (let i = 0; i < ids.length; i += BATCH) {
    try {
      const rows = await getWorkersPresence(ids.slice(i, i + BATCH));
      const at = Date.now();
      const next = { ...live };
      for (const { id, ...rest } of rows) next[id] = { ...rest, at };
      live = next;
      emit();
    } catch {
      // Kartalar ko'rsatib turganini saqlaydi; keyingi so'rov qayta urinadi.
    }
  }
}

function watch(id) {
  watched.set(id, (watched.get(id) ?? 0) + 1);
  // Bir muddat oldingi javob hozirgina yuklangan kartadan eskiroq: tashlab yuboriladi.
  const seen = live[id];
  if (seen && Date.now() - seen.at > EVERY_MS) {
    const next = { ...live };
    delete next[id];
    live = next;
    emit();
  }
  if (timer === null) {
    timer = setInterval(look, EVERY_MS);
    appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastLook > FRESH_MS) look();
    });
  }
  return () => {
    const left = (watched.get(id) ?? 1) - 1;
    if (left > 0) watched.set(id, left);
    else watched.delete(id);
    if (watched.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      appSub?.remove();
      appSub = null;
    }
  };
}

/**
 * Shu ustaning joriy holati: `{ is_online, availability: 'online'|'busy'|'offline', busy_until }`
 * yoki hali javob kelmagan bo'lsa `undefined` (u holda yuklangan qiymat ko'rsatiladi).
 * Ekranda ko'rinib turgan paytda har 2 daqiqada yangilanadi.
 */
export default function useLivePresence(id) {
  const snapshot = useSyncExternalStore(subscribe, () => live);
  useEffect(() => (id != null ? watch(id) : undefined), [id]);
  return id != null ? snapshot[id] : undefined;
}
