import { useState } from 'react';
import { View, Text, TextInput, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import {
  getOrderPayment,
  getPaymentProviders,
  startOrderPayment,
  payDeposit,
  providerLabel,
  paymentLocale,
} from '../../api/customerFlow';
import { Button, Chip, Notice, Muted, useL, fill, stamp, money } from './ui';

const TEXTS = {
  uz: {
    title: "Tizim orqali to'lash",
    paid: "To'langan",
    paidNote:
      "To'lov mutaxassis hisobiga o'tkazildi. Muammo bo'lsa, qo'llab-quvvatlash orqali murojaat qiling.",
    refunded: "To'lov bekor qilindi — pul kartangizga qaytariladi",
    receipt: 'Chek',
    guarantee:
      "Ilova orqali to'lasangiz — Harna kafolati: ish sifatsiz bo'lsa, tuzatiladi yoki {cap} so'mgacha qaytariladi",
    guaranteeFix:
      "Ilova orqali to'lasangiz — Harna kafolati: ish sifatsiz bo'lsa, tuzatib beriladi",
    refundNotice:
      "Tizim orqali to'lasangiz, to'lov qayd etilib qoladi va nizo chiqsa u dalil bo'lib xizmat qiladi — operator masalani ko'rib chiqadi. Naqd to'lovda hech qanday qayd qolmaydi.",
    amount: "Summa (so'm)",
    amountRequired: 'Summani kiriting',
    pay: "To'lash",
    safety:
      "Karta ma'lumotlari to'lov tizimining o'z sahifasida kiritiladi — ilova ularni ko'rmaydi.",
    noProvider: "Onlayn to'lov hozircha ulanmagan.",
    failed: "To'lov tizimlarini yuklab bo'lmadi.",
    retry: 'Qayta urinish',
    err: 'Xatolik yuz berdi',
    depPay: "Omonatni to'lang: {amount} so'm — {due} gacha. To'lanmasa, buyurtma bekor qilinadi.",
    depHeld: "Omonat to'landi: {amount} so'm",
    depRefundLate: "Omonat buyurtma yopilgandan keyin keldi — {amount} so'm qaytariladi",
    depRefundDue: "Omonat qaytariladi: {amount} so'm — xodimlarimiz to'lab beradi",
    depRefunded: "Omonat qaytarildi: {amount} so'm",
    depForfeited: "Omonat ustaga o'tkazildi",
    depNoContact: "Omonat ustaga o'tkazildi: usta siz bilan bog'lana olmagani tasdiqlandi",
    depNoWork: "Omonat ustaga o'tkazildi: usta kelganda ish qildirilmagani tasdiqlandi",
    depFault: "Omonat ustaga o'tkazildi: bekor qilish sizning aybingiz bilan deb topildi",
    depUnpaid: "Omonat to'lanmadi — buyurtma bekor qilindi",
    depWaived: "Omonat talab qilinmaydigan bo'ldi — buyurtma e'lon qilindi",
  },
  ru: {
    title: 'Оплата через систему',
    paid: 'Оплачено',
    paidNote: 'Оплата переведена на счёт специалиста. При проблемах обратитесь в поддержку.',
    refunded: 'Платёж отменён — деньги вернутся на вашу карту',
    receipt: 'Чек',
    guarantee:
      'Оплата через приложение — гарантия Harna: при некачественной работе исправят или вернут до {cap} сум',
    guaranteeFix: 'Оплата через приложение — гарантия Harna: при некачественной работе исправят',
    refundNotice:
      'При оплате через систему платёж фиксируется и в споре служит доказательством — вопрос рассмотрит оператор. При оплате наличными записей не остаётся.',
    amount: 'Сумма (сум)',
    amountRequired: 'Введите сумму',
    pay: 'Оплатить',
    safety: 'Данные карты вводятся на странице платёжной системы — приложение их не видит.',
    noProvider: 'Онлайн-оплата пока не подключена.',
    failed: 'Не удалось загрузить платёжные системы.',
    retry: 'Повторить',
    err: 'Произошла ошибка',
    depPay: 'Внесите залог: {amount} сум — до {due}. Иначе заказ будет отменён.',
    depHeld: 'Залог внесён: {amount} сум',
    depRefundLate: 'Залог пришёл после закрытия заказа — {amount} сум будет возвращено',
    depRefundDue: 'Залог будет возвращён: {amount} сум — переведут наши сотрудники',
    depRefunded: 'Залог возвращён: {amount} сум',
    depForfeited: 'Залог передан специалисту',
    depNoContact:
      'Залог передан специалисту: подтверждено, что специалист не смог связаться с вами',
    depNoWork: 'Залог передан специалисту: подтверждено, что работу не дали сделать',
    depFault: 'Залог передан специалисту: отмена признана по вашей вине',
    depUnpaid: 'Залог не внесён — заказ отменён',
    depWaived: 'Залог больше не требуется — заказ опубликован',
  },
  en: {
    title: 'Pay through the app',
    paid: 'Paid',
    paidNote: 'The payment went to the specialist. If there is a problem, contact support.',
    refunded: 'Payment cancelled — the money returns to your card',
    receipt: 'Receipt',
    guarantee: 'Pay in the app — Harna guarantee: poor work is fixed or refunded up to {cap} UZS',
    guaranteeFix: 'Pay in the app — Harna guarantee: poor work is fixed',
    refundNotice:
      'Paying through the app records the payment and it serves as evidence in a dispute — an operator reviews it. Cash leaves no record.',
    amount: 'Amount (UZS)',
    amountRequired: 'Enter the amount',
    pay: 'Pay',
    safety: 'Card details are entered on the payment provider page — the app never sees them.',
    noProvider: 'Online payment is not connected yet.',
    failed: 'Could not load payment providers.',
    retry: 'Retry',
    err: 'Something went wrong',
    depPay: 'Pay the deposit: {amount} UZS — by {due}. Otherwise the order is cancelled.',
    depHeld: 'Deposit paid: {amount} UZS',
    depRefundLate: 'The deposit arrived after the order closed — {amount} UZS will be refunded',
    depRefundDue: 'Deposit will be refunded: {amount} UZS — our staff will pay it out',
    depRefunded: 'Deposit refunded: {amount} UZS',
    depForfeited: 'The deposit went to the specialist',
    depNoContact: 'The deposit went to the specialist: it was confirmed they could not reach you',
    depNoWork: 'The deposit went to the specialist: it was confirmed they were not let work',
    depFault: 'The deposit went to the specialist: the cancellation was found to be your fault',
    depUnpaid: 'Deposit not paid — order cancelled',
    depWaived: 'The deposit is no longer required — the order was published',
  },
};

// Provider tugmalari: to'lov sahifasi tizim brauzerida ochiladi.
function ProviderButtons({ providers, labels, busy, onPick }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {providers.map((p, i) => (
        <View key={p} style={{ minWidth: 120 }}>
          <Button
            t={labels.t}
            kind={i === 0 ? 'primary' : 'ghost'}
            label={providerLabel(p, labels.map)}
            busy={busy === p}
            disabled={busy != null && busy !== p}
            onPress={() => onPick(p)}
          />
        </View>
      ))}
    </View>
  );
}

