import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import usePullRefresh from '../hooks/usePullRefresh';
import useTabBarSpace from '../navigation/useTabBarSpace';
import { useMyOffers, useRejectedOrders, useAssignedOrders } from '../queries/workerHome';
import { useOpenFeed, useProfileGate } from '../queries/workerOrders';
import { Segment, OrderCard, QueryState, orderPrice } from './worker/shared';

const JOB_STATUSES = {
  active: ['pending', 'accepted', 'active'],
  done: ['completed'],
  cancelled: ['cancelled'],
};

// Usta buyurtmalari: yangi (ochiq lenta), takliflarim (yuborilgan / rad etilgan), ishlarim.
export default function WorkerOrdersScreen() {
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const router = useRouter();
  const bottomSpace = useTabBarSpace(90);
  const { refreshControl } = usePullRefresh();
  const gate = useProfileGate();

  const [tab, setTab] = useState('new');
  const [offerTab, setOfferTab] = useState('sent');
  const [jobTab, setJobTab] = useState('active');
  const [allRegions, setAllRegions] = useState(false);
  const [sort, setSort] = useState('new');
  const [filterOpen, setFilterOpen] = useState(false);
  const filtersActive = allRegions || sort === 'price';

  const feed = useOpenFeed(allRegions);
  const offers = useMyOffers();
  const rejected = useRejectedOrders();
  const assigned = useAssignedOrders();

  const open = (o) => router.push(`/worker-order/${o.id}`);

  const newItems = useMemo(() => {
    const items = feed.data ?? [];
    if (sort !== 'price') return items;
    return [...items].sort((a, b) => Number(orderPrice(b) ?? 0) - Number(orderPrice(a) ?? 0));
  }, [feed.data, sort]);

  const sentItems = useMemo(
    () => (offers.data ?? []).map((x) => ({ ...x.order, _offer: x })),
    [offers.data]
  );
  const rejectedItems = useMemo(
    () => (rejected.data ?? []).map((x) => ({ ...x.order, _rejected: x })),
    [rejected.data]
  );
  const jobItems = useMemo(
    () => (assigned.data ?? []).filter((o) => JOB_STATUSES[jobTab].includes(o.status)),
    [assigned.data, jobTab]
  );

  const jobCount = (k) =>
    assigned.data
      ? assigned.data.filter((o) => JOB_STATUSES[k].includes(o.status)).length
      : undefined;

  const mainTabs = [
    ['new', tr('workerOrders.tabNew'), feed.data?.length],
    ['offers', tr('workerOrders.tabOffers'), offers.data?.length],
    ['jobs', tr('workerOrders.tabJobs'), jobCount('active')],
  ];

  const renderList = (query, items, icon, emptyKey) => (
    <QueryState
      query={query}
      isEmpty={!items.length}
      icon={icon}
      empty={tr(`workerOrders.${emptyKey}`)}
      t={t}
      tr={tr}
    >
      {items.map((o) => (
        <OrderCard
          key={`${o.id}-${o._offer?.id ?? ''}`}
          order={o}
          onPress={() => open(o)}
          t={t}
          tr={tr}
        />
      ))}
    </QueryState>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomSpace }}
      >
        <View style={s.titleRow}>
          <Text style={{ flex: 1, color: t.text, fontSize: 26, fontWeight: '800' }}>
            {tr('workerOrders.title')}
          </Text>
          {tab === 'new' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setFilterOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={tr('workerOrders.filterTitle')}
              style={[
                s.filterBtn,
                {
                  backgroundColor: filtersActive ? t.orange : t.card,
                  borderColor: filtersActive ? t.orange : t.border,
                },
              ]}
            >
              <Ionicons name="options" size={20} color={filtersActive ? '#fff' : t.text} />
            </TouchableOpacity>
          )}
        </View>

        {gate.locked && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.navigate('/profile')}
            style={[s.gate, { backgroundColor: t.card, borderColor: t.orange }]}
          >
            <Ionicons name="lock-closed" size={20} color={t.orange} />
            <Text
              style={{ flex: 1, color: t.text, fontSize: 13, fontWeight: '700', lineHeight: 18 }}
            >
              {tr('workerHome.gateTitle')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={t.orange} />
          </TouchableOpacity>
        )}

        <Segment items={mainTabs} value={tab} onChange={setTab} t={t} />

        {tab === 'new' && <>{renderList(feed, newItems, 'search-outline', 'emptyNew')}</>}

        {tab === 'offers' && (
          <>
            <Segment
              small
              items={[
                ['sent', tr('workerOrders.subSent'), sentItems.length],
                ['rejected', tr('workerOrders.subRejected'), rejectedItems.length],
              ]}
              value={offerTab}
              onChange={setOfferTab}
              t={t}
            />
            {offerTab === 'sent'
              ? renderList(offers, sentItems, 'chatbubbles-outline', 'emptyOffers')
              : renderList(rejected, rejectedItems, 'close-circle-outline', 'emptyRejected')}
          </>
        )}

        {tab === 'jobs' && (
          <>
            <Segment
              small
              items={[
                ['active', tr('workerHome.activeTab'), jobCount('active')],
                ['done', tr('workerHome.doneTab'), jobCount('done')],
                ['cancelled', tr('workerHome.cancelledTab'), jobCount('cancelled')],
              ]}
              value={jobTab}
              onChange={setJobTab}
              t={t}
            />
            {renderList(assigned, jobItems, 'briefcase-outline', 'emptyJobs')}
          </>
        )}
      </ScrollView>
      <FilterSheet
        visible={filterOpen}
        allRegions={allRegions}
        sort={sort}
        onClose={() => setFilterOpen(false)}
        onApply={(r, so) => {
          setAllRegions(r);
          setSort(so);
          setFilterOpen(false);
        }}
        t={t}
        tr={tr}
      />
    </SafeAreaView>
  );
}

