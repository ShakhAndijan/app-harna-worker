import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// Ochiq turgan ilovaga yangi versiya yetib kelishi (EAS Update). Telefon har ishga tushganda
// (expo-updates o'zi tekshiradi) va ilovaga qaytganda (15 daqiqadan tez-tez emas) so'raydi.
// Yuklab olingan versiya keyingi ishga tushishda o'zi ochiladi; shu bilan birga hozir ochishni
// taklif qiladi — majburlamaydi: forma to'ldirayotgan odam yo'qotmaydi. "×" — "hozir emas",
// ilovaga keyingi qaytishda yana chiqadi. Yangilanish manzili yo'q yig'malarda (dev, Expo Go)
// bu yerda hech narsa ishlamaydi.
const TEXTS = {
  uz: {
    title: 'Yangi versiya tayyor',
    body: 'Hozir qayta ishga tushirib, yangilanishni oching yoki ilova keyingi safar ochilganda o‘zi yuklanadi.',
    reload: 'Yangilash',
    close: 'Yopish',
  },
  ru: {
    title: 'Новая версия готова',
    body: 'Перезапустите приложение сейчас или она загрузится сама при следующем запуске.',
    reload: 'Обновить',
    close: 'Закрыть',
  },
  en: {
    title: 'A new version is ready',
    body: 'Restart now to get it, or it loads by itself the next time the app starts.',
    reload: 'Update',
    close: 'Close',
  },
};

const CHECK_GAP_MS = 15 * 60_000;
let lastCheck = Date.now(); // ishga tushish o'zi tekshiruv
let checking = false;

async function check() {
  if (checking || Date.now() - lastCheck < CHECK_GAP_MS) return;
  checking = true;
  lastCheck = Date.now();
  try {
    const found = await Updates.checkForUpdateAsync();
    if (found.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // Internet yo'q yoki xizmat band: ilovaga keyingi qaytishda yana so'raladi.
  } finally {
    checking = false;
  }
}

export default function ReleaseBanner() {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const tx = TEXTS[language] ?? TEXTS.uz;
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setDismissed(false);
      check();
    });
    return () => sub.remove();
  }, []);

  if (!isUpdatePending || dismissed) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        s.box,
        { bottom: insets.bottom + 70, backgroundColor: t.card, borderColor: t.border },
      ]}
    >
      <View style={s.head}>
        <Text style={[s.title, { color: t.text }]}>{`⟳ ${tx.title}`}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.close}
          hitSlop={10}
          onPress={() => setDismissed(true)}
        >
          <Text style={[s.close, { color: t.muted }]}>×</Text>
        </Pressable>
      </View>
      <Text style={[s.body, { color: t.muted }]}>{tx.body}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={[s.btn, { backgroundColor: t.orange }]}
        onPress={() => Updates.reloadAsync().catch(() => undefined)}
      >
        <Text style={s.btnTxt}>{tx.reload}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 21 },
  close: { fontSize: 22, lineHeight: 22 },
  body: { fontSize: 13.5, lineHeight: 19 },
  btn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
});
