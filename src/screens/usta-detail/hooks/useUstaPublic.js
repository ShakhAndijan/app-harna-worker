import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  getWorkerAvailability,
  getWorkerCompletedJobs,
  getWorkerReviews,
} from '../../../api/workers';

const JOBS_SIZE = 12;
const REVIEWS_SIZE = 10;

const paged = (size) => ({
  initialPageParam: 1,
  getNextPageParam: (last, all) => {
    const loaded = all.reduce((n, p) => n + p.items.length, 0);
    return last.items.length === size && loaded < (last.total || Infinity)
      ? all.length + 1
      : undefined;
  },
});

// Ustaning ommaviy ma'lumotlari: bajarilgan ishlar, sharhlar va mijoz ko'radigan band kunlar.
export default function useUstaPublic(workerId) {
  const enabled = !!workerId;

  const jobs = useInfiniteQuery({
    queryKey: ['worker', workerId, 'completed-jobs'],
    queryFn: ({ pageParam }) =>
      getWorkerCompletedJobs(workerId, { page: pageParam, size: JOBS_SIZE }),
    enabled,
    ...paged(JOBS_SIZE),
  });
  const reviews = useInfiniteQuery({
    queryKey: ['worker', workerId, 'reviews'],
    queryFn: ({ pageParam }) => getWorkerReviews(workerId, { page: pageParam, size: REVIEWS_SIZE }),
    enabled,
    ...paged(REVIEWS_SIZE),
  });
  const availability = useQuery({
    queryKey: ['worker', workerId, 'availability'],
    queryFn: () => getWorkerAvailability(workerId),
    enabled,
    staleTime: 60_000,
  });

  return {
    jobs: jobs.data?.pages.flatMap((p) => p.items) ?? [],
    jobsTotal: jobs.data?.pages[0]?.total ?? 0,
    jobsLoading: jobs.isLoading,
    jobsMore: jobs.hasNextPage ? () => jobs.fetchNextPage() : null,
    reviews: reviews.data?.pages.flatMap((p) => p.items) ?? [],
    reviewsLoading: reviews.isLoading,
    reviewsMore: reviews.hasNextPage ? () => reviews.fetchNextPage() : null,
    reviewsFetching: reviews.isFetchingNextPage,
    availability: availability.data ?? null,
  };
}