// Filtr oynasi: hudud va saralash bitta joyda; "Qo'llash" bosilganda ro'yxatga ta'sir qiladi.
function FilterSheet({ visible, allRegions, sort, onClose, onApply, t, tr }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible && (
        <SheetBody
          allRegions={allRegions}
          sort={sort}
          onClose={onClose}
          onApply={onApply}
          t={t}
          tr={tr}
        />
      )}
    </Modal>
  );
}

function SheetBody({ allRegions, sort, onClose, onApply, t, tr }) {
  const [r, setR] = useState(allRegions);
  const [so, setSo] = useState(sort);
  const label = (text) => <Text style={[s.sheetLabel, { color: t.muted }]}>{text}</Text>;
  return (
    <View style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: t.bg, borderColor: t.border }]}>
        <View style={s.sheetHead}>
          <Text style={{ flex: 1, color: t.text, fontSize: 18, fontWeight: '800' }}>
            {tr('workerOrders.filterTitle')}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={22} color={t.muted} />
          </TouchableOpacity>
        </View>

        {label(tr('workerOrders.filterRegion'))}
        <View style={s.filters}>
          <Chip
            active={!r}
            icon="location-outline"
            label={tr('workerOrders.myRegion')}
            onPress={() => setR(false)}
            t={t}
          />
          <Chip
            active={r}
            icon="earth"
            label={tr('workerOrders.allRegions')}
            onPress={() => setR(true)}
            t={t}
          />
        </View>

        {label(tr('workerOrders.filterSort'))}
        <View style={s.filters}>
          <Chip
            active={so === 'new'}
            icon="time-outline"
            label={tr('workerOrders.sortNew')}
            onPress={() => setSo('new')}
            t={t}
          />
          <Chip
            active={so === 'price'}
            icon="cash-outline"
            label={tr('workerOrders.sortPrice')}
            onPress={() => setSo('price')}
            t={t}
          />
        </View>

        <View style={s.sheetActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setR(false);
              setSo('new');
            }}
            style={[s.sheetBtn, { backgroundColor: t.card, borderColor: t.border, borderWidth: 1 }]}
          >
            <Text style={{ color: t.text, fontSize: 14.5, fontWeight: '800' }}>
              {tr('workerOrders.filterReset')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onApply(r, so)}
            style={[s.sheetBtn, { backgroundColor: t.orange, flex: 1.4 }]}
          >
            <Text style={{ color: '#fff', fontSize: 14.5, fontWeight: '800' }}>
              {tr('workerOrders.filterApply')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function Chip({ active, icon, label, onPress, t }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        s.chip,
        { backgroundColor: active ? t.orange : t.card, borderColor: active ? t.orange : t.border },
      ]}
    >
      <Ionicons name={icon} size={14} color={active ? '#fff' : t.muted} />
      <Text style={{ color: active ? '#fff' : t.subtext, fontSize: 12.5, fontWeight: '700' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  gate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 18,
    paddingBottom: 28,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sheetLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});
