import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Pill, Muted, Txt, money, num, fmtDate } from './ui';

// Buyurtma holati → yozuv va rang. Usta nuqtai nazaridan: "pending" — ochiq (taklif yuborish mumkin).
export function statusMeta(order, t, theme, meId) {
  const st = order?.status;
  if (st === 'completed') return { label: t('w.st.completed'), color: theme.green };
  if (st === 'cancelled') return { label: t('w.st.cancelled'), color: theme.red };
  if (st === 'active') {
    return order?.worker_done_at
      ? { label: t('w.st.waitConfirm'), color: theme.gold }
      : { label: t('w.st.active'), color: theme.blue };
  }
  if (st === 'accepted') return { label: t('w.st.negotiating'), color: theme.violet };
  const mine = order?.my_offer && order.my_offer.status === 'pending';
  if (mine) return { label: t('w.st.offerSent'), color: theme.gold };
  if (meId && order?.worker_id === meId) return { label: t('w.st.forYou'), color: theme.orange };
  return { label: t('w.st.open'), color: theme.orange };
}

// Ro'yxatdagi buyurtma kartasi.
export function OrderCard({ order, meId }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const meta = statusMeta(order, t, theme, meId);
  const price = order.agreed_price || order.offer_price || order.budget;
  const title =
    (order.task_names && order.task_names.length ? order.task_names.join(', ') : '') ||
    order.listing_title ||
    order.description ||
    order.code;
  const place = [order.district, order.mahalla].filter(Boolean).join(', ');
  return (
    <Card onPress={() => router.push(`/order/${order.id}`)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Muted>#{order.code}</Muted>
        <Pill label={meta.label} color={meta.color} />
      </View>
      <Txt style={{ fontWeight: '700' }} numberOfLines={2}>
        {title}
      </Txt>
      {order.description && order.task_names?.length ? (
        <Muted numberOfLines={2}>{order.description}</Muted>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: theme.orange, fontWeight: '800', fontSize: 15 }}>
          {num(price) > 0 ? money(price, t) : t('w.priceNegotiable')}
        </Text>
        <Muted>{fmtDate(order.created_at, language)}</Muted>
      </View>
      {place ? <Muted numberOfLines={1}>{place}</Muted> : null}
      {order.offers_count != null && order.status === 'pending' ? (
        <Muted>{t('w.offersCount', { n: order.offers_count })}</Muted>
      ) : null}
    </Card>
  );
}
