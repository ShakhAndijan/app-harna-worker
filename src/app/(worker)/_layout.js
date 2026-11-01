import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

// Usta uchun pastki menyu: Asosiy, Buyurtmalar, E'lonlar, Hamyon, Profil.
const TABS = [
  { name: 'home', label: 'w.tab.home', on: 'home', off: 'home-outline' },
  { name: 'orders', label: 'w.tab.orders', on: 'briefcase', off: 'briefcase-outline' },
  { name: 'listings', label: 'w.tab.listings', on: 'images', off: 'images-outline' },
  { name: 'wallet', label: 'w.tab.wallet', on: 'wallet', off: 'wallet-outline' },
  { name: 'profile', label: 'w.tab.profile', on: 'person', off: 'person-outline' },
];

export default function WorkerTabs() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const inset = useSafeAreaInsets().bottom;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.bg },
        tabBarActiveTintColor: theme.orange,
        tabBarInactiveTintColor: theme.faint,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 58 + inset,
          paddingBottom: inset + 4,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.on : tab.off} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
