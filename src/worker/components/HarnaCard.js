import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// «Harna kartasi»: hamyon balansi bank kartasi ko'rinishida. Faqat dizayn — haqiqiy to'lov kartasi
// emas, shuning uchun karta raqami va to'lov tizimi (Visa va h.k.) belgisi yo'q. Chap tomondagi
// naqsh logodagi bir-biriga o'tgan ikki halqadan olingan: halqalardan yasalgan guldasta.
const LOGO = require('../../../assets/logo-on-dark.png');
const LOGO_ASPECT = 1200 / 170;
const ORANGE = '#e87a45';
const ASPECT = 85.6 / 53.98; // standart bank kartasi

// Guldasta: markazdan 8 ta, 22.5° buralgan yana 8 ta halqa — "mandala" naqshi.
function Rosette() {
  const cx = 78;
  const cy = 84;
  const ring = (angle, dist, r, opacity, key) => {
    const a = (angle * Math.PI) / 180;
    return (
      <Circle
        key={key}
        cx={cx + Math.cos(a) * dist}
        cy={cy + Math.sin(a) * dist}
        r={r}
        stroke={ORANGE}
        strokeOpacity={opacity}
        strokeWidth={1.1}
        fill="none"
      />
    );
  };
  const items = [];
  for (let i = 0; i < 8; i += 1) {
    items.push(ring(i * 45, 46, 46, 0.55, `a${i}`));
    items.push(ring(i * 45 + 22.5, 70, 46, 0.3, `b${i}`));
    items.push(ring(i * 45, 24, 24, 0.5, `c${i}`));
  }
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 340 214"
      preserveAspectRatio="xMinYMid slice"
      pointerEvents="none"
    >
      {items}
      <Circle cx={cx} cy={cy} r={10} fill={ORANGE} fillOpacity={0.9} />
      <Circle
        cx={cx}
        cy={cy}
        r={20}
        stroke={ORANGE}
        strokeOpacity={0.8}
        strokeWidth={1.4}
        fill="none"
      />
    </Svg>
  );
}

function Chip() {
  return (
    <LinearGradient
      colors={['#f3d9a4', '#c9a15b']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.chip}
    >
      <View style={s.chipH} />
      <View style={[s.chipH, { top: '66%' }]} />
      <View style={s.chipV} />
      <View style={[s.chipV, { left: '66%' }]} />
    </LinearGradient>
  );
}

/** balance: tayyor matn («1 250 000 so'm»); label: «Mavjud balans»; name: usta ismi; tag: o'ng pastdagi yozuv. */
export default function HarnaCard({
  balance,
  label,
  name,
  tag = 'USTA',
  delta,
  deltaNegative,
  style,
}) {
  return (
    <LinearGradient
      colors={['#13233a', '#0a1422', '#060d17']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, style]}
    >
      <Rosette />
      {/* Pastki qism to'qlashadi: naqsh balans matni ustiga chiqib, uni o'qib bo'lmas qilmasin. */}
      <LinearGradient colors={['#060d1700', '#060d17f2']} style={s.scrim} pointerEvents="none" />

      <Image source={LOGO} style={s.logo} resizeMode="contain" accessibilityLabel="Harna" />

      <View style={s.chipRow}>
        <Chip />
        <MaterialCommunityIcons name="contactless-payment" size={26} color="#ffffffcc" />
      </View>

      <View style={s.bottom}>
        <View style={{ flex: 1 }}>
          <View style={s.labelRow}>
            <Text style={s.label}>{label}</Text>
            {delta ? (
              <View style={[s.delta, deltaNegative && { backgroundColor: '#ef444433' }]}>
                <Text style={[s.deltaText, deltaNegative && { color: '#f87171' }]}>{delta}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.balance} numberOfLines={1} adjustsFontSizeToFit>
            {balance}
          </Text>
          {name ? (
            <Text style={s.name} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
        <Text style={s.tag}>{tag}</Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: ASPECT,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff14',
    justifyContent: 'space-between',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  logo: { position: 'absolute', top: 16, right: 16, width: 104, height: 104 / LOGO_ASPECT },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 34 },
  chip: { width: 38, height: 28, borderRadius: 6, overflow: 'hidden' },
  chipH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: '#8a6a2f',
  },
  chipV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: '#8a6a2f',
  },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delta: {
    backgroundColor: '#22c55e33',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deltaText: { color: '#4ade80', fontSize: 12, fontWeight: '800' },
  label: { color: '#ffffffd9', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.6 },
  balance: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
    textShadowColor: '#000000aa',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  name: {
    color: '#ffffffcc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  tag: { color: '#fff', fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
});
