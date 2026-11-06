import { memo, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { VideoView } from 'expo-video';
import { useAutoplayVideo } from '../../utils/autoplayVideo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import Avatar from '../../components/Avatar';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { OrderCard } from '../components';
import {
  Screen,
  Card,
  Muted,
  Txt,
  Btn,
  Pill,
  Chips,
  Loading,
  ErrorBox,
  Empty,
  fmtDate,
  num,
  money,
} from '../ui';
import { supportRoute } from '../../navigation/params';

function MenuItem({ icon, label, onPress, danger }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={22} color={danger ? theme.red : theme.orange} />
      <Text
        style={{ flex: 1, color: danger ? theme.red : theme.text, fontSize: 15, fontWeight: '600' }}
      >
        {label}
      </Text>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={theme.faint} /> : null}
    </TouchableOpacity>
  );
}

// Til, mavzu va "Chiqish": profil yuklanmagan (masalan 403) holatda ham doim ko'rinib turadi.
function SessionCards() {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { signOut } = useAuth();
  return (
    <>
      <Card>
        <Muted>{t('w.profile.language')}</Muted>
        <Chips
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'uz', label: "O'zbekcha" },
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]}
        />
        <MenuItem
          icon={theme.isDark ? 'sunny-outline' : 'moon-outline'}
          label={t('w.profile.theme')}
          onPress={toggleTheme}
        />
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <MenuItem
          icon="log-out-outline"
          danger
          label={t('w.profile.logout')}
          onPress={() =>
            appConfirm({
              title: t('w.profile.logout'),
              message: t('w.profile.logoutAsk'),
              confirmLabel: t('w.profile.logout'),
              destructive: true,
              onConfirm: signOut,
            })
          }
        />
      </Card>
    </>
  );
}

// Pastdan chiqadigan oyna (+ va ☰ tugmalari uchun).
function Sheet({ visible, onClose, title, children }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          maxHeight: '85%',
          backgroundColor: theme.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 10,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border,
            marginBottom: 10,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <Txt style={{ flex: 1, fontWeight: '800', fontSize: 18 }}>{title}</Txt>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Ionicons name="close" size={24} color={theme.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 36 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt style={{ fontWeight: '800', fontSize: 17 }}>{value}</Txt>
      <Muted style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
        {label}
      </Muted>
    </View>
  );
}

// Instagram uslubidagi tablar: monoxrom ikonlar, faol tabda to'ldirilgan ikon va pastida yupqa chiziq.
// Tab sahifasi: memo — surish paytida (holat o'zgarganda) qayta chizilmaydi, shuning uchun qotmaydi.
const TabPage = memo(function TabPage({ v, w, still }) {
  return (
    <View style={{ gap: 12 }}>
      {v === 'listings' ? <MyListingsTab still={still} /> : null}
      {v === 'works' ? <CompletedWorks meId={w.id} /> : null}
      {v === 'reviews' ? <ReviewsList w={w} /> : null}
      {v === 'info' ? <InfoTab w={w} /> : null}
    </View>
  );
});

const TAB_ORDER = ['listings', 'works', 'reviews', 'info'];