const useProviders = () =>
  useQuery({
    queryKey: ['customerFlow', 'providers'],
    queryFn: getPaymentProviders,
    staleTime: 60000,
  });

// Tugagan buyurtma uchun onlayn to'lov (summa + "To'lash"), to'langan bo'lsa chek.
export function PaymentBlock({ order, onChanged }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = useL(TEXTS);
  const qc = useQueryClient();
  const pay = useQuery({
    queryKey: ['customerFlow', 'payment', order.id],
    queryFn: () => getOrderPayment(order.id),
  });
  const prov = useProviders();
  const [amount, setAmount] = useState(
    order.agreedPrice != null ? String(Math.round(order.agreedPrice)) : ''
  );
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(null);

  const p = pay.data;
  const providers = prov.data?.orderProviders ?? [];
  const provider = chosen && providers.includes(chosen) ? chosen : (providers[0] ?? null);
  const amountNum = Number(String(amount).replace(/\D/g, ''));

  const open = async (url) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } finally {
      qc.invalidateQueries({ queryKey: ['customerFlow', 'payment', order.id] });
      onChanged?.();
    }
  };

  const start = async () => {
    if (!amountNum) {
      appAlert(x.amountRequired);
      return;
    }
    if (!provider) return;
    setBusy(provider);
    try {
      const r = await startOrderPayment(
        order.id,
        amountNum,
        provider,
        paymentLocale(provider, language)
      );
      if (r?.checkout_url) await open(r.checkout_url);
    } catch (e) {
      appAlert(e?.message || x.err);
      qc.invalidateQueries({ queryKey: ['customerFlow', 'payment', order.id] });
    } finally {
      setBusy(null);
    }
  };

  const receipt = p?.receipt_url ? (
    <Text
      onPress={() => Linking.openURL(p.receipt_url)}
      style={{ color: t.orange, fontWeight: '700', fontSize: 13.5 }}
    >
      {x.receipt}
    </Text>
  ) : null;

  if (p?.state === 'paid') {
    return (
      <Notice
        tone="ok"
        icon="checkmark-circle"
        title={`${x.paid} · ${money(p.amount_tiyin / 100)}`}
      >
        <Muted>{x.paidNote}</Muted>
        {receipt}
      </Notice>
    );
  }
  if (p?.state === 'refunded') {
    return (
      <Notice title={x.refunded}>
        {!!p.refund_reason && <Muted>{p.refund_reason}</Muted>}
        {receipt}
      </Notice>
    );
  }

  const cap = Number(p?.guarantee?.cap ?? prov.data?.guaranteeCap) || 0;
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.card,
      }}
    >
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{x.title}</Text>
      {!!p?.guarantee && (
        <Notice
          tone="ok"
          icon="shield-checkmark"
          title={cap > 0 ? fill(x.guarantee, { cap: money(cap) }) : x.guaranteeFix}
        />
      )}
      <Muted>{x.refundNotice}</Muted>
      <View>
        <Text style={{ color: t.muted, fontSize: 12, marginBottom: 4 }}>{x.amount}</Text>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          style={{
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.inputBg,
            color: t.text,
            fontSize: 16,
            fontWeight: '700',
          }}
        />
      </View>
      {providers.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {providers.map((id) => (
            <Chip
              key={id}
              label={providerLabel(id, prov.data?.labels)}
              active={id === provider}
              onPress={() => setChosen(id)}
            />
          ))}
        </View>
      )}
      {prov.isError ? (
        <View style={{ gap: 8 }}>
          <Muted>{x.failed}</Muted>
          <Button t={t} kind="ghost" label={x.retry} onPress={() => prov.refetch()} />
        </View>
      ) : !prov.isLoading && !provider ? (
        <Muted>{x.noProvider}</Muted>
      ) : (
        <Button
          t={t}
          label={x.pay}
          busy={busy != null}
          disabled={!provider || !amountNum}
          onPress={start}
        />
      )}
      <Text style={{ color: t.faint, fontSize: 11.5, lineHeight: 16 }}>{x.safety}</Text>
    </View>
  );
}

