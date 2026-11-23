import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { rememberReferral } from '../../utils/referral';

// `/r/<kod>` — saytning referal sahifasi: kod saqlanadi, so'ng kirgan usta "Do'st taklif qilish"
// ekraniga, boshqalar kirishga o'tadi (kirgach kod o'zi qabul qilinadi).
export default function ReferralLink() {
  const { code } = useLocalSearchParams();
  const { signedIn } = useAuth();
  const { theme: t } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const value = Array.isArray(code) ? code[0] : code;
      if (value) await rememberReferral(value);
      if (alive) router.replace(signedIn ? '/referral' : '/login');
    })();
    return () => {
      alive = false;
    };
  }, [code, signedIn, router]);

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}
    >
      <ActivityIndicator color={t.orange} />
    </View>
  );
}
