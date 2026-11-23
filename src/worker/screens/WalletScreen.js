import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { scanCard } from '../cardScan';
import TopupReceiptSheet from '../components/TopupReceiptSheet';
import HarnaCard from '../components/HarnaCard';
import PayProviderTile from '../components/PayProviderTile';
import {
  Screen,
  Muted,
  Txt,
  Btn,
  Segments,
  Loading,
  ErrorBox,
  Empty,
  Pill,
  money,
  num,
  fmtDate,
} from '../ui';

// To'ldirish qatori: «Top-up via Click (tx=<id>)». Shu `tx` to'ldirishlar ro'yxatidagi
// `provider_tx_id` bilan bir xil, chek havolasi shu orqali topiladi (sayt: `topupTxKey`).
const TOPUP_LINE = /^Top-up via [A-Za-z]+ \(tx=(.+)\)$/;
const topupTxKey = (tx) =>
  tx.type === 'payment' ? (TOPUP_LINE.exec(tx.description ?? '')?.[1] ?? null) : null;
const receiptHref = (url) => {
  const link = typeof url === 'string' ? url.trim() : '';
  return /^https?:\/\/\S+$/i.test(link) ? link : null;
};
// Soliq idorasi sahifasi ilova ichidagi brauzerda; ochilmasa telefonning o'z brauzerida.
const openReceipt = async (url) => {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
};

// Tarixni kunlar bo'yicha guruhlash: «Bugun», «Kecha», keyin sana.
const DAY_WORDS = {
  uz: ['Bugun', 'Kecha'],
  ru: ['Сегодня', 'Вчера'],
  en: ['Today', 'Yesterday'],
};
const spaced = (v) => String(v || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cardSpaced = (v) =>
  String(v || '')
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
// Karta raqami tarixda yashiriladi: «8600 •••• •••• 1234».
const maskCard = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 12 ? `${d.slice(0, 4)} •••• ${d.slice(-4)}` : String(v || '');
};
const pad = (n) => String(n).padStart(2, '0');
const clock = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function groupByDay(list, language) {
  const words = DAY_WORDS[language] ?? DAY_WORDS.uz;
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOf(new Date());
  const map = new Map();
  for (const x of list) {
    const d = new Date(x.created_at);
    const diff = Math.round((today - startOf(d)) / 86400000);
    const label = Number.isNaN(d.getTime())
      ? '—'
      : diff === 0
        ? words[0]
        : diff === 1
          ? words[1]
          : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(x);
  }
  return [...map.entries()];
}
const PROVIDER_NAMES = { payme: 'Payme', click: 'Click', uzum: 'Uzum' };
const providerLabel = (p) => PROVIDER_NAMES[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : '');
// «Top-up via Click (tx=...)» — texnik matn, foydalanuvchiga ko'rsatilmaydi.
const cleanDesc = (d) => (d && !TOPUP_LINE.test(d) ? d : '');

// Hisob raqami orqali to'lanadigan tizimlar (Paynet, Uzum Bank): sahifa ochilmaydi, usta o'z raqamini
// ilovada kiritadi. Server ularni `GET /wallet/topup/account` da `providers` ro'yxatida beradi.
const ACCOUNT_SYSTEMS = ['paynet', 'uzumbank'];

// Hisob raqami kartasi: raqam katta, nusxalash tugmasi va 3 qadam (sayt TopupAccountCard bilan bir xil).
function AccountCard({ number, systems, x, theme }) {
  const names = systems.map((p) => (p === 'uzumbank' ? 'Uzum Bank' : 'Paynet')).join(` ${x.or} `);
  const steps = [
    systems.includes('paynet') ? `${x.stepApp(names)} ${x.stepTerminal}` : x.stepApp(names),
    x.stepService,
    x.stepNumber(number),
  ];
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
        gap: 14,
      }}
    >
      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{x.accTitle}</Text>
      <View
        style={{
          alignItems: 'center',
          paddingVertical: 14,
          borderRadius: 16,
          backgroundColor: theme.bg,
        }}
      >
        <Text
          selectable
          style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: 3 }}
        >
          {number}
        </Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          Clipboard.setStringAsync(number).then(
            () => appAlert(x.accCopied),
            () => undefined
          )
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: 46,
          borderRadius: 14,
          backgroundColor: theme.orange + '22',
        }}
      >
        <Ionicons name="copy-outline" size={18} color={theme.orange} />
        <Text style={{ color: theme.orange, fontWeight: '800', fontSize: 14.5 }}>{x.accCopy}</Text>
      </TouchableOpacity>
      {steps.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.orange,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12.5 }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: theme.text, fontSize: 14, lineHeight: 20 }}>{step}</Text>
        </View>
      ))}
      <Muted style={{ fontSize: 12, lineHeight: 17 }}>{x.accNote}</Muted>
    </View>
  );
}

