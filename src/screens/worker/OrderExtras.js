import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils/format';
import { proposeExtra } from '../../api/workerApp';

export const MAX_EXTRAS = 5;

const TEXTS = {
  uz: {
    title: "Qo'shimcha ishlar",
    add: "Qo'shimcha ish taklif qilish",
    desc: 'Qanday qo‘shimcha ish? Masalan: rozetka o‘rnatish',
    price: 'Narx',
    send: 'Mijozga yuborish',
    cancel: 'Bekor qilish',
    som: "so'm",
    pending: 'Mijoz javobini kutyapmiz',
    approved: "Mijoz rozi bo'ldi",
    declined: 'Mijoz rad etdi',
    lapsed: 'Javob bo‘lmadi — taklif bekor bo‘ldi',
    closed: 'Yopildi',
    total: 'Jami: {total} so‘m (kelishilgan {agreed} + qo‘shimcha {extras})',
    limit: 'Bitta buyurtmaga ko‘pi bilan {n} ta qo‘shimcha ish taklif qilish mumkin',
    waiting: 'Avvalgi taklifga mijoz javob berishi kerak',
    hint: 'Mijoz rozi bo‘lsa, narx buyurtmaning jami summasiga qo‘shiladi.',
    err: 'Xatolik yuz berdi',
  },
  ru: {
    title: 'Дополнительные работы',
    add: 'Предложить доп. работу',
    desc: 'Какая работа? Например: установка розетки',
    price: 'Цена',
    send: 'Отправить клиенту',
    cancel: 'Отмена',
    som: 'сум',
    pending: 'Ждём ответа клиента',
    approved: 'Клиент согласился',
    declined: 'Клиент отклонил',
    lapsed: 'Ответа не было — предложение отменено',
    closed: 'Закрыто',
    total: 'Итого: {total} сум (договорная {agreed} + дополнительно {extras})',
    limit: 'К одному заказу можно предложить не более {n} доп. работ',
    waiting: 'Клиент должен ответить на предыдущее предложение',
    hint: 'Если клиент согласится, сумма добавится к итоговой цене заказа.',
    err: 'Произошла ошибка',
  },
  en: {
    title: 'Extra work',
    add: 'Propose extra work',
    desc: 'What extra work? e.g. install a socket',
    price: 'Price',
    send: 'Send to customer',
    cancel: 'Cancel',
    som: 'UZS',
    pending: 'Waiting for the customer',
    approved: 'Customer agreed',
    declined: 'Customer declined',
    lapsed: 'No reply — proposal cancelled',
    closed: 'Closed',
    total: 'Total: {total} UZS (agreed {agreed} + extra {extras})',
    limit: 'You can propose at most {n} extra jobs per order',
    waiting: 'The customer must answer your previous proposal first',
    hint: 'If the customer agrees, the price is added to the order total.',
    err: 'Something went wrong',
  },
};

const GREEN = '#2eb872';
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const num = (v) => formatNumber(Math.round(Number(v) || 0));

/** "Jami = kelishilgan + qo'shimcha" qatori; qo'shimcha ish bo'lmasa null. */
export function extrasTotalLine(order, language) {
  const extras = Number(order.extras_total ?? 0);
  if (!(extras > 0) || !order.agreed_price) return null;
  const x = TEXTS[language] ?? TEXTS.uz;
  const agreed = Number(order.agreed_price);
  const total = order.total_price != null ? Number(order.total_price) : agreed + extras;
  return x.total
    .replace('{total}', num(total))
    .replace('{agreed}', num(agreed))
    .replace('{extras}', num(extras));
}

