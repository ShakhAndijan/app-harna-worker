import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

// Ushbu telefon boshlagan MyID tekshiruvi va uning ekrandagi bosqichi (backend dasturchisining
// mobile-shared/src/lib/myidPending.ts kabi). Server `/start` da bergan bir martalik `nonce` — javob
// aynan shu ilova boshlagan tekshiruvga tegishli ekanining isboti; yakuniy tugma uni yuboradi.
// Android MyID sahifasi ochiq paytda ilovani to'xtatib qo'yishi mumkin, shuning uchun u SecureStore'da
// ham saqlanadi. Muvaffaqiyatdan, haqiqiy xatodan va chiqishdan keyin o'chadi.
//
// Bosqichlar (`view.kind`): idle · opening · waiting · unfinished · final · finishing · done · failed · refused.

const KEY = 'myid_pending';

let view = { kind: 'idle' };
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function showMyId(next) {
  view = next;
  listeners.forEach((fn) => fn());
}
export const getMyIdView = () => view;
export const useMyIdView = () => useSyncExternalStore(subscribe, getMyIdView);

let held = null;

const valid = (p) =>
  !!p &&
  typeof p === 'object' &&
  typeof p.session_id === 'string' &&
  p.session_id !== '' &&
  typeof p.nonce === 'string' &&
  p.nonce !== '' &&
  typeof p.expires_at === 'number';

export async function readMyIdPending() {
  if (held) return held;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    held = valid(parsed) ? parsed : null;
  } catch {
    held = null;
  }
  return held;
}

export async function saveMyIdPending(pending) {
  held = pending;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(pending));
  } catch {
    // Xotirada qoladi: bu ishga tushirishda tekshiruvni tugatish mumkin.
  }
}

export async function clearMyIdPending() {
  held = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Yo'q yoki xotira ishlamayapti: baribir o'chgan.
  }
}

/** Chiqishda: tekshiruv va uning holati sessiya bilan ketadi. */
export async function forgetMyIdAttempt() {
  showMyId({ kind: 'idle' });
  await clearMyIdPending();
}
