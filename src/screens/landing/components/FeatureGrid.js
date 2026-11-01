import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';
import { FEATURES_LIST } from '../constants';

// "Ilovada nimalar bor": ikki ustunli kichik kartalar, har biri bitta imkoniyat.
export default function FeatureGrid() {
  const { t } = useLanguage();

  return (
    <View style={s.grid}>
      {FEATURES_LIST.map((f) => (
        <View key={f.key} style={s.card}>
          <View style={[s.icon, { backgroundColor: f.color + '22' }]}>
            <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
          </View>
          <Text style={s.title}>{t(`ustaLanding.features.${f.key}Title`)}</Text>
          <Text style={s.desc}>{t(`ustaLanding.features.${f.key}Desc`)}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: { color: COLORS.white, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  desc: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
});
