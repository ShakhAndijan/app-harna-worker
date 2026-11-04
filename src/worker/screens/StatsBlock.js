import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import {
  Screen,
  Card,
  H,
  Txt,
  Muted,
  Segments,
  Loading,
  ErrorBox,
  Pill,
  Row,
  num,
  money,
} from '../ui';

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

const STAT_CARDS = [
  ['views', null, 'eye-outline'],
  ['offersSent', 'offers_sent', 'send-outline'],
  ['offersChosen', 'offers_chosen', 'checkmark-done-outline'],
  ['jobsDone', 'jobs_completed', 'briefcase-outline'],
];

export default function StatsScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ['w', 'stats', days],
    queryFn: () => api.getStats(days),
    retry: false,
  });
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const contest = useQuery({ queryKey: ['w', 'contest'], queryFn: api.getContestMe, retry: false });
  const d = q.data || {};
  const items = completenessItems(me.data);
  const done = items.filter((x) => x[1]).length;
  const c = contest.data;

  return (
    <Screen
      title={t('w.more.stats')}
      onRefresh={() => {
        q.refetch();
        me.refetch();
        contest.refetch();
      }}
      refreshing={q.isRefetching}
    >
      {me.data ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H>{t('w.site.completeness')}</H>
            <Txt style={{ fontWeight: '800' }}>
              {done}/{items.length}
            </Txt>
          </View>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${(done / items.length) * 100}%`,
                height: 8,
                backgroundColor: theme.orange,
              }}
            />
          </View>
          {items.map(([k, ok]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons
                name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={ok ? theme.green : theme.faint}
              />
              <Txt style={{ fontSize: 14 }}>{t(`w.site.c_${k}`)}</Txt>
            </View>
          ))}
        </Card>
      ) : null}

      <Segments
        value={days}
        onChange={setDays}
        options={[30, 90].map((n) => ({ value: n, label: t('w.more.days', { n }) }))}
      />
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {STAT_CARDS.map(([label, key, icon]) => {
              const value = key ? d[key] : d.views_30d;
              return (
                <Card key={label} style={{ width: '48%', flexGrow: 1 }}>
                  <Ionicons name={icon} size={22} color={theme.orange} />
                  <Txt style={{ fontSize: 24, fontWeight: '800' }}>{num(value)}</Txt>
                  <Muted>{t(`w.more.${label}`)}</Muted>
                </Card>
              );
            })}
          </View>
          {num(d.offers_sent) > 0 ? (
            <Muted>
              {t('w.site.chosen', { n: num(d.offers_chosen) })} ·{' '}
              {Math.round((num(d.offers_chosen) / num(d.offers_sent)) * 100)}%
            </Muted>
          ) : null}
          <Muted>
            {t('w.site.views7')}: {num(d.views_7d)}
          </Muted>
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
