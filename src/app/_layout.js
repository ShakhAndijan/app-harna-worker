import { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  Stack,
  useRouter,
  useRootNavigationState,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient, persistOptions } from '../queries/client';
import { AppAlertHost } from '../components/AppAlert';
import BiometricLockScreen from '../screens/BiometricLockScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { markStartup } from '../utils/startup';
import usePushNotifications from '../hooks/usePushNotifications';

// Native splash birinchi ekran tayyor bo'lguncha turadi: bo'sh ekran va alohida yuklagich bosqichi yo'q.
SplashScreen.preventAutoHideAsync();
let splashHidden = false;
const hideSplash = () => {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hide();
  markStartup('splash yopildi (birinchi ekran tayyor)');
};

// Ilova ildizi: providerlar va asosiy Stack. Marshrutlar `src/app/` papkasidagi fayllardan olinadi.
//  - mehmon: index (kirish ekraniga yo'naltiradi), login
//  - usta:   (worker) tablari (asosiy, buyurtmalar, e'lonlar, hamyon, profil) va undan ochiladigan ekranlar
export default function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <LanguageProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <KeyboardProvider>
              <AuthProvider>
                <RootNavigator />
                <AppAlertHost />
              </AuthProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </LanguageProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { checked, locked, unlocking, retryUnlock, abandonSession, signedIn } = useAuth();
  const { theme: t } = useTheme();

  // Navigatsiya fon rangi ilova mavzusi bilan bir xil bo'lishi kerak, aks holda ekran almashganda
  // (ayniqsa "Orqaga" bosilganda) standart oq/kulrang fon bir lahza ko'rinib qoladi.
  const navTheme = useMemo(() => {
    const base = t.isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: t.bg, card: t.bg } };
  }, [t]);

  useEffect(() => {
    if (checked) markStartup(`sessiya tekshirildi (signedIn=${signedIn})`);
  }, [checked, signedIn]);

  // Sessiya tekshirilguncha native splash ko'rinib turadi, shuning uchun bu yerda hech narsa chizilmaydi.
  if (!checked) return null;

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }} onLayout={hideSplash}>
        <StatusBar style="light" />
        <BiometricLockScreen
          unlocking={unlocking}
          onRetry={retryUnlock}
          onUseOtherAccount={abandonSession}
        />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: t.bg }} onLayout={hideSplash}>
        <StatusBar style={t.isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(worker)" />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="order-chat/[id]" />
            <Stack.Screen name="listing-edit" />
            <Stack.Screen name="profile-edit" />
            <Stack.Screen name="my-categories" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name="my-reviews" />
            <Stack.Screen name="referral" />
            <Stack.Screen name="complaints" />
            <Stack.Screen name="account" />
            <Stack.Screen name="top" />
            <Stack.Screen name="brigade" />
            <Stack.Screen name="pro" />
            <Stack.Screen name="portfolio" />
            <Stack.Screen name="certificates" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="help" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="support" />
            <Stack.Screen name="support-chat" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Screen name="document" />
        </Stack>
        <AuthRedirect />
        <PushNotifications />
      </View>
    </NavigationThemeProvider>
  );
}

// Push: token yuborish va bildirishnoma bosilganda ekran ochish. AuthRedirect'dan keyin turadi,
// shunda uning effekti avval ishlab, push ochgan ekran bosh sahifa ustida qoladi.
function PushNotifications() {
  usePushNotifications();
  return null;
}

// Kirish/chiqish holati o'zgarganda tegishli bosh ekranga o'tkazadi (masalan, mehmon sifatida
// usta sahifasidan login qilgach, usta sahifasi emas, bosh sahifa ochiladi).
function AuthRedirect() {
  const { signedIn } = useAuth();
  const router = useRouter();
  const navState = useRootNavigationState();
  const previous = useRef(null);

  useEffect(() => {
    if (!navState?.key || previous.current === signedIn) return;
    const isFirst = previous.current === null;
    previous.current = signedIn;
    if (signedIn) router.replace('/home');
    else if (!isFirst) router.replace('/');
  }, [signedIn, navState?.key, router]);

  return null;
}
