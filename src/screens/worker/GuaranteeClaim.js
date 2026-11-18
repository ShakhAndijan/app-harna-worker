import { useState } from 'react';
import { View, Text, Image, ScrollView, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { answerGuaranteeClaim, reportGuaranteeFixed } from '../../api/workerApp';
import { Button } from './OrderFieldActions';

const TEXTS = {
  uz: {
    claimed: 'Mijoz kafolat bo‘yicha murojaat qildi',
    fixBy: '{d} gacha tuzatib bering',
    fixByPlain: 'Belgilangan muddatda tuzatib bering',
    checking: 'Mijoz tekshirmoqda — {d} gacha',
    checkingPlain: 'Mijoz tekshirmoqda',
    disputed: "Operator ko'rib chiqyapti",
    fixedNoAnswer: 'Mijoz javob bermadi — tuzatildi deb hisoblandi',
    fixedOk: 'Mijoz tuzatilganini tasdiqladi',
    refunded: "Operator mijoz foydasiga hal qildi — {a} so'm hamyoningizdan qaytarildi",
    refundedPlain: 'Operator mijoz foydasiga hal qildi — pul hamyoningizdan qaytarildi',
    rejected: 'Operator siz tomonda hal qildi',
    answerBy: 'Javob muddati: {d}. Javob bermasangiz, operator hal qiladi.',
    answerByPlain: 'Belgilangan vaqtda javob bering. Javob bermasangiz, operator hal qiladi.',
    answerLate: "Javob muddati o'tdi",
    fixLate: "Tuzatish muddati o'tdi — operator hal qiladi",
    willFix: 'Tuzatib beraman',
    refuse: 'Rad etaman',
    refuseAsk:
      "Murojaatni operator ko'rib chiqadi. Mijoz haq deb topilsa, pul hamyoningizdan qaytariladi.",
    fixed: 'Tuzatdim',
    fixedAsk: 'Mijozga tekshirish uchun yuboriladi',
    cancel: 'Bekor qilish',
    err: 'Xatolik yuz berdi',
  },
  ru: {
    claimed: 'Заказчик обратился по гарантии',
    fixBy: 'Исправьте до {d}',
    fixByPlain: 'Исправьте в установленный срок',
    checking: 'Заказчик проверяет — до {d}',
    checkingPlain: 'Заказчик проверяет',
    disputed: 'Оператор рассматривает',
    fixedNoAnswer: 'Заказчик не ответил — считается исправленным',
    fixedOk: 'Заказчик подтвердил исправление',
    refunded: 'Оператор решил в пользу заказчика — {a} сум списано с вашего кошелька',
    refundedPlain: 'Оператор решил в пользу заказчика — деньги списаны с вашего кошелька',
    rejected: 'Оператор решил в вашу пользу',
    answerBy: 'Ответьте до {d}. Если не ответите, решит оператор.',
    answerByPlain: 'Ответьте в установленный срок. Если не ответите, решит оператор.',
    answerLate: 'Срок ответа истёк',
    fixLate: 'Срок исправления истёк — решит оператор',
    willFix: 'Исправлю',
    refuse: 'Отклонить',
    refuseAsk:
      'Обращение рассмотрит оператор. Если заказчик окажется прав, деньги спишут с вашего кошелька.',
    fixed: 'Исправил',
    fixedAsk: 'Будет отправлено заказчику на проверку',
    cancel: 'Отмена',
    err: 'Произошла ошибка',
  },
  en: {
    claimed: 'The customer filed a guarantee claim',
    fixBy: 'Fix it by {d}',
    fixByPlain: 'Fix it within the set time',
    checking: 'The customer is checking — until {d}',
    checkingPlain: 'The customer is checking',
    disputed: 'An operator is reviewing',
    fixedNoAnswer: 'The customer did not answer — treated as fixed',
    fixedOk: 'The customer confirmed the fix',
    refunded: 'The operator ruled for the customer — {a} UZS refunded from your wallet',
    refundedPlain: 'The operator ruled for the customer — money refunded from your wallet',
    rejected: 'The operator ruled in your favour',
    answerBy: 'Reply by {d}. If you do not, an operator will decide.',
    answerByPlain: 'Reply within the set time. If you do not, an operator will decide.',
    answerLate: 'The reply window has passed',
    fixLate: 'The fix window has passed — an operator will decide',
    willFix: "I'll fix it",
    refuse: 'Refuse',
    refuseAsk:
      'An operator will review the claim. If the customer is right, the money is refunded from your wallet.',
    fixed: 'I fixed it',
    fixedAsk: 'It will be sent to the customer to check',
    cancel: 'Cancel',
    err: 'Something went wrong',
  },
};

const deadlineOf = (c) =>
  c.deadline ??
  (c.status === 'awaiting_worker'
    ? c.worker_answer_deadline
    : c.status === 'fixing'
      ? c.fix_deadline
      : c.status === 'customer_check'
        ? c.customer_check_deadline
        : null) ??
  null;

const stamp = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Mijozning kafolat da'vosi: usta "tuzatib beraman" / "rad etaman" deydi, so'ng "tuzatdim" deb belgilaydi.
export default function GuaranteeClaim({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);
  const c = order.guarantee_claim;
  const run = useMutation({
    mutationFn: (kind) =>
      kind === 'fixed'
        ? reportGuaranteeFixed(order.id)
        : answerGuaranteeClaim(order.id, kind === 'fix'),
    onSettled: () => {
      setBusy(null);
      qc.invalidateQueries({ queryKey: ['worker'] });
    },
    onError: (e) => appAlert(e?.message || x.err),
  });
  if (!c) return null;

  const dl = deadlineOf(c);
  const d = dl ? stamp(dl) : '';
  const late = !!dl && new Date(dl).getTime() < new Date().getTime();
  let title = null;
  switch (c.status) {
    case 'awaiting_worker':
      title = x.claimed;
      break;
    case 'fixing':
      title = d ? x.fixBy.replace('{d}', d) : x.fixByPlain;
      break;
    case 'customer_check':
      title = d ? x.checking.replace('{d}', d) : x.checkingPlain;
      break;
    case 'disputed':
      title = x.disputed;
      break;
    case 'fixed':
      title = c.resolution === 'no_answer' ? x.fixedNoAnswer : x.fixedOk;
      break;
    case 'refunded': {
      const n = Number(c.refund_amount);
      title =
        Number.isFinite(n) && n > 0
          ? x.refunded.replace('{a}', Math.round(n).toLocaleString('ru-RU'))
          : x.refundedPlain;
      break;
    }
    case 'rejected':
      title = x.rejected;
      break;
    default:
      return null;
  }

  const warn = ['awaiting_worker', 'fixing'].includes(c.status);
  const ok = c.status === 'fixed' || c.status === 'rejected';
  const color = warn ? '#f5b81f' : ok ? '#2eb872' : t.muted;
  const canFix = c.status === 'awaiting_worker' && !late;
  const canRefuse = c.status === 'awaiting_worker';
  const canReport = c.status === 'fixing' && !late;
  const photos = (c.photos ?? [])
    .map((p) => (typeof p === 'string' ? p : (p?.url ?? p?.file_url)))
    .filter(Boolean);

  const go = (kind) => {
    setBusy(kind);
    run.mutate(kind);
  };
  const confirm = (msg, label, kind, destructive) =>
    Alert.alert(label, msg, [
      { text: x.cancel, style: 'cancel' },
      { text: label, style: destructive ? 'destructive' : 'default', onPress: () => go(kind) },
    ]);

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: t.card2,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Ionicons name="shield-checkmark" size={18} color={color} />
        <Text style={{ flex: 1, color: t.text, fontWeight: '800', fontSize: 14.5 }}>{title}</Text>
      </View>
      {!!c.description && (
        <Text style={{ color: t.text, fontSize: 13.5, lineHeight: 19, fontStyle: 'italic' }}>
          {c.description}
        </Text>
      )}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {photos.map((u) => (
            <Image
              key={u}
              source={{ uri: u }}
              style={{ width: 64, height: 64, borderRadius: 10 }}
            />
          ))}
        </ScrollView>
      )}
      {c.status === 'awaiting_worker' && (
        <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>
          {late ? x.answerLate : d ? x.answerBy.replace('{d}', d) : x.answerByPlain}
        </Text>
      )}
      {c.status === 'fixing' && late && (
        <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>{x.fixLate}</Text>
      )}
      {canFix && (
        <Button
          t={t}
          icon="construct"
          label={x.willFix}
          busy={busy === 'fix'}
          disabled={busy != null}
          onPress={() => go('fix')}
        />
      )}
      {canReport && (
        <Button
          t={t}
          icon="checkmark-circle"
          label={x.fixed}
          busy={busy === 'fixed'}
          disabled={busy != null}
          onPress={() => confirm(x.fixedAsk, x.fixed, 'fixed', false)}
        />
      )}
      {canRefuse && (
        <Button
          t={t}
          kind="danger"
          label={x.refuse}
          busy={busy === 'refuse'}
          disabled={busy != null}
          onPress={() => confirm(x.refuseAsk, x.refuse, 'refuse', true)}
        />
      )}
    </View>
  );
}
