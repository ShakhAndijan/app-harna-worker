import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  Image,
  StyleSheet,
} from 'react-native';
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { appAlert } from '../../components/AppAlert';
import { submitReview, uploadReviewPhoto, sendFinalComment } from '../../api/customerFlow';
import { Button, Muted, PhotoStrip, usePhotoPicker, useL, photoUrl } from './ui';

const TEXTS = {
  uz: {
    title: 'Sharh qoldirish',
    rating: 'Baho',
    comment: 'Izoh',
    addPhotos: "Rasm qo'shish",
    uploading: 'Yuklanmoqda…',
    photosPublic: "Suratlar ustaning profilida ko'rinsin",
    photosPublicHint: "Belgilasangiz, buyurtma suratlari ustaning ochiq profilida ko'rinadi",
    submit: 'Sharhni yuborish',
    thanks: 'Sharhingiz uchun rahmat!',
    err: 'Xatolik yuz berdi',
    fcTitle: 'Yakuniy izohlar',
    fcCustomer: 'Mijoz',
    fcWorker: 'Mutaxassis',
    fcYou: 'siz',
    fcYours: 'Sizning izohingiz',
    fcPlaceholder: 'Ish qanday o‘tdi? Masalan: ikkala kran almashtirildi, kafolat 6 oy.',
    fcOnce: "Izoh bir marta yoziladi, keyin uni o'zgartirib bo'lmaydi.",
    fcSend: 'Yuborish',
    cTitle: 'Buyurtmani yakunlash',
    cHint:
      "Ish bajarilganini tasdiqlaysiz. Xohlasangiz, ish haqida yakuniy izoh qoldiring: uni mutaxassis ham ko'radi.",
    cAfter: 'Ishdan keyingi suratlar',
    cLabel: 'Yakuniy izoh (ixtiyoriy)',
    cOk: 'Yakunlash',
    close: 'Yopish',
  },
  ru: {
    title: 'Оставить отзыв',
    rating: 'Оценка',
    comment: 'Комментарий',
    addPhotos: 'Добавить фото',
    uploading: 'Загрузка…',
    photosPublic: 'Показывать фото в профиле специалиста',
    photosPublicHint: 'Если отметите, фото заказа будут видны в открытом профиле специалиста',
    submit: 'Отправить отзыв',
    thanks: 'Спасибо за отзыв!',
    err: 'Произошла ошибка',
    fcTitle: 'Итоговые комментарии',
    fcCustomer: 'Заказчик',
    fcWorker: 'Специалист',
    fcYou: 'вы',
    fcYours: 'Ваш комментарий',
    fcPlaceholder: 'Как прошла работа? Например: заменили оба крана, гарантия 6 месяцев.',
    fcOnce: 'Комментарий пишется один раз, потом его нельзя изменить.',
    fcSend: 'Отправить',
    cTitle: 'Завершение заказа',
    cHint:
      'Вы подтверждаете, что работа выполнена. При желании оставьте итоговый комментарий — его увидит и специалист.',
    cAfter: 'Фото после работы',
    cLabel: 'Итоговый комментарий (необязательно)',
    cOk: 'Завершить',
    close: 'Закрыть',
  },
  en: {
    title: 'Leave a review',
    rating: 'Rating',
    comment: 'Comment',
    addPhotos: 'Add photos',
    uploading: 'Uploading…',
    photosPublic: "Show photos on the specialist's profile",
    photosPublicHint: "If ticked, the order photos appear on the specialist's public profile",
    submit: 'Submit review',
    thanks: 'Thank you for your review!',
    err: 'Something went wrong',
    fcTitle: 'Final comments',
    fcCustomer: 'Customer',
    fcWorker: 'Specialist',
    fcYou: 'you',
    fcYours: 'Your comment',
    fcPlaceholder: 'How did the job go? E.g. both taps replaced, 6-month warranty.',
    fcOnce: 'You can write the comment once; it cannot be changed later.',
    fcSend: 'Send',
    cTitle: 'Complete the order',
    cHint:
      'You confirm the work is done. If you like, leave a final comment — the specialist will see it too.',
    cAfter: 'Photos after the work',
    cLabel: 'Final comment (optional)',
    cOk: 'Complete',
    close: 'Close',
  },
};

const MAX_REVIEW_PHOTOS = 5;