// Omonat: kutilayotgan bo'lsa to'lash tugmalari, aks holda holat xabari.
export function DepositBlock({ order, onChanged }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = useL(TEXTS);
  const prov = useProviders();
  const [busy, setBusy] = useState(null);
  const d = order.deposit;
  if (!d) return null;
  const amount = money(d.amount);

  if (d.status === 'pending') {
    if (prov.data?.depositEnabled === false) return null;
    const providers = prov.data?.depositProviders ?? [];
    const go = async (provider) => {
      setBusy(provider);
      try {
        const r = await payDeposit(order.id, provider, paymentLocale(provider, language));
        if (r?.checkout_url) {
          try {
            await WebBrowser.openBrowserAsync(r.checkout_url);
          } finally {
            onChanged?.();
          }
        }
      } catch (e) {
        appAlert(e?.message || x.err);
        onChanged?.();
      } finally {
        setBusy(null);
      }
    };
    return (
      <Notice
        tone="warn"
        icon="wallet-outline"
        title={fill(x.depPay, { amount, due: d.due_at ? stamp(d.due_at) : '—' })}
      >
        {prov.isLoading ? null : providers.length === 0 ? (
          <Muted>{x.noProvider}</Muted>
        ) : (
          <ProviderButtons
            providers={providers}
            labels={{ t, map: prov.data?.labels }}
            busy={busy}
            onPick={go}
          />
        )}
      </Notice>
    );
  }

  let text = null;
  let tone = 'info';
  switch (d.status) {
    case 'held':
      text = fill(x.depHeld, { amount });
      break;
    case 'refund_due':
      text = fill(d.resolution === 'late_payment' ? x.depRefundLate : x.depRefundDue, { amount });
      break;
    case 'refunded':
      text = fill(x.depRefunded, { amount });
      tone = 'ok';
      break;
    case 'forfeited':
      tone = 'warn';
      text =
        d.resolution === 'no_contact'
          ? x.depNoContact
          : d.resolution === 'no_work'
            ? x.depNoWork
            : d.resolution === 'customer_fault'
              ? x.depFault
              : x.depForfeited;
      break;
    case 'void':
      if (d.resolution === 'unpaid') {
        text = x.depUnpaid;
        tone = 'warn';
      } else if (d.resolution === 'waived') text = x.depWaived;
      break;
    default:
      break;
  }
  return text ? <Notice tone={tone} icon="wallet-outline" title={text} /> : null;
}
