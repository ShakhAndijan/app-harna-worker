import { AppState } from 'react-native';
import { API_BASE_URL } from '../constants/config';

// Statistika (POST /analytics/events): saytdagi bilan bir xil hodisalar. Faqat hodisa nomi va ilova
// har ishga tushganda yangi tasodifiy raqam ketadi — hisob, ekran va yozilgan matn yuborilmaydi,
// token ham yo'q. Xato hech qachon ekranni buzmaydi. Ishlab chiqish (__DEV__) yig'malaridan
// yuborilmaydi.
//
// Server ruxsat etgan nomlar: wizard_opened, wizard_step_viewed, wizard_submit_pressed,
// wizard_phone_asked, wizard_code_sent, wizard_code_rejected, wizard_order_created,
// listing_viewed, worker_viewed, search_performed. Boshqa nom — 422.
const ENDPOINT = `${API_BASE_URL}/api/v1/analytics/events`;
const MAX_BATCH = 20;
const FLUSH_MS = 4000;

let visit = null;
let queue = [];
let timer = null;
let started = false;

// 32 ta hex belgi (server shablon bo'yicha) — har ishga tushishda bir marta.
function visitId() {
  if (visit) return visit;
  const bytes = new Uint8Array(16);
  const c = globalThis.crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  visit = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return visit;
}

function send(batch) {
  if (!batch.length) return;
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: batch }),
  }).catch(() => undefined);
}

function flush() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  const batch = queue;
  queue = [];
  for (let i = 0; i < batch.length; i += MAX_BATCH) send(batch.slice(i, i + MAX_BATCH));
}

export function track(name, step) {
  if (__DEV__) return;
  try {
    const visit_id = visitId();
    queue.push(step === undefined ? { name, visit_id } : { name, visit_id, step });
    if (queue.length >= MAX_BATCH) {
      flush();
      return;
    }
    if (timer === null) timer = setTimeout(flush, FLUSH_MS);
  } catch {
    // Statistika ekranni buzmasligi kerak.
  }
}

// Ilova ildizidan bir marta: fonga o'tganda navbatdagi hodisalar yuboriladi.
export function startAnalytics() {
  if (started) return;
  started = true;
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') flush();
  });
}