// Tablar orasida barmoq bilan surish: joriy oyna barmoq ketidan siljiydi, keyingisi yonidan sekin kirib keladi.
function SwipeTabs({ order, value, onChange, render }) {
  const [width, setWidth] = useState(0);
  const [tx] = useState(() => new Animated.Value(0));
  const [dir, setDir] = useState(0); // +1: keyingi tab o'ngda, -1: oldingi tab chapda
  const index = order.indexOf(value);

  const pan = useMemo(() => {
    const finish = (toValue, then) =>
      Animated.timing(tx, { toValue, duration: 200, useNativeDriver: true }).start(then);
    // Surish 12 px dan keyin tutib olinadi: shu boshlang'ich siljish ayrib tashlanadi, aks holda oyna sakrab ketadi.
    const base = { v: 0 };
    return PanResponder.create({
      onPanResponderGrant: (_, g) => {
        base.v = g.dx;
      },
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const dx = g.dx - base.v;
        const d = dx < 0 ? 1 : -1;
        const hasNeighbor = index + d >= 0 && index + d < order.length;
        setDir((p) => (p === d ? p : d));
        // Chekkada boshqa tab yo'q: siljish qarshilik bilan, ozgina.
        tx.setValue(hasNeighbor ? dx : dx * 0.25);
      },
      onPanResponderRelease: (_, g) => {
        const dx = g.dx - base.v;
        const d = dx < 0 ? 1 : -1;
        const target = index + d;
        const can = target >= 0 && target < order.length;
        const go = can && (Math.abs(dx) > width * 0.25 || Math.abs(g.vx) > 0.5);
        if (go) {
          finish(-d * width, () => {
            onChange(order[target]);
            setDir(0);
          });
        } else {
          finish(0, () => setDir(0));
        }
      },
      onPanResponderTerminate: () => finish(0, () => setDir(0)),
    });
  }, [index, order, width, tx, onChange]);

  // Tab almashgach siljish bo'yoqdan oldin (layout bosqichida) nolga qaytariladi: bir kadr ham bo'sh/eski holat ko'rinmaydi.
  useLayoutEffect(() => {
    tx.setValue(0);
  }, [value, tx]);

  const neighbor =
    dir !== 0 && index + dir >= 0 && index + dir < order.length ? order[index + dir] : null;

  return (
    <View
      style={{ overflow: 'hidden', marginHorizontal: -18 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <Animated.View style={{ transform: [{ translateX: tx }] }}>
        <View style={{ paddingHorizontal: 18 }}>{render(value, false)}</View>
        {neighbor && width > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: dir * width,
              width,
              paddingHorizontal: 18,
            }}
          >
            {render(neighbor, true)}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

function ProfileTabs({ tabs, value, onChange }) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
        marginHorizontal: -18,
      }}
    >
      {tabs.map((tb) => {
        const on = tb.value === value;
        return (
          <TouchableOpacity
            key={tb.value}
            onPress={() => onChange(tb.value)}
            activeOpacity={0.6}
            accessibilityRole="tab"
            accessibilityLabel={tb.label}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name={on ? tb.icon : `${tb.icon}-outline`}
              size={27}
              color={on ? theme.text : theme.faint}
            />
            <View
              style={{
                position: 'absolute',
                alignSelf: 'center',
                width: '62%',
                bottom: 0,
                height: 2,
                backgroundColor: on ? theme.text : 'transparent',
              }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const nameOf = (v) => (v && typeof v === 'object' ? v.name : v) || '';

// Plitka ichida o'zi ijro etiladigan video: ovozsiz, takrorlanadi, boshqaruv tugmalarisiz.
function TileVideo({ uri }) {
  const player = useAutoplayVideo(uri);
  return (
    // Native video teginishlarni ushlab qolmasligi uchun teginishsiz o'ramda turadi (plitka bosilaveradi).
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

// Pastki qatordagi ko'rsatkich: ikon va soni, o'z bo'lagi markazida.
function MiniStat({ icon, n, color }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
      }}
    >
      <Ionicons name={icon} size={15} color={color || theme.muted} />
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>{n ?? 0}</Text>
    </View>
  );
}

// Ixcham e'lon plitkasi: bir qatorda 2 tadan. Bosilsa e'lon to'liq ekranda ochiladi (tahrirlash tugmasi shu yerda), ko'z tugmasi — ko'rinadi/yashirin, uzoq bosilsa — o'chirish.
function ListingTile({ l, t, onOpen, onToggle, onDelete, still }) {
  const { theme } = useTheme();
  const photo = l.photos?.[0];
  const views = l.view_count ?? l.views_count ?? l.views ?? null;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onOpen}
      onLongPress={onDelete}
      style={{
        width: '48.5%',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
        opacity: l.is_active ? 1 : 0.6,
      }}
    >
      <View style={{ aspectRatio: 1, backgroundColor: theme.card2 }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={34} color={theme.faint} />
          </View>
        )}
        {l.video_url && !still ? <TileVideo uri={l.video_url} /> : null}
        <TouchableOpacity
          onPress={onToggle}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={l.is_active ? t('w.listings.visible') : t('w.listings.hidden')}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={l.is_active ? 'eye' : 'eye-off'} size={16} color="#fff" />
        </TouchableOpacity>
        {l.is_top ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 10,
              backgroundColor: theme.gold,
            }}
          >
            <Ionicons name="flame" size={11} color="#1b1200" />
            <Text style={{ color: '#1b1200', fontSize: 10.5, fontWeight: '900' }}>TOP</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <Txt style={{ fontWeight: '700', fontSize: 13.5 }} numberOfLines={2}>
          {l.title}
        </Txt>
        <Text style={{ color: theme.orange, fontWeight: '900', fontSize: 15 }} numberOfLines={1}>
          {num(l.price) > 0 ? money(l.price, t) : t('w.priceNegotiable')}
        </Text>
      </View>
      {/* Pastki qator: yoqtirish va sharh, teng ikki bo'lakda — joyi doim yetadi */}
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        }}
      >
        {views != null && (
          <>
            <MiniStat icon="eye-outline" n={views} />
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
          </>
        )}
        <MiniStat icon="heart" color={theme.red} n={l.like_count} />
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />
        <MiniStat icon="chatbubble-outline" n={l.comment_count} />
      </View>
    </TouchableOpacity>
  );
}

