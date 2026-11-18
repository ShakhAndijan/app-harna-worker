import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { useQueryClient } from '@tanstack/react-query';
import { uploadWorkPhoto, addBeforePhotos, requestLocation } from '../../api/workerApp';
import {
  useWorkDone,
  useMarkArrived,
  useFileComplaint,
  useAnswerNoShow,
} from '../../queries/workerOrders';

const MAX_PHOTOS = 10;

const TEXTS = {
  uz: {
    arrive: 'Yetib keldim',
    arriveHint:
      'Manzilga yetganingizda bosing — joylashuvingiz buyurtma nuqtasi bilan solishtiriladi.',
    arrivedAt: 'Siz {time} da yetib keldingiz',
    noPin: "Buyurtmada xaritadagi nuqta yo'q — «Yetib keldim» ishlamaydi",
    askPin: "Mijozdan manzil nuqtasini so'rash",
    askSent: "So'rov yuborildi",
    askSentShort: "So'rov yuborildi",
    askAgainAt: '{when} dan keyin qayta so‘rash mumkin',
    arrivedPlain: 'Siz manzilga yetib keldingiz',
    denied: "Joylashuvga ruxsat berilmadi — sozlamalardan yoqing yoki Telegram'dan foydalaning",
    failed: "Joylashuvni aniqlab bo'lmadi",
    noContact: "Bog'lana olmadim",
    noWork: 'Mijoz ish qildirmadi',
    noContactTitle: "Mijoz bilan bog'lana olmadingizmi?",
    noWorkTitle: 'Mijoz ish qildirmadimi?',
    complaintHint:
      "Mijozdan 24 soat ichida javob so'raladi. U tasdiqlasa yoki javob bermasa, buyurtma bekor qilinadi.",
    note: 'Izoh (ixtiyoriy)',
    send: 'Yuborish',
    cancel: 'Bekor qilish',
    complaintSent: "Yuborildi. Mijozdan so'raymiz — natijasini xabar qilamiz.",
    doneTitle: 'Ish bajarildimi?',
    doneHint:
      'Mijozdan tasdiq so‘raymiz. Tasdiqlangach buyurtma yakunlanadi va mijozni baholay olasiz.',
    photosTitle: 'Ishdan keyingi foto',
    addPhoto: "Foto qo'shish",
    photoHint: "Kamida bitta foto yuklang — mijoz ishni shu foto bo'yicha tasdiqlaydi",
    confirm: 'Ha, ish bajarildi',
    uploading: 'Yuklanmoqda…',
    err: 'Xatolik yuz berdi',
    beforeTitle: 'Ishdan oldingi suratlar',
    beforeHint: 'Ishni boshlashdan oldin holatni suratga oling — nizoda sizni himoya qiladi',
    beforeAdded: "{n} ta surat qo'shildi",
  },
  ru: {
    arrive: 'Я на месте',
    arriveHint: 'Нажмите, когда будете на месте — ваше местоположение сверят с точкой заказа.',
    arrivedAt: 'Вы прибыли в {time}',
    noPin: 'В заказе нет точки на карте — «Я на месте» не сработает',
    askPin: 'Попросить заказчика отметить точку',
    askSent: 'Запрос отправлен',
    askSentShort: 'Запрос отправлен',
    askAgainAt: 'Повторить можно после {when}',
    arrivedPlain: 'Вы прибыли на место',
    denied: 'Нет доступа к местоположению — включите его в настройках',
    failed: 'Не удалось определить местоположение',
    noContact: 'Не смог связаться',
    noWork: 'Заказчик не дал работать',
    noContactTitle: 'Не смогли связаться с заказчиком?',
    noWorkTitle: 'Заказчик не дал выполнить работу?',
    complaintHint:
      'Заказчику дадут 24 часа на ответ. Если он подтвердит или не ответит, заказ будет отменён.',
    note: 'Комментарий (необязательно)',
    send: 'Отправить',
    cancel: 'Отмена',
    complaintSent: 'Отправлено. Спросим заказчика — сообщим результат.',
    doneTitle: 'Работа выполнена?',
    doneHint:
      'Попросим клиента подтвердить. После подтверждения заказ будет завершён, и вы сможете оценить клиента.',
    photosTitle: 'Фото после работы',
    addPhoto: 'Добавить фото',
    photoHint: 'Загрузите хотя бы одно фото — по нему клиент подтвердит работу',
    confirm: 'Да, работа выполнена',
    uploading: 'Загрузка…',
    err: 'Произошла ошибка',
    beforeTitle: 'Фото до начала работы',
    beforeHint: 'Сфотографируйте состояние до начала работы — это защитит вас в споре',
    beforeAdded: 'Добавлено фото: {n}',
  },
  en: {
    arrive: "I'm here",
    arriveHint: 'Tap when you arrive — your location is checked against the order point.',
    arrivedAt: 'You arrived at {time}',
    noPin: 'The order has no map point — "I\'m here" will not work',
    askPin: 'Ask the customer to mark the point',
    askSent: 'Request sent',
    askSentShort: 'Request sent',
    askAgainAt: 'You can ask again after {when}',
    arrivedPlain: 'You arrived at the place',
    denied: 'Location access denied — enable it in settings',
    failed: 'Could not get your location',
    noContact: "Couldn't reach",
    noWork: 'Customer refused work',
    noContactTitle: "Couldn't reach the customer?",
    noWorkTitle: 'Did the customer refuse the work?',
    complaintHint:
      'The customer gets 24 hours to answer. If they confirm or do not answer, the order is cancelled.',
    note: 'Comment (optional)',
    send: 'Send',
    cancel: 'Cancel',
    complaintSent: "Sent. We'll ask the customer and tell you the result.",
    doneTitle: 'Work done?',
    doneHint:
      'We will ask the customer to confirm. Once confirmed the order completes and you can rate the customer.',
    photosTitle: 'After-work photos',
    addPhoto: 'Add photo',
    photoHint: 'Upload at least one photo — the customer confirms the work by it',
    confirm: 'Yes, work is done',
    uploading: 'Uploading…',
    err: 'Something went wrong',
    beforeTitle: 'Photos before the work',
    beforeHint: 'Photograph the condition before you start — it protects you in a dispute',
    beforeAdded: '{n} photo(s) added',
  },
};

