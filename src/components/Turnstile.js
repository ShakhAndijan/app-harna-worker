import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { SITE_URL } from '../constants/config';
import { useTurnstileSiteKey } from '../queries/system';

// Cloudflare Turnstile — ro'yxatdan o'tmagan odam yoza oladigan yagona narsa (jamoaga xabar) uchun.
// Faqat saytning config.json faylida kalit bo'lsa ko'rinadi; kalit yo'q bo'lsa hech narsa chizilmaydi,
// token bo'sh qoladi va server o'z sirini ko'rib tekshiruvni o'tkazib yuboradi.
// Vidjet saytning o'z manzili (kalit shu domen uchun berilgan) bo'lgan kichik WebView'da ishlaydi.
// Yechilgan tokenni yoki muddati tugasa/xato bo'lsa '' ni qaytaradi; token bitta xabar uchun yaroqli —
// yuborgach forma buni qayta o'rnatadi (`key` almashtiradi).
function page(siteKey, theme) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:transparent}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=go&render=explicit" async defer></script>
<script>
function say(token){window.ReactNativeWebView.postMessage(token)}
function go(){turnstile.render('#box',{sitekey:${JSON.stringify(siteKey)},theme:${JSON.stringify(theme)},
callback:say,'expired-callback':function(){say('')},'error-callback':function(){say('')}})}
</script></head><body><div id="box"></div></body></html>`;
}

export default function Turnstile({ onToken }) {
  const { theme: t } = useTheme();
  const siteKey = useTurnstileSiteKey();
  if (!siteKey) return null;
  return (
    <View style={[s.box, { borderColor: t.border }]}>
      <WebView
        source={{ html: page(siteKey, t.isDark ? 'dark' : 'light'), baseUrl: SITE_URL }}
        originWhitelist={['https://*']}
        onMessage={(e) => onToken(e.nativeEvent.data)}
        scrollEnabled={false}
        style={s.web}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { height: 72, borderRadius: 12, overflow: 'hidden' },
  web: { backgroundColor: 'transparent' },
});
