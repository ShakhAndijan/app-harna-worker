import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../../constants/colors';
import { useLanguage } from '../../../context/LanguageContext';

// "Do'stingizni taklif qiling": referal bonuslari (dev.harna.uz kabinetidagi "Пригласить друга").
export default function ReferralCard() {
  const { t } = useLanguage();

  return (
    <View style={s.card}>
      <View style={s.iconBox}>
        <MaterialCommunityIcons name="account-multiple-plus-outline" size={26} color="#14b8a6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{t('ustaLanding.referral.title')}</Text>
        <Text style={s.text}>{t('ustaLanding.referral.text')}</Text>
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
    marginTop: 28,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.35)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.white, fontSize: 15, fontWeight: '800', marginBottom: 3 },
  text: { color: COLORS.gray, fontSize: 12.5, lineHeight: 18 },
});