// "E'lonlarim" tabi: o'z e'lonlari, bir qatorda ikkitadan.
function MyListingsTab({ still }) {
  const router = useRouter();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'listings'], queryFn: () => api.getMyListings({}) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['w', 'listings'] });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const toggle = useMutation({
    mutationFn: ({ id, active }) => api.updateListing(id, { is_active: active }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id) => api.deleteListing(id),
    onSuccess: refresh,
    onError,
  });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={q.refetch} />;
  const mine = Array.isArray(q.data) ? q.data : q.data?.items || [];
  if (!mine.length) return <Empty icon="megaphone-outline" text={t('w.profile.noListings')} />;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
      }}
    >
      {mine.map((l) => (
        <ListingTile
          key={l.id}
          l={l}
          t={t}
          still={still}
          onOpen={() => router.push({ pathname: '/my-reels', params: { id: String(l.id) } })}
          onToggle={() => toggle.mutate({ id: l.id, active: !l.is_active })}
          onDelete={() =>
            appConfirm({
              title: t('w.delete'),
              message: t('w.listings.deleteAsk'),
              confirmLabel: t('w.delete'),
              destructive: true,
              onConfirm: () => remove.mutate(l.id),
            })
          }
        />
      ))}
    </View>
  );
}

// "Ishlarim" tabi: mutaxassis bajarib bergan (yakunlangan) buyurtmalar.
function CompletedWorks({ meId }) {
  const { t } = useLanguage();
  const q = useQuery({
    queryKey: ['w', 'orders', 'completed'],
    queryFn: () => api.getOrders({ scope: 'assigned', status: 'completed', limit: 50 }),
  });
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={q.refetch} />;
  const items = Array.isArray(q.data) ? q.data : q.data?.items || [];
  if (!items.length) return <Empty icon="hammer-outline" text={t('w.profile.noWorks')} />;
  return items.map((o) => <OrderCard key={o.id} order={o} meId={meId} />);
}

function ReviewsList({ w }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const q = useQuery({
    queryKey: ['w', 'reviews', w.id, 'preview'],
    queryFn: () => api.getReviewsPage(w.id, { page: 1, size: 10 }),
    enabled: !!w.id,
  });
  const router = useRouter();
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox error={q.error} onRetry={q.refetch} />;
  const items = q.data?.items || [];
  if (!items.length) return <Empty icon="star-outline" text={t('w.reviews.empty')} />;
  return (
    <>
      {items.map((r, i) => (
        <Card key={i}>
          <Txt style={{ color: theme.gold, fontWeight: '800' }}>
            {'★'.repeat(r.rating)}
            {'☆'.repeat(Math.max(0, 5 - r.rating))}
          </Txt>
          {r.comment ? <Txt>{r.comment}</Txt> : <Muted>{t('w.site.noComment')}</Muted>}
          <Muted>
            {r.customer?.full_name || ''} · {fmtDate(r.created_at, language)}
          </Muted>
        </Card>
      ))}
      <TouchableOpacity onPress={() => router.push('/my-reviews')} style={{ padding: 8 }}>
        <Txt style={{ color: theme.orange, fontWeight: '700', textAlign: 'center' }}>
          {t('w.site.loadMore')}
        </Txt>
      </TouchableOpacity>
    </>
  );
}

