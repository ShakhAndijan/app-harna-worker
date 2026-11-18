import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { rateCustomer } from '../../api/workerApp';

const TEXTS = {
  uz: {
    title: 'Mijozni baholash',
    hint: "Bahoyingiz boshqa mutaxassislarga ko'rinadi va uni keyin o'zgartirib bo'lmaydi. Har bir buyurtma uchun bir marta.",
    comment: 'Izoh (ixtiyoriy)',
    send: 'Baho yuborish',
    rated: 'Mijozga {n} baho berdingiz',
    ratedNoStars: 'Mijozni baholadingiz',
    err: 'Xatolik yuz berdi',
  },
  ru: {
    title: 'Оценить заказчика',
    hint: 'Оценку увидят другие специалисты, изменить её потом нельзя. По одной на заказ.',
    comment: 'Комментарий (необязательно)',
    send: 'Отправить оценку',
    rated: 'Вы поставили заказчику {n}',
    ratedNoStars: 'Вы оценили заказчика',
    err: 'Произошла ошибка',
  },
  en: {
    title: 'Rate the customer',
    hint: 'Other specialists will see your rating and it cannot be changed later. One per order.',
    comment: 'Comment (optional)',
    send: 'Submit rating',
    rated: 'You rated the customer {n}',
    ratedNoStars: 'You rated the customer',
    err: 'Something went wrong',
  },
};

// Tugagan buyurtma: mijozni 1–5 yulduz va izoh bilan baholash (bir marta).
export default function RateCustomer({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: () => rateCustomer(order.id, { rating: stars, comment }),
    onSuccess: () => {
      setSent(true);
      qc.invalidateQueries({ queryKey: ['worker'] });
    },
    onError: (e) => setError(e?.message || x.err),
  });

  if (order.customer_rating || sent) {
    const n = order.customer_rating ?? stars;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="checkmark-circle" size={20} color="#2eb872" />
        <Text style={{ flex: 1, color: t.text, fontWeight: '700' }}>
          {n ? x.rated.replace('{n}', `${n} ★`) : x.ratedNoStars}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.title.toUpperCase()}
      </Text>
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
      <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{x.hint}</Text>
      {!!error && <Text style={{ color: '#e5484d', fontSize: 13 }}>{error}</Text>}
      <TouchableOpacity
        disabled={send.isPending}
        onPress={() => {
          setError('');
          send.mutate();
        }}
        style={{
          alignItems: 'center',
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: t.orange,
          opacity: send.isPending ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14.5 }}>{x.send}</Text>
      </TouchableOpacity>
    </View>
  );
}
