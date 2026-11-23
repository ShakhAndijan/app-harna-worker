import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

// To'lov tizimi plitkasi: har bir tizim o'z brend rangida va so'z belgisi bilan — foydalanuvchi
// «Click», «Uzum Bank», «Payme», «Paynet» ni darrov taniydi. Logotipi bor tizimda (Click) rasm, qolganlarida
// brend rangi va yozuv ishlatiladi (logotip assets/pay/ ga qo'shilsa, BRANDS ga logo beriladi).
const BRANDS = {
  payme: { colors: ['#35d3d0', '#00a9ad'], name: 'payme', weight: '900', sub: '' },
  click: {
    colors: ['#1fb6ff', '#0069e0'],
    name: 'click',
    weight: '900',
    sub: '',
    logo: require('../../../assets/pay/click.png'),
    logoAspect: 430 / 182,
    tileColors: ['#ffffff', '#eef3fa'],
  },
  uzum: {
    colors: ['#7000ff', '#5b21d6'],
    name: 'Uzum Bank',
    weight: '800',
    sub: 'bank',
    logo: require('../../../assets/pay/uzum.png'),
    logoAspect: 435 / 171,
    tileColors: ['#7000ff', '#7000ff'],
  },
  paynet: {
    colors: ['#27c28a', '#0d8a6a'],
    name: 'Paynet',
    weight: '900',
    sub: '',
    logo: require('../../../assets/pay/paynet.png'),
    logoAspect: 682 / 135,
    logoWidth: 124,
    tileColors: ['#ffffff', '#eef3fa'],
  },
};
const FALLBACK = { colors: ['#475569', '#1e293b'], weight: '800', sub: '' };

export const providerTitle = (p) =>
  BRANDS[p]?.name ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : '');

/** provider: 'click' | 'payme' | 'uzum' | 'paynet' | boshqa; selected: tanlanganmi. */
export default function PayProviderTile({ provider, selected, dimmed, onPress, badge }) {
  const key = provider === 'uzumbank' ? 'uzum' : provider; // serverda kodi «uzumbank»
  const brand = BRANDS[key] ?? FALLBACK;
  const name = BRANDS[key]?.name ?? providerTitle(key);
  const locked = !!badge; // badge bor bo'lsa tanlab bo'lmaydi («Tez orada»)
  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.85}
      onPress={locked ? undefined : onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      style={[
        s.wrap,
        selected && { shadowColor: brand.colors[1], shadowOpacity: 0.55, elevation: 8 },
        dimmed && { opacity: 0.5 },
        locked && { opacity: 0.7 },
      ]}
    >
      <LinearGradient
        colors={brand.tileColors ?? brand.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.tile, selected && { borderColor: brand.logo ? brand.colors[1] : '#ffffff' }]}
      >
        {brand.logo ? (
          // Rasmiy logotip: oq plitkada, o'rtada
          <Image
            source={brand.logo}
            style={{
              width: (brand.logoWidth ?? 118) * (locked ? 0.85 : 1),
              height: ((brand.logoWidth ?? 118) * (locked ? 0.85 : 1)) / brand.logoAspect,
              alignSelf: 'center',
              marginTop: locked ? 16 : 0, // «Tez orada» yorlig'i logotipga tegmasin
            }}
            resizeMode="contain"
            accessibilityLabel={name}
          />
        ) : (
          <>
            {/* Yengil yorug'lik dog'i */}
            <View style={s.glow} pointerEvents="none" />
            <Text style={[s.name, { fontWeight: brand.weight }]} numberOfLines={1}>
              {name}
            </Text>
            {brand.sub ? <Text style={s.sub}>{brand.sub}</Text> : null}
          </>
        )}
        {locked ? (
          <View style={s.badge}>
            <Ionicons name="lock-closed" size={9} color="#fff" />
            <Text style={s.badgeText}>{badge}</Text>
          </View>
        ) : (
          <View
            style={[
              s.check,
              brand.logo && brand.tileColors[0] === '#ffffff' && { borderColor: '#b6c2d4' },
              selected &&
                (brand.logo && brand.tileColors[0] === '#ffffff'
                  ? { backgroundColor: brand.colors[1], borderColor: brand.colors[1] }
                  : s.checkOn),
            ]}
          >
            {selected ? (
              <Ionicons
                name="checkmark"
                size={14}
                color={brand.logo && brand.tileColors[0] === '#ffffff' ? '#fff' : '#0b1220'}
              />
            ) : null}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: '48%',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    shadowOpacity: 0,
  },
  tile: {
    height: 78,
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: '#ffffff' },
  glow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffffff26',
  },
  name: { color: '#fff', fontSize: 24, letterSpacing: -0.5 },
  sub: { color: '#ffffffd9', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: -2 },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffffaa',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: '#0b1220cc',
  },
  badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '800' },
  checkOn: { backgroundColor: '#fff', borderColor: '#fff' },
});
