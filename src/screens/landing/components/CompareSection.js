import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';
import { COMPARE_KEYS } from '../constants';

// "Harna'siz va Harna bilan": ustaning odatiy og'riqlari va ularning yechimi, ikki ustunda.
export default function CompareSection() {
  const { t } = useLanguage();

  return (
    <View style={s.wrap}>
      <View style={[s.col, s.before]}>
        <Text style={s.colTitle}>{t('ustaLanding.compare.beforeTitle')}</Text>
        {COMPARE_KEYS.map((n) => (
          <View key={n} style={s.item}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
            <Text style={s.text}>{t(`ustaLanding.compare.before${n}`)}</Text>
          </View>
        ))}
      </View>
      <View style={[s.col, s.after]}>
        <Text style={[s.colTitle, { color: COLORS.orange }]}>
          {t('ustaLanding.compare.afterTitle')}
        </Text>
        {COMPARE_KEYS.map((n) => (
          <View key={n} style={s.item}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#2ecc71" />
            <Text style={s.text}>{t(`ustaLanding.compare.after${n}`)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  col: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  before: { backgroundColor: COLORS.card, borderColor: 'rgba(255,255,255,0.06)' },
  after: { backgroundColor: 'rgba(232,122,69,0.10)', borderColor: 'rgba(232,122,69,0.45)' },
  colTitle: { color: COLORS.gray, fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase' },
  item: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  text: { flex: 1, color: COLORS.white, fontSize: 12.5, lineHeight: 17 },
});