const BAL_TEXTS = {
  uz: {
    choose: "To'lov usulini tanlang",
    all: 'Hammasi',
    soon: 'Tez orada',
    scan: 'Kartani skanerlash',
    scanFail:
      "Karta raqami topilmadi. Kartani tekis, yorug' joyda va raqamlari aniq ko'rinadigan qilib suratga oling yoki raqamni qo'lda yozing.",
    scanDenied:
      "Kameraga ruxsat berilmagan. Telefon sozlamalaridan ruxsat bering yoki raqamni qo'lda yozing.",
    or: 'yoki',
    accTitle: "Hisob raqami orqali to'ldirish",
    accCopy: 'Raqamni nusxalash',
    accCopied: 'Raqam nusxalandi',
    stepApp: (n) => `${n} ilovasini oching`,
    stepTerminal: "(Paynet terminalida ham to'lash mumkin).",
    stepService: "Xizmatlar ro'yxatidan «Harna» ni tanlang.",
    stepNumber: (n) => `Hisob raqami sifatida ${n} ni kiriting va summani to'lang.`,
    accNote:
      "To'langan pul hamyonga tushadi va faqat platforma xizmatlari uchun sarflanadi, yechib bo'lmaydi.",
    over: "Mablag' yetarli emas",
    after: 'Yangi balans',
    min: "Kamida 1 000 so'm",
    withdrawable: 'Yechib olish mumkin',
    withdrawableHint: "Mijozlar ish uchun onlayn to'lagan pul",
    services: 'Faqat xizmatlar uchun',
    servicesHint: "Siz to'ldirgan pul: komissiya, TOP va Pro uchun, yechib bo'lmaydi",
    bonus: 'Bonus balans',
    bonusHint: "Faqat taklif uchun to'lovga sarflanadi, yechib bo'lmaydi",
  },
  ru: {
    choose: 'Выберите способ оплаты',
    all: 'Всё',
    soon: 'Скоро',
    scan: 'Сканировать карту',
    scanFail:
      'Номер карты не найден. Снимите карту ровно, при хорошем свете, чтобы цифры были чёткими, или введите номер вручную.',
    scanDenied:
      'Нет доступа к камере. Разрешите его в настройках телефона или введите номер вручную.',
    or: 'или',
    accTitle: 'Пополнение по номеру счёта',
    accCopy: 'Скопировать номер',
    accCopied: 'Номер скопирован',
    stepApp: (n) => `Откройте приложение ${n}`,
    stepTerminal: '(Paynet также принимает платёж в терминалах).',
    stepService: 'В списке услуг выберите «Harna».',
    stepNumber: (n) => `Введите номер счёта ${n} и оплатите сумму.`,
    accNote:
      'Оплаченная сумма зачисляется в кошелёк и тратится только на услуги платформы, вывести нельзя.',
    over: 'Недостаточно средств',
    after: 'Новый баланс',
    min: 'Минимум 1 000 сум',
    withdrawable: 'Можно вывести',
    withdrawableHint: 'Деньги, которые клиенты оплатили онлайн за работу',
    services: 'Только для услуг',
    servicesHint: 'Пополненные вами деньги: идут на комиссию, TOP и Pro, вывести нельзя',
    bonus: 'Бонусный баланс',
    bonusHint: 'Тратится только на оплату за подбор, вывести нельзя',
  },
  en: {
    choose: 'Choose a payment method',
    all: 'All',
    soon: 'Soon',
    scan: 'Scan card',
    scanFail:
      'No card number found. Photograph the card flat, in good light, with the digits clear, or type the number.',
    scanDenied: 'Camera access is off. Allow it in the phone settings or type the number.',
    or: 'or',
    accTitle: 'Top up by account number',
    accCopy: 'Copy the number',
    accCopied: 'Number copied',
    stepApp: (n) => `Open the ${n} app`,
    stepTerminal: '(Paynet also takes it at its terminals).',
    stepService: 'Find «Harna» in the list of services.',
    stepNumber: (n) => `Enter ${n} as the account number and pay the amount.`,
    accNote:
      'The money lands in your wallet and pays for platform services only; it cannot be withdrawn.',
    over: 'Insufficient funds',
    after: 'New balance',
    min: 'Minimum 1 000 UZS',
    withdrawable: 'Available to withdraw',
    withdrawableHint: 'Money customers paid online for your work',
    services: 'For services only',
    servicesHint: 'Money you topped up: used for fees, TOP and Pro, cannot be withdrawn',
    bonus: 'Bonus balance',
    bonusHint: 'Only spent on match fees, cannot be withdrawn',
  },
};