function InfoTab({ w }) {
  const { t } = useLanguage();
  const router = useRouter();
  const cats = w.categories || [];
  const place = [nameOf(w.region), nameOf(w.district)].filter(Boolean).join(', ');
  const rows = [
    w.phone && ['call-outline', t('w.profile.phone'), w.phone],
    place && ['location-outline', t('w.profile.region'), place],
    w.experience_years != null && [
      'briefcase-outline',
      t('w.profile.experience'),
      `${w.experience_years} ${t('w.profile.year')}`,
    ],
    w.work_radius_km && [
      'navigate-outline',
      t('w.profile.radius'),
      `${w.work_radius_km} ${t('w.profile.km')}`,
    ],
  ].filter(Boolean);
  return (
    <>
      <Card>
        <Txt style={{ fontWeight: '800' }}>{t('w.profile.about')}</Txt>
        {w.bio ? <Txt>{w.bio}</Txt> : <Muted>{t('w.profile.noBio')}</Muted>}
      </Card>
      {cats.length ? (
        <Card>
          <Txt style={{ fontWeight: '800' }}>{t('w.profile.categories')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cats.map((c) => (
              <Pill
                key={c.category?.id ?? c.id}
                label={`${c.category?.name ?? ''}${num(c.price) > 0 ? ` · ${num(c.price).toLocaleString('ru-RU')}` : ''}`}
                color="#f97316"
              />
            ))}
          </View>
        </Card>
      ) : null}
      {rows.length ? (
        <Card>
          {rows.map(([icon, label, value]) => (
            <InfoRow key={label} icon={icon} label={label} value={value} />
          ))}
        </Card>
      ) : null}
      <Btn
        kind="ghost"
        icon="create-outline"
        label={t('w.profile.edit')}
        onPress={() => router.push('/profile-edit')}
      />
    </>
  );
}