// Tugagan buyurtma: yulduz, izoh, suratlar va "suratlar usta profilida ko'rinsin" belgisi.
export function ReviewForm({ order, onChanged }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const photos = usePhotoPicker(
    MAX_REVIEW_PHOTOS,
    (uri, mime) => uploadReviewPhoto(uri, mime),
    x.err
  );

  if (order.customerRated || sent) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="checkmark-circle" size={20} color="#2eb872" />
        <Text style={{ flex: 1, color: t.text, fontWeight: '700' }}>{x.thanks}</Text>
      </View>
    );
  }

  const send = async () => {
    setSending(true);
    try {
      await submitReview(order.id, {
        rating: stars,
        comment,
        photoKeys: photos.keys,
        photosPublic: isPublic && photos.keys.length > 0,
      });
      setSent(true);
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setSending(false);
      onChanged?.();
    }
  };

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
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>{x.rating}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} hitSlop={6} onPress={() => setStars(n)}>
            <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={36} color="#f5b81f" />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder={x.comment}
        placeholderTextColor={t.faint}
        multiline
        maxLength={2000}
        style={{
          minHeight: 80,
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
        label={
          photos.busy ? x.uploading : `${x.addPhotos} · ${photos.items.length}/${MAX_REVIEW_PHOTOS}`
        }
        busy={photos.busy}
        disabled={photos.items.length >= MAX_REVIEW_PHOTOS || sending}
        onPress={photos.add}
      />
      {photos.items.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 13.5 }}>
              {x.photosPublic}
            </Text>
            <Muted>{x.photosPublicHint}</Muted>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
      )}
      <Button t={t} label={x.submit} busy={sending} disabled={photos.busy} onPress={send} />
    </View>
  );
}

// Yakuniy izohlar: mijoz va usta izohi; mijoz o'zinikini bir marta yozadi.
export function CustomerFinalComment({ order, onChanged }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const mine = order.customerFinalComment;
  const theirs = order.workerFinalComment;
  if (!mine && !theirs && !order.workerId) return null;

  const send = async () => {
    setSending(true);
    try {
      await sendFinalComment(order.id, text);
      setText('');
    } catch (e) {
      appAlert(e?.message || x.err);
    } finally {
      setSending(false);
      onChanged?.();
    }
  };
  const rows = [
    mine && { key: 'c', who: `${x.fcCustomer} · ${x.fcYou}`, body: mine },
    theirs && { key: 'w', who: x.fcWorker, body: theirs },
  ].filter(Boolean);

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{x.fcTitle}</Text>
      {rows.map((r) => (
        <View
          key={r.key}
          style={{ gap: 4, padding: 12, borderRadius: 12, backgroundColor: t.card }}
        >
          <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>{r.who}</Text>
          <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>{r.body}</Text>
        </View>
      ))}
      {!mine && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{x.fcYours}</Text>
            <Text style={{ color: t.faint, fontSize: 12 }}>{text.length} / 1000</Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={x.fcPlaceholder}
            placeholderTextColor={t.faint}
            multiline
            maxLength={1000}
            style={{
              minHeight: 80,
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
          <Muted>{x.fcOnce}</Muted>
          <Button t={t} label={x.fcSend} busy={sending} disabled={!text.trim()} onPress={send} />
        </View>
      )}
    </View>
  );
}

// Joriy raunddagi "ishdan keyin" suratlari (usta yuklagan).
export const afterPhotosOf = (order) => {
  const wp = order.workPhotos;
  const cur = wp?.rounds?.find((r) => r.round === wp.round);
  return (cur?.after ?? wp?.after ?? []).map(photoUrl).filter(Boolean);
};

// "Buyurtmani yakunlash": ustaning ishdan keyingi suratlari + ixtiyoriy yakuniy izoh.
export function CompleteModal({ visible, order, busy, onClose, onSubmit }) {
  const { theme: t } = useTheme();
  const x = useL(TEXTS);
  const [value, setValue] = useState('');
  const after = visible ? afterPhotosOf(order) : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <KeyboardAvoidingView style={s.backdrop} behavior="padding">
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[s.title, { color: t.text }]}>{x.cTitle}</Text>
            <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>{x.cHint}</Text>
            {after.length > 0 && (
              <View style={{ gap: 6 }}>
                <Text style={{ color: t.muted, fontSize: 12.5, fontWeight: '700' }}>
                  {x.cAfter}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {after.map((u) => (
                    <Image
                      key={u}
                      source={{ uri: u }}
                      style={{ width: 64, height: 64, borderRadius: 10 }}
                    />
                  ))}
                </View>
              </View>
            )}
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{x.cLabel}</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={x.fcPlaceholder}
              placeholderTextColor={t.faint}
              multiline
              maxLength={1000}
              style={{
                height: 90,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.inputBg,
                color: t.text,
                fontSize: 15,
                textAlignVertical: 'top',
              }}
            />
            <Muted>{x.fcOnce}</Muted>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[s.btn, { borderColor: t.line2, borderWidth: 1.5 }]}
                disabled={busy}
                onPress={onClose}
              >
                <Text style={{ color: t.text, fontWeight: '700', fontSize: 14.5 }}>{x.close}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: t.green, opacity: busy ? 0.5 : 1 }]}
                disabled={busy}
                onPress={() => onSubmit(value.trim())}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14.5 }}>{x.cOk}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 18, gap: 12 },
  title: { fontWeight: '800', fontSize: 17 },
  btn: { flex: 1, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
