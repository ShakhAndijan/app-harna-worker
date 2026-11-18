import { useState } from 'react';
import { View, Text, TextInput, Image, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appAlert } from '../../components/AppAlert';
import {
  answerArrivalCheck,
  answerComplaint,
  fileGuaranteeClaim,
  checkGuaranteeFix,
  uploadOrderWorkPhoto,
} from '../../api/customerFlow';
import {
  Button,
  Notice,
  Muted,
  PhotoStrip,
  useL,
  fill,
  stamp,
  money,
  confirmBox,
  photoUrl,
  usePhotoPicker,
} from './ui';

const TEXTS = {
  uz: {
    acTitle: 'Usta keldimi?',
    acBody: 'Kelishilgan vaqt: {day}{window}. Usta ilovada «Yetib keldim» deb belgilamadi.',
    acUntil: '{until} gacha javob berishingiz mumkin',
    acOnTime: 'Ha, vaqtida',
    acLate: 'Ha, kechikib',
    acNoShow: "Yo'q, kelmadi",
    acNoShowTitle: 'Usta kelmadimi?',
    acNoShowText:
      "Ustaga xabar beramiz. U kelmaganini tasdiqlasa yoki o'z vaqtida javob bermasa, buyurtma bekor qilinadi va uni boshqa ustalarga qayta joylashingiz mumkin. Usta kelganini aytsa, operator chat va kelish yozuvi asosida hal qiladi.",
    acNoShowOk: 'Ha, kelmadi',
    acAwaiting:
      'Ustaga bildirdik — {deadline} gacha javob beradi. Javob bermasa, buyurtma bekor qilinadi',
    acDisputed: "Usta kelganini aytdi — operator ko'rib chiqyapti",
    acRejected: 'Operator usta kelgan deb topdi — buyurtma davom etadi',
    acOnTimeDone: 'Javobingiz qabul qilindi: usta vaqtida keldi',
    acLateDone: 'Javobingiz qabul qilindi: usta kechikib keldi',
    cancel: 'Bekor qilish',
    back: 'Orqaga',
    err: 'Xatolik yuz berdi',
    cpTitleNoContact: "Usta siz bilan bog'lana olmaganini bildirdi",
    cpTitleNoWork: 'Usta yetib kelganini va ish qildirilmaganini bildirdi',
    cpBody: '{deadline} gacha javob bering. Javob bermasangiz, buyurtma bekor qilinadi.',
    cpBodyNoWork:
      'Usta {time} da manzilingizga yetib kelgan ({distance} m). {deadline} gacha javob bering. Javob bermasangiz, buyurtma bekor qilinadi.',
    cpLate: 'Javob berish muddati tugadi — buyurtma bekor qilinadi.',
    cpWhat:
      "«To'g'ri, bog'lanmadik» desangiz yoki javob bermasangiz, buyurtma bekor qilinadi va hisobingizga «bog'lanib bo'lmadi» belgisi qo'yiladi. «Yo'q, bog'langanmiz» desangiz, operator chat yozishmalariga qarab hal qiladi — shu orada buyurtma davom etadi.",
    cpWhatNoWork:
      "«To'g'ri, ish qildirmadim» desangiz yoki javob bermasangiz, buyurtma bekor qilinadi va hisobingizga «usta kelganda ish qildirmadi» belgisi qo'yiladi. «Yo'q, bunday emas» desangiz, operator hal qiladi — shu orada buyurtma davom etadi.",
    cpYes: "To'g'ri, bog'lanmadik",
    cpYesNoWork: "To'g'ri, ish qildirmadim",
    cpNo: "Yo'q, bog'langanmiz",
    cpNoNoWork: "Yo'q, bunday emas",
    cpConfirmTitle: 'Buyurtma bekor qilinsinmi?',
    cpConfirm:
      "Buyurtma bekor qilinadi va hisobingizga «bog'lanib bo'lmadi» belgisi qo'yiladi. Keyin uni qayta e'lon qilishingiz mumkin — bu usta unga taklif yubora olmaydi.",
    cpConfirmNoWork:
      "Buyurtma bekor qilinadi va hisobingizga «usta kelganda ish qildirmadi» belgisi qo'yiladi. Keyin uni qayta e'lon qilishingiz mumkin — bu usta unga taklif yubora olmaydi.",
    cpSentReached: 'Javobingiz operatorga yuborildi',
    cpSentNot: "Buyurtma bekor qilindi — kerak bo'lsa, uni qayta e'lon qiling",
    cpDisputed: "Operator ko'rib chiqmoqda",
    cpDisputedMore:
      'Javobingiz operatorga yuborildi. Operator chat yozishmalariga qarab hal qiladi; shu orada buyurtma davom etadi va yozishishingiz mumkin.',
    gTitle: "Kafolat bo'yicha murojaat",
    gUntil: '{until} gacha murojaat qilishingiz mumkin',
    gNudge: "Harna kafolati faqat ilova orqali to'liq to'langan ishlarga beriladi",
    gWhat: "Nima noto'g'ri bajarilgan?",
    gHint:
      'Usta avval tuzatib berishi mumkin. Kelisha olmasangiz, operator dalillar asosida hal qiladi.',
    gSend: 'Yuborish',
    gAddPhoto: "Rasm qo'shish",
    gUploading: 'Yuklanmoqda…',
    gAwaitingW: 'Murojaatingiz ustaga yuborildi — {deadline} gacha javob beradi',
    gAwaitingWPlain: 'Murojaatingiz ustaga yuborildi',
    gFixing: "Usta tuzatib berishga rozi bo'ldi — {deadline} gacha",
    gFixingPlain: "Usta tuzatib berishga rozi bo'ldi",
    gCheck:
      'Usta tuzatganini aytdi. Tekshirib, javob bering — {deadline} gacha. Javob bermasangiz, tuzatildi deb hisoblanadi',
    gCheckPlain:
      'Usta tuzatganini aytdi. Tekshirib, javob bering. Javob bermasangiz, tuzatildi deb hisoblanadi',
    gDisputed: "Operator ko'rib chiqyapti",
    gFixedNoAnswer: 'Javob bermaganingiz uchun tuzatildi deb hisoblandi',
    gFixedOk: "Muammo hal bo'ldi",
    gRefundedFull: "To'lovingiz qaytarildi: {amount} so'm",
    gRefundedFullPlain: "To'lovingiz qaytarildi",
    gRefundedPartial: "{amount} so'm qaytariladi — xodimlarimiz to'lab beradi",
    gRefundedPartialPlain: "Pul qaytariladi — xodimlarimiz to'lab beradi",
    gRefunded: 'Operator sizning foydangizga hal qildi — pul qaytariladi',
    gRejected: 'Operator ustaning foydasiga hal qildi',
    gLate: "Javob muddati o'tdi",
    gFixedYes: 'Tuzatildi',
    gFixedNo: 'Tuzatilmadi',
    gNotFixedAsk: "Murojaat operatorga o'tadi va u dalillar asosida hal qiladi",
  },
  ru: {
    acTitle: 'Специалист пришёл?',
    acBody: 'Согласованное время: {day}{window}. Специалист не отметил «Я на месте» в приложении.',
    acUntil: 'Можно ответить до {until}',
    acOnTime: 'Да, вовремя',
    acLate: 'Да, с опозданием',
    acNoShow: 'Нет, не пришёл',
    acNoShowTitle: 'Специалист не пришёл?',
    acNoShowText:
      'Мы сообщим специалисту. Если он подтвердит неявку или не ответит вовремя, заказ будет отменён, и вы сможете разместить его заново. Если специалист скажет, что пришёл, оператор решит по чату и записи прибытия.',
    acNoShowOk: 'Да, не пришёл',
    acAwaiting:
      'Мы сообщили специалисту — ответит до {deadline}. Если не ответит, заказ будет отменён',
    acDisputed: 'Специалист говорит, что пришёл — оператор рассматривает',
    acRejected: 'Оператор решил, что специалист пришёл — заказ продолжается',
    acOnTimeDone: 'Ответ принят: специалист пришёл вовремя',
    acLateDone: 'Ответ принят: специалист пришёл с опозданием',
    cancel: 'Отмена',
    back: 'Назад',
    err: 'Произошла ошибка',
    cpTitleNoContact: 'Специалист сообщил, что не смог с вами связаться',
    cpTitleNoWork: 'Специалист сообщил, что приехал, но работу не дали сделать',
    cpBody: 'Ответьте до {deadline}. Если не ответите, заказ будет отменён.',
    cpBodyNoWork:
      'Специалист прибыл к вам в {time} ({distance} м). Ответьте до {deadline}. Если не ответите, заказ будет отменён.',
    cpLate: 'Срок ответа истёк — заказ будет отменён.',
    cpWhat:
      'Если скажете «Верно, не связались» или не ответите, заказ будет отменён и в вашем аккаунте появится отметка «не удалось связаться». Если «Нет, мы связались», оператор решит по переписке — пока заказ продолжается.',
    cpWhatNoWork:
      'Если скажете «Верно, не давал делать» или не ответите, заказ будет отменён и появится отметка «не дал сделать работу». Если «Нет, это не так», решит оператор — пока заказ продолжается.',
    cpYes: 'Верно, не связались',
    cpYesNoWork: 'Верно, не давал делать',
    cpNo: 'Нет, мы связались',
    cpNoNoWork: 'Нет, это не так',
    cpConfirmTitle: 'Отменить заказ?',
    cpConfirm:
      'Заказ будет отменён и появится отметка «не удалось связаться». Потом его можно разместить заново — этот специалист не сможет откликнуться.',
    cpConfirmNoWork:
      'Заказ будет отменён и появится отметка «не дал сделать работу». Потом его можно разместить заново — этот специалист не сможет откликнуться.',
    cpSentReached: 'Ваш ответ отправлен оператору',
    cpSentNot: 'Заказ отменён — при необходимости разместите его заново',
    cpDisputed: 'Оператор рассматривает',
    cpDisputedMore:
      'Ваш ответ отправлен оператору. Он решит по переписке; пока заказ продолжается, вы можете переписываться.',
    gTitle: 'Обращение по гарантии',
    gUntil: 'Обратиться можно до {until}',
    gNudge: 'Гарантия Harna действует только на работы, полностью оплаченные через приложение',
    gWhat: 'Что сделано неправильно?',
    gHint:
      'Специалист может сначала исправить. Если не договоритесь, оператор решит по доказательствам.',
    gSend: 'Отправить',
    gAddPhoto: 'Добавить фото',
    gUploading: 'Загрузка…',
    gAwaitingW: 'Обращение отправлено специалисту — ответит до {deadline}',
    gAwaitingWPlain: 'Обращение отправлено специалисту',
    gFixing: 'Специалист согласился исправить — до {deadline}',
    gFixingPlain: 'Специалист согласился исправить',
    gCheck:
      'Специалист говорит, что исправил. Проверьте и ответьте до {deadline}. Если не ответите, будет считаться исправленным',
    gCheckPlain:
      'Специалист говорит, что исправил. Проверьте и ответьте. Если не ответите, будет считаться исправленным',
    gDisputed: 'Оператор рассматривает',
    gFixedNoAnswer: 'Вы не ответили — считается исправленным',
    gFixedOk: 'Проблема решена',
    gRefundedFull: 'Ваш платёж возвращён: {amount} сум',
    gRefundedFullPlain: 'Ваш платёж возвращён',
    gRefundedPartial: '{amount} сум будет возвращено — выплатят наши сотрудники',
    gRefundedPartialPlain: 'Деньги будут возвращены — выплатят наши сотрудники',
    gRefunded: 'Оператор решил в вашу пользу — деньги будут возвращены',
    gRejected: 'Оператор решил в пользу специалиста',
    gLate: 'Срок ответа истёк',
    gFixedYes: 'Исправлено',
    gFixedNo: 'Не исправлено',
    gNotFixedAsk: 'Обращение уйдёт оператору, он решит по доказательствам',
  },
  en: {
    acTitle: 'Did the specialist arrive?',
    acBody: 'Agreed time: {day}{window}. The specialist did not tap “I arrived” in the app.',
    acUntil: 'You can answer until {until}',
    acOnTime: 'Yes, on time',
    acLate: 'Yes, but late',
    acNoShow: 'No, did not come',
    acNoShowTitle: 'The specialist did not come?',
    acNoShowText:
      'We will notify them. If they confirm or do not reply in time, the order is cancelled and you can repost it. If they say they came, an operator decides from the chat and arrival record.',
    acNoShowOk: 'Yes, did not come',
    acAwaiting:
      'We told the specialist — they reply by {deadline}. If they do not, the order is cancelled',
    acDisputed: 'The specialist says they came — an operator is reviewing',
    acRejected: 'The operator found the specialist did come — the order continues',
    acOnTimeDone: 'Answer received: the specialist came on time',
    acLateDone: 'Answer received: the specialist came late',
    cancel: 'Cancel',
    back: 'Back',
    err: 'Something went wrong',
    cpTitleNoContact: 'The specialist says they could not reach you',
    cpTitleNoWork: 'The specialist says they arrived but were not let work',
    cpBody: 'Reply by {deadline}. If you do not, the order is cancelled.',
    cpBodyNoWork:
      'The specialist reached your address at {time} ({distance} m). Reply by {deadline}. If you do not, the order is cancelled.',
    cpLate: 'The reply window has passed — the order is cancelled.',
    cpWhat:
      'If you say “Correct, we did not connect” or do not reply, the order is cancelled and a “could not be reached” mark is added to your account. If “No, we did connect”, an operator decides from the chat — meanwhile the order continues.',
    cpWhatNoWork:
      'If you say “Correct, I did not let them work” or do not reply, the order is cancelled and a “did not let work” mark is added. If “No, that is not so”, an operator decides — meanwhile the order continues.',
    cpYes: 'Correct, we did not connect',
    cpYesNoWork: 'Correct, I did not let them work',
    cpNo: 'No, we did connect',
    cpNoNoWork: 'No, that is not so',
    cpConfirmTitle: 'Cancel the order?',
    cpConfirm:
      'The order is cancelled and a “could not be reached” mark is added. You can repost it — this specialist cannot offer on it.',
    cpConfirmNoWork:
      'The order is cancelled and a “did not let work” mark is added. You can repost it — this specialist cannot offer on it.',
    cpSentReached: 'Your answer was sent to the operator',
    cpSentNot: 'Order cancelled — repost it if needed',
    cpDisputed: 'An operator is reviewing',
    cpDisputedMore:
      'Your answer was sent to the operator. They decide from the chat; meanwhile the order continues and you can message.',
    gTitle: 'Guarantee claim',
    gUntil: 'You can file a claim until {until}',
    gNudge: 'The Harna guarantee covers only jobs fully paid through the app',
    gWhat: 'What was done wrong?',
    gHint:
      'The specialist may fix it first. If you cannot agree, an operator decides from the evidence.',
    gSend: 'Send',
    gAddPhoto: 'Add photo',
    gUploading: 'Uploading…',
    gAwaitingW: 'Your claim was sent to the specialist — they reply by {deadline}',
    gAwaitingWPlain: 'Your claim was sent to the specialist',
    gFixing: 'The specialist agreed to fix it — by {deadline}',
    gFixingPlain: 'The specialist agreed to fix it',
    gCheck:
      'The specialist says it is fixed. Check and reply by {deadline}. If you do not, it counts as fixed',
    gCheckPlain:
      'The specialist says it is fixed. Check and reply. If you do not, it counts as fixed',
    gDisputed: 'An operator is reviewing',
    gFixedNoAnswer: 'You did not reply — it counts as fixed',
    gFixedOk: 'The problem is solved',
    gRefundedFull: 'Your payment was refunded: {amount} UZS',
    gRefundedFullPlain: 'Your payment was refunded',
    gRefundedPartial: '{amount} UZS will be refunded — our staff will pay it out',
    gRefundedPartialPlain: 'The money will be refunded — our staff will pay it out',
    gRefunded: 'The operator ruled in your favour — the money will be refunded',
    gRejected: 'The operator ruled for the specialist',
    gLate: 'The reply window has passed',
    gFixedYes: 'Fixed',
    gFixedNo: 'Not fixed',
    gNotFixedAsk: 'The claim goes to an operator who decides from the evidence',
  },
};

