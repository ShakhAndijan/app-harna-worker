import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';
import { LEVELS } from '../constants';

// Maqomlar (Bronza → Kumush → Oltin): shartlar dev.harna.uz kabinetidagi "Статус" sahifasidan.
export default function LevelsSection() {
  const { t } = useLanguage();

  return (
    <View style={s.wrap}>
      {LEVELS.map((l) => (
        <View key={l.key} style={s.row}>
          <View style={[s.badge, { backgroundColor: l.color + '26' }]}>
            <MaterialCommunityIcons name="medal-outline" size={24} color={l.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: l.color }]}>{t(`ustaLanding.levels.${l.key}`)}</Text>
            <Text style={s.req}>{t(`ustaLanding.levels.${l.key}Req`)}</Text>
          </View>
        </View>
      ))}
      <Text style={s.note}>{t('ustaLanding.levels.note')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '800' },
  req: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  note: { color: COLORS.gray, fontSize: 12, lineHeight: 17 },
});
