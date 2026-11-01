import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';

// Xush kelibsiz bonusi: har bir yangi ustaga beriladi (dev.harna.uz kabinetidagi "Приветственный бонус").
export default function BonusCard() {
  const { t } = useLanguage();

  return (
    <View style={s.card}>
      <View style={s.iconBox}>
        <MaterialCommunityIcons name="gift-outline" size={28} color="#f5b81f" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{t('ustaLanding.bonus.label')}</Text>
        <Text style={s.amount}>{t('ustaLanding.bonus.amount')}</Text>
        <Text style={s.text}>{t('ustaLanding.bonus.text')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(245,184,31,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245,184,31,0.40)',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(245,184,31,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: COLORS.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  amount: { color: '#f5b81f', fontSize: 24, fontWeight: '800', marginVertical: 2 },
  text: { color: COLORS.white, fontSize: 13, lineHeight: 18 },
});
