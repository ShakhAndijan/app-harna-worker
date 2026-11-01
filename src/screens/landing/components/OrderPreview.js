import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';

// "Buyurtma shunday ko'rinadi": ilovadagi ochiq buyurtma kartasining NAMUNASI (haqiqiy buyurtma emas,
// kartada shu aytilgan). Usta ichkarida nimani ko'rishini oldindan tasavvur qilsin deb.
export default function OrderPreview({ onPress }) {
  const { t } = useLanguage();

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.topRow}>
          <View style={s.tag}>
            <Text style={s.tagText}>{t('ustaLanding.preview.category')}</Text>
          </View>
          <Text style={s.sample}>{t('ustaLanding.preview.sample')}</Text>
        </View>
        <Text style={s.title}>{t('ustaLanding.preview.title')}</Text>
        <View style={s.metaRow}>
          <Meta icon="map-marker-outline" text={t('ustaLanding.preview.where')} />
          <Meta icon="clock-outline" text={t('ustaLanding.preview.when')} />
        </View>
        <View style={s.metaRow}>
          <Meta icon="cash" text={t('ustaLanding.preview.budget')} />
        </View>
        <TouchableOpacity style={s.btn} activeOpacity={0.85} onPress={onPress}>
          <Text style={s.btnText}>{t('ustaLanding.preview.button')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.caption}>{t('ustaLanding.preview.caption')}</Text>
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={s.meta}>
      <MaterialCommunityIcons name={icon} size={16} color={COLORS.gray} />
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  sample: { color: COLORS.gray, fontSize: 11.5, fontStyle: 'italic' },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: COLORS.gray, fontSize: 13 },
  btn: {
    marginTop: 4,
    backgroundColor: COLORS.orange,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
  caption: { color: COLORS.gray, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 10 },
});
