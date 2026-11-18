import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { fmtDate } from '../../worker/ui';

const TEXTS = {
  uz: {
    title: 'Tarix',
    created: 'Yaratildi',
    accepted: 'Qabul qilindi',
    agreed: 'Kelishildi',
    worker_done: 'Usta ishni bajardi',
    completed: 'Yakunlandi',
    cancelled: 'Bekor qilindi',
  },
  ru: {
    title: 'История',
    created: 'Создан',
    accepted: 'Принят',
    agreed: 'Согласовано',
    worker_done: 'Мастер выполнил работу',
    completed: 'Завершён',
    cancelled: 'Отменён',
  },
  en: {
    title: 'History',
    created: 'Created',
    accepted: 'Accepted',
    agreed: 'Agreed',
    worker_done: 'Worker finished the job',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
};

const STEPS = [
  ['created', 'created_at'],
  ['accepted', 'accepted_at'],
  ['agreed', 'agreed_at'],
  ['worker_done', 'worker_done_at'],
  ['completed', 'completed_at'],
  ['cancelled', 'cancelled_at'],
];

/** Buyurtma tarixi: mavjud vaqt belgilaridan xronologiya (yaratildi → qabul → kelishildi → ...). */
export function orderEvents(order) {
  return STEPS.map(([key, field]) => ({ key, at: order[field] }))
    .filter((e) => !!e.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

export default function OrderHistory({ order }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const x = TEXTS[language] ?? TEXTS.uz;
  const [open, setOpen] = useState(false);
  const events = orderEvents(order);
  if (!events.length) return null;

  return (
    <View>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setOpen((v) => !v)} style={s.head}>
        <Text style={{ color: t.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
          {x.title.toUpperCase()}
        </Text>
        <View style={[s.count, { backgroundColor: t.card2 }]}>
          <Text style={{ color: t.muted, fontSize: 11, fontWeight: '800' }}>{events.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.muted} />
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 12 }}>
          {events.map((e, i) => {
            const last = i === events.length - 1;
            const bad = e.key === 'cancelled';
            const color = bad ? '#e5484d' : last ? t.orange : t.faint;
            return (
              <View key={e.key} style={s.item}>
                <View style={s.rail}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  {!last && <View style={[s.line, { backgroundColor: t.border }]} />}
                </View>
                <View style={s.body}>
                  <Text
                    style={{
                      flex: 1,
                      color: t.text,
                      fontSize: 13.5,
                      fontWeight: last ? '800' : '600',
                    }}
                  >
                    {x[e.key]}
                  </Text>
                  <Text style={{ color: t.muted, fontSize: 12 }}>{fmtDate(e.at, language)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  item: { flexDirection: 'row', gap: 12, minHeight: 34 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  line: { flex: 1, width: 2, marginVertical: 2 },
  body: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 10,
  },
});
