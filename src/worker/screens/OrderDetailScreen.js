import { useState } from 'react';
import { View, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { statusMeta } from '../components';
import {
  Screen,
  Card,
  H,
  Muted,
  Txt,
  Pill,
  Btn,
  Field,
  Row,
  Loading,
  ErrorBox,
  money,
  num,
  fmtDate,
} from '../ui';

const REASONS = ['price_low', 'too_far', 'busy', 'not_my_trade'];

function OfferForm({ order, quote, onDone }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [price, setPrice] = useState(
    order.budget && num(order.budget) > 0 ? String(Math.round(num(order.budget))) : ''
  );
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(
    order.timing_kind === 'on_date' ? order.scheduled_date || '' : ''
  );
  const send = useMutation({
    mutationFn: () =>
      api.sendOffer(order.id, {
        price: price.replace(/\s/g, ''),
        comment: comment.trim() || undefined,
        scheduled_date: date.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w'] });
      onDone();
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  const fee = num(quote?.fee);
  return (
    <Card>
      <H>{t('w.order.sendOffer')}</H>
      <Field
        label={t('w.order.price')}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="150000"
      />
      {order.timing_kind === 'on_date' || order.scheduled_date ? (
        <Field
          label={t('w.order.date')}
          value={date}
          onChangeText={setDate}
          placeholder="2026-11-05"
        />
      ) : null}
      <Field
        label={t('w.order.comment')}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={500}
      />
      {quote?.fees_enabled && fee > 0 ? (
        <Muted>
          {t('w.order.feeNote', { fee: money(fee, t), avail: money(quote.available, t) })}
        </Muted>
      ) : (
        <Muted>{t('w.order.offerFree')}</Muted>
      )}
      {quote?.blocked_reason ? <Muted>{quote.blocked_reason}</Muted> : null}
      <Btn
        label={t('w.order.sendOffer')}
        loading={send.isPending}
        disabled={num(price) <= 0 || !!quote?.blocked_reason}
        onPress={() => send.mutate()}
      />
    </Card>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [counter, setCounter] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const q = useQuery({
    queryKey: ['w', 'order', id],
    queryFn: () => api.getOrder(id),
    refetchInterval: 20000,
  });
  const order = q.data;
  const meId = me.data?.id;
  const isOpenPool = order?.status === 'pending' && !order?.worker;
  const needQuote = isOpenPool && !order?.my_offer;
  const quote = useQuery({
    queryKey: ['w', 'quote', id],
    queryFn: () => api.getMatchQuote(id),
    enabled: !!needQuote,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['w'] });
  };
  const useAct = (fn, { back = false } = {}) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        refresh();
        if (back) router.back();
      },
      onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
    });

  const accept = useAct(() => api.acceptOrder(id));
  const reject = useAct((reason) => api.rejectOrder(id, reason), { back: true });
  const decline = useAct((reason) => api.declineOrder(id, reason), { back: true });
  const agree = useAct(() => api.agreeOrder(id, {}));
  const counterOffer = useAct(() => api.offerPrice(id, { price: counter.replace(/\s/g, '') }));
  const withdraw = useAct(() => api.withdrawOffer(id));
  const skip = useAct((reason) => api.skipOrder(id, reason), { back: true });
  const done = useAct(() => api.workDone(id));
  const cancel = useAct(() => api.cancelByWorker(id, cancelReason.trim()), { back: true });

  if (q.isPending || me.isPending)
    return (
      <Screen title={t('w.order.title')}>
        <Loading />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen title={t('w.order.title')}>
        <ErrorBox error={q.error} onRetry={q.refetch} />
      </Screen>
    );

  const mine = order.worker?.id === meId;
  const meta = statusMeta({ ...order, worker_id: order.worker?.id }, t, theme, meId);
  const title =
    (order.tasks || []).map((x) => x.name).join(', ') || order.category?.name || order.code;
  const place = [order.region, order.district, order.mahalla].filter(Boolean).join(', ');
  const canChat =
    (order.status === 'accepted' || order.status === 'active' || order.status === 'completed') &&
    mine;
  const hasOffer = order.my_offer && order.my_offer.status === 'pending';
  const lastOfferByCustomer = order.offer_by === 'customer' && num(order.offer_price) > 0;

  const askReason = (title2, fn) => {
    appAlert(title2, t('w.order.reasonAsk'), [
      ...REASONS.map((r) => ({ text: t(`w.reason.${r}`), onPress: () => fn(r) })),
      { style: 'cancel' },
    ]);
  };

  return (
    <Screen title={`#${order.code}`} onRefresh={refresh} refreshing={q.isRefetching}>
      <Card>
        <Pill label={meta.label} color={meta.color} />
        <H>{title}</H>
        {order.description ? <Txt>{order.description}</Txt> : null}
        <Row label={t('w.order.customer')} value={order.customer?.full_name} />
        <Row label={t('w.order.place')} value={place} />
        <Row label={t('w.order.landmark')} value={order.location_landmark} />
        <Row
          label={t('w.order.when')}
          value={
            order.scheduled_date ||
            (order.timing_kind ? t(`w.timing.${order.timing_kind}`) : '') ||
            ''
          }
        />
        <Row
          label={t('w.order.budget')}
          value={num(order.budget) > 0 ? money(order.budget, t) : ''}
        />
        <Row
          label={t('w.order.agreed')}
          value={num(order.agreed_price) > 0 ? money(order.agreed_price, t) : ''}
          bold
        />
        <Row
          label={t('w.order.payment')}
          value={order.payment_method ? t(`w.pay.${order.payment_method}`) : ''}
        />
        <Row label={t('w.order.createdAt')} value={fmtDate(order.created_at, language)} />
        {order.status === 'cancelled' ? (
          <Row label={t('w.order.cancelReason')} value={order.cancel_reason} />
        ) : null}
      </Card>

      {mine && order.contact_phone && order.status !== 'cancelled' ? (
        <Card>
          <H>{t('w.order.contacts')}</H>
          <Row label={t('w.order.phone')} value={order.contact_phone} />
          <Btn
            kind="ghost"
            icon="call-outline"
            label={t('w.order.call')}
            onPress={() => Linking.openURL(`tel:${order.contact_phone}`)}
          />
        </Card>
      ) : null}

      {/* ── Ochiq buyurtma: taklif yuborish ── */}
      {isOpenPool && !hasOffer && order.status === 'pending' ? (
        <>
          <OfferForm order={order} quote={quote.data} onDone={refresh} />
          <Btn
            kind="ghost"
            label={t('w.order.notInterested')}
            onPress={() => askReason(t('w.order.notInterested'), (r) => skip.mutate(r))}
          />
        </>
      ) : null}

      {/* ── Taklif yuborilgan ── */}
      {isOpenPool && hasOffer ? (
        <Card>
          <H>{t('w.order.yourOffer')}</H>
          <Txt style={{ fontWeight: '800', fontSize: 18 }}>{money(order.my_offer.price, t)}</Txt>
          <Muted>{t('w.order.waitingCustomer')}</Muted>
          <Btn
            kind="danger"
            label={t('w.order.withdraw')}
            loading={withdraw.isPending}
            onPress={() =>
              appConfirm({
                title: t('w.order.withdraw'),
                message: t('w.order.withdrawAsk'),
                confirmLabel: t('w.order.withdraw'),
                destructive: true,
                onConfirm: () => withdraw.mutate(),
              })
            }
          />
        </Card>
      ) : null}

      {/* ── Menga yo'llangan yangi buyurtma ── */}
      {order.status === 'pending' && mine ? (
        <Card>
          <H>{t('w.order.sentToYou')}</H>
          <Btn
            label={t('w.order.startTalk')}
            loading={accept.isPending}
            onPress={() => accept.mutate()}
          />
          <Btn
            kind="ghost"
            label={t('w.order.reject')}
            onPress={() => askReason(t('w.order.reject'), (r) => reject.mutate(r))}
          />
        </Card>
      ) : null}

      {/* ── Kelishuv bosqichi ── */}
      {order.status === 'accepted' && mine ? (
        <Card>
          <H>{t('w.order.negotiation')}</H>
          {num(order.offer_price) > 0 ? (
            <Txt>
              {t(order.offer_by === 'worker' ? 'w.order.youOffered' : 'w.order.customerOffered', {
                sum: money(order.offer_price, t),
              })}
            </Txt>
          ) : (
            <Muted>{t('w.order.noPriceYet')}</Muted>
          )}
          {lastOfferByCustomer ? (
            <Btn
              kind="green"
              label={t('w.order.agree')}
              loading={agree.isPending}
              onPress={() => agree.mutate()}
            />
          ) : null}
          <Field
            label={t('w.order.yourPrice')}
            value={counter}
            onChangeText={setCounter}
            keyboardType="numeric"
          />
          <Btn
            label={t('w.order.offerPrice')}
            disabled={num(counter) <= 0}
            loading={counterOffer.isPending}
            onPress={() => counterOffer.mutate()}
          />
          <Btn
            kind="ghost"
            label={t('w.order.decline')}
            onPress={() => askReason(t('w.order.decline'), (r) => decline.mutate(r))}
          />
        </Card>
      ) : null}

      {/* ── Faol ish ── */}
      {order.status === 'active' && mine ? (
        <Card>
          {order.worker_done_at ? (
            <Muted>{t('w.order.waitConfirm')}</Muted>
          ) : (
            <Btn
              kind="green"
              icon="checkmark-circle-outline"
              label={t('w.order.workDone')}
              loading={done.isPending}
              onPress={() =>
                appConfirm({
                  title: t('w.order.workDone'),
                  message: t('w.order.workDoneAsk'),
                  confirmLabel: t('w.order.workDone'),
                  onConfirm: () => done.mutate(),
                })
              }
            />
          )}
          {showCancel ? (
            <>
              <Field
                label={t('w.order.cancelReason')}
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                maxLength={500}
              />
              <Btn
                kind="danger"
                label={t('w.order.cancelOrder')}
                disabled={cancelReason.trim().length < 5}
                loading={cancel.isPending}
                onPress={() => cancel.mutate()}
              />
            </>
          ) : (
            <Btn
              kind="ghost"
              label={t('w.order.cancelOrder')}
              onPress={() => setShowCancel(true)}
            />
          )}
        </Card>
      ) : null}

      {canChat ? (
        <Btn
          icon="chatbubbles-outline"
          label={t('w.order.chat')}
          onPress={() => router.push(`/order-chat/${order.id}`)}
        />
      ) : null}
      {hasOffer || (order.status === 'pending' && mine) ? (
        <Btn
          kind="ghost"
          icon="chatbubbles-outline"
          label={t('w.order.chat')}
          onPress={() => router.push(`/order-chat/${order.id}`)}
        />
      ) : null}
      <View style={{ height: 20 }} />
    </Screen>
  );
}
