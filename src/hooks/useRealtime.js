import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { queryClient } from '../queries/client';
import { API_BASE_URL } from '../constants/config';
import { getToken } from '../utils/token';
import { refreshSession } from '../utils/apiClient';
import { appAlert } from '../components/AppAlert';

// Jonli kanal (sayt `useSocket`, backend dasturchisining `mobile-shared/src/lib/realtime.ts`):
// tizimga kirilgan paytda bitta Socket.IO ulanishi. Server «shu narsa o'zgardi» desa, ochiq ekranlar
// ma'lumotni qayta so'raydi — buyurtma, taklif va chat taymer kutmasdan yangilanadi. Taymerli
// qayta so'rashlar (chat 6 s, buyurtma 20 s) zaxira sifatida qoladi: kanal uzilsa ham ishlayveradi.

// Buyurtma/taklif voqealari (`core/realtime/notifications.py`).
const ORDER_EVENTS = [
  'order.created',
  'order.accepted',
  'order.offer',
  'order.agreed',
  'order.work_done',
  'order.negotiation_ended',
  'order.returned',
  'order.completed',
  'order.cancelled',
  'order.message',
  'order.new_offer',
  'offer.chosen',
  'offer.not_chosen',
  'offer.waiting',
  'offer.reopened',
  'offer.rejected',
  'offer.expired',
  'order.offers_changed',
  'order.reminder',
  'order.work_not_done',
  'order.complaint',
  'order.arrived',
  'order.location',
  'order.location_request',
  'order.extra',
  'order.guarantee',
  'order.deposit',
  'order.chat_read',
];
// Qo'ng'iroqcha qatori qoldiradigan voqealar (bildirishnomalar soni qayta o'qiladi).
const BELL_EVENTS = [
  'order.accepted',
  'order.agreed',
  'order.work_done',
  'order.offer',
  'order.negotiation_ended',
  'order.returned',
  'order.completed',
  'order.cancelled',
  'order.message',
  'order.new_offer',
  'offer.chosen',
  'offer.not_chosen',
  'offer.rejected',
  'offer.expired',
  'order.reminder',
  'order.work_not_done',
  'order.complaint',
  'order.arrived',
  'order.location',
  'order.location_request',
  'order.extra',
  'order.guarantee',
  'order.deposit',
  'review.received',
  'admin.message',
  'complaint.changed',
];

const SETTLE_MS = 400; // ketma-ket voqealar bitta qayta o'qish bo'ladi
const CATALOG_SPREAD_MS = 3000; // katalog o'zgarishi hammaga birdan keladi: yuk taqsimlanadi

// Usta ilovasidagi buyurtmaga bog'liq so'rovlar (`['w', <shu nomlar>]`) va mijoz tomoni.
const W_ORDER_KEYS = new Set([
  'orders',
  'order',
  'quote',
  'chat',
  'openCount',
  'balance',
  'tx',
  'status',
  'complaints',
  'topups',
]);
const isOrderQuery = (q) => {
  const [a, b] = q.queryKey;
  return (a === 'w' && W_ORDER_KEYS.has(b)) || a === 'orders' || a === 'customerFlow';
};
const isBellQuery = (q) => q.queryKey[0] === 'notifications';

// Faqat ko'rinib turgan ekranlar darrov qayta so'raydi; qolganlari eskirgan deb belgilanadi.
const refetchWhere = (predicate) =>
  queryClient.invalidateQueries({ predicate, refetchType: 'active' });

/**
 * Tizimga kirgan paytda kanalni ochadi. `enabled` — kirilganmi; `onClosed` — hisob yopilganda.
 * Ilova fonga o'tsa kanal yopiladi, qaytganda ochiladi va nima o'zgargani bir martada o'qiladi.
 */
export default function useRealtime(enabled, onClosed) {
  useEffect(() => {
    if (!enabled) return undefined;

    const socket = io(API_BASE_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      // Har (qayta) ulanishda o'qiladi: yangilangan token yuboriladi.
      auth: (cb) => {
        getToken().then(
          (token) => cb({ token: token ?? '' }),
          () => cb({ token: '' })
        );
      },
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };
    // Bir xil nomdagi ishni «turtki» bilan bitta qilib yig'adi.
    const settle = {};
    const debounced = (name, fn, ms = SETTLE_MS) => {
      if (settle[name]) clearTimeout(settle[name]);
      settle[name] = later(fn, ms);
    };

    let connectedBefore = false;
    let renewed = false;

    socket.on('connect', () => {
      renewed = false;
      // Fondan yoki uzilgan tarmoqdan qaytganda: shu orada nima o'zgargan bo'lsa, o'qiladi.
      if (connectedBefore) queryClient.invalidateQueries({ refetchType: 'active' });
      connectedBefore = true;
    });
    // Server ulanishni rad etdi (odatda token eskirgan): token bir marta yangilanadi va qayta uriniladi.
    socket.on('connect_error', () => {
      if (socket.active || renewed) return;
      renewed = true;
      refreshSession().then((r) => r === 'ok' && socket.connect());
    });

    const orderEvent = () => debounced('order', () => refetchWhere(isOrderQuery));
    ORDER_EVENTS.forEach((event) => socket.on(event, orderEvent));
    const bell = () => debounced('bell', () => refetchWhere(isBellQuery), 1000);
    BELL_EVENTS.forEach((event) => socket.on(event, bell));

    // Hisobda nimadir o'zgardi (taqiq, admin qarori, to'lov, jamoa javobi): hamma ochiq ekran qayta o'qiydi.
    const accountEvent = () =>
      debounced('account', () => queryClient.invalidateQueries({ refetchType: 'active' }));
    socket.on('account.changed', (payload) => {
      if (payload?.closed) {
        appAlert(
          payload.what === 'deleted' ? 'Hisob o‘chirildi' : 'Hisob yopildi',
          payload.what === 'deleted'
            ? 'Hisobingiz o‘chirildi. Qayta kirish uchun yangi hisob oching.'
            : 'Hisobingiz yopilgan. Batafsil ma’lumot uchun qo‘llab-quvvatlashga yozing.'
        );
        onClosed?.();
        return;
      }
      accountEvent();
    });
    socket.on('catalog.changed', () => later(accountEvent, Math.random() * CATALOG_SPREAD_MS));

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!socket.connected) socket.connect();
      } else if (state === 'background') {
        socket.disconnect();
      }
    });

    return () => {
      sub.remove();
      timers.forEach(clearTimeout);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, onClosed]);
}
