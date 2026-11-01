import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWorkerMe,
  getBalance,
  getWorkerOrders,
  getOpenOrderCount,
  getMyOffers,
  getWorkerStats,
  getContest,
  getReferral,
  getRejectedOrders,
  setAvailability,
} from '../api/workerApp';

// Usta ilovasi so'rovlari ['worker', ...] ostida: bitta invalidate hammasini yangilaydi.
export const WORKER_ME_KEY = ['worker', 'me'];
const list = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

export const useWorkerMe = () => useQuery({ queryKey: WORKER_ME_KEY, queryFn: getWorkerMe });
export const useWorkerBalance = () =>
  useQuery({ queryKey: ['worker', 'balance'], queryFn: getBalance });
export const useOpenOrders = () =>
  useQuery({
    queryKey: ['worker', 'orders', 'open'],
    queryFn: () => getWorkerOrders({ scope: 'open', limit: 10 }).then(list),
  });
export const useOpenOrderCount = () =>
  useQuery({ queryKey: ['worker', 'openCount'], queryFn: getOpenOrderCount });
export const useAssignedOrders = () =>
  useQuery({
    queryKey: ['worker', 'orders', 'assigned'],
    queryFn: () => getWorkerOrders({ scope: 'assigned', limit: 50 }).then(list),
  });
export const useMyOffers = () =>
  useQuery({ queryKey: ['worker', 'offers'], queryFn: () => getMyOffers().then(list) });
export const useRejectedOrders = () =>
  useQuery({ queryKey: ['worker', 'rejected'], queryFn: () => getRejectedOrders().then(list) });

/** "Buyurtma olaman" / "Dam olyapman" almashtirgich: server WorkerMe qaytaradi, kesh darhol yangilanadi. */
export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (availability) => setAvailability(availability),
    onSuccess: (me) => {
      if (me) qc.setQueryData(WORKER_ME_KEY, me);
      qc.invalidateQueries({ queryKey: ['worker', 'orders', 'open'] });
      qc.invalidateQueries({ queryKey: ['worker', 'openCount'] });
    },
  });
}

export const useWorkerStats = (days = 7) =>
  useQuery({ queryKey: ['worker', 'stats', days], queryFn: () => getWorkerStats(days) });
// Tanlov o'chirilgan yoki mavjud bo'lmasa jimgina yashiriladi (xato ko'rsatilmaydi).
export const useContest = () =>
  useQuery({ queryKey: ['worker', 'contest'], queryFn: getContest, retry: false });

export const useReferral = () =>
  useQuery({ queryKey: ['worker', 'referral'], queryFn: getReferral, retry: false });
