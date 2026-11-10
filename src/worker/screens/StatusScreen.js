import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import { Screen, H, Txt, Muted, Loading, ErrorBox, num } from '../ui';

const ORDER = ['bronze', 'silver', 'gold'];
const COLORS = { none: '#9aa0a6', bronze: '#cd7f32', silver: '#9aa5b1', gold: '#e6b422' };

// Yumaloq medal: daraja rangida, ichida medal belgisi.
function Medal({ color, size = 54, icon = 'medal' }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.55)',
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color="#fff" />
    </View>
  );
}

// Progress chizig'i: yozuv, joriy/maqsad qiymat va to'ldirilgan chiziq.
function Bar({ icon, label, value, target, color, done }) {
  const { theme } = useTheme();
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 100;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={16} color={color} />
        <Txt style={{ flex: 1, fontSize: 13.5, fontWeight: '700' }}>{label}</Txt>
        <Txt style={{ fontSize: 13.5, fontWeight: '900', color: done ? theme.green : theme.text }}>
          {value} / {target}
          {done ? ' ✓' : ''}
        </Txt>
      </View>
      <View
        style={{ height: 8, borderRadius: 4, backgroundColor: theme.border, overflow: 'hidden' }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: 8,
            borderRadius: 4,
            backgroundColor: done ? theme.green : color,
          }}
        />
      </View>
    </View>
  );
}

// Talab qatori: ikon va matn.
function Req({ icon, text, ok }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons
        name={ok ? 'checkmark-circle' : icon}
        size={16}
        color={ok ? theme.green : theme.muted}
      />
      <Muted style={{ flex: 1, fontSize: 13 }}>{text}</Muted>
    </View>
  );
}

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
  const curIdx = ORDER.indexOf(current);
  const nextName = ORDER[curIdx + 1];
  const next = nextName ? bars[nextName] : null;
  const jobs = num(w.completed_jobs_count);
  const rating = num(w.overall_rating);
  const accent = COLORS[current];

  return (
    <Screen title={t('w.site.status')}>
      {/* Joriy daraja */}
      <View
        style={{
          padding: 18,
          borderRadius: 26,
          gap: 16,
          overflow: 'hidden',
          backgroundColor: accent + '1C',
          borderWidth: 1,
          borderColor: accent + '66',
        }}
      >
        <View
          style={{
            position: 'absolute',
            right: -35,
            top: -35,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: accent + '22',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Medal color={accent} size={64} icon={current === 'none' ? 'ribbon-outline' : 'medal'} />
          <View style={{ flex: 1, gap: 2 }}>
            <Muted style={{ fontSize: 12.5 }}>{t('w.site.current')}</Muted>
            <Txt style={{ fontSize: 24, fontWeight: '900' }}>{t(`w.site.badge_${current}`)}</Txt>
          </View>
        </View>
        <Muted style={{ fontSize: 13, lineHeight: 19 }}>{t('w.site.statusHint')}</Muted>
        {next ? (
          <View style={{ gap: 12 }}>
            <Txt style={{ fontWeight: '800', fontSize: 14.5 }}>
              {t('w.site.toNext', {
                name: t(`w.site.badge_${nextName}`),
                n: Math.max(0, num(next.min_jobs) - jobs),
              })}
            </Txt>
            <Bar
              icon="briefcase"
              label={t('w.site.completedJobs')}
              value={jobs}
              target={num(next.min_jobs)}
              color={COLORS[nextName]}
              done={jobs >= num(next.min_jobs)}
            />
            <Bar
              icon="star"
              label={t('w.site.rating')}
              value={Number(rating.toFixed(1))}
              target={num(next.min_rating)}
              color={COLORS[nextName]}
              done={rating >= num(next.min_rating)}
            />
          </View>
        ) : null}
      </View>

      {/* Darajalar zinapoyasi */}
      {[...ORDER].reverse().map((k) => {
        if (!bars[k]) return null;
        const isCur = current === k;
        const reached = ORDER.indexOf(k) <= curIdx;
        return (
          <View
            key={k}
            style={{
              padding: 14,
              borderRadius: 22,
              gap: 12,
              backgroundColor: theme.card,
              borderWidth: isCur ? 2 : 1,
              borderColor: isCur ? COLORS[k] : theme.border,
              opacity: reached || isCur ? 1 : 0.92,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Medal color={COLORS[k]} size={42} />
              <H style={{ flex: 1 }}>{t(`w.site.badge_${k}`)}</H>
              {isCur ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 11,
                    backgroundColor: COLORS[k] + '26',
                  }}
                >
                  <Txt style={{ fontSize: 12, fontWeight: '900', color: COLORS[k] }}>
                    {t('w.site.current')}
                  </Txt>
                </View>
              ) : reached ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.green} />
              ) : (
                <Ionicons name="lock-closed-outline" size={20} color={theme.faint} />
              )}
            </View>
            <View style={{ gap: 7 }}>
              <Req icon="briefcase-outline" text={t('w.site.reqJobs', { n: bars[k].min_jobs })} />
              <Req
                icon="close-circle-outline"
                text={t('w.site.reqCancel', { n: bars[k].max_cancel_pct })}
              />
              <Req icon="star-outline" text={t('w.site.reqRating', { n: bars[k].min_rating })} />
            </View>
          </View>
        );
      })}
      <Winners region={w.region} />
    </Screen>
  );
}

// "Oy ustalari": oxirgi hal qilingan oyning tuman g'oliblari.
function Winners({ region }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const q = useQuery({
    queryKey: ['w', 'winners', region],
    queryFn: () => api.getContestWinners(region || undefined),
    retry: false,
  });
  const list = q.data?.winners || [];
  if (!list.length) return null;
  return (
    <View
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.gold + '26',
          }}
        >
          <Ionicons name="trophy" size={21} color={theme.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <H>{t('w.site.winners')}</H>
          {q.data?.period ? <Muted style={{ fontSize: 12.5 }}>{q.data.period}</Muted> : null}
        </View>
      </View>
      {list.map((x, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.orange + '1F',
            }}
          >
            <Txt style={{ fontSize: 13, fontWeight: '900', color: theme.orange }}>{i + 1}</Txt>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt style={{ fontWeight: '800', fontSize: 14.5 }} numberOfLines={1}>
              {[x.worker?.first_name, x.worker?.last_name].filter(Boolean).join(' ')}
            </Txt>
            <Muted style={{ fontSize: 12.5 }}>
              {t('w.site.winnerLine', { d: x.district, j: x.jobs })}
            </Muted>
          </View>
        </View>
      ))}
    </View>
  );
}
