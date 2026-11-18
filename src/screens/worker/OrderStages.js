import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatNumber } from '../../utils/format';
import { getOrderStages, planOrderStages, markStageDone } from '../../api/workerApp';

const TEXTS = {
  uz: {
    title: 'Bosqichlar',
    empty: "Katta ishni bosqichlarga bo'ling — har birini bajarganingizda mijoz tasdiqlaydi.",
    progress: '{done} / {all} tasdiqlangan',
    pending: 'Navbatda',
    done: 'Bajarildi — tasdiq kutilmoqda',
    confirmed: 'Tasdiqlangan',
    markDone: 'Bajarildi',
    edit: 'Bosqichlarni o‘zgartirish',
    plan: 'Bosqichlarni belgilash',
    add: "Bosqich qo'shish",
    ph: 'Masalan: eski kafelni olish',
    amount: 'Narx',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    som: "so'm",
    err: 'Xatolik yuz berdi',
  },
  ru: {
    title: 'Этапы',
    empty: 'Разбейте большую работу на этапы — клиент подтверждает каждый выполненный.',
    progress: '{done} / {all} подтверждено',
    pending: 'В очереди',
    done: 'Выполнен — ждёт подтверждения',
    confirmed: 'Подтверждён',
    markDone: 'Выполнен',
    edit: 'Изменить этапы',
    plan: 'Задать этапы',
    add: 'Добавить этап',
    ph: 'Например: демонтаж старой плитки',
    amount: 'Сумма',
    save: 'Сохранить',
    cancel: 'Отмена',
    som: 'сум',
    err: 'Произошла ошибка',
  },
  en: {
    title: 'Stages',
    empty: 'Split a big job into stages — the customer confirms each one you finish.',
    progress: '{done} / {all} confirmed',
    pending: 'Queued',
    done: 'Done — awaiting confirmation',
    confirmed: 'Confirmed',
    markDone: 'Mark done',
    edit: 'Edit stages',
    plan: 'Plan stages',
    add: 'Add stage',
    ph: 'e.g. remove old tiles',
    amount: 'Amount',
    save: 'Save',
    cancel: 'Cancel',
    som: 'UZS',
    err: 'Something went wrong',
  },
};

const GREEN = '#2eb872';
const digits = (v) => String(v ?? '').replace(/\D/g, '');
const list = (d) => (Array.isArray(d) ? d : (d?.items ?? []));