// Qo'shimcha ishlar ro'yxati va yangi taklif formasi (faqat jarayondagi buyurtmada, usta "bajarildi" demagan bo'lsa).
export default function OrderExtras({ order, canPropose }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const send = useMutation({
    mutationFn: () => proposeExtra(order.id, { description, price }),
    onSuccess: () => {
      setOpen(false);
      setDescription('');
      setPrice('');
      qc.invalidateQueries({ queryKey: ['worker'] });
    },
    onError: (e) => {
      setError(e?.message || x.err);
      // 409: holat o'zgargan (masalan mijoz javob bergan) — ma'lumotni yangilaymiz.
      if (e?.status === 409) qc.invalidateQueries({ queryKey: ['worker'] });
    },
  });

  const items = order.extras ?? [];
  const count = order.extras_count ?? items.length;
  const hasPending = order.pending_extra != null || items.some((e) => e.status === 'pending');
  const limitReached = count >= MAX_EXTRAS;
  const totalLine = extrasTotalLine(order, language);
  if (!items.length && !canPropose) return null;

  const statusText = (e) => x[e.status] ?? e.status;
  const statusColor = (e) =>
    e.status === 'approved' ? GREEN : e.status === 'pending' ? t.gold : t.muted;
  const itemTitle = (e) => [e.task_name, e.description].filter(Boolean).join(' — ') || x.title;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.title.toUpperCase()}
      </Text>

      {items.map((e) => (
        <View key={e.id} style={[s.row, { backgroundColor: t.card2 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{itemTitle(e)}</Text>
            <Text style={{ color: statusColor(e), fontSize: 12, marginTop: 2, fontWeight: '600' }}>
              {statusText(e)}
            </Text>
          </View>
          {e.price != null && (
            <Text style={{ color: t.text, fontWeight: '800' }}>
              {num(e.price)} {x.som}
            </Text>
          )}
        </View>
      ))}

      {!!totalLine && (
        <View style={[s.total, { backgroundColor: 'rgba(232,122,69,0.12)' }]}>
          <Ionicons name="calculator-outline" size={16} color={t.orange} />
          <Text style={{ flex: 1, color: t.text, fontSize: 13, fontWeight: '700' }}>
            {totalLine}
          </Text>
        </View>
      )}

      {canPropose && !open && (
        <>
          {limitReached ? (
            <Text style={{ color: t.muted, fontSize: 12.5 }}>
              {x.limit.replace('{n}', MAX_EXTRAS)}
            </Text>
          ) : hasPending ? (
            <Text style={{ color: t.muted, fontSize: 12.5 }}>{x.waiting}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setError('');
                setOpen(true);
              }}
              style={[s.add, { borderColor: t.border }]}
            >
              <Ionicons name="add-circle-outline" size={18} color={t.orange} />
              <Text style={{ color: t.orange, fontWeight: '700' }}>{x.add}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {open && (
        <View style={{ gap: 10 }}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={x.desc}
            placeholderTextColor={t.faint}
            multiline
            maxLength={500}
            style={[
              s.input,
              s.multi,
              { backgroundColor: t.card2, borderColor: t.border, color: t.text },
            ]}
          />
          <View style={[s.priceBox, { backgroundColor: t.card2, borderColor: t.border }]}>
            <TextInput
              value={price ? formatNumber(price) : ''}
              onChangeText={(v) => setPrice(digits(v))}
              placeholder={x.price}
              placeholderTextColor={t.faint}
              keyboardType="number-pad"
              style={{
                flex: 1,
                color: t.text,
                fontSize: 18,
                fontWeight: '800',
                paddingVertical: 11,
              }}
            />
            <Text style={{ color: t.muted, fontWeight: '700' }}>{x.som}</Text>
          </View>
          <Text style={{ color: t.muted, fontSize: 12, lineHeight: 17 }}>{x.hint}</Text>
          {!!error && <Text style={{ color: '#e5484d', fontSize: 13 }}>{error}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={[s.btn, { backgroundColor: t.card2 }]}
            >
              <Text style={{ color: t.text, fontWeight: '800' }}>{x.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!price || !description.trim() || send.isPending}
              onPress={() => {
                setError('');
                send.mutate();
              }}
              style={[
                s.btn,
                {
                  backgroundColor: t.orange,
                  opacity: !price || !description.trim() || send.isPending ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{x.send}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
});