const isPast = (iso) => !!iso && new Date(iso).getTime() < new Date().getTime();

// Mijoz: "Usta keldimi?" — usta ilovada "Yetib keldim" demagan bo'lsa so'raladi.
export function ArrivalCheckCard({ order, onChanged }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [busy, setBusy] = useState(null);
  const ac = order.arrivalCheck;
  if (!ac || order.rawStatus !== 'active') return null;

  const askable = !!ac.can_answer && (ac.until == null || !isPast(ac.until));
  const send = async (answer) => {
    setBusy(answer);
    try {
      await answerArrivalCheck(order.id, answer);
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setBusy(null);
      onChanged?.();
    }
  };

  if (askable) {
    const day = order.scheduledDate
      ? order.scheduledDate.slice(8, 10) + '.' + order.scheduledDate.slice(5, 7)
      : '—';
    const win =
      order.windowStart && order.windowEnd
        ? `, ${String(order.windowStart).slice(0, 5)}–${String(order.windowEnd).slice(0, 5)}`
        : '';
    return (
      <Notice tone="warn" title={x.acTitle}>
        <Muted>{fill(x.acBody, { day, window: win })}</Muted>
        {!!ac.until && <Muted>{fill(x.acUntil, { until: stamp(ac.until) })}</Muted>}
        <Button
          t={t}
          label={x.acOnTime}
          busy={busy === 'on_time'}
          disabled={busy != null}
          onPress={() => send('on_time')}
        />
        <Button
          t={t}
          kind="ghost"
          label={x.acLate}
          busy={busy === 'late'}
          disabled={busy != null}
          onPress={() => send('late')}
        />
        <Button
          t={t}
          kind="danger"
          label={x.acNoShow}
          busy={busy === 'no_show'}
          disabled={busy != null}
          onPress={() =>
            confirmBox(
              x.acNoShowTitle,
              x.acNoShowText,
              x.cancel,
              x.acNoShowOk,
              () => send('no_show'),
              true
            )
          }
        />
      </Notice>
    );
  }

  let text = null;
  if (ac.complaint_id != null) {
    if (ac.status === 'awaiting_worker')
      text = fill(x.acAwaiting, { deadline: stamp(ac.deadline) });
    else if (ac.status === 'disputed') text = x.acDisputed;
    else if (ac.status === 'rejected' && ac.resolution !== 'job_completed') text = x.acRejected;
  } else if (ac.answer === 'on_time') text = x.acOnTimeDone;
  else if (ac.answer === 'late') text = x.acLateDone;
  return text ? (
    <Notice tone={ac.status === 'awaiting_worker' ? 'warn' : 'info'} title={text} />
  ) : null;
}

