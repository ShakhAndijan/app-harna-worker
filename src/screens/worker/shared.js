import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatNumber } from '../../utils/format';

export const money = (v) =>
  v === null || v === undefined || v === '' ? null : formatNumber(Math.round(Number(v)));

/** Shoshilinch / bugun / sana / erkin muddat matni. */
export function timingLabel(order, tr) {
  if (order.timing_kind === 'urgent') return tr('workerHome.urgent');
  if (order.timing_kind === 'today') return tr('workerHome.today');
  if (order.timing_kind === 'on_date' && order.scheduled_date)
    return tr('workerHome.onDate', { d: order.scheduled_date });
  return tr('workerHome.flexible');
}

export const orderPrice = (o) => o.agreed_price ?? o.offer_price ?? o.budget;

export function Segment({ items, value, onChange, t, small }) {
  return (
    <View style={[s.segment, { backgroundColor: t.card2 }]}>
      {items.map(([key, label, count]) => {
        const active = key === value;
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => onChange(key)}
            style={[
              s.segItem,
              small && { paddingVertical: 8 },
              active && { backgroundColor: t.orange },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: active ? '#fff' : t.muted,
                fontWeight: '700',
                fontSize: small ? 12 : 12.5,
              }}
            >
              {label}
              {count ? `  ${count}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function EmptyBox({ icon, text, t }) {
  return (
    <View style={[s.empty, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[s.emptyIcon, { backgroundColor: t.card2 }]}>
        <Ionicons name={icon} size={26} color={t.muted} />
      </View>
      <Text style={{ color: t.muted, textAlign: 'center', lineHeight: 19, marginTop: 12 }}>
        {text}
      </Text>
    </View>
  );
}

/** Yuklanish / xato / bo'sh holatlarni ko'rsatadi, aks holda `children`. */
export function QueryState({ query, empty, icon, isEmpty, t, tr, children }) {
  if (query.isLoading) return <ActivityIndicator color={t.orange} style={{ marginVertical: 32 }} />;
  if (query.isError)
    return (
      <TouchableOpacity onPress={() => query.refetch()} style={s.errBox}>
        <Ionicons name="refresh-outline" size={28} color={t.muted} />
        <Text style={{ color: t.muted, marginTop: 8 }}>
          {tr('workerHome.err')} · {tr('workerHome.retry')}
        </Text>
      </TouchableOpacity>
    );
  if (isEmpty) return <EmptyBox icon={icon} text={empty} t={t} />;
  return children;
}

/** Buyurtma kartasi. `_offer` (taklif) va `_rejected` (rad etilgan) qo'shimcha ma'lumot beradi. */
export function OrderCard({ order, onPress, t, tr }) {
  const urgent = order.timing_kind === 'urgent';
  const accent = urgent ? '#e5484d' : t.orange;
  const price = money(orderPrice(order));
  const myPrice = money(order.my_offer?.price ?? order._offer?.price);
  const title = order.task_names?.join(', ') || order.description;
  const offerStatus = order._offer?.status;
  const reason = order._rejected?.reason;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[s.order, { backgroundColor: t.card, borderColor: t.border }]}
    >
      <View style={[s.accent, { backgroundColor: accent }]} />
      <View style={{ flex: 1, padding: 14, paddingLeft: 16 }}>
        <View style={s.rowBetween}>
          <View
            style={[
              s.chip,
              { backgroundColor: urgent ? 'rgba(229,72,77,0.14)' : 'rgba(232,122,69,0.14)' },
            ]}
          >
            <Ionicons name={urgent ? 'flash' : 'time-outline'} size={12} color={accent} />
            <Text style={{ color: accent, fontSize: 11.5, fontWeight: '800' }}>
              {timingLabel(order, tr)}
            </Text>
          </View>
          <Text style={{ color: t.faint, fontSize: 12 }}>#{order.code}</Text>
        </View>
        <Text
          style={{ color: t.text, fontSize: 15.5, fontWeight: '700', marginTop: 10 }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {!!order.description && !!order.task_names?.length && (
          <Text
            style={{ color: t.muted, fontSize: 13, marginTop: 4, lineHeight: 18 }}
            numberOfLines={2}
          >
            {order.description}
          </Text>
        )}
        <View style={[s.rowBetween, { marginTop: 12 }]}>
          <View style={[s.row, { flex: 1, gap: 4 }]}>
            <Ionicons name="location-outline" size={15} color={t.muted} />
            <Text style={{ color: t.muted, fontSize: 12.5, flex: 1 }} numberOfLines={1}>
              {[order.district, order.region].filter(Boolean).join(', ') || '—'}
            </Text>
          </View>
          <Text
            style={{
              color: price ? t.text : t.muted,
              fontSize: price ? 15 : 12.5,
              fontWeight: '800',
            }}
          >
            {price ? `${price} ${tr('workerHome.som')}` : tr('workerHome.noPrice')}
          </Text>
        </View>
        {(!!myPrice || order.offers_count > 0 || !!offerStatus || !!reason) && (
          <View style={[s.row, { marginTop: 10, flexWrap: 'wrap' }]}>
            {!!myPrice && (
              <View style={[s.chip, { backgroundColor: 'rgba(46,184,114,0.14)' }]}>
                <Text style={{ color: '#2eb872', fontSize: 11.5, fontWeight: '700' }}>
                  {tr('workerHome.myOffer')}: {myPrice}
                </Text>
              </View>
            )}
            {!!offerStatus && (
              <View style={[s.chip, { backgroundColor: t.card2 }]}>
                <Text style={{ color: t.muted, fontSize: 11.5, fontWeight: '700' }}>
                  {tr(`workerOrders.offerStatus.${offerStatus}`) ===
                  `workerOrders.offerStatus.${offerStatus}`
                    ? offerStatus
                    : tr(`workerOrders.offerStatus.${offerStatus}`)}
                </Text>
              </View>
            )}
            {!!reason && (
              <View style={[s.chip, { backgroundColor: 'rgba(229,72,77,0.14)' }]}>
                <Text style={{ color: '#e5484d', fontSize: 11.5, fontWeight: '700' }}>
                  {tr(`workerOrders.reason.${reason}`)}
                </Text>
              </View>
            )}
            {order.offers_count > 0 && (
              <View style={[s.chip, { backgroundColor: t.card2 }]}>
                <Ionicons name="people-outline" size={12} color={t.muted} />
                <Text style={{ color: t.muted, fontSize: 11.5, fontWeight: '700' }}>
                  {tr('workerHome.offers', { n: order.offers_count })}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
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
  errBox: { alignItems: 'center', paddingVertical: 28 },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