// Buyurtma bosqichlari (etaplar): ro'yxat, progress, "Bajarildi" belgisi va rejalashtirish formasi.
// Mijoz tasdiqlagan/bajarilgan bosqichlar qulflanadi — faqat kutilayotganlar tahrirlanadi.
export default function OrderStages({ orderId, editable = true }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const qc = useQueryClient();
  const key = ['worker', 'order-stages', String(orderId)];
  const q = useQuery({ queryKey: key, queryFn: () => getOrderStages(orderId) });
  const [draft, setDraft] = useState(null); // null — ko'rish rejimi, massiv — tahrir
  const [error, setError] = useState('');

  const onErr = (e) => setError(e?.message || x.err);
  const done = useMutation({
    mutationFn: (stageId) => markStageDone(orderId, stageId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: onErr,
  });
  const plan = useMutation({
    mutationFn: (stages) => planOrderStages(orderId, stages),
    onSuccess: () => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: onErr,
  });

  if (q.isLoading) return <ActivityIndicator color={t.orange} style={{ marginVertical: 12 }} />;

  const stages = list(q.data);
  const locked = stages.filter((s) => s.status !== 'pending');
  const pending = stages.filter((s) => s.status === 'pending');
  const confirmed = stages.filter((s) => s.status === 'confirmed').length;
  const stateText = (s) =>
    s.status === 'confirmed' ? x.confirmed : s.status === 'done' ? x.done : x.pending;
  const stateColor = (s) =>
    s.status === 'confirmed' ? GREEN : s.status === 'done' ? t.gold : t.muted;

  const startEdit = () => {
    setError('');
    setDraft(pending.map((s) => ({ title: s.title, amount: digits(s.amount) })));
  };
  const setRow = (i, patch) => setDraft((d) => d.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const save = () => {
    setError('');
    const rows = draft
      .filter((r) => r.title.trim())
      .map((r) => ({ title: r.title.trim(), amount: r.amount ? String(r.amount) : null }));
    plan.mutate(rows);
  };

  const Head = (
    <View style={s.head}>
      <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
        {x.title.toUpperCase()}
      </Text>
      {stages.length > 0 && (
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700' }}>
          {x.progress.replace('{done}', confirmed).replace('{all}', stages.length)}
        </Text>
      )}
    </View>
  );

  // ── Tahrir rejimi ──
  if (draft) {
    return (
      <View style={{ gap: 10 }}>
        {Head}
        {locked.map((st) => (
          <View key={st.id} style={[s.row, { backgroundColor: t.card2, opacity: 0.7 }]}>
            <Text style={{ flex: 1, color: t.text, fontWeight: '600' }}>{st.title}</Text>
            <Text style={{ color: stateColor(st), fontSize: 12, fontWeight: '700' }}>
              {stateText(st)}
            </Text>
          </View>
        ))}
        {draft.map((r, i) => (
          <View key={i} style={s.editRow}>
            <TextInput
              value={r.title}
              onChangeText={(v) => setRow(i, { title: v })}
              placeholder={x.ph}
              placeholderTextColor={t.faint}
              maxLength={200}
              style={[
                s.input,
                { flex: 1, backgroundColor: t.card2, borderColor: t.border, color: t.text },
              ]}
            />
            <TextInput
              value={r.amount ? formatNumber(r.amount) : ''}
              onChangeText={(v) => setRow(i, { amount: digits(v) })}
              placeholder={x.amount}
              placeholderTextColor={t.faint}
              keyboardType="number-pad"
              style={[
                s.input,
                { width: 96, backgroundColor: t.card2, borderColor: t.border, color: t.text },
              ]}
            />
            <TouchableOpacity
              hitSlop={8}
              onPress={() => setDraft((d) => d.filter((_, n) => n !== i))}
            >
              <Ionicons name="close-circle" size={22} color={t.muted} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={() => setDraft((d) => [...d, { title: '', amount: '' }])}
          style={[s.add, { borderColor: t.border }]}
        >
          <Ionicons name="add" size={18} color={t.orange} />
          <Text style={{ color: t.orange, fontWeight: '700' }}>{x.add}</Text>
        </TouchableOpacity>
        {!!error && <Text style={{ color: '#e5484d', fontSize: 13 }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setDraft(null)}
            style={[s.btn, { backgroundColor: t.card2 }]}
          >
            <Text style={{ color: t.text, fontWeight: '800' }}>{x.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={plan.isPending}
            onPress={save}
            style={[s.btn, { backgroundColor: t.orange, opacity: plan.isPending ? 0.6 : 1 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>{x.save}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Ko'rish rejimi ──
  return (
    <View style={{ gap: 10 }}>
      {Head}
      {stages.length === 0 ? (
        <Text style={{ color: t.muted, fontSize: 13.5, lineHeight: 19 }}>{x.empty}</Text>
      ) : (
        <>
          <View style={[s.bar, { backgroundColor: t.card2 }]}>
            <View
              style={{
                width: `${(confirmed / stages.length) * 100}%`,
                height: '100%',
                backgroundColor: GREEN,
                borderRadius: 3,
              }}
            />
          </View>
          {stages.map((st, i) => (
            <View key={st.id} style={[s.row, { backgroundColor: t.card2 }]}>
              <View
                style={[
                  s.num,
                  {
                    backgroundColor: st.status === 'confirmed' ? GREEN : t.card,
                    borderColor: t.border,
                  },
                ]}
              >
                {st.status === 'confirmed' ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={{ color: t.muted, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{st.title}</Text>
                <Text
                  style={{ color: stateColor(st), fontSize: 12, marginTop: 2, fontWeight: '600' }}
                >
                  {Number(st.amount) > 0
                    ? `${formatNumber(Math.round(Number(st.amount)))} ${x.som} · `
                    : ''}
                  {stateText(st)}
                </Text>
              </View>
              {editable && st.status === 'pending' && (
                <TouchableOpacity
                  disabled={done.isPending}
                  onPress={() => {
                    setError('');
                    done.mutate(st.id);
                  }}
                  style={[s.doneBtn, { borderColor: t.orange, opacity: done.isPending ? 0.6 : 1 }]}
                >
                  <Text style={{ color: t.orange, fontSize: 12.5, fontWeight: '800' }}>
                    {x.markDone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}
      {!!error && <Text style={{ color: '#e5484d', fontSize: 13 }}>{error}</Text>}
      {editable && (
        <TouchableOpacity onPress={startEdit} style={[s.add, { borderColor: t.border }]}>
          <Ionicons
            name={stages.length ? 'create-outline' : 'list-outline'}
            size={17}
            color={t.orange}
          />
          <Text style={{ color: t.orange, fontWeight: '700' }}>
            {stages.length ? x.edit : x.plan}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
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
  btn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
});