// Mijoz: usta shikoyatiga ("bog'lana olmadim" / "ish qildirmadi") javob.
export function ComplaintAnswerCard({ order, onChanged }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [busy, setBusy] = useState(null);
  const c = order.matchComplaint;
  if (!c) return null;
  const noWork = c.kind === 'no_work';

  if (c.status === 'disputed') {
    return (
      <Notice title={x.cpDisputed}>
        <Muted>{x.cpDisputedMore}</Muted>
      </Notice>
    );
  }
  if (c.status !== 'awaiting_customer') return null;

  const late = isPast(c.answer_deadline);
  const send = async (reached) => {
    setBusy(reached ? 'yes' : 'no');
    try {
      await answerComplaint(order.id, reached);
      appAlert(reached ? x.cpSentReached : x.cpSentNot);
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setBusy(null);
      onChanged?.();
    }
  };
  const deadline = stamp(c.answer_deadline);
  const body =
    noWork && c.arrived_at
      ? fill(x.cpBodyNoWork, {
          time: stamp(c.arrived_at).slice(-5),
          distance: c.arrival_distance_m,
          deadline,
        })
      : fill(x.cpBody, { deadline });

  return (
    <Notice tone="warn" title={noWork ? x.cpTitleNoWork : x.cpTitleNoContact}>
      {!!c.note && <Muted>{`“${c.note}”`}</Muted>}
      {late ? (
        <Muted>{x.cpLate}</Muted>
      ) : (
        <>
          <Muted>{body}</Muted>
          <Muted>{noWork ? x.cpWhatNoWork : x.cpWhat}</Muted>
          <Button
            t={t}
            kind="danger"
            label={noWork ? x.cpYesNoWork : x.cpYes}
            busy={busy === 'no'}
            disabled={busy != null}
            onPress={() =>
              confirmBox(
                x.cpConfirmTitle,
                noWork ? x.cpConfirmNoWork : x.cpConfirm,
                x.back,
                noWork ? x.cpYesNoWork : x.cpYes,
                () => send(false),
                true
              )
            }
          />
          <Button
            t={t}
            label={noWork ? x.cpNoNoWork : x.cpNo}
            busy={busy === 'yes'}
            disabled={busy != null}
            onPress={() => send(true)}
          />
        </>
      )}
    </Notice>
  );
}

