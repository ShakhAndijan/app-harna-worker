import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { SITE_URL } from '../constants/config';

// Telegram kirish oynasi (oauth.telegram.org, origin — botning sayt domeni) WebView ichida. U qaytargan
// imzolangan javob (`#tgAuthResult=<base64url JSON>`) o'qiladi, sahifa sifatida yuklanmaydi va serverga
// o'zgartirilmasdan beriladi: imzo hamma maydonni qoplaydi.
const TEXTS = {
  uz: 'Telegram bilan davom etish',
  ru: 'Продолжить через Telegram',
  en: 'Continue with Telegram',
};

// base64url → UTF-8 JSON (ismlar UTF-8 da).
function decodeTelegram(value) {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const text = decodeURIComponent(
      Array.from(binary)
        .map((ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function TelegramLoginModal({ visible, botId, onResult, onClose }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const title = TEXTS[language] ?? TEXTS.uz;
  if (botId == null) return null;
  const url =
    `https://oauth.telegram.org/auth?bot_id=${botId}&origin=${encodeURIComponent(SITE_URL)}` +
    `&request_access=write&return_to=${encodeURIComponent(`${SITE_URL}/`)}`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={s.head}>
          <Text style={[s.title, { color: t.text }]}>{title}</Text>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onClose}>
            <Text style={[s.close, { color: t.muted }]}>×</Text>
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          originWhitelist={['https://*']}
          style={{ flex: 1 }}
          onShouldStartLoadWithRequest={(request) => {
            if (!request.url.startsWith(SITE_URL)) return true;
            const hash = request.url.split('#')[1] ?? '';
            const match = /tgAuthResult=([^&]+)/.exec(hash);
            const data = match ? decodeTelegram(match[1]) : null;
            if (data) onResult(data);
            else onClose();
            return false;
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: '800' },
  close: { fontSize: 30, fontWeight: '600' },
});
