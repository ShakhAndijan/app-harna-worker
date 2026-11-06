import { Image, View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LIGHT = require('../../assets/logo.png');
const DARK = require('../../assets/logo-on-dark.png');
const ASPECT = 1200 / 170;

// Harna logosi (belgi + HARNA yozuvi): to'q fonda yozuvi och rangli variant, och fonda asosiy variant.
// `dark` berilsa mavzu e'tiborga olinmaydi (masalan, doim to'q fonli kirish ekranlari uchun).
// Balandlik kenglikdan olinadi. Logo tepasida "PRO" yozuvi turadi (bu ilova mutaxassislar uchun).
export default function BrandLogo({ width = 160, dark, style, pro = true }) {
  const { theme } = useTheme();
  const onDark = dark ?? theme.isDark;
  const logo = (
    <Image
      source={onDark ? DARK : LIGHT}
      style={[{ width, height: width / ASPECT }, style]}
      resizeMode="contain"
      accessibilityLabel="harna.usta.uz"
    />
  );
  if (!pro) return logo;
  return (
    // "PRO" HARNA yozuvi tugagan joydan, o'ng tomonda, tepasidan ko'rinib turadi (logo kichraymaydi).
    <View style={{ width }}>
      {logo}
      <View
        style={{
          position: 'absolute',
          left: width + 4,
          top: -6,
          backgroundColor: theme.orange,
          borderRadius: 6,
          paddingHorizontal: 7,
          paddingVertical: 1,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }}>
          PRO
        </Text>
      </View>
    </View>
  );
}
