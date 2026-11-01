import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useUnreadNotifications } from '../../queries/notifications';
import Avatar from '../../components/Avatar';
import * as api from '../api';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import { OrderCard } from '../components';
import { Muted, Segments, Loading, ErrorBox, money, num, fmtDate } from '../ui';

const HEARTBEAT_MS = 4 * 60 * 1000;
const GRADIENT = ['#f28d56', '#e87a45', '#c9552a'];

function greetingKey(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 23) return 'evening';
  return 'night';
}

function SectionHeader({ title, actionLabel, onActionPress }) {
  const { theme } = useTheme();
  return (
    <View style={s.sectionRow}>
      <Text style={[s.sectionTitle, { color: theme.text }]}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress} accessibilityRole="button">
          <Text style={[s.sectionAction, { color: theme.orange }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// Usta bosh sahifasi: mijoz ilovasidagi kabi gradientli sarlavha va hamyon kartasi, lekin
// ustaning ishiga mos bo'limlar bilan (holat, yangi buyurtmalar, faol ishlar, statistika).
export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const unread = useUnreadNotifications(true);

  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const status = useQuery({ queryKey: ['w', 'status'], queryFn: api.getStatus });
  const open = useQuery({
    queryKey: ['w', 'openCount'],
    queryFn: api.getOpenCount,
    refetchInterval: 60 * 1000,
  });
  const fresh = useQuery({
    queryKey: ['w', 'orders', 'open', 'home'],
    queryFn: () => api.getOrders({ scope: 'open', limit: 3 }),
  });
  const balance = useQuery({ queryKey: ['w', 'balance'], queryFn: api.getBalance });
  const stats = useQuery({ queryKey: ['w', 'stats', 30], queryFn: () => api.getStats(30) });
  const active = useQuery({
    queryKey: ['w', 'orders', 'assigned', 'active'],
    queryFn: () => api.getOrders({ scope: 'assigned', status: 'active', limit: 5 }),
  });
  const negotiating = useQuery({
    queryKey: ['w', 'orders', 'assigned', 'accepted'],
    queryFn: () => api.getOrders({ scope: 'assigned', status: 'accepted', limit: 5 }),
  });

  // Ilova ochiq turganda usta onlayn deb hisoblanadi (saytdagi kabi "yurak urishi").
  useEffect(() => {
    api.heartbeat().catch(() => {});
    const id = setInterval(() => api.heartbeat().catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  const toggle = useMutation({
    mutationFn: (availability) => api.setAvailability({ availability }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w', 'me'] });
      qc.invalidateQueries({ queryKey: ['w', 'status'] });
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.loadFailed')),
  });

  const refreshAll = () => qc.invalidateQueries({ queryKey: ['w'] });

  if (me.isPending || me.isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
        <View style={{ padding: 20 }}>
          {me.isError ? <ErrorBox error={me.error} onRetry={me.refetch} /> : <Loading />}
        </View>
      </SafeAreaView>
    );
  }

  const w = me.data;
  const st = status.data;
  const availability = st?.availability || w.availability || (w.is_online ? 'online' : 'offline');
  const accepting = st?.accepting ?? w.is_online;
  const name = w.first_name || w.last_name || '';
  const location = w.district || w.region || '';
  const bal = balance.data ? (balance.data.available_balance ?? balance.data.wallet_balance) : null;
  const openOrders = Array.isArray(fresh.data) ? fresh.data : fresh.data?.items || [];

  const quick = [
    { icon: 'bullhorn-outline', label: t('w.extra.myListings'), route: '/listings' },
    { icon: 'gift-outline', label: t('w.extra.referral'), route: '/referral' },
    { icon: 'diamond-stone', label: t('w.extra.pro'), route: '/pro' },
    { icon: 'star-outline', label: t('w.profile.reviews'), route: '/my-reviews' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={me.isRefetching}
            onRefresh={refreshAll}
            tintColor={theme.orange}
            colors={[theme.orange]}
          />
        }
      >
        {/* ── Sarlavha ── */}
        <View style={s.headerWrap}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { shadowColor: theme.orange }]}
          >
            <View style={[s.blob, s.blobA]} />
            <View style={[s.blob, s.blobB]} />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.navigate('/profile')}
              style={s.ring}
              accessibilityRole="button"
            >
              <Avatar
                size={46}
                letter={(name || 'U').charAt(0).toUpperCase()}
                bgColor="#c9552a"
                uri={w.profile_photo}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.hello} numberOfLines={1}>
                {t(`w.extra.${greetingKey(new Date().getHours())}`)} 👋
              </Text>
              {!!name && (
                <Text style={s.name} numberOfLines={1}>
                  {name}
                </Text>
              )}
              <View style={s.chipRow}>
                <View style={s.chip}>
                  <MaterialCommunityIcons name="hammer-wrench" size={12} color="#fff" />
                  <Text style={s.chipTxt}>{t('w.extra.ustaBadge')}</Text>
                </View>
                {!!location && (
                  <View style={s.chip}>
                    <MaterialCommunityIcons name="map-marker" size={12} color="#fff" />
                    <Text style={s.chipTxt} numberOfLines={1}>
                      {location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/notifications')}
              style={s.iconBtn}
              accessibilityRole="button"
            >
              <Feather name="bell" size={19} color="#fff" />
              {unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {w.blocked_until ? (
            <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.red }]}>
              <Text style={[s.cardTitle, { color: theme.red }]}>{t('w.home.blocked')}</Text>
              <Muted>{w.block_reason || ''}</Muted>
            </View>
          ) : null}

          {/* ── Holat kartasi (mijozdagi "tezkor buyurtma" o'rnida) ── */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[s.cardBlob, { backgroundColor: theme.orange, opacity: 0.08 }]} />
            <View style={s.cardHead}>
              <View style={[s.cardIcon, { backgroundColor: `${theme.orange}26` }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={22} color={theme.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: theme.text }]}>{t('w.home.status')}</Text>
                <Text
                  style={{
                    color: accepting ? theme.green : theme.muted,
                    fontSize: 12.5,
                    marginTop: 2,
                  }}
                >
                  {accepting ? t('w.home.accepting') : t('w.home.notAccepting')}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              <Segments
                value={
                  availability === 'online'
                    ? 'online'
                    : availability === 'busy'
                      ? 'busy'
                      : 'offline'
                }
                onChange={(v) => !toggle.isPending && toggle.mutate(v)}
                options={[
                  { value: 'online', label: t('w.home.online') },
                  { value: 'busy', label: t('w.home.busy') },
                  { value: 'offline', label: t('w.home.offline') },
                ]}
              />
            </View>
            {st?.busy_until ? (
              <Muted style={{ marginTop: 8 }}>
                {t('w.home.busyUntil', { date: fmtDate(st.busy_until, language) })}
              </Muted>
            ) : null}
            <TouchableOpacity
              style={[s.cta, { backgroundColor: theme.orange }]}
              activeOpacity={0.88}
              onPress={() => router.push('/orders')}
              accessibilityRole="button"
            >
              <Text style={s.ctaTxt}>
                {t('w.extra.findOrders')}
                {open.data?.count ? ` · ${open.data.count}` : ''}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Hamyon kartasi ── */}
          <TouchableOpacity
            style={s.wallet}
            activeOpacity={0.9}
            onPress={() => router.push('/wallet')}
            accessibilityRole="button"
          >
            <View style={s.walletCircle} />
            <View style={s.walletIcon}>
              <MaterialCommunityIcons name="wallet" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)' }}>
                {t('w.home.balance')}
              </Text>
              <Text style={{ fontWeight: '800', fontSize: 17, color: '#fff', marginTop: 2 }}>
                {bal != null ? money(bal, t) : '–'}
              </Text>
            </View>
            <View style={s.walletBtn}>
              <Text style={{ color: theme.orangeD, fontWeight: '700', fontSize: 12 }}>
                {t('w.extra.topUp')}
              </Text>
            </View>
          </TouchableOpacity>
          {balance.data && num(balance.data.held_balance) > 0 ? (
            <Muted style={{ marginTop: -8, marginBottom: 12 }}>
              {t('w.home.held', { sum: money(balance.data.held_balance, t) })}
            </Muted>
          ) : null}

          {/* ── Yangi buyurtmalar ── */}
          <SectionHeader
            title={t('w.extra.newForYou')}
            actionLabel={t('w.extra.seeAll')}
            onActionPress={() => router.push('/orders')}
          />
          {fresh.isPending ? (
            <Loading />
          ) : openOrders.length ? (
            openOrders.map((o) => <OrderCard key={o.id} order={o} meId={w.id} />)
          ) : (
            <Muted>{t('w.extra.noNew')}</Muted>
          )}

          {/* ── Faol ishlar ── */}
          <View style={{ marginTop: 12 }}>
            <SectionHeader title={t('w.home.activeJobs')} />
          </View>
          {active.isPending ? (
            <Loading />
          ) : active.data?.length ? (
            active.data.map((o) => <OrderCard key={o.id} order={o} meId={w.id} />)
          ) : (
            <Muted>{t('w.home.noActive')}</Muted>
          )}

          {negotiating.data?.length ? (
            <View style={{ marginTop: 12 }}>
              <SectionHeader title={t('w.home.negotiating')} />
              {negotiating.data.map((o) => (
                <OrderCard key={o.id} order={o} meId={w.id} />
              ))}
            </View>
          ) : null}

          {/* ── Statistika ── */}
          {stats.data ? (
            <View style={{ marginTop: 12 }}>
              <SectionHeader title={t('w.home.stats30')} />
              <View style={s.statsGrid}>
                {[
                  [t('w.home.views'), stats.data.views_30d, 'eye-outline'],
                  [t('w.home.offersSent'), stats.data.offers_sent, 'send-outline'],
                  [t('w.home.offersChosen'), stats.data.offers_chosen, 'check-decagram-outline'],
                  [t('w.home.jobsDone'), stats.data.jobs_completed, 'briefcase-check-outline'],
                ].map(([label, value, icon]) => (
                  <View
                    key={label}
                    style={[s.stat, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <MaterialCommunityIcons name={icon} size={20} color={theme.orange} />
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
                      {value ?? 0}
                    </Text>
                    <Muted>{label}</Muted>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Tezkor bo'limlar ── */}
          <View style={{ marginTop: 12 }}>
            <SectionHeader title={t('w.extra.quick')} />
            <View style={s.statsGrid}>
              {quick.map((q) => (
                <TouchableOpacity
                  key={q.route}
                  activeOpacity={0.85}
                  onPress={() => router.push(q.route)}
                  style={[s.stat, { backgroundColor: theme.card, borderColor: theme.border }]}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name={q.icon} size={22} color={theme.orange} />
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    {q.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerWrap: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  blob: { position: 'absolute', backgroundColor: '#fff', borderRadius: 999 },
  blobA: { width: 120, height: 120, top: -55, right: -25, opacity: 0.12 },
  blobB: { width: 70, height: 70, bottom: -35, right: 70, opacity: 0.08 },
  ring: {
    padding: 2,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  hello: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },
  name: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, color: '#fff', marginTop: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    maxWidth: '100%',
  },
  chipTxt: { fontSize: 11.5, fontWeight: '700', color: '#fff', flexShrink: 1 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#e0473a',
    borderWidth: 1.5,
    borderColor: '#e87a45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 12, overflow: 'hidden' },
  cardBlob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -70,
    right: -50,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    height: 48,
    borderRadius: 16,
  },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#e87a45',
    overflow: 'hidden',
    marginBottom: 16,
  },
  walletCircle: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 13,
  },
  sectionTitle: { fontWeight: '700', fontSize: 16.5 },
  sectionAction: { fontSize: 12.5, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '48%', borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
});
