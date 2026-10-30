import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/request';
import { ENDPOINTS } from '../constants/config';
import { getErrorMessage } from '../utils/errors';

// Usta kirgandan keyingi bosh ekran: profil ma'lumoti (GET /workers/me) va chiqish.
// Buyurtmalar, hamyon va boshqa usta bo'limlari keyingi bosqichda shu yerga qo'shiladi.
export default function WorkerHomeScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['worker', 'me'],
    queryFn: () => request(ENDPOINTS.WORKER_ME),
  });

  const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.bg }]}>
      <View style={s.body}>
        <Text style={[s.title, { color: theme.text }]}>{t('workerHome.title')}</Text>
        {isPending ? (
          <ActivityIndicator color={theme.orange} />
        ) : isError ? (
          <View style={s.gap}>
            <Text style={{ color: theme.red }}>{getErrorMessage(error, t, 'workerHome.err')}</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={{ color: theme.orange, fontWeight: '700' }}>
                {t('workerHome.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.hello, { color: theme.text }]}>
              {t('workerHome.hello')}
              {name ? `, ${name}` : ''}
            </Text>
            <Text style={{ color: theme.muted }}>{t('workerHome.soon')}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[s.out, { borderColor: theme.border }]}
          onPress={signOut}
          activeOpacity={0.8}
        >
          <Text style={{ color: theme.text, fontWeight: '700' }}>{t('workerHome.out')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, padding: 22, gap: 18 },
  title: { fontSize: 26, fontWeight: '800' },
  gap: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 },
  hello: { fontSize: 18, fontWeight: '700' },
  out: {
    borderWidth: 1,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