const timeOf = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function Button({ t, label, onPress, kind = 'primary', icon, disabled, busy }) {
  const color = kind === 'primary' ? '#fff' : kind === 'danger' ? '#e5484d' : t.text;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || busy}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor:
          kind === 'primary' ? t.orange : kind === 'danger' ? 'rgba(229,72,77,0.14)' : t.card2,
        opacity: disabled || busy ? 0.55 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={17} color={color} />
      ) : null}
      <Text style={{ color, fontWeight: '800', fontSize: 14.5 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Ishdan oldingi suratlar: bir raundda ko'pi bilan 10 ta; yuklangach `work-photos` ga yuboriladi.
export function BeforePhotos({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const wp = order.work_photos;
  const current = wp?.rounds?.find((r) => r.round === wp.round);
  const before = (current?.before ?? wp?.before ?? []).map((p) =>
    typeof p === 'string' ? p : p?.url
  );
  const left = Math.max(0, MAX_PHOTOS - before.length);

  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: left,
      quality: 0.8,
    });
    if (res.canceled) return;
    setBusy(true);
    try {
      const keys = [];
      for (const a of res.assets.slice(0, left)) {
        keys.push(await uploadWorkPhoto(order.id, a.uri, a.mimeType || 'image/jpeg'));
      }
      if (keys.length) {
        await addBeforePhotos(order.id, keys);
        appAlert(x.beforeAdded.replace('{n}', String(keys.length)));
      }
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ['worker'] });
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.beforeTitle.toUpperCase()} · {before.length}/{MAX_PHOTOS}
      </Text>
      <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>{x.beforeHint}</Text>
      {before.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {before.map((u, i) => (
            <Image
              key={`${u}${i}`}
              source={{ uri: u }}
              style={{ width: 72, height: 72, borderRadius: 10 }}
            />
          ))}
        </View>
      )}
      <Button
        t={t}
        kind="ghost"
        icon="camera-outline"
        label={busy ? x.uploading : x.addPhoto}
        busy={busy}
        disabled={left <= 0}
        onPress={add}
      />
    </View>
  );
}