const claimDeadline = (c) =>
  c.deadline ??
  (c.status === 'awaiting_worker'
    ? c.worker_answer_deadline
    : c.status === 'fixing'
      ? c.fix_deadline
      : c.status === 'customer_check'
        ? c.customer_check_deadline
        : null) ??
  null;

function ClaimForm({ order, onFiled }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const photos = usePhotoPicker(
    10,
    (uri, mime) => uploadOrderWorkPhoto(order.id, uri, mime),
    x.err
  );
  const ok = text.trim().length > 0 && text.trim().length <= 1000 && !photos.busy;

  const send = async () => {
    setSending(true);
    try {
      await fileGuaranteeClaim(order.id, text.trim(), photos.keys);
      setText('');
      photos.reset();
      onFiled?.();
    } catch (e) {
      appAlert(e?.message || x.err);
      onFiled?.();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 13.5 }}>{x.gWhat}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        editable={!sending}
        style={{
          minHeight: 90,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.inputBg,
          color: t.text,
          fontSize: 14,
          textAlignVertical: 'top',
        }}
      />
      <PhotoStrip items={photos.items} onRemove={photos.remove} />
      <Button
        t={t}
        kind="ghost"
        icon="camera-outline"
        label={photos.busy ? x.gUploading : x.gAddPhoto}
        busy={photos.busy}
        disabled={photos.items.length >= 10 || sending}
        onPress={photos.add}
      />
      <Muted>{x.gHint}</Muted>
      <Button t={t} label={x.gSend} busy={sending} disabled={!ok} onPress={send} />
    </View>
  );
}

