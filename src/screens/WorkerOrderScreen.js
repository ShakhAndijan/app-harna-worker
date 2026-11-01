import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import usePullRefresh from '../hooks/usePullRefresh';
import useGoBack from '../navigation/useGoBack';
import { formatNumber } from '../utils/format';
import {
  useOrder,
  useProfileGate,
  useSendOffer,
  useSkipOrder,
  useWithdrawOffer,
  useRepriceOffer,
  useAgreeOrder,
  useDeclineOrder,
  useWorkDone,
} from '../queries/workerOrders';
import { money, timingLabel, orderPrice } from './worker/shared';

function Card({ children, style, t }) {
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

function Btn({ label, onPress, kind = 'primary', icon, disabled, busy, t }) {
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? '#e5484d' : t.text;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        s.btn,
        kind === 'primary' && { backgroundColor: t.orange },
        kind === 'ghost' && { backgroundColor: t.card2 },
        kind === 'danger' && { backgroundColor: 'rgba(229,72,77,0.14)' },
        (disabled || busy) && { opacity: 0.55 },
      ]}
    >
      {!!icon && <Ionicons name={icon} size={17} color={color} />}
      <Text style={{ color, fontWeight: '800', fontSize: 14.5 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const labelStyle = (t) => ({ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 });

const REASONS = ['price_low', 'too_far', 'busy', 'not_my_trade'];
const digits = (v) => String(v ?? '').replace(/\D/g, '');

// Buyurtma tafsiloti: ma'lumotlar, taklif yuborish, "Qiziq emas", kelishuv va ishni yakunlash.
export default function WorkerOrderScreen({ id }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const router = useRouter();
  const goBack = useGoBack();
  const { refreshControl } = usePullRefresh();
  const gate = useProfileGate();
  const q = useOrder(id);
  const order = q.data;

  const sendOffer = useSendOffer();
  const skip = useSkipOrder();
  const withdraw = useWithdrawOffer();
  const reprice = useRepriceOffer();
  const agree = useAgreeOrder();
  const decline = useDeclineOrder();
  const done = useWorkDone();

  const [mode, setMode] = useState(null); // 'offer' | 'skip' | 'reprice'
  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const fail = (e) => {
    const key = `workerOrders.err.${e?.code}`;
    const txt = tr(key);
    setError(txt !== key ? txt : e?.message || tr('workerHome.err'));
  };
  const run = (mutation, vars, after) => {
    setError('');
    mutation.mutate(vars, {
      onSuccess: () => {
        setMode(null);
        after?.();
      },
      onError: fail,
    });
  };

  const open = mode ? mode : null;
  const busy =
    sendOffer.isPending ||
    skip.isPending ||
    withdraw.isPending ||
    reprice.isPending ||
    agree.isPending ||
    decline.isPending ||
    done.isPending;

  const startOffer = (kind) => {
    setPrice(digits(kind === 'reprice' ? order.my_offer?.price : order.budget));
    setError('');
    setMode(kind);
  };

  const Header = (
    <View style={s.header}>
      <TouchableOpacity
        onPress={goBack}
        hitSlop={10}
        style={[s.back, { backgroundColor: t.card2 }]}
      >
        <Ionicons name="chevron-back" size={22} color={t.text} />
      </TouchableOpacity>
      <Text style={{ flex: 1, color: t.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
        {order ? `#${order.code}` : tr('workerOrders.order')}
      </Text>
    </View>
  );

  if (q.isLoading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        {Header}
        {q.isError ? (
          <TouchableOpacity onPress={() => q.refetch()} style={s.center}>
            <Ionicons name="refresh-outline" size={28} color={t.muted} />
            <Text style={{ color: t.muted, marginTop: 8 }}>
              {tr('workerHome.err')} · {tr('workerHome.retry')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={s.center}>
            <ActivityIndicator color={t.orange} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const priceText = money(orderPrice(order));
  const mine = order.my_offer;
  const isOpen = order.status === 'pending' && !order.worker_id;
  const awaitingAgree = order.status === 'accepted' && !order.agreed_at;
  const inProgress = ['accepted', 'active'].includes(order.status) && !!order.agreed_at;
  const photos = order.before_photos ?? [];
  const phone = order.contact_phone;
  const hasGps = order.gps_lat && order.gps_lng;
  const place = [order.region, order.district, order.mahalla, order.location_landmark]
    .filter(Boolean)
    .join(', ');

  const rows = [
    place && ['location-outline', tr('workerOrders.location'), place],
    order.payment_method && [
      'wallet-outline',
      tr('workerOrders.payment'),
      tr(`workerOrders.payment_${order.payment_method}`),
    ],
    order.tools_provided_by && [
      'construct-outline',
      tr('workerOrders.tools'),
      tr(`workerOrders.tools_${order.tools_provided_by}`),
    ],
    order.workers_needed > 1 && [
      'people-outline',
      tr('workerOrders.workersNeeded'),
      String(order.workers_needed),
    ],
    order.estimated_hours && ['hourglass-outline', tr('workerOrders.hours'), order.estimated_hours],
    order.customer_name && ['person-outline', tr('workerOrders.customer'), order.customer_name],
  ].filter(Boolean);

  const reqs = [
    order.min_rating && `${tr('workerOrders.minRating')}: ${order.min_rating}`,
    order.require_verified && tr('workerOrders.verifiedOnly'),
    order.min_experience_years && `${tr('workerOrders.experience')}: ${order.min_experience_years}`,
    order.require_photo && tr('workerOrders.needPhoto'),
    order.extra_requirements,
  ].filter(Boolean);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      {Header}
      <KeyboardAwareScrollView
        bottomOffset={120}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 14 }}
      >
        {/* Asosiy */}
        <Card t={t}>
          <View style={s.rowBetween}>
            <View style={[s.chip, { backgroundColor: 'rgba(232,122,69,0.14)' }]}>
              <Text style={{ color: t.orange, fontSize: 12, fontWeight: '800' }}>
                {timingLabel(order, tr)}
              </Text>
            </View>
            <View style={[s.chip, { backgroundColor: t.card2 }]}>
              <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>
                {tr(`workerOrders.status_${order.status}`)}
              </Text>
            </View>
          </View>
          <Text style={{ color: t.text, fontSize: 19, fontWeight: '800', marginTop: 12 }}>
            {order.task_names?.join(', ') || tr('workerOrders.order')}
          </Text>
          <Text style={{ color: t.orange, fontSize: 24, fontWeight: '800', marginTop: 10 }}>
            {priceText ? `${priceText} ${tr('workerHome.som')}` : tr('workerHome.noPrice')}
          </Text>
          {order.price_mode === 'hourly' && !!order.hourly_rate && (
            <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 2 }}>
              {tr('workerOrders.hourly')}: {money(order.hourly_rate)} {tr('workerHome.som')}
            </Text>
          )}
          <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 8 }}>
            {tr('workerHome.offers', { n: order.offers_count ?? 0 })}
          </Text>
        </Card>

        {!!order.description && (
          <Card t={t}>
            <Text style={labelStyle(t)}>{tr('workerOrders.about')}</Text>
            <Text style={{ color: t.text, fontSize: 14.5, lineHeight: 21, marginTop: 6 }}>
              {order.description}
            </Text>
          </Card>
        )}

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            style={{ marginHorizontal: -20, paddingLeft: 20 }}
          >
            {photos.map((u) => (
              <Image key={u} source={{ uri: u }} style={[s.photo, { backgroundColor: t.card2 }]} />
            ))}
          </ScrollView>
        )}

        {rows.length > 0 && (
          <Card t={t} style={{ gap: 14 }}>
            {rows.map(([icon, label, value]) => (
              <View key={label} style={s.infoRow}>
                <Ionicons name={icon} size={19} color={t.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.muted, fontSize: 11.5 }}>{label}</Text>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: '600', marginTop: 1 }}>
                    {value}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {reqs.length > 0 && (
          <Card t={t}>
            <Text style={labelStyle(t)}>{tr('workerOrders.requirements')}</Text>
            {reqs.map((r) => (
              <View key={r} style={[s.infoRow, { marginTop: 8 }]}>
                <Ionicons name="checkmark-circle" size={16} color="#2eb872" />
                <Text style={{ flex: 1, color: t.text, fontSize: 13.5 }}>{r}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Mening taklifim */}
        {!!mine && (
          <Card t={t}>
            <Text style={labelStyle(t)}>{tr('workerHome.myOffer')}</Text>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: '800', marginTop: 6 }}>
              {money(mine.price)} {tr('workerHome.som')}
            </Text>
            {!!mine.status && (
              <Text style={{ color: t.muted, fontSize: 12.5, marginTop: 4 }}>
                {tr(`workerOrders.offerStatus.${mine.status}`) ===
                `workerOrders.offerStatus.${mine.status}`
                  ? mine.status
                  : tr(`workerOrders.offerStatus.${mine.status}`)}
              </Text>
            )}
          </Card>
        )}

        {/* Forma: taklif / narxni o'zgartirish */}
        {(open === 'offer' || open === 'reprice') && (
          <Card t={t}>
            <Text style={labelStyle(t)}>
              {open === 'offer' ? tr('workerOrders.yourPrice') : tr('workerOrders.newPrice')}
            </Text>
            <View style={[s.input, { backgroundColor: t.card2, borderColor: t.border }]}>
              <TextInput
                value={price ? formatNumber(price) : ''}
                onChangeText={(v) => setPrice(digits(v))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={t.faint}
                style={{
                  flex: 1,
                  color: t.text,
                  fontSize: 20,
                  fontWeight: '800',
                  paddingVertical: 12,
                }}
              />
              <Text style={{ color: t.muted, fontWeight: '700' }}>{tr('workerHome.som')}</Text>
            </View>
            {open === 'offer' && (
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={tr('workerOrders.commentPh')}
                placeholderTextColor={t.faint}
                multiline
                maxLength={500}
                style={[
                  s.comment,
                  { backgroundColor: t.card2, borderColor: t.border, color: t.text },
                ]}
              />
            )}
            <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17, marginTop: 10 }}>
              {tr('workerHome.f1')}
            </Text>
          </Card>
        )}

        {/* Forma: "Qiziq emas" sabablari */}
        {open === 'skip' && (
          <Card t={t}>
            <Text style={labelStyle(t)}>{tr('workerOrders.skipTitle')}</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.8}
                  disabled={busy}
                  onPress={() => run(skip, { id: order.id, reason: r }, goBack)}
                  style={[s.reason, { backgroundColor: t.card2, borderColor: t.border }]}
                >
                  <Text style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: '600' }}>
                    {tr(`workerOrders.reason.${r}`)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {!!error && (
          <View style={[s.err]}>
            <Ionicons name="alert-circle" size={18} color="#e5484d" />
            <Text style={{ flex: 1, color: '#e5484d', fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        )}

        {/* Amallar */}
        <View style={{ gap: 10 }}>
          {isOpen && !mine && !open && (
            <>
              {gate.locked ? (
                <Btn
                  busy={busy}
                  t={t}
                  icon="lock-closed"
                  label={tr('workerHome.gateBtn')}
                  onPress={() => router.navigate('/profile')}
                />
              ) : (
                <Btn
                  busy={busy}
                  t={t}
                  icon="paper-plane"
                  label={tr('workerOrders.sendOffer')}
                  onPress={() => startOffer('offer')}
                />
              )}
              <Btn
                busy={busy}
                t={t}
                kind="ghost"
                icon="close-circle-outline"
                label={tr('workerOrders.skip')}
                onPress={() => {
                  setError('');
                  setMode('skip');
                }}
              />
            </>
          )}

          {open === 'offer' && (
            <>
              <Btn
                busy={busy}
                t={t}
                icon="paper-plane"
                disabled={!price}
                label={sendOffer.isPending ? tr('workerOrders.sending') : tr('workerOrders.send')}
                onPress={() =>
                  run(sendOffer, {
                    id: order.id,
                    payload: { price, comment: comment.trim() || null, as_brigade: false },
                  })
                }
              />
              <Btn
                busy={busy}
                t={t}
                kind="ghost"
                label={tr('workerOrders.cancel')}
                onPress={() => setMode(null)}
              />
            </>
          )}

          {open === 'reprice' && (
            <>
              <Btn
                busy={busy}
                t={t}
                disabled={!price}
                label={tr('workerOrders.send')}
                onPress={() => run(reprice, { id: order.id, payload: { price } })}
              />
              <Btn
                busy={busy}
                t={t}
                kind="ghost"
                label={tr('workerOrders.cancel')}
                onPress={() => setMode(null)}
              />
            </>
          )}

          {open === 'skip' && (
            <Btn
              busy={busy}
              t={t}
              kind="ghost"
              label={tr('workerOrders.cancel')}
              onPress={() => setMode(null)}
            />
          )}

          {!!mine && isOpen && !open && (
            <>
              <Btn
                busy={busy}
                t={t}
                kind="ghost"
                icon="create-outline"
                label={tr('workerOrders.reprice')}
                onPress={() => startOffer('reprice')}
              />
              <Btn
                busy={busy}
                t={t}
                kind="danger"
                icon="arrow-undo-outline"
                label={tr('workerOrders.withdraw')}
                onPress={() => run(withdraw, order.id)}
              />
            </>
          )}

          {awaitingAgree && (
            <>
              <Btn
                busy={busy}
                t={t}
                icon="checkmark-circle"
                label={tr('workerOrders.agree')}
                onPress={() => run(agree, order.id)}
              />
              <Btn
                busy={busy}
                t={t}
                kind="danger"
                icon="close-circle-outline"
                label={tr('workerOrders.decline')}
                onPress={() => run(decline, order.id, goBack)}
              />
            </>
          )}

          {inProgress && (
            <>
              {!!phone && (
                <Btn
                  busy={busy}
                  t={t}
                  icon="call"
                  label={tr('workerHome.call')}
                  onPress={() => Linking.openURL(`tel:${phone}`)}
                />
              )}
              {!!hasGps && (
                <Btn
                  busy={busy}
                  t={t}
                  kind="ghost"
                  icon="navigate"
                  label={tr('workerHome.route')}
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1&destination=${order.gps_lat},${order.gps_lng}`
                    )
                  }
                />
              )}
              {!order.worker_done_at && (
                <Btn
                  busy={busy}
                  t={t}
                  kind="ghost"
                  icon="checkmark-done"
                  label={tr('workerOrders.workDone')}
                  onPress={() => run(done, order.id)}
                />
              )}
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 16, borderRadius: 18, borderWidth: 1 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  photo: { width: 150, height: 110, borderRadius: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  comment: {
    marginTop: 10,
    minHeight: 80,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  err: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(229,72,77,0.12)',
  },
});
