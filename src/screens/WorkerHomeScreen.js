import { useEffect, useRef } from 'react';
import {
  Share,
  Linking,
  View,
  Text,
  Image,
  Switch,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import usePullRefresh from '../hooks/usePullRefresh';
import useTabBarSpace from '../navigation/useTabBarSpace';
import { formatNumber } from '../utils/format';
import { useUnreadNotifications, useNotificationsFeed } from '../queries/notifications';
import { notificationText, notificationDetail } from './notifications/utils';
import {
  useWorkerMe,
  useWorkerBalance,
  useOpenOrders,
  useAssignedOrders,
  useSetAvailability,
  useWorkerStats,
  useContest,
  useReferral,
} from '../queries/workerHome';

const money = (v) =>
  v === null || v === undefined || v === '' ? null : formatNumber(Math.round(Number(v)));

// Usta bosh sahifasi (saytdagi usta kabineti bosh sahifasi): holat, ko'rsatkichlar, hamyon,
// buyurtmalar, ishlar va e'lonlar.
export default function WorkerHomeScreen() {
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const router = useRouter();
  const bottomSpace = useTabBarSpace(90);
  const { refreshControl } = usePullRefresh();

  const me = useWorkerMe();
  const balance = useWorkerBalance();
  const openOrders = useOpenOrders();
  const assigned = useAssignedOrders();
  const toggle = useSetAvailability();
  const stats = useWorkerStats(7);
  const contest = useContest();
  const referral = useReferral();

  const worker = me.data;
  const isOnline = worker?.availability === 'online';
  const offHours = isOnline && worker?.status?.accepting === false;

  const unread = useUnreadNotifications();
  // Buyurtma olish uchun majburiy ma'lumotlar (mijoz ilovasi qoidasi; serverda alohida tekshiruv yo'q).
  const required = [
    ['m_photo', !!worker?.profile_photo],
    ['m_bio', !!worker?.bio],
    ['m_cat', !!worker?.categories?.length],
    ['m_loc', !!worker?.district],
  ];
  const missing = required.filter((r) => !r[1]).map((r) => tr(`workerHome.${r[0]}`));
  const locked = !!worker && missing.length > 0;
  const openList = openOrders.data ?? [];
  const bestOrders = locked
    ? openList.slice(0, 10)
    : [...openList]
        .map((o) => ({ o, p: Number(o.agreed_price ?? o.offer_price ?? o.budget ?? 0) }))
        .filter((x) => x.p > 0)
        .sort((x, y) => y.p - x.p)
        .slice(0, 6)
        .map((x) => x.o);
  const feed = useNotificationsFeed();
  const recent = feed.items.slice(0, 3);
  const nextJob = (assigned.data ?? []).find((o) => ['accepted', 'active'].includes(o.status));
  const location = worker?.district || worker?.region || '';
  const holder = [worker?.first_name, worker?.last_name].filter(Boolean).join(' ').toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomSpace }}
      >
        {/* ── Sarlavha: joylashuv, bildirishnomalar, avatar ── */}
        <View style={s.header}>
          <View style={s.location}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.navigate('/profile')}
              style={s.locationRow}
            >
              <Ionicons name="location-outline" size={22} color={t.text} />
              <Text style={[s.locationTxt, { color: t.text }]} numberOfLines={1}>
                {location || tr('workerHome.setLocation')}
              </Text>
            </TouchableOpacity>
            {!!worker && (
              <View style={s.navBadges}>
                <Badge
                  icon="ribbon"
                  text={tr(`workerHome.badge_${worker.reliability_badge || 'none'}`)}
                  color={BADGE_COLOR[worker.reliability_badge || 'none']}
                />
                {!!worker.is_identity_verified && (
                  <Badge icon="shield-checkmark" text={tr('workerHome.verified')} color="#2eb872" />
                )}
                {!!worker.is_pro && (
                  <Badge icon="diamond" text={tr('workerHome.pro')} color="#7c5cff" />
                )}
                {!!worker.is_top && (
                  <Badge icon="rocket" text={tr('workerHome.top')} color={t.orange} />
                )}
              </View>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/notifications')}
            style={[s.circle, { backgroundColor: t.card2 }]}
          >
            <Ionicons name="notifications-outline" size={22} color={t.text} />
            {unread > 0 && (
              <View style={[s.badge, { backgroundColor: t.orange }]}>
                <Text style={s.badgeTxt}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.navigate('/profile')}>
            <Avatar worker={worker} t={t} />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {!isOnline && !!worker && (
            <Note icon="moon-outline" text={tr('workerHome.busySub')} t={t} />
          )}
          {offHours && <Note icon="time-outline" text={tr('workerHome.offHours')} t={t} />}

          {/* ── Profil to'liq emas: buyurtma olish yopiq ── */}
          {locked && (
            <View style={[s.gate, { backgroundColor: t.card, borderColor: t.orange }]}>
              <View style={s.row}>
                <View style={[s.gateIcon, { backgroundColor: 'rgba(232,122,69,0.16)' }]}>
                  <Ionicons name="lock-closed" size={20} color={t.orange} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: t.text,
                    fontSize: 15,
                    fontWeight: '800',
                    lineHeight: 20,
                  }}
                >
                  {tr('workerHome.gateTitle')}
                </Text>
              </View>
              <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18, marginTop: 10 }}>
                {tr('workerHome.gateText')}
              </Text>
              <View style={s.badges}>
                {missing.map((m) => (
                  <View key={m} style={[s.badgePill, { backgroundColor: 'rgba(229,72,77,0.14)' }]}>
                    <Ionicons name="close-circle" size={13} color="#e5484d" />
                    <Text style={{ color: '#e5484d', fontSize: 12, fontWeight: '800' }}>{m}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.navigate('/profile')}
                style={[s.gateBtn, { backgroundColor: t.orange }]}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {tr('workerHome.gateBtn')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Holat: Buyurtma olaman / Dam olyapman ── */}
          {!locked && (
            <View style={[s.avail, { backgroundColor: t.card, borderColor: t.border }]}>
              <View
                style={[
                  s.availIcon,
                  { backgroundColor: isOnline ? 'rgba(46,184,114,0.15)' : t.card2 },
                ]}
              >
                <Ionicons
                  name={isOnline ? 'flash' : 'moon'}
                  size={20}
                  color={isOnline ? '#2eb872' : t.muted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: '800' }}>
                  {isOnline ? tr('workerHome.online') : tr('workerHome.busy')}
                </Text>
                <Text style={{ color: t.muted, fontSize: 12, marginTop: 2, lineHeight: 16 }}>
                  {locked
                    ? tr('workerHome.lockedSub')
                    : isOnline
                      ? tr('workerHome.onlineSub')
                      : tr('workerHome.busySub')}
                </Text>
              </View>
              {toggle.isPending ? (
                <ActivityIndicator color={t.orange} />
              ) : (
                <Switch
                  value={isOnline}
                  disabled={!worker || locked}
                  onValueChange={(v) => toggle.mutate(v ? 'online' : 'busy')}
                  trackColor={{ false: t.card3, true: '#2eb872' }}
                  thumbColor="#fff"
                />
              )}
            </View>
          )}

          {/* ── Hamyon: plastik karta ── */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/wallet')}
            style={{ alignSelf: 'stretch' }}
          >
            <LinearGradient
              colors={['#2a4468', '#15263f', '#0b1626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.card}
            >
              <View style={[s.sheen, s.sheenA]} />
              <View style={[s.sheen, s.sheenB]} />
              <View style={s.rowBetween}>
                <Text style={s.cardBrand}>HARNA</Text>
                <Ionicons
                  name="wifi"
                  size={24}
                  color="rgba(255,255,255,0.75)"
                  style={{ transform: [{ rotate: '90deg' }] }}
                />
              </View>
              <View style={s.emv}>
                <View style={s.chipLineH} />
                <View style={[s.chipLineH, { top: '66%' }]} />
                <View style={s.chipLineV} />
              </View>
              <View>
                <Text style={s.cardLabel}>{tr('workerHome.balance')}</Text>
                <Text style={s.cardAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {balance.data
                    ? money(
                        Number(balance.data.wallet_balance) + Number(balance.data.bonus_balance)
                      )
                    : '—'}
                  <Text style={s.cardCur}> {tr('workerHome.som')}</Text>
                </Text>
              </View>
              <View style={s.rowBetween}>
                <Text style={s.cardHolder} numberOfLines={1}>
                  {holder || 'HARNA USTA'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Eng yaxshi / faol buyurtmalar (avtomatik karusel) ── */}
          {bestOrders.length > 0 && (
            <View>
              <SectionTitle
                title={tr(locked ? 'workerHome.activeOrders' : 'workerHome.best')}
                t={t}
              />
              <Text style={{ color: t.muted, fontSize: 12.5, marginTop: -6, marginBottom: 12 }}>
                {tr(locked ? 'workerHome.activeOrdersSub' : 'workerHome.bestSub')}
              </Text>
              <AutoCarousel>
                {bestOrders.map((o) => (
                  <BestCard
                    key={o.id}
                    order={o}
                    locked={locked}
                    onPress={() => locked && router.navigate('/profile')}
                    t={t}
                    tr={tr}
                  />
                ))}
              </AutoCarousel>
            </View>
          )}

          {!!nextJob && <NextJob order={nextJob} t={t} tr={tr} />}

          {!!worker && <PricesCard categories={worker.categories} t={t} tr={tr} router={router} />}
          {!!worker && !locked && <ScheduleCard worker={worker} t={t} tr={tr} router={router} />}

          {/* ── Barcha buyurtmalarga havola ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.navigate('/tasks')}
            style={[s.allOrders, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <Ionicons name="briefcase" size={22} color={t.orange} />
            <Text style={{ flex: 1, color: t.text, fontSize: 14.5, fontWeight: '800' }}>
              {tr('workerHome.allOrders')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={t.orange} />
          </TouchableOpacity>

          {/* ── Haftalik natijalar ── */}
          {!!stats.data && <ResultsCard stats={stats.data} t={t} tr={tr} />}

          {/* ── Oylik tanlov ── */}
          {!!contest.data?.enabled && <ContestCard c={contest.data} t={t} tr={tr} />}

          {/* ── So'nggi xabarlar ── */}
          {recent.length > 0 && (
            <View>
              <SectionTitle
                title={tr('workerHome.recent')}
                action={tr('workerHome.seeAll')}
                onAction={() => router.push('/notifications')}
                t={t}
              />
              <View
                style={[
                  s.results,
                  { backgroundColor: t.card, borderColor: t.border, paddingVertical: 6 },
                ]}
              >
                {recent.map((n, i) => (
                  <TouchableOpacity
                    key={n.id}
                    activeOpacity={0.8}
                    onPress={() => router.push('/notifications')}
                    style={[s.notifRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}
                  >
                    <View
                      style={[s.dotSmall, { backgroundColor: n.isRead ? t.faint : t.orange }]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: t.text, fontSize: 13.5, lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {notificationText(n, tr)}
                      </Text>
                      {!!notificationDetail(n) && (
                        <Text
                          style={{ color: t.muted, fontSize: 12, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {notificationDetail(n)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Bilib qo'ying (sayt faktlari) ── */}
          <SectionTitle title={tr('workerHome.factsTitle')} t={t} />
          {FACTS.map(([icon, color, n]) => (
            <View key={n} style={[s.fact, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[s.promoIcon, { backgroundColor: color + '24' }]}>
                <Ionicons name={icon} size={22} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 14.5, fontWeight: '800' }}>
                  {tr(`workerHome.f${n}t`)}
                </Text>
                <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 3, lineHeight: 18 }}>
                  {tr(`workerHome.f${n}`)}
                </Text>
              </View>
            </View>
          ))}

          {/* ── Do'stni taklif qilish ── */}
          {!!referral.data && <ReferralCard r={referral.data} t={t} tr={tr} />}

          {/* ── Yordam ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/support')}
            style={[s.support, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <View style={[s.promoIcon, { backgroundColor: 'rgba(124,92,255,0.15)' }]}>
              <Ionicons name="headset" size={22} color="#7c5cff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 14.5, fontWeight: '800' }}>
                {tr('workerHome.supportTitle')}
              </Text>
              <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 }}>
                {tr('workerHome.supportText')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Avatar({ worker, t }) {
  const initial = (worker?.first_name || '?').charAt(0).toUpperCase();
  if (worker?.profile_photo)
    return <Image source={{ uri: worker.profile_photo }} style={s.avatar} />;
  return (
    <View style={[s.avatar, s.avatarFallback, { backgroundColor: t.orange }]}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}

function Note({ icon, text, action, onAction, t }) {
  return (
    <View style={[s.note, { backgroundColor: t.card, borderColor: t.border }]}>
      <Ionicons name={icon} size={22} color={t.orange} />
      <Text style={{ flex: 1, color: t.subtext, fontSize: 13, lineHeight: 18 }}>{text}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.orange, fontWeight: '800', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FACTS = [
  ['pricetag', '#2eb872', 1],
  ['gift', '#e87a45', 2],
  ['cash', '#2eb872', 3],
  ['eye-off', '#8da0ba', 4],
  ['ribbon', '#f5b81f', 5],
  ['diamond', '#7c5cff', 6],
  ['rocket', '#e87a45', 7],
];

const BADGE_COLOR = { none: '#8da0ba', bronze: '#cd7f32', silver: '#a8b3c2', gold: '#f5b81f' };

function ResultsCard({ stats, t, tr }) {
  const days = (stats.views_by_day ?? []).slice(-7);
  const max = Math.max(1, ...days.map((d) => d.views));
  return (
    <View>
      <SectionTitle title={tr('workerHome.results')} t={t} />
      <View style={[s.results, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={s.rowBetween}>
          <View>
            <Text style={{ color: t.text, fontSize: 30, fontWeight: '800' }}>{stats.views_7d}</Text>
            <Text style={{ color: t.muted, fontSize: 12.5 }}>
              {tr('workerHome.views')} · {tr('workerHome.viewsSub')}
            </Text>
          </View>
          <View style={s.bars}>
            {days.map((d) => (
              <View
                key={d.day}
                style={[
                  s.bar7,
                  {
                    height: 6 + (d.views / max) * 40,
                    backgroundColor: t.orange,
                    opacity: d.views ? 1 : 0.3,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={s.resRow}>
          <ResItem value={stats.offers_sent} label={tr('workerHome.offersSent')} t={t} />
          <ResItem value={stats.offers_chosen} label={tr('workerHome.offersChosen')} t={t} />
          <ResItem value={stats.orders_missed} label={tr('workerHome.missed')} t={t} />
        </View>
      </View>
    </View>
  );
}

function ResItem({ value, label, t }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: t.muted, fontSize: 11.5, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ContestCard({ c, t, tr }) {
  const pct = Math.min(100, Math.round((c.jobs / Math.max(1, c.min_jobs)) * 100));
  return (
    <View>
      <SectionTitle title={tr('workerHome.contest')} t={t} />
      <View style={[s.results, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={s.rowBetween}>
          <View style={[s.row, { flex: 1 }]}>
            <Ionicons name="trophy" size={26} color="#f5b81f" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 15, fontWeight: '800' }}>
                {c.rank
                  ? tr('workerHome.contestRank', { r: c.rank, n: c.participants })
                  : tr('workerHome.contestJobs', { j: c.jobs, m: c.min_jobs })}
              </Text>
              <Text style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
                {tr('workerHome.contestDecided', { d: c.decided_on })}
              </Text>
            </View>
          </View>
          {!!c.prize && (
            <Text style={{ color: t.orange, fontSize: 14, fontWeight: '800' }}>
              {money(c.prize)} {tr('workerHome.som')}
            </Text>
          )}
        </View>
        <View style={[s.bar, { backgroundColor: t.card3 }]}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: '#f5b81f' }]} />
        </View>
        <Text style={{ color: t.muted, fontSize: 12, marginTop: 6 }}>
          {tr('workerHome.contestJobs', { j: c.jobs, m: c.min_jobs })}
        </Text>
      </View>
    </View>
  );
}

// Kartalar o'zi suriladi (3,5 soniyada bittadan); foydalanuvchi tortsa vaqtincha to'xtaydi.
const CARD_STEP = 230 + 12;
function AutoCarousel({ children }) {
  const ref = useRef(null);
  const index = useRef(0);
  const paused = useRef(false);
  const count = Array.isArray(children) ? children.length : 1;

  useEffect(() => {
    if (count < 2) return undefined;
    const id = setInterval(() => {
      if (paused.current) return;
      index.current = (index.current + 1) % count;
      ref.current?.scrollTo({ x: index.current * CARD_STEP, animated: true });
    }, 3500);
    return () => clearInterval(id);
  }, [count]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_STEP}
      decelerationRate="fast"
      onScrollBeginDrag={() => {
        paused.current = true;
      }}
      onMomentumScrollEnd={(e) => {
        index.current = Math.round(e.nativeEvent.contentOffset.x / CARD_STEP);
        paused.current = false;
      }}
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
      style={{ marginHorizontal: -20, paddingLeft: 20 }}
    >
      {children}
    </ScrollView>
  );
}

function BestCard({ order, locked, onPress, t, tr }) {
  const urgent = order.timing_kind === 'urgent';
  const price = money(order.agreed_price ?? order.offer_price ?? order.budget);
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[s.best, { backgroundColor: t.card, borderColor: t.border }]}
    >
      <View style={s.rowBetween}>
        {urgent ? (
          <View style={[s.chip, { backgroundColor: 'rgba(229,72,77,0.14)' }]}>
            <Ionicons name="flash" size={12} color="#e5484d" />
            <Text style={{ color: '#e5484d', fontSize: 11.5, fontWeight: '800' }}>
              {tr('workerHome.urgent')}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Ionicons name={locked ? 'lock-closed' : 'trending-up'} size={16} color={t.orange} />
      </View>
      <Text
        style={{ color: t.orange, fontSize: price ? 22 : 16, fontWeight: '800', marginTop: 10 }}
      >
        {price ? price : tr('workerHome.noPrice')}
        {!!price && (
          <Text style={{ fontSize: 13, fontWeight: '700' }}> {tr('workerHome.som')}</Text>
        )}
      </Text>
      <Text
        style={{ color: t.text, fontSize: 14, fontWeight: '700', marginTop: 6 }}
        numberOfLines={2}
      >
        {order.task_names?.join(', ') || order.description}
      </Text>
      <View style={[s.row, { marginTop: 10, gap: 4 }]}>
        <Ionicons name="location-outline" size={14} color={t.muted} />
        <Text style={{ color: t.muted, fontSize: 12, flex: 1 }} numberOfLines={1}>
          {order.district || order.region || '—'}
        </Text>
      </View>
      {locked && (
        <Text style={{ color: t.muted, fontSize: 11, marginTop: 8, lineHeight: 15 }}>
          {tr('workerHome.bestLock')}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function ReferralCard({ r, t, tr }) {
  const you = money(r.inviter_bonus) ?? '—';
  const friend = money(r.invitee_bonus) ?? '—';
  const share = () =>
    Share.share({ message: tr('workerHome.refMsg', { code: r.code }) }).catch(() => {});
  const steps = [
    ['paper-plane', tr('workerHome.refStep1'), null],
    ['person-add', tr('workerHome.refStep2'), tr('workerHome.refGets', { n: friend })],
    ['trophy', tr('workerHome.refStep3'), tr('workerHome.refYouGet', { n: you })],
  ];
  return (
    <LinearGradient
      colors={['#25405f', '#12223a', '#0b1626']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.ref}
    >
      <View style={s.refGlow} />

      {/* Sarlavha va sovrin */}
      <View style={s.refTop}>
        <View style={s.refGift}>
          <Ionicons name="gift" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
            {tr('workerHome.refTitle')}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            {tr('workerHome.refReward')}
          </Text>
        </View>
        <Text style={s.refAmount}>
          {you}
          <Text style={{ fontSize: 12, fontWeight: '700' }}> {tr('workerHome.som')}</Text>
        </Text>
      </View>

      {/* Qadamlar */}
      <View style={s.refSteps}>
        {steps.map(([icon, title, reward], i) => (
          <View key={title} style={s.refStep}>
            <View style={s.refStepIcon}>
              <Ionicons name={icon} size={18} color="#fff" />
              <View style={s.refStepNum}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{i + 1}</Text>
              </View>
            </View>
            <Text style={s.refStepTxt} numberOfLines={2}>
              {title}
            </Text>
            {!!reward && <Text style={s.refStepReward}>{reward}</Text>}
          </View>
        ))}
      </View>

      {/* Kod "chipta" */}
      <View style={s.refTicket}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 1 }}>
            {tr('workerHome.refCode').toUpperCase()}
          </Text>
          <Text style={s.refCodeTxt}>{r.code}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={share} style={s.refBtn}>
          <Ionicons name="share-social" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>
            {tr('workerHome.refShare')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Natijalar */}
      <View style={s.refStats}>
        <RefStat value={r.invited} label={tr('workerHome.refInvited')} />
        <View style={s.refSep} />
        <RefStat value={r.rewarded} label={tr('workerHome.refRewarded')} />
        <View style={s.refSep} />
        <RefStat value={money(r.earned) ?? 0} label={tr('workerHome.refEarned')} />
      </View>
    </LinearGradient>
  );
}

function RefStat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{value}</Text>
      <Text
        style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function NextJob({ order, t, tr }) {
  const phone = order.contact_phone;
  const hasGps = order.gps_lat && order.gps_lng;
  const when =
    order.timing_kind === 'on_date' && order.scheduled_date
      ? order.scheduled_date
      : order.timing_kind === 'urgent'
        ? tr('workerHome.urgent')
        : order.timing_kind === 'today'
          ? tr('workerHome.today')
          : tr('workerHome.flexible');
  return (
    <View style={[s.next, { backgroundColor: t.card, borderColor: t.orange }]}>
      <View style={s.rowBetween}>
        <Text style={{ color: t.orange, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
          {tr('workerHome.todayJob').toUpperCase()}
        </Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>
          #{order.code} · {when}
        </Text>
      </View>
      <Text
        style={{ color: t.text, fontSize: 16, fontWeight: '800', marginTop: 8 }}
        numberOfLines={2}
      >
        {order.task_names?.join(', ') || order.description}
      </Text>
      <Text style={{ color: t.muted, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
        {[order.customer_name, order.district].filter(Boolean).join(' · ')}
      </Text>
      {(!!phone || !!hasGps) && (
        <View style={[s.row, { marginTop: 14 }]}>
          {!!phone && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Linking.openURL(`tel:${phone}`)}
              style={[s.actBtn, { backgroundColor: t.orange }]}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                {tr('workerHome.call')}
              </Text>
            </TouchableOpacity>
          )}
          {!!hasGps && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${order.gps_lat},${order.gps_lng}`
                )
              }
              style={[s.actBtn, { backgroundColor: t.card2 }]}
            >
              <Ionicons name="navigate" size={16} color={t.text} />
              <Text style={{ color: t.text, fontWeight: '800', fontSize: 13 }}>
                {tr('workerHome.route')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function PricesCard({ categories, t, tr, router }) {
  const list = (categories ?? []).slice(0, 4);
  if (!list.length) return null;
  return (
    <View>
      <SectionTitle
        title={tr('workerHome.prices')}
        action={tr('workerHome.seeAll')}
        onAction={() => router.navigate('/profile')}
        t={t}
      />
      <View
        style={[s.results, { backgroundColor: t.card, borderColor: t.border, paddingVertical: 6 }]}
      >
        {list.map((c, i) => {
          const value = c.price ?? c.min_price;
          return (
            <View
              key={c.id}
              style={[s.notifRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}
            >
              <Text
                style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: '600' }}
                numberOfLines={1}
              >
                {c.category?.name}
              </Text>
              <Text
                style={{ color: value ? t.orange : t.muted, fontSize: 13.5, fontWeight: '800' }}
              >
                {value
                  ? `${c.price ? '' : tr('workerHome.from') + ' '}${money(value)} ${tr('workerHome.som')}`
                  : tr('workerHome.negotiable')}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ScheduleCard({ worker, t, tr, router }) {
  const days = worker.schedule?.working_days ?? [];
  const accepting = worker.status?.accepting;
  return (
    <View>
      <SectionTitle title={tr('workerHome.schedule')} t={t} />
      <View style={[s.results, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={s.row}>
          <View
            style={[s.dotSmall, { backgroundColor: accepting === false ? t.faint : '#2eb872' }]}
          />
          <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>
            {accepting === false ? tr('workerHome.notAcceptingNow') : tr('workerHome.acceptingNow')}
          </Text>
        </View>
        {days.length === 0 ? (
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 8 }}>
            {tr('workerHome.noSchedule')}
          </Text>
        ) : (
          <View style={s.badges}>
            {days.map((d) => (
              <View key={d.id} style={[s.dayChip, { backgroundColor: t.card2 }]}>
                <Text style={{ color: t.text, fontSize: 12, fontWeight: '800' }}>{d.name}</Text>
                <Text style={{ color: t.muted, fontSize: 11 }}>
                  {d.work_start && d.work_end
                    ? `${d.work_start.slice(0, 5)}–${d.work_end.slice(0, 5)}`
                    : '24/7'}
                </Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.navigate('/profile')}
          style={[s.schedBtn, { borderColor: t.orange }]}
        >
          <Ionicons
            name={days.length ? 'create-outline' : 'add-circle-outline'}
            size={18}
            color={t.orange}
          />
          <Text style={{ color: t.orange, fontWeight: '800', fontSize: 13.5 }}>
            {days.length ? tr('workerHome.scheduleEdit') : tr('workerHome.scheduleAdd')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Badge({ icon, text, color }) {
  return (
    <View style={[s.badgePill, { backgroundColor: color + '24' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onAction, t }) {
  return (
    <View style={[s.rowBetween, { marginTop: 28, marginBottom: 12 }]}>
      <Text style={{ color: t.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.orange, fontWeight: '700', fontSize: 13 }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  allOrders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
  },
  ref: {
    marginTop: 28,
    padding: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  refGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -90,
    right: -70,
    backgroundColor: 'rgba(232,122,69,0.22)',
  },
  refTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refGift: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e87a45',
  },
  refAmount: { color: '#f5b81f', fontSize: 22, fontWeight: '900' },
  refSteps: { flexDirection: 'row', gap: 10, marginTop: 20 },
  refStep: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refStepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  refStepNum: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e87a45',
  },
  refStepTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    minHeight: 28,
  },
  refStepReward: {
    color: '#f5b81f',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  refTicket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  refCodeTxt: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 3, marginTop: 2 },
  refBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e87a45',
  },
  refStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  refSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },
  support: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
  },
  gate: { marginTop: 4, padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 12 },
  gateIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  best: { width: 230, padding: 14, borderRadius: 18, borderWidth: 1 },
  schedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  next: { marginTop: 12, padding: 16, borderRadius: 18, borderWidth: 1.5 },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  dotSmall: { width: 8, height: 8, borderRadius: 4 },
  fact: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  dayChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  results: { padding: 16, borderRadius: 18, borderWidth: 1 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 48 },
  bar7: { width: 8, borderRadius: 4 },
  resRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127,127,127,0.2)',
  },
  avail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },
  availIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: { marginTop: 12, padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bar: { height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  promoIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  location: { flex: 1, gap: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 2 },
  locationTxt: { flexShrink: 1, fontSize: 19, fontWeight: '800' },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  card: {
    width: '100%',
    aspectRatio: 1.7,
    borderRadius: 22,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 12,
  },
  sheen: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  sheenA: { width: 260, height: 260, top: -120, right: -80 },
  sheenB: {
    width: 200,
    height: 200,
    bottom: -110,
    left: -60,
    backgroundColor: 'rgba(232,122,69,0.12)',
  },
  cardBrand: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 3 },
  emv: {
    width: 44,
    height: 33,
    borderRadius: 7,
    backgroundColor: '#e3c16f',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  chipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  chipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 2 },
  cardCur: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  cardHolder: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 14, marginBottom: 14 },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  order: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
