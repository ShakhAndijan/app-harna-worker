import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../context/ThemeContext';

// Marshrut nomi ↔ BottomNav kaliti. `services` menyuda yo'q — u bosh sahifadan ochiladi, shuning uchun
// uning ustida "Asosiy" belgilanib turadi.
const ROUTE_TO_KEY = {
  home: 'home',
  tasks: 'orders',
  ads: 'ads',
  services: 'home',
  profile: 'profile',
};
const KEY_TO_ROUTE = { home: 'home', orders: 'tasks', ads: 'ads', profile: 'profile' };

// Mavjud suzuvchi BottomNav dizayni Tabs navigatoriga `tabBar` sifatida ulanadi.
// O'ram oynasi ixtiyoriy balandlikda: Android o'ram chegarasidan tashqaridagi bosishlarni o'tkazmaydi.
export default function AppTabBar({ state }) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const activeRoute = state.routes[state.index];
  const bottomInset = useSafeAreaInsets().bottom;
  const keyboardVisible = useKeyboardState((st) => st.isVisible);

  // Klaviatura ochiq paytda menyu yashiriladi: aks holda u klaviatura ustiga ko'tarilib, kontentni yopadi
  // va skrollni to'sadi.
  if (keyboardVisible) return null;

  // Yangi expo-router'da tabBar propsida `navigation` bo'lmaydi — shuning uchun router orqali o'tiladi.
  const onTabChange = (key) => {
    const name = KEY_TO_ROUTE[key];
    if (!name || name === activeRoute.name) return;
    router.navigate('/' + name);
  };

  return (
    <View pointerEvents="box-none" style={[s.wrap, { height: 130 + bottomInset }]}>
      <BottomNav
        activeTab={ROUTE_TO_KEY[activeRoute.name]}
        onTabChange={onTabChange}
        accent={t.orange}
        background={t.navBg}
        border={t.border}
        muted={t.faint}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
});
