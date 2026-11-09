import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import { Screen, Card, H, Txt, Muted, Loading, ErrorBox, Pill, Row, num, money } from '../ui';

// Profil to'ldirilganligi: saytdagi 9 ta band.
export function completenessItems(me) {
  const cats = me?.categories || [];
  return [
    ['portfolio', (me?.portfolio?.length || 0) > 0],
    ['photo', !!me?.profile_photo],
    ['bio', !!me?.bio],
    ['cats', cats.length > 0],
    ['prices', cats.length > 0 && cats.some((c) => num(c.price) > 0 || c.is_negotiable)],
    ['schedule', !!me?.schedule && (Array.isArray(me.schedule) ? me.schedule.length > 0 : true)],
    ['map', me?.latitude != null && me?.longitude != null],
    ['phone', !!me?.is_phone_verified],
    ['identity', !!me?.is_identity_verified],
  ];
}

export default function StatsScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const q = useQuery({
    queryKey: ['w', 'stats', 30],
    queryFn: () => api.getStats(30),
    retry: false,
  });
  const contest = useQuery({ queryKey: ['w', 'contest'], queryFn: api.getContestMe, retry: false });
  const d = q.data || {};
  const c = contest.data;

  return (
    <Screen
      title={t('w.more.stats')}
      onRefresh={() => {
        q.refetch();
        contest.refetch();
      }}
      refreshing={q.isRefetching}
    >
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        q.error?.code === 'pro_required' ? (
          <Card>
            <Pill label="PRO" color={theme.violet} />
            <Txt>{t('w.site.proNeeded')}</Txt>
          </Card>
        ) : (
          <ErrorBox error={q.error} onRetry={q.refetch} />
        )
      ) : (
        <>
          <Card>
            <H>{t('w.site.orders')}</H>
            <Muted>
              {t('w.site.ordersText', {
                a: num(d.orders_notified),
                b: num(d.orders_missed),
              })}
            </Muted>
            <Muted>{t('w.site.ordersOpen', { n: num(d.orders_open) })}</Muted>
          </Card>
        </>
      )}

      {c?.enabled ? (
        <Card>
          <H>{t('w.site.contest')}</H>
          <Txt>
            {c.rank != null
              ? t('w.site.contestRank', {
                  p: [c.period, c.district || c.region].filter(Boolean).join(', '),
                  r: c.rank,
                  n: c.participants,
                })
              : t('w.site.contestJobs', {
                  p: [c.period, c.district || c.region].filter(Boolean).join(', '),
                  j: c.jobs,
                  m: c.min_jobs,
                })}
          </Txt>
          <Muted>{t('w.site.contestDecided', { d: c.decided_on })}</Muted>
          <Row label="" value={c.prize ? money(c.prize, t) : ''} bold />
        </Card>
      ) : null}
    </Screen>
  );
}
