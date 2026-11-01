import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
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

  const mainTabs = [
    ['new', tr('workerOrders.tabNew'), feed.data?.length],
    ['offers', tr('workerOrders.tabOffers'), offers.data?.length],
    ['jobs', tr('workerOrders.tabJobs')],
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
        <Text style={{ color: t.text, fontSize: 26, fontWeight: '800', marginBottom: 16 }}>
          {tr('workerOrders.title')}
        </Text>

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

        {tab === 'new' && (
          <>
            <View style={s.filters}>
              <Chip
                active={allRegions}
                icon="earth"
                label={tr('workerOrders.allRegions')}
                onPress={() => setAllRegions((v) => !v)}
                t={t}
              />
              <Chip
                active={sort === 'price'}
                icon="cash-outline"
                label={tr('workerOrders.sortPrice')}
                onPress={() => setSort((v) => (v === 'price' ? 'new' : 'price'))}
                t={t}
              />
            </View>
            {renderList(feed, newItems, 'search-outline', 'emptyNew')}
          </>
        )}

        {tab === 'offers' && (
          <>
            <Segment
              small
              items={[
                ['sent', tr('workerOrders.subSent')],
                ['rejected', tr('workerOrders.subRejected')],
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
                ['active', tr('workerHome.activeTab')],
                ['done', tr('workerHome.doneTab')],
                ['cancelled', tr('workerHome.cancelledTab')],
              ]}
              value={jobTab}
              onChange={setJobTab}
              t={t}
            />
            {renderList(assigned, jobItems, 'briefcase-outline', 'emptyJobs')}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
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
