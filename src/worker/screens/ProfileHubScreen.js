import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Screen } from '../ui';

// Menyudagi profil kartasini bosganda ochiladigan sahifa: profilga oid bo'limlar katakchalarda.
export default function ProfileHubScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const items = [
    ['create-outline', t('w.profile.edit'), '/profile-edit'],
    ['construct-outline', t('w.profile.categories'), '/my-categories'],
    ['images-outline', t('w.extra.portfolio'), '/portfolio'],
    ['ribbon-outline', t('w.extra.certificates'), '/certificates'],
    ['star-outline', t('w.profile.reviews'), '/my-reviews'],
  ];
  return (
    <Screen title={t('w.profile.secProfile')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map(([icon, label, path]) => (
          <TouchableOpacity
            key={path}
            onPress={() => router.push(path)}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={{
              width: '48%',
              flexGrow: 1,
              alignItems: 'center',
              gap: 10,
              paddingVertical: 20,
              paddingHorizontal: 8,
              borderRadius: 20,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.orange + '1F',
              }}
            >
              <Ionicons name={icon} size={26} color={theme.orange} />
            </View>
            <Text
              numberOfLines={2}
              style={{ color: theme.text, fontSize: 14, fontWeight: '800', textAlign: 'center' }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}
