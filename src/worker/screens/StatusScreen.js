import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import { Screen, Card, H, Txt, Muted, Pill, Loading, ErrorBox, num } from '../ui';

const ORDER = ['bronze', 'silver', 'gold'];

// Usta statusi (Bronza / Kumush / Oltin): talablar `/badges/levels` dan, joriy ko'rsatkichlar `/workers/me` dan.
export default function StatusScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const levels = useQuery({ queryKey: ['w', 'levels'], queryFn: api.getBadgeLevels });

  if (me.isPending || levels.isPending || me.isError || levels.isError) {
    const err = me.error || levels.error;
    return (
      <Screen title={t('w.site.status')}>
        {err ? (
          <ErrorBox
            error={err}
            onRetry={() => {
              me.refetch();
              levels.refetch();
            }}
          />
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  const w = me.data;
  const bars = levels.data?.worker || {};
  const current = w.reliability_badge || 'none';
  const nextName = ORDER[ORDER.indexOf(current) + 1];
  const next = nextName ? bars[nextName] : null;
  const jobs = num(w.completed_jobs_count);
  const rating = num(w.overall_rating);
  const color = { none: theme.faint, bronze: '#cd7f32', silver: '#9aa5b1', gold: '#e6b422' };

  return (
    <Screen title={t('w.site.status')}>
      <Card>
        <Muted>{t('w.site.current')}</Muted>
        <Pill label={t(`w.site.badge_${current}`)} color={color[current]} />
        <Muted>{t('w.site.statusHint')}</Muted>
        {next ? (
          <>
            <Txt style={{ fontWeight: '700' }}>
              {t('w.site.toNext', {
                name: t(`w.site.badge_${nextName}`),
                n: Math.max(0, num(next.min_jobs) - jobs),
              })}
            </Txt>
            <Muted>
              {t('w.site.completedJobs')}: {jobs} / {next.min_jobs}
            </Muted>
            <Muted>
              {t('w.site.rating')}: {rating.toFixed(1)} / {next.min_rating}
              {rating >= num(next.min_rating) ? ' ✓' : ''}
            </Muted>
          </>
        ) : null}
      </Card>
      {[...ORDER].reverse().map((k) =>
        bars[k] ? (
          <Card key={k} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <H style={{ flex: 1 }}>{t(`w.site.badge_${k}`)}</H>
              {current === k ? <Pill label={t('w.site.current')} color={color[k]} /> : null}
            </View>
            <Muted>{t('w.site.reqJobs', { n: bars[k].min_jobs })}</Muted>
            <Muted>{t('w.site.reqCancel', { n: bars[k].max_cancel_pct })}</Muted>
            <Muted>{t('w.site.reqRating', { n: bars[k].min_rating })}</Muted>
          </Card>
        ) : null
      )}
      <Winners region={w.region} />
    </Screen>
  );
}

// "Oy ustalari": oxirgi hal qilingan oyning tuman g'oliblari.
function Winners({ region }) {
  const { t } = useLanguage();
  const q = useQuery({
    queryKey: ['w', 'winners', region],
    queryFn: () => api.getContestWinners(region || undefined),
    retry: false,
  });
  const list = q.data?.winners || [];
  if (!list.length) return null;
  return (
    <Card>
      <H>{t('w.site.winners')}</H>
      <Muted>{q.data?.period}</Muted>
      {list.map((x, i) => (
        <View key={i} style={{ gap: 2 }}>
          <Txt style={{ fontWeight: '700' }}>
            {[x.worker?.first_name, x.worker?.last_name].filter(Boolean).join(' ')}
          </Txt>
          <Muted>{t('w.site.winnerLine', { d: x.district, j: x.jobs })}</Muted>
        </View>
      ))}
    </Card>
  );
}
