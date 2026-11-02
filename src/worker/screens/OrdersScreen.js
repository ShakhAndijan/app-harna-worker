import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import { OrderCard } from '../components';
import {
  Screen,
  Segments,
  Loading,
  ErrorBox,
  Empty,
  Card,
  Muted,
  Txt,
  Pill,
  money,
  fmtDate,
} from '../ui';
import { useRouter } from 'expo-router';

// Bo'limlar: ochiq buyurtmalar lentasi, mening takliflarim, kelishilayotgan, faol, tugagan, bekor, rad etilgan.
const TABS = ['open', 'offers', 'accepted', 'active', 'completed', 'cancelled', 'rejected'];

function useTabData(tab) {
  return useQuery({
    queryKey: ['w', 'orders', tab],
    queryFn: async () => {
      if (tab === 'open') return api.getOrders({ scope: 'open', limit: 50 });
      if (tab === 'offers') return api.getMyOffers({ limit: 50 });
      if (tab === 'rejected') return api.getRejectedOrders(50);
      return api.getOrders({ scope: 'assigned', status: tab, limit: 50 });
    },
  });
}

function OfferCard({ offer }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const o = offer.order || {};
  return (
    <Card onPress={() => router.push(`/order/${o.id}`)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Muted>#{o.code}</Muted>
        <Pill
          label={
            t(`w.offerSt.${offer.status}`) === `w.offerSt.${offer.status}`
              ? offer.status
              : t(`w.offerSt.${offer.status}`)
          }
        />
      </View>
      <Txt numberOfLines={2} style={{ fontWeight: '700' }}>
        {(o.task_names || []).join(', ') || o.description || o.code}
      </Txt>
      <Txt>{t('w.myOffer', { sum: money(offer.price, t) })}</Txt>
      <Muted>{fmtDate(offer.created_at, language)}</Muted>
    </Card>
  );
}

export default function OrdersScreen() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState('open');
  const q = useTabData(tab);
  const me = qc.getQueryData(['w', 'me']);
  const meId = me?.id;

  // Ro'yxat elementini bir xil ko'rinishga keltiramiz: rad etilganlar `{ order, ... }` ko'rinishida keladi.
  const items = q.data || [];

  return (
    <Screen
      back={false}
      title={t('w.orders.title')}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      bottomSpace
    >
      <Segments
        value={tab}
        onChange={setTab}
        options={TABS.map((k) => ({ value: k, label: t(`w.orders.tab.${k}`) }))}
      />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : items.length === 0 ? (
        <Empty text={t(`w.orders.empty.${tab}`)} />
      ) : tab === 'offers' ? (
        items.map((o) => <OfferCard key={o.id} offer={o} />)
      ) : tab === 'rejected' ? (
        items.map((r, i) => <OrderCard key={r.order?.id ?? i} order={r.order} meId={meId} />)
      ) : (
        items.map((o) => <OrderCard key={o.id} order={o} meId={meId} />)
      )}
    </Screen>
  );
}