function InfoRow({ icon, label, value }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <Ionicons name={icon} size={20} color={theme.orange} />
      <Muted style={{ width: 90 }}>{label}</Muted>
      <Txt style={{ flex: 1, fontWeight: '600' }}>{value}</Txt>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState('listings');
  const [sheet, setSheet] = useState(null); // 'menu' | null
  const q = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const stats = useQuery({
    queryKey: ['w', 'stats', 30],
    queryFn: () => api.getStats(30),
    enabled: q.isSuccess,
    retry: false,
  });

  const avatar = useMutation({
    mutationFn: async () => {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled) return null;
      return api.uploadAvatar(res.assets[0].uri);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'me'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  if (q.isPending)
    return (
      <Screen back={false} title={t('w.profile.title')}>
        <Loading />
      </Screen>
    );
  if (q.isError) {
    return (
      <Screen back={false} title={t('w.profile.title')}>
        <ErrorBox error={q.error} onRetry={q.refetch} />
        <Muted style={{ textAlign: 'center' }}>{t('w.profile.notWorkerHint')}</Muted>
        <Muted style={{ textAlign: 'center', fontSize: 11 }}>
          {[q.error?.status, q.error?.code].filter(Boolean).join(' · ')}
        </Muted>
        <SessionCards />
      </Screen>
    );
  }
  const w = q.data;
  const name = [w.first_name, w.last_name].filter(Boolean).join(' ');
  const rating = w.overall_rating ? Number(w.overall_rating).toFixed(1) : '—';
  const place = [nameOf(w.region), nameOf(w.district)].filter(Boolean).join(', ');
  const go = (path) => {
    setSheet(null);
    router.push(path);
  };

  return (
    <Screen
      back={false}
      onRefresh={() => {
        q.refetch();
        stats.refetch();
      }}
      refreshing={q.isRefetching}
      bottomSpace
    >
      {/* Yuqori qator: chapda + (e'lon qo'shish), o'rtada laqab, o'ngda ☰ (sozlamalar) */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => go('/listing-edit')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('w.profile.add')}
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <Ionicons name="add-circle-outline" size={30} color={theme.text} />
        </TouchableOpacity>
        <Txt
          numberOfLines={1}
          style={{ flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '800' }}
        >
          {w.nickname || name}
        </Txt>
        <TouchableOpacity
          style={{ width: 40, alignItems: 'flex-end' }}
          onPress={() => setSheet('menu')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('w.profile.menu')}
        >
          <Ionicons name="menu" size={30} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Avatar + usta uchun foydali ko'rsatkichlar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <TouchableOpacity
          onPress={() => !avatar.isPending && avatar.mutate()}
          accessibilityRole="button"
        >
          <Avatar size={84} letter={(w.first_name || 'U')[0]} uri={w.profile_photo} />
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: theme.orange,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={avatar.isPending ? 'hourglass-outline' : 'camera'}
              size={14}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 10 }}>
          {/* Ism-familiya (tasdiq belgisi bilan) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt style={{ flexShrink: 1, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>
              {name}
            </Txt>
            {w.is_identity_verified ? (
              <Ionicons name="shield-checkmark" size={18} color={theme.green} />
            ) : null}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Stat
              value={`★ ${rating}`}
              label={`${t('w.profile.rating')} (${w.review_count ?? 0})`}
            />
            <Stat value={w.completed_jobs_count ?? 0} label={t('w.profile.jobs')} />
            <Stat value={stats.data?.views_30d ?? '—'} label={t('w.profile.views')} />
            <Stat value={w.likes_count ?? 0} label={t('w.profile.likes')} />
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {w.is_pro || w.is_top ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {w.is_pro ? <Pill label="PRO" color={theme.violet} /> : null}
            {w.is_top ? <Pill label="TOP" color={theme.gold} /> : null}
          </View>
        ) : null}
        {place ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="location-outline" size={15} color={theme.orange} />
            <Muted style={{ flex: 1 }} numberOfLines={1}>
              {place}
            </Muted>
          </View>
        ) : null}
      </View>

      <ProfileTabs
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'listings',
            label: t('w.profile.tabListings'),
            icon: 'megaphone',
          },
          {
            value: 'works',
            label: t('w.profile.tabWorks'),
            icon: 'hammer',
          },
          {
            value: 'reviews',
            label: t('w.profile.tabReviews'),
            icon: 'chatbubble',
          },
          {
            value: 'info',
            label: t('w.profile.tabInfo'),
            icon: 'person-circle',
          },
        ]}
      />

      <SwipeTabs
        order={TAB_ORDER}
        value={tab}
        onChange={setTab}
        render={(v, still) => <TabPage v={v} w={w} still={still} />}
      />

      <Sheet visible={sheet === 'menu'} onClose={() => setSheet(null)} title={t('w.profile.menu')}>
        <Card style={{ paddingVertical: 6 }}>
          <MenuItem
            icon="create-outline"
            label={t('w.profile.edit')}
            onPress={() => go('/profile-edit')}
          />
          <MenuItem
            icon="construct-outline"
            label={t('w.profile.categories')}
            onPress={() => go('/my-categories')}
          />
          <MenuItem
            icon="calendar-outline"
            label={t('w.profile.schedule')}
            onPress={() => go('/schedule')}
          />
          <MenuItem
            icon="stats-chart-outline"
            label={t('w.more.stats')}
            onPress={() => go('/stats')}
          />
          <MenuItem
            icon="ribbon-outline"
            label={t('w.site.status')}
            onPress={() => go('/status')}
          />
          <MenuItem
            icon="calendar-number-outline"
            label={t('w.more.calendar')}
            onPress={() => go('/calendar')}
          />
          <MenuItem
            icon="location-outline"
            label={t('w.more.location')}
            onPress={() => go('/location')}
          />
          <MenuItem
            icon="star-outline"
            label={t('w.profile.reviews')}
            onPress={() => go('/my-reviews')}
          />
          <MenuItem
            icon="images-outline"
            label={t('w.extra.portfolio')}
            onPress={() => go('/portfolio')}
          />
          <MenuItem
            icon="ribbon-outline"
            label={t('w.extra.certificates')}
            onPress={() => go('/certificates')}
          />
          <MenuItem icon="diamond-outline" label={t('w.extra.pro')} onPress={() => go('/pro')} />
          <MenuItem
            icon="trending-up-outline"
            label={t('w.extra.top')}
            onPress={() => go('/top')}
          />
          <MenuItem
            icon="people-outline"
            label={t('w.extra.brigade')}
            onPress={() => go('/brigade')}
          />
          <MenuItem
            icon="gift-outline"
            label={t('w.extra.referral')}
            onPress={() => go('/referral')}
          />
          <MenuItem
            icon="bulb-outline"
            label={t('w.more.suggestions')}
            onPress={() => go(supportRoute('suggestion'))}
          />
          <MenuItem
            icon="alert-circle-outline"
            label={t('w.extra.complaints')}
            onPress={() => go('/complaints')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label={t('w.extra.account')}
            onPress={() => go('/account')}
          />
          <MenuItem
            icon="notifications-outline"
            label={t('w.profile.notifications')}
            onPress={() => go('/notifications')}
          />
          <MenuItem
            icon="settings-outline"
            label={t('w.more.settings')}
            onPress={() => go('/settings')}
          />
          <MenuItem
            icon="headset-outline"
            label={t('w.profile.support')}
            onPress={() => go('/support')}
          />
          <MenuItem
            icon="help-circle-outline"
            label={t('w.profile.help')}
            onPress={() => go('/help')}
          />
        </Card>
        <SessionCards />
      </Sheet>
    </Screen>
  );
}
