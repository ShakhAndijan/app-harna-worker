import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrder,
  getWorkerOrders,
  sendOffer,
  skipOrder,
  withdrawOffer,
  repriceOffer,
  agreeOrder,
  declineOrder,
  workDone,
} from '../api/workerApp';
import { useWorkerMe } from './workerHome';

const list = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

/**
 * Buyurtma olish uchun majburiy ma'lumotlar (ilova qoidasi; serverda alohida tekshiruv yo'q).
 * `missing` — yetishmayotgan bandlar uchun `workerHome.m_*` i18n kalitlari.
 */
export function useProfileGate() {
  const me = useWorkerMe();
  const worker = me.data;
  const required = [
    ['m_photo', !!worker?.profile_photo],
    ['m_bio', !!worker?.bio],
    ['m_cat', !!worker?.categories?.length],
    ['m_loc', !!worker?.district],
  ];
  const missing = required.filter((r) => !r[1]).map((r) => r[0]);
  return { worker, missing, locked: !!worker && missing.length > 0 };
}

/** Ochiq buyurtmalar lentasi; `allRegions` — barcha hududlar. */
export const useOpenFeed = (allRegions) =>
  useQuery({
    queryKey: ['worker', 'orders', 'open', 'feed', !!allRegions],
    queryFn: () =>
      getWorkerOrders({ scope: 'open', limit: 40, allRegions: allRegions || undefined }).then(list),
  });

export const useOrder = (id) =>
  useQuery({
    queryKey: ['worker', 'order', String(id)],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });

// Har bir amaldan keyin usta ma'lumotlari (ro'yxatlar, balans, hisoblagichlar) qayta yuklanadi.
function useOrderAction(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker'] }),
  });
}

export const useSendOffer = () => useOrderAction(({ id, payload }) => sendOffer(id, payload));
export const useSkipOrder = () => useOrderAction(({ id, reason }) => skipOrder(id, reason));
export const useWithdrawOffer = () => useOrderAction((id) => withdrawOffer(id));
export const useRepriceOffer = () => useOrderAction(({ id, payload }) => repriceOffer(id, payload));
export const useAgreeOrder = () => useOrderAction((id) => agreeOrder(id));
export const useDeclineOrder = () => useOrderAction((id) => declineOrder(id));
export const useWorkDone = () => useOrderAction((id) => workDone(id));
