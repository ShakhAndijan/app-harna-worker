import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Screen, Card, Loading, ErrorBox, SegmentedTabs } from '../worker/ui';
import { useWorkerStats, useWorkerMe, useContest } from '../queries/workerHome';
import { formatNumber } from '../utils/format';

const TEXTS = {
  uz: {
    title: "Ko'rsatkichlar",
    d7: '7 kun',
    d30: '30 kun',
    views: "Profil ko'rishlari",
    offers: 'Yuborilgan takliflar',
    chosen: 'Sizni tanlashdi',
    jobs: 'Bajarilgan ishlar',
    notified: 'Sizga yuborilgan buyurtmalar',
    missed: "O'tkazib yuborilgan",
    open: 'Hozir ochiq',
    contest: 'Oy tanlovi',
    rank: "{r}-o'rin ({n} ishtirokchidan)",
    contestJobs: '{j} / {m} ish',
    decided: 'Natija: {d}',
    byDay: "Kunlar bo'yicha ko'rishlar",
    proNeeded: "Statistika faqat PRO obunada ko'rinadi",
    som: "so'm",
  },
  ru: {
    title: 'Показатели',
    d7: '7 дней',
    d30: '30 дней',
    views: 'Просмотры профиля',
    offers: 'Отправлено предложений',
    chosen: 'Вас выбрали',
    jobs: 'Выполнено работ',
    notified: 'Заказов отправлено вам',
    missed: 'Пропущено',
    open: 'Сейчас открыто',
    contest: 'Конкурс месяца',
    rank: '{r}-е место (из {n})',
    contestJobs: '{j} / {m} работ',
    decided: 'Итоги: {d}',
    byDay: 'Просмотры по дням',
    proNeeded: 'Статистика доступна только с PRO',
    som: 'сум',
  },
  en: {
    title: 'Insights',
    d7: '7 days',
    d30: '30 days',
    views: 'Profile views',
    offers: 'Offers sent',
    chosen: 'Chose you',
    jobs: 'Jobs completed',
    notified: 'Orders sent to you',
    missed: 'Missed',
    open: 'Open now',
    contest: 'Contest of the month',
    rank: 'Rank {r} of {n}',
    contestJobs: '{j} / {m} jobs',
    decided: 'Results: {d}',
    byDay: 'Views by day',
    proNeeded: 'Statistics are available with PRO only',
    som: 'UZS',
  },
};

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const n = (v) => formatNumber(Math.round(Number(v) || 0));

function Tile({ icon, color, value, label, t }) {
  return (
    <View style={[s.tile, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[s.tileIcon, { backgroundColor: `${color}24` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '800', marginTop: 10 }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 12, marginTop: 2, lineHeight: 16 }}>{label}</Text>
    </View>
  );
}

// Usta ko'rsatkichlari: ko'rishlar (7/30 kun), takliflar, bajarilgan ishlar, kelgan buyurtmalar, oy tanlovi.
export default function WorkerStatsScreen() {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const [days, setDays] = useState(30);
  const q = useWorkerStats(30);
  const me = useWorkerMe();
  const contest = useContest();
  const d = q.data;
  const c = contest.data;

  // Kunlik ko'rishlar: tanlangan davr bo'yicha yig'indi va diagramma.
  const perDay = (d?.views_by_day ?? []).slice(-days);
  const views = perDay.reduce((sum, r) => sum + (Number(r.views) || 0), 0);
  const shown = perDay.slice(-14);
  const max = Math.max(1, ...shown.map((r) => Number(r.views) || 0));
  const pct = c ? Math.min(100, Math.round((c.jobs / Math.max(1, c.min_jobs)) * 100)) : 0;

  return (
    <Screen
      title={x.title}
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
            <Text style={{ color: t.text, fontWeight: '700' }}>{x.proNeeded}</Text>
          </Card>
        ) : (
          <ErrorBox error={q.error} onRetry={q.refetch} />
        )
      ) : (
        <>
          <SegmentedTabs
            options={[
              { value: 7, label: x.d7 },
              { value: 30, label: x.d30 },
            ]}
            value={days}
            onChange={setDays}
          />

          <View style={s.grid}>
            <Tile
              icon="eye"
              color="#3b82f6"
              value={n(views)}
              label={`${x.views} · ${days === 7 ? x.d7 : x.d30}`}
              t={t}
            />
            <Tile
              icon="paper-plane"
              color={t.orange}
              value={n(d.offers_sent)}
              label={x.offers}
              t={t}
            />
            <Tile
              icon="checkmark-done"
              color="#2eb872"
              value={n(me.data?.completed_jobs_count)}
              label={x.jobs}
              t={t}
            />
            <Tile
              icon="notifications"
              color="#7c5cff"
              value={n(d.orders_notified)}
              label={x.notified}
              t={t}
            />
            <Tile icon="ribbon" color="#f5b81f" value={n(d.offers_chosen)} label={x.chosen} t={t} />
            <Tile icon="time" color="#e5484d" value={n(d.orders_missed)} label={x.missed} t={t} />
          </View>

          {!!shown.length && (
            <Card>
              <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                {x.byDay.toUpperCase()}
              </Text>
              <View style={s.bars}>
                {shown.map((r) => (
                  <View key={r.day} style={s.barCol}>
                    <View
                      style={{
                        width: '100%',
                        height: 4 + ((Number(r.views) || 0) / max) * 70,
                        borderRadius: 4,
                        backgroundColor: t.orange,
                        opacity: r.views ? 1 : 0.25,
                      }}
                    />
                  </View>
                ))}
              </View>
              {d.orders_open != null && (
                <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 10 }}>
                  {x.open}: {n(d.orders_open)}
                </Text>
              )}
            </Card>
          )}

          {!!c?.enabled && (
            <Card>
              <View style={s.rowC}>
                <Ionicons name="trophy" size={26} color="#f5b81f" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>
                    {x.contest.toUpperCase()}
                    {c.period ? ` · ${c.period}` : ''}
                  </Text>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                    {c.rank != null
                      ? fill(x.rank, { r: c.rank, n: c.participants })
                      : fill(x.contestJobs, { j: c.jobs, m: c.min_jobs })}
                  </Text>
                </View>
                {!!c.prize && (
                  <Text style={{ color: t.orange, fontWeight: '800' }}>
                    {n(c.prize)} {x.som}
                  </Text>
                )}
              </View>
              <View style={[s.track, { backgroundColor: t.card2 }]}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#f5b81f' }} />
              </View>
              {!!c.decided_on && (
                <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>
                  {fill(x.decided, { d: c.decided_on })}
                </Text>
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', padding: 14, borderRadius: 18, borderWidth: 1 },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80, marginTop: 12 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  rowC: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
});
