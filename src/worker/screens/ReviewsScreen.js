import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import { Screen, Card, Muted, Txt, Loading, ErrorBox, Empty, fmtDate } from '../ui';

export default function ReviewsScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const q = useQuery({
    queryKey: ['w', 'reviews', me.data?.id],
    queryFn: () => api.getMyReviews(me.data.id, 30),
    enabled: !!me.data?.id,
  });
  const items = q.data?.items ?? [];

  return (
    <Screen title={t('w.profile.reviews')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {me.isPending || q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <Empty icon="star-outline" text={t('w.reviews.empty')} />
      ) : (
        items.map((r, i) => (
          <Card key={i}>
            <Txt style={{ color: theme.gold, fontWeight: '800' }}>
              {'★'.repeat(r.rating)}
              {'☆'.repeat(Math.max(0, 5 - r.rating))}
            </Txt>
            {r.comment ? <Txt>{r.comment}</Txt> : null}
            <Muted>
              {r.customer?.full_name || ''} · {fmtDate(r.created_at, language)}
            </Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}