// "Yetib keldim" + "Mijoz bilan bog'lana olmadim / ish qildirmadi" (ish boshlanishidan oldin).
export function FieldActions({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const arrive = useMarkArrived();
  const complain = useFileComplaint();
  const [locating, setLocating] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  // Sayt maydoni: `worker_arrived_at`. Nuqta bor-yo'qligi: gps_lat/gps_lng sonmi.
  const arrivedIso = order.worker_arrived_at ?? order.arrived_at;
  const arrived = !!arrivedIso;
  const isNum = (v) => v != null && v !== '' && Number.isFinite(Number(v));
  const hasPin = isNum(order.gps_lat) && isNum(order.gps_lng);
  const kind = arrived ? 'no_work' : 'no_contact';
  // Sayt qoidasi: ochiq shikoyat (mijoz javobi kutilmoqda / nizo) bo'lsa yoki muddat o'tgan bo'lsa yangisi yo'q;
  // "ish qildirmadi" faqat `no_work_allowed` bo'lganda.
  const openComplaint = ['awaiting_customer', 'disputed'].includes(order.match_complaint?.status);
  const untilMs = order.complaint_until ? new Date(order.complaint_until).getTime() : null;
  const canComplain =
    !openComplaint &&
    (untilMs == null || untilMs > new Date().getTime()) &&
    (!arrived || order.no_work_allowed !== false);
  const qc = useQueryClient();
  const [askBusy, setAskBusy] = useState(false);
  const [askUntil, setAskUntil] = useState(null);
  const [cooling, setCooling] = useState(false);

  // Buyurtmada xarita nuqtasi yo'q bo'lsa — mijozdan nuqta belgilashni so'rash (qayta so'rash cheklangan).
  const askPin = async () => {
    setAskBusy(true);
    try {
      const res = await requestLocation(order.id);
      const next = res?.next_request_at ?? null;
      const ms = next ? new Date(next).getTime() - Date.now() : 0;
      setAskUntil(next);
      if (ms > 0) {
        setCooling(true);
        setTimeout(() => setCooling(false), Math.min(ms, 2 ** 31 - 1));
      }
      appAlert(x.askSent);
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setAskBusy(false);
      qc.invalidateQueries({ queryKey: ['worker'] });
    }
  };

  const markArrived = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        appAlert(x.denied);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const r = (n) => Math.round(n * 1e6) / 1e6;
      arrive.mutate(
        {
          id: order.id,
          coords: {
            lat: r(pos.coords.latitude),
            lng: r(pos.coords.longitude),
            accuracy_m: Math.round(pos.coords.accuracy ?? 0),
          },
        },
        { onError: (e) => appAlert(e?.message || x.err) }
      );
    } catch {
      appAlert(x.failed);
    } finally {
      setLocating(false);
    }
  };

  const sendComplaint = () =>
    complain.mutate(
      { id: order.id, note, kind },
      {
        onSuccess: () => {
          setOpen(false);
          setNote('');
          appAlert(x.complaintSent);
        },
        onError: (e) => appAlert(e?.message || x.err),
      }
    );

  return (
    <View style={{ gap: 10 }}>
      {arrived ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="location" size={18} color="#2eb872" />
          <Text style={{ flex: 1, color: t.text, fontWeight: '700' }}>
            {arrivedIso ? x.arrivedAt.replace('{time}', timeOf(arrivedIso)) : x.arrivedPlain}
          </Text>
        </View>
      ) : !hasPin ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name="alert-circle-outline" size={18} color="#f5b81f" />
            <Text style={{ flex: 1, color: t.muted, fontSize: 12.5, lineHeight: 18 }}>
              {x.noPin}
            </Text>
          </View>
          <Button
            t={t}
            kind="ghost"
            icon="pin-outline"
            label={cooling ? x.askSentShort : x.askPin}
            busy={askBusy}
            disabled={cooling}
            onPress={askPin}
          />
          {cooling && (
            <Text style={{ color: t.muted, fontSize: 12 }}>
              {x.askAgainAt.replace('{when}', timeOf(askUntil))}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>{x.arriveHint}</Text>
          <Button
            t={t}
            icon="location-outline"
            label={x.arrive}
            busy={locating || arrive.isPending}
            onPress={markArrived}
          />
        </>
      )}

      {!canComplain ? null : open ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 14.5 }}>
            {arrived ? x.noWorkTitle : x.noContactTitle}
          </Text>
          <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>{x.complaintHint}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={x.note}
            placeholderTextColor={t.faint}
            multiline
            maxLength={500}
            style={{
              minHeight: 70,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.card2,
              color: t.text,
              fontSize: 14,
              textAlignVertical: 'top',
            }}
          />
          <Button
            t={t}
            kind="danger"
            label={x.send}
            busy={complain.isPending}
            onPress={sendComplaint}
          />
          <Button t={t} kind="ghost" label={x.cancel} onPress={() => setOpen(false)} />
        </View>
      ) : (
        <Button
          t={t}
          kind="ghost"
          icon="call-outline"
          label={arrived ? x.noWork : x.noContact}
          onPress={() => setOpen(true)}
        />
      )}
    </View>
  );
}

