import { Tabs } from 'expo-router';
import AppTabBar from '../../navigation/AppTabBar';
import { useTheme } from '../../context/ThemeContext';

// Doim "home" dan ochiladi (kirgandan keyin boshqa tab ochilib qolmasligi uchun).
export const unstable_settings = { initialRouteName: 'home' };

// Pastki menyu: tartib BottomNav bilan bir xil (home, tasks, ads, profile).
// `services` menyuda ko'rinmaydi, lekin bosh sahifadagi "Barchasi" orqali ochiladi.
export default function TabsLayout() {
  const { theme: t } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="ads" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