// Mijoz: kafolat — da'vo yuborish yoki mavjud da'voning holati / "Tuzatildi — Tuzatilmadi".
export function GuaranteeSection({ order, onChanged }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const g = order.guarantee;
  if (!g) return null;

  const claim = g.claim ?? null;
  if (!claim) {
    if (g.eligible) {
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
          <Button
            t={t}
            icon="shield-checkmark-outline"
            label={x.gTitle}
            kind={open ? 'ghost' : 'primary'}
            onPress={() => setOpen((v) => !v)}
          />
          {!!g.until && <Muted>{fill(x.gUntil, { until: stamp(g.until) })}</Muted>}
          {open && (
            <ClaimForm
              order={order}
              onFiled={() => {
                setOpen(false);
                onChanged?.();
              }}
            />
          )}
        </View>
      );
    }
    if (g.reason === 'not_paid_in_app') return <Muted>{x.gNudge}</Muted>;
    return null;
  }

  const dl = claimDeadline(claim);
  const d = dl ? stamp(dl) : null;
  const late = isPast(dl);
  let title = null;
  switch (claim.status) {
    case 'awaiting_worker':
      title = d ? fill(x.gAwaitingW, { deadline: d }) : x.gAwaitingWPlain;
      break;
    case 'fixing':
      title = d ? fill(x.gFixing, { deadline: d }) : x.gFixingPlain;
      break;
    case 'customer_check':
      title = d ? fill(x.gCheck, { deadline: d }) : x.gCheckPlain;
      break;
    case 'disputed':
      title = x.gDisputed;
      break;
    case 'fixed':
      title = claim.resolution === 'no_answer' ? x.gFixedNoAnswer : x.gFixedOk;
      break;
    case 'refunded': {
      const n = Number(claim.refund_amount);
      const amount = Number.isFinite(n) && n > 0 ? money(n) : null;
      title =
        claim.refund_method === 'full_payment_refund'
          ? amount
            ? fill(x.gRefundedFull, { amount })
            : x.gRefundedFullPlain
          : claim.refund_method === 'manual_partial'
            ? amount
              ? fill(x.gRefundedPartial, { amount })
              : x.gRefundedPartialPlain
            : x.gRefunded;
      break;
    }
    case 'rejected':
      title = x.gRejected;
      break;
    default:
      return null;
  }

  const check = async (fixed) => {
    setBusy(fixed ? 'yes' : 'no');
    try {
      await checkGuaranteeFix(order.id, fixed);
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setBusy(null);
      onChanged?.();
    }
  };
  const photos = (claim.photos ?? []).map(photoUrl).filter(Boolean);
  const tone =
    claim.status === 'customer_check'
      ? 'warn'
      : claim.status === 'fixed' || claim.status === 'refunded'
        ? 'ok'
        : 'info';

  return (
    <Notice tone={tone} icon="shield-checkmark" title={title}>
      {!!claim.description && (
        <Text style={{ color: t.text, fontSize: 13.5, lineHeight: 19, fontStyle: 'italic' }}>
          {claim.description}
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
      {claim.status === 'customer_check' && (
        <>
          {late && <Muted>{x.gLate}</Muted>}
          <Button
            t={t}
            label={x.gFixedYes}
            busy={busy === 'yes'}
            disabled={busy != null}
            onPress={() => check(true)}
          />
          {!late && (
            <Button
              t={t}
              kind="danger"
              label={x.gFixedNo}
              busy={busy === 'no'}
              disabled={busy != null}
              onPress={() =>
                confirmBox(
                  x.gFixedNo,
                  x.gNotFixedAsk,
                  x.cancel,
                  x.gFixedNo,
                  () => check(false),
                  true
                )
              }
            />
          )}
        </>
      )}
    </Notice>
  );
}