// "Ish bajarildi": kamida bitta foto majburiy (sayt shunday), keyin mijozga tasdiqlashga yuboriladi.
export function WorkDoneForm({ order, disabled, onSent }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const done = useWorkDone();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });
    if (res.canceled) return;
    setPhotos((p) => [...p, ...res.assets].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    setBusy(true);
    try {
      const keys = [];
      for (const a of photos) {
        keys.push(await uploadWorkPhoto(order.id, a.uri, a.mimeType || 'image/jpeg'));
      }
      await done.mutateAsync({ id: order.id, keys });
      setOpen(false);
      setPhotos([]);
      onSent?.();
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        t={t}
        kind="ghost"
        icon="checkmark-done"
        label={x.doneTitle.replace('?', '')}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{x.doneTitle}</Text>
      <Text style={{ color: t.muted, fontSize: 12.5, lineHeight: 18 }}>{x.doneHint}</Text>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.photosTitle.toUpperCase()} · {photos.length}/{MAX_PHOTOS}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((a, i) => (
          <View key={a.uri + i}>
            <Image source={{ uri: a.uri }} style={{ width: 84, height: 84, borderRadius: 12 }} />
            <TouchableOpacity
              hitSlop={6}
              onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <TouchableOpacity
            onPress={pick}
            activeOpacity={0.8}
            style={{
              width: 84,
              height: 84,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: t.border,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <Ionicons name="image-outline" size={22} color={t.muted} />
            <Text style={{ color: t.muted, fontSize: 11, fontWeight: '700' }}>{x.addPhoto}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{x.photoHint}</Text>
      <Button
        t={t}
        icon="checkmark-done"
        label={busy ? x.uploading : x.confirm}
        busy={busy}
        disabled={photos.length === 0}
        onPress={submit}
      />
      <Button t={t} kind="ghost" label={x.cancel} disabled={busy} onPress={() => setOpen(false)} />
    </View>
  );
}

const NS_TEXTS = {
  uz: {
    title: 'Mijoz siz kelmadingiz deb bildirdi',
    body: "{deadline} gacha javob bering. Kelmaganingizni tasdiqlasangiz yoki javob bermasangiz, buyurtma bekor qilinadi va kelmaslik belgisi qo'yiladi. Olingan haq qaytarilmaydi.",
    late: "Javob muddati o'tdi",
    came: 'Men keldim',
    cameAsk: 'Operator chat va kelish yozuvi asosida hal qiladi. Davom etasizmi?',
    notCame: 'Kelmadim',
    notCameAsk:
      "Buyurtma bekor qilinadi, kelmaslik belgisi qo'yiladi va olingan haq qaytarilmaydi.",
    cancel: 'Bekor qilish',
    err: 'Xatolik yuz berdi',
  },
  ru: {
    title: 'Заказчик сообщил, что вы не пришли',
    body: 'Ответьте до {deadline}. Если подтвердите неявку или не ответите, заказ будет отменён и будет поставлена отметка о неявке. Полученная оплата не возвращается.',
    late: 'Срок ответа истёк',
    came: 'Я пришёл',
    cameAsk: 'Оператор решит по чату и записи прибытия. Продолжить?',
    notCame: 'Не приходил',
    notCameAsk: 'Заказ будет отменён, будет отметка о неявке, оплата не возвращается.',
    cancel: 'Отмена',
    err: 'Произошла ошибка',
  },
  en: {
    title: 'The customer says you did not show up',
    body: 'Reply by {deadline}. If you confirm or do not reply, the order is cancelled and a no-show is recorded. Any fee already taken is not refunded.',
    late: 'The reply window has passed',
    came: 'I came',
    cameAsk: 'An operator will decide based on the chat and arrival record. Continue?',
    notCame: 'I did not come',
    notCameAsk: 'The order will be cancelled, a no-show recorded and the fee is not refunded.',
    cancel: 'Cancel',
    err: 'Something went wrong',
  },
};

const stamp = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Mijoz "usta kelmadi" degan: usta "keldim" / "kelmadim" deb javob beradi (`no-show/answer`).
export function NoShowAnswer({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = NS_TEXTS[language] ?? NS_TEXTS.uz;
  const answer = useAnswerNoShow();
  const c = order.arrival_check;
  if (!c || c.status !== 'awaiting_worker' || order.status !== 'active') return null;
  const expired = !!c.deadline && new Date(c.deadline).getTime() < new Date().getTime();

  const send = (came) =>
    answer.mutate({ id: order.id, came }, { onError: (e) => appAlert(e?.message || x.err) });
  const confirm = (msg, label, came) =>
    Alert.alert(label, msg, [
      { text: x.cancel, style: 'cancel' },
      { text: label, style: came ? 'default' : 'destructive', onPress: () => send(came) },
    ]);

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(245,184,31,0.5)',
        backgroundColor: 'rgba(245,184,31,0.1)',
      }}
    >
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 14.5 }}>{x.title}</Text>
      <Text style={{ color: t.muted, fontSize: 13, lineHeight: 18 }}>
        {expired ? x.late : x.body.replace('{deadline}', stamp(c.deadline))}
      </Text>
      {!expired && (
        <Button
          t={t}
          icon="checkmark-circle"
          label={x.came}
          busy={answer.isPending}
          onPress={() => confirm(x.cameAsk, x.came, true)}
        />
      )}
      <Button
        t={t}
        kind="danger"
        label={x.notCame}
        busy={answer.isPending}
        onPress={() => confirm(x.notCameAsk, x.notCame, false)}
      />
    </View>
  );
}

