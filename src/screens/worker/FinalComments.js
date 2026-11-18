import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { sendFinalComment } from '../../api/workerApp';
import { Button } from './OrderFieldActions';

const TEXTS = {
  uz: {
    title: 'Yakuniy izohlar',
    customer: 'Mijoz',
    worker: 'Mutaxassis',
    you: 'siz',
    yours: 'Sizning izohingiz',
    placeholder: 'Ish qanday o‘tdi? Masalan: ikkala kran almashtirildi, kafolat 6 oy.',
    once: "Izoh bir marta yoziladi, keyin uni o'zgartirib bo'lmaydi.",
    send: 'Yuborish',
    err: 'Xatolik yuz berdi',
  },
  ru: {
    title: 'Итоговые комментарии',
    customer: 'Заказчик',
    worker: 'Специалист',
    you: 'вы',
    yours: 'Ваш комментарий',
    placeholder: 'Как прошла работа? Например: заменили оба крана, гарантия 6 месяцев.',
    once: 'Комментарий пишется один раз, потом его нельзя изменить.',
    send: 'Отправить',
    err: 'Произошла ошибка',
  },
  en: {
    title: 'Final comments',
    customer: 'Customer',
    worker: 'Specialist',
    you: 'you',
    yours: 'Your comment',
    placeholder: 'How did the job go? E.g. both taps replaced, 6-month warranty.',
    once: 'You can write the comment once; it cannot be changed later.',
    send: 'Send',
    err: 'Something went wrong',
  },
};

// Tugagan buyurtmada ikki tomonning yakuniy izohi: usta o'zinikini bir marta yozadi (≤1000).
export default function FinalComments({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const send = useMutation({
    mutationFn: () => sendFinalComment(order.id, text),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['worker'] });
    },
    onError: (e) => appAlert(e?.message || x.err),
  });

  const mine = order.worker_final_comment;
  const theirs = order.customer_final_comment;
  const shown = [
    theirs && { key: 'c', who: x.customer, body: theirs, me: false },
    mine && { key: 'w', who: x.worker, body: mine, me: true },
  ].filter(Boolean);
  if (order.status !== 'completed' || (shown.length === 0 && mine)) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.title.toUpperCase()}
      </Text>
      {shown.map((c) => (
        <View
          key={c.key}
          style={{ gap: 4, padding: 12, borderRadius: 12, backgroundColor: t.card2 }}
        >
          <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>
            {c.me ? `${c.who} · ${x.you}` : c.who}
          </Text>
          <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>{c.body}</Text>
        </View>
      ))}
      {!mine && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{x.yours}</Text>
            <Text style={{ color: t.faint, fontSize: 12 }}>{text.length} / 1000</Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={x.placeholder}
            placeholderTextColor={t.faint}
            multiline
            maxLength={1000}
            style={{
              minHeight: 80,
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
          <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{x.once}</Text>
          <Button
            t={t}
            label={x.send}
            busy={send.isPending}
            disabled={!text.trim()}
            onPress={() => send.mutate()}
          />
        </View>
      )}
    </View>
  );
}