export default function WalletScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState('tx');
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState(null);
  const [wAmount, setWAmount] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [hint, setHint] = useState(0); // balans tarkibida tanlangan ustun
  const [sheet, setSheet] = useState(null); // ochiq kvitansiya (to'ldirish)

  const bal = useQuery({ queryKey: ['w', 'balance'], queryFn: api.getBalance });
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe }); // kartadagi ism uchun
  const providers = useQuery({ queryKey: ['w', 'providers'], queryFn: api.getPaymentProviders });
  const tx = useQuery({ queryKey: ['w', 'tx'], queryFn: () => api.getTransactions(50) });
  const wd = useQuery({ queryKey: ['w', 'withdrawals'], queryFn: () => api.getWithdrawals(30) });
  // Chek havolalari uchun: xato bo'lsa tarix shunchaki havolasiz ko'rinadi.
  const topups = useQuery({ queryKey: ['w', 'topups'], queryFn: () => api.getTopupIntents(50) });
  const receipts = new Map(
    (topups.data || [])
      .filter((i) => i.provider_tx_id)
      .map((i) => [
        String(i.provider_tx_id),
        {
          url: receiptHref(i.receipt_url),
          amount: num(i.amount_tiyin) / 100,
          provider: i.provider,
          txId: String(i.provider_tx_id),
          date: i.created_at,
        },
      ])
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['w'] });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));

  const account = useQuery({
    queryKey: ['w', 'topupAccount'],
    queryFn: api.getTopupAccount,
    retry: false,
  });
  const accountNumber =
    typeof account.data?.account_number === 'string' ? account.data.account_number.trim() : '';
  const accountList = accountNumber
    ? (account.data?.providers || []).filter((p) => ACCOUNT_SYSTEMS.includes(p))
    : [];
  const list = (providers.data?.providers || []).filter((p) => !ACCOUNT_SYSTEMS.includes(p));
  const isAccount = accountList.includes(provider);
  const chosen = isAccount ? provider : provider || list[0];

  const topup = useMutation({
    mutationFn: () => api.createTopupIntent(amount.replace(/\s/g, ''), chosen, language),
    onSuccess: async (intent) => {
      await WebBrowser.openBrowserAsync(intent.checkout_url);
      refresh();
    },
    onError,
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api.requestWithdrawal({
        amount: wAmount.replace(/\s/g, ''),
        payout_target: target.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      setWAmount('');
      setNote('');
      appAlert(t('w.wallet.withdrawSent'));
      refresh();
    },
    onError,
  });

  if (bal.isPending)
    return (
      <Screen title={t('w.wallet.title')}>
        <Loading />
      </Screen>
    );
  if (bal.isError) {
    return (
      <Screen title={t('w.wallet.title')}>
        <ErrorBox error={bal.error} onRetry={bal.refetch} />
      </Screen>
    );
  }
  const b = bal.data;
  const onScan = async () => {
    const r = await scanCard().catch(() => ({ error: 'notfound' }));
    if (!r) return;
    if (r.number) setTarget(cardSpaced(r.number));
    else appAlert(x.scan, r.error === 'denied' ? x.scanDenied : x.scanFail);
  };
  const amountOk = num(amount.replace(/\s/g, '')) >= 1000;
  const wNum = num(wAmount.replace(/\s/g, ''));
  const wMax = num(b.withdrawable_balance ?? b.wallet_balance);
  const wOver = wNum > wMax;
  const x = BAL_TEXTS[language] ?? BAL_TEXTS.uz;
  const parts = [
    ['cash-outline', theme.green, x.withdrawable, b.withdrawable_balance, x.withdrawableHint],
    ['construct-outline', theme.orange, x.services, b.prepaid_balance, x.servicesHint],
    ['gift-outline', theme.violet, x.bonus, b.bonus_balance, x.bonusHint],
  ].map(([icon, color, title, value, hint]) => ({
    icon,
    color,
    title,
    value,
    hint,
    n: Math.max(num(value), 0),
  }));

  return (
    <Screen
      title={t('w.wallet.title')}
      onRefresh={refresh}
      refreshing={bal.isRefetching}
      bottomSpace
    >
      <HarnaCard
        label={t('w.wallet.available')}
        balance={money(
          num(b.available_balance ?? b.wallet_balance) +
            (tab === 'topup' && !isAccount && amountOk ? num(amount) : 0) -
            (tab === 'withdraw' && wNum > 0 && !wOver ? wNum : 0),
          t
        )}
        delta={
          tab === 'topup' && !isAccount && amountOk
            ? `+ ${money(num(amount), t)}`
            : tab === 'withdraw' && wNum > 0 && !wOver
              ? `− ${money(wNum, t)}`
              : null
        }
        deltaNegative={tab === 'withdraw'}
        name={[me.data?.first_name, me.data?.last_name].filter(Boolean).join(' ')}
      />
      {/* Balans tarkibi: umumiy summa qaysi qismlardan iboratligi — rangli chiziq + 3 ustun */}
      <View
        style={{
          borderRadius: 20,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 14,
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: theme.border,
            gap: 2,
          }}
        >
          {parts.map((pt) =>
            pt.n > 0 ? (
              <View key={pt.title} style={{ flex: pt.n, backgroundColor: pt.color }} />
            ) : null
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {parts.map((pt, i) => {
            const on = i === hint;
            return (
              <TouchableOpacity
                key={pt.title}
                activeOpacity={0.8}
                onPress={() => setHint(i)}
                style={{
                  flex: 1,
                  gap: 6,
                  padding: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: on ? pt.color + '88' : 'transparent',
                  backgroundColor: on ? pt.color + '1a' : theme.bg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={pt.icon} size={15} color={pt.color} />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ color: theme.text, fontSize: 15, fontWeight: '800', flex: 1 }}
                  >
                    {money(pt.value ?? 0, t)}
                  </Text>
                </View>
                <Muted style={{ fontSize: 11, lineHeight: 14 }} numberOfLines={2}>
                  {pt.title}
                </Muted>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Ionicons name="information-circle-outline" size={16} color={parts[hint].color} />
          <Muted style={{ flex: 1, fontSize: 12, lineHeight: 16 }}>{parts[hint].hint}</Muted>
        </View>
        {num(b.held_balance) > 0 || (b.fees_enabled && num(b.offer_fee) > 0) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {num(b.held_balance) > 0 ? (
              <Pill label={`${t('w.wallet.held')}: ${money(b.held_balance, t)}`} />
            ) : null}
            {b.fees_enabled && num(b.offer_fee) > 0 ? (
              <Pill label={`${t('w.wallet.offerFee')}: ${money(b.offer_fee, t)}`} />
            ) : null}
          </View>
        ) : null}
      </View>

      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tx', label: t('w.wallet.history') },
          { value: 'topup', label: t('w.wallet.topup') },
          { value: 'withdraw', label: t('w.wallet.withdraw') },
        ]}
      />

      {tab === 'topup' ? (
        <View style={{ gap: 12 }}>
          {/* Summa: karta tepada jonli o'zgaradi */}
          {!isAccount ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                height: 60,
                borderRadius: 18,
                backgroundColor: theme.card,
                borderWidth: 1.5,
                borderColor: amountOk ? theme.orange : theme.border,
              }}
            >
              <TextInput
                value={spaced(amount)}
                onChangeText={(v) => setAmount(v.replace(/\D/g, '').slice(0, 9))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.faint}
                style={{ flex: 1, color: theme.text, fontSize: 26, fontWeight: '800', padding: 0 }}
              />
              <Text style={{ color: theme.muted, fontSize: 16, fontWeight: '700' }}>
                {t('w.currency')}
              </Text>
            </View>
          ) : null}
          {!isAccount && !amountOk && amount ? (
            <Muted style={{ marginLeft: 6 }}>{x.min}</Muted>
          ) : null}

          {/* To'lov usuli: brend plitkalari, bosib tanlanadi */}
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginTop: 4 }}>
            {x.choose}
          </Text>
          {list.length || accountList.length ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                rowGap: 12,
              }}
            >
              {[...list, ...ACCOUNT_SYSTEMS].map((pv) => {
                const soon = ACCOUNT_SYSTEMS.includes(pv) && !accountList.includes(pv);
                return (
                  <PayProviderTile
                    key={pv}
                    provider={pv}
                    selected={pv === chosen}
                    dimmed={!!chosen && pv !== chosen}
                    badge={soon ? x.soon : undefined}
                    onPress={() => setProvider(pv)}
                  />
                );
              })}
            </View>
          ) : (
            <Muted style={{ textAlign: 'center' }}>{t('w.wallet.noProviders')}</Muted>
          )}

          {isAccount ? (
            <AccountCard number={accountNumber} systems={accountList} x={x} theme={theme} />
          ) : (
            <Btn
              label={`${t('w.wallet.pay')}${amountOk ? ` · ${money(num(amount), t)}` : ''}`}
              loading={topup.isPending}
              disabled={!chosen || !amountOk}
              onPress={() => topup.mutate()}
            />
          )}
        </View>
      ) : null}

      {tab === 'withdraw' ? (
        <View style={{ gap: 12 }}>
          {/* Summa + «Hammasi» */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 16,
              paddingRight: 8,
              height: 60,
              borderRadius: 18,
              backgroundColor: theme.card,
              borderWidth: 1.5,
              borderColor: wOver ? theme.red : wNum > 0 ? theme.orange : theme.border,
            }}
          >
            <TextInput
              value={spaced(wAmount)}
              onChangeText={(v) => setWAmount(v.replace(/\D/g, '').slice(0, 9))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.faint}
              style={{ flex: 1, color: theme.text, fontSize: 26, fontWeight: '800', padding: 0 }}
            />
            <Text style={{ color: theme.muted, fontSize: 16, fontWeight: '700' }}>
              {t('w.currency')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setWAmount(String(Math.floor(wMax)))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: theme.orange + '26',
              }}
            >
              <Text style={{ color: theme.orange, fontWeight: '800', fontSize: 13 }}>{x.all}</Text>
            </TouchableOpacity>
          </View>
          <Muted style={{ marginLeft: 6, color: wOver ? theme.red : theme.muted }}>
            {wOver ? x.over : t('w.wallet.withdrawable', { sum: money(wMax, t) })}
          </Muted>

          {/* Qabul qiluvchi karta */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              height: 58,
              borderRadius: 18,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.violet + '24',
              }}
            >
              <Ionicons name="card-outline" size={20} color={theme.violet} />
            </View>
            <TextInput
              value={target}
              onChangeText={(v) => setTarget(cardSpaced(v))}
              keyboardType="number-pad"
              placeholder="8600 0000 0000 0000"
              placeholderTextColor={theme.faint}
              maxLength={19}
              style={{
                flex: 1,
                color: theme.text,
                fontSize: 17,
                fontWeight: '700',
                letterSpacing: 1,
                padding: 0,
              }}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onScan}
              accessibilityRole="button"
              accessibilityLabel={x.scan}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.orange + '26',
              }}
            >
              <Ionicons name="scan-outline" size={21} color={theme.orange} />
            </TouchableOpacity>
          </View>
          <Muted style={{ marginLeft: 6, marginTop: -4 }}>{t('w.wallet.target')}</Muted>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('w.wallet.note')}
            placeholderTextColor={theme.faint}
            style={{
              color: theme.text,
              fontSize: 14,
              height: 46,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />

          <Btn
            label={`${t('w.wallet.requestWithdraw')}${wNum > 0 && !wOver ? ` · ${money(wNum, t)}` : ''}`}
            loading={withdraw.isPending}
            disabled={wNum <= 0 || wOver || target.trim().length < 4}
            onPress={() => withdraw.mutate()}
          />

          {/* So'rovlar tarixi */}
          {(wd.data || []).map((w) => {
            const st = String(w.state || '').toLowerCase();
            const color = /reject|cancel|declin|fail/.test(st)
              ? theme.red
              : /paid|done|complete|approv|success/.test(st)
                ? theme.green
                : theme.orange;
            const icon =
              color === theme.red
                ? 'close-circle'
                : color === theme.green
                  ? 'checkmark-circle'
                  : 'time';
            return (
              <View
                key={w.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 18,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: color + '1f',
                  }}
                >
                  <Ionicons name={icon} size={21} color={color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontWeight: '800', fontSize: 15 }}>{money(w.amount, t)}</Txt>
                  <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                    {[maskCard(w.payout_target), fmtDate(w.created_at, language)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Muted>
                  {w.decision_note ? (
                    <Muted style={{ fontSize: 12 }} numberOfLines={2}>
                      {w.decision_note}
                    </Muted>
                  ) : null}
                </View>
                <Pill label={w.state} color={color} />
              </View>
            );
          })}
        </View>
      ) : null}

      {tab === 'tx' ? (
        tx.isPending ? (
          <Loading />
        ) : !tx.data?.length ? (
          <Empty icon="receipt-outline" text={t('w.wallet.noTx')} />
        ) : (
          groupByDay(tx.data, language).map(([day, rows]) => (
            <View key={day} style={{ gap: 6 }}>
              <Text
                style={{
                  color: theme.muted,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 0.4,
                  marginLeft: 4,
                }}
              >
                {day}
              </Text>
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 12,
                }}
              >
                {rows.map((x, i) => {
                  const plus = num(x.amount) >= 0;
                  const color = plus ? theme.green : theme.red;
                  const txKey = topupTxKey(x);
                  const receipt = txKey ? receipts.get(txKey) : null;
                  const typeKey = `w.tx.${x.type}`;
                  const title = t(typeKey) === typeKey ? x.type : t(typeKey);
                  const sub = [
                    receipt ? providerLabel(receipt.provider) : cleanDesc(x.description),
                    x.order_code ? `#${x.order_code}` : null,
                    clock(x.created_at),
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <TouchableOpacity
                      key={x.id}
                      activeOpacity={receipt ? 0.7 : 1}
                      disabled={!receipt}
                      onPress={() => setSheet(receipt)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                        borderTopColor: theme.border,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: color + '1f',
                        }}
                      >
                        <Ionicons name={plus ? 'arrow-down' : 'arrow-up'} size={19} color={color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt style={{ fontWeight: '700', fontSize: 14.5 }} numberOfLines={1}>
                          {title}
                        </Txt>
                        <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                          {sub}
                        </Muted>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ color, fontWeight: '800', fontSize: 15 }}>
                          {plus ? '+' : '−'}
                          {money(Math.abs(num(x.amount)), t)}
                        </Text>
                        {receipt ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                              backgroundColor: theme.orange + '22',
                            }}
                          >
                            <Ionicons name="receipt-outline" size={12} color={theme.orange} />
                            <Text
                              style={{ color: theme.orange, fontSize: 11.5, fontWeight: '700' }}
                            >
                              {t('w.wallet.receipt')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )
      ) : null}
      <TopupReceiptSheet
        receipt={sheet}
        onClose={() => setSheet(null)}
        onOpenSite={(url) => openReceipt(url)}
      />
    </Screen>
  );
}