const CS_TEXTS = {
  uz: {
    awaiting: 'Mijoz javobini kutyapmiz — {deadline} gacha',
    disputed: "Mijoz rad etdi — operator ko'rib chiqmoqda",
    refundedFee: 'Komissiya hamyoningizga qaytarildi.',
    upheld: 'Shikoyat tasdiqlandi — buyurtma bekor qilindi',
    by: {
      customer_confirmed: 'mijoz tasdiqladi',
      no_answer: 'mijoz javob bermadi',
      operator_refund: 'operator tasdiqladi',
    },
    feeBack: 'haq hamyoningizga qaytarildi',
    comp: "Yo'l kompensatsiyasi: {amount} so'm hamyoningizga qo'shildi",
    rejectedOn: 'Shikoyat rad etildi — buyurtma davom etadi',
    rejected: 'Shikoyat rad etildi',
  },
  ru: {
    awaiting: 'Ждём ответ заказчика — до {deadline}',
    disputed: 'Заказчик отклонил — оператор рассматривает',
    refundedFee: 'Комиссия возвращена на ваш кошелёк.',
    upheld: 'Жалоба подтверждена — заказ отменён',
    by: {
      customer_confirmed: 'подтвердил заказчик',
      no_answer: 'заказчик не ответил',
      operator_refund: 'подтвердил оператор',
    },
    feeBack: 'удержанная сумма возвращена на кошелёк',
    comp: 'Компенсация за дорогу: {amount} сум зачислено на кошелёк',
    rejectedOn: 'Жалоба отклонена — заказ продолжается',
    rejected: 'Жалоба отклонена',
  },
  en: {
    awaiting: 'Waiting for the customer to answer — until {deadline}',
    disputed: 'The customer disagreed — an operator is reviewing',
    refundedFee: 'The commission was returned to your wallet.',
    upheld: 'Complaint upheld — the order was cancelled',
    by: {
      customer_confirmed: 'customer confirmed',
      no_answer: 'customer did not answer',
      operator_refund: 'operator confirmed',
    },
    feeBack: 'the fee was returned to your wallet',
    comp: 'Travel compensation: {amount} UZS added to your wallet',
    rejectedOn: 'Complaint rejected — the order continues',
    rejected: 'Complaint rejected',
  },
};

// Ustaning shikoyati (`match_complaint`) holati: faqat ko'rsatish, javobni mijoz beradi.
export function ComplaintStatus({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = CS_TEXTS[language] ?? CS_TEXTS.uz;
  const c = order.match_complaint;
  if (!c) return null;
  const noWork = c.kind === 'no_work';
  const fee = c.refunded_amount != null ? Number(c.refunded_amount) : null;
  let text = null;
  let tone = 'info';
  switch (c.status) {
    case 'awaiting_customer':
      text = x.awaiting.replace('{deadline}', stamp(c.answer_deadline));
      break;
    case 'disputed':
      text = x.disputed;
      break;
    case 'refunded': {
      tone = 'ok';
      if (!noWork && order.cancel_reason !== 'complaint_no_contact') {
        text = x.refundedFee;
        break;
      }
      const parts = [x.upheld, x.by[c.resolution], fee == null || fee > 0 ? x.feeBack : null];
      text = parts.filter(Boolean).join(' · ');
      if (noWork && Number(c.compensation) > 0) {
        text += `. ${x.comp.replace('{amount}', String(Math.round(Number(c.compensation))))}`;
      }
      break;
    }
    case 'rejected':
      if (c.resolution === 'job_completed') return null;
      tone = 'warn';
      text = order.status === 'active' ? x.rejectedOn : x.rejected;
      break;
    default:
      return null;
  }
  const color = tone === 'ok' ? '#2eb872' : tone === 'warn' ? '#f5b81f' : t.muted;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: t.card2,
      }}
    >
      <Ionicons name="information-circle" size={18} color={color} />
      <Text style={{ flex: 1, color: t.text, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}
