import { View, Text } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useUstaStyles } from '../styles';
import SectionTitle from './SectionTitle';

// Mijoz ko'radigan kunlar (GET /workers/{id}/availability): bo'sh, band (joy yo'q) va dam olish.
// Nechta ish borligi aytilmaydi — faqat kunda joy bor-yo'qligi.
const WEEK = {
  uz: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

const parseDay = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export default function AvailabilitySection({ availability }) {
  const { t: tr, language } = useLanguage();
  const { C, st } = useUstaStyles();
  if (!availability?.hasSchedule || availability.days.length === 0) return null;

  const names = WEEK[language] ?? WEEK.uz;
  const palette = {
    open: { bg: 'rgba(39,165,103,0.14)', border: C.green, text: C.green },
    full: { bg: 'rgba(232,122,69,0.16)', border: C.orange, text: C.orange },
    off: { bg: 'transparent', border: C.line, text: C.dim },
  };
  const legend = [
    ['open', tr('ustaDetail.availOpen')],
    ['full', tr('ustaDetail.availFull')],
    ['off', tr('ustaDetail.availOff')],
  ];

  return (
    <>
      <SectionTitle icon="calendar-month-outline" title={tr('ustaDetail.availabilityTitle')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {availability.days.map((d) => {
          const date = parseDay(d.day);
          const p = palette[d.status] ?? palette.off;
          return (
            <View
              key={d.day}
              style={[
                st.chip,
                {
                  width: 44,
                  height: 52,
                  paddingHorizontal: 0,
                  flexDirection: 'column',
                  justifyContent: 'center',
                  backgroundColor: p.bg,
                  borderColor: p.border,
                  opacity: d.status === 'off' ? 0.55 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 10.5, color: C.dim, fontWeight: '600' }}>
                {names[date.getDay()]}
              </Text>
              <Text style={{ fontSize: 15, color: p.text, fontWeight: '800' }}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {legend.map(([key, label]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: palette[key].bg,
                borderWidth: 1.5,
                borderColor: palette[key].border,
              }}
            />
            <Text style={{ fontSize: 12, color: C.dim }}>{label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}
