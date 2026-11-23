import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Easing,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLanguage } from '../../context/LanguageContext';
import { Btn, fmtDate, money } from '../ui';

// To'ldirish kvitansiyasi: «Chek →» bosilganda yuqoridagi chek apparati tirqishidan qog'oz chek
// chiqib keladi (modal oyna emas). Bu FISKAL chek emas — serverdan faqat summa, to'lov tizimi, sana,
// tranzaksiya raqami va soliq sahifasi havolasi keladi. QR kod soliq havolasini (bo'lmasa Harna
// kvitansiya ma'lumotini) kodlaydi.
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const INK = '#16181d';
const SOFT = '#6b7280';
const PAPER = '#fffefa';

const PROVIDERS = { payme: 'Payme', click: 'Click', uzum: 'Uzum' };
const providerName = (p) => PROVIDERS[p] || (p ? p.charAt(0).toUpperCase() + p.slice(1) : '—');

// Pastki tishli (yirtilgan) chet: 30 ta tish.
const TEETH = 30;
const ZIGZAG = (() => {
  let d = 'M0 0 L0 1';
  for (let i = 0; i < TEETH; i += 1) {
    d += ` L${i * 10 + 5} 10 L${(i + 1) * 10} 1`;
  }
  return `${d} L${TEETH * 10} 0 Z`;
})();

function Line({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={s.line}>
      <Text style={[s.mono, { color: SOFT }]}>{label}</Text>
      <Text style={[s.mono, s.value]} selectable>
        {value}
      </Text>
    </View>
  );
}

const Dash = () => <View style={s.dash} />;

/** receipt: { url, amount (so'm), provider, txId, date } yoki null. */
export default function TopupReceiptSheet({ receipt, onClose, onOpenSite }) {
  const { t, language } = useLanguage();
  const [slide] = useState(() => new Animated.Value(0)); // 0 = yashirin, 1 = to'liq chiqqan
  const [h, setH] = useState(0);
  const [shown, setShown] = useState(null); // yopilish animatsiyasi tugaguncha ma'lumot saqlanadi
  const [prev, setPrev] = useState(null);
  if (receipt !== prev) {
    setPrev(receipt);
    if (receipt) setShown(receipt);
  }

  useEffect(() => {
    if (!receipt || !h) return;
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [receipt, h, slide]);

  const close = () => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 380,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setShown(null);
      setH(0);
      onClose();
    });
  };

  const r = shown;
  const qrValue = r
    ? r.url || `HARNA|TOPUP|${r.txId || ''}|${Math.round(Number(r.amount) || 0)}|${r.date || ''}`
    : '';
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [-(h + 16), 0] });

  return (
    <Modal
      visible={!!r}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <TouchableWithoutFeedback onPress={close}>
        <View style={s.overlay} />
      </TouchableWithoutFeedback>

      {r ? (
        <View style={s.stage} pointerEvents="box-none">
          {/* Chek apparatining tirqishi */}
          <View style={s.slotBody}>
            <View style={s.slot} />
          </View>

          {/* Qog'oz tirqish ostidan pastga siljib chiqadi */}
          <View style={s.clip}>
            <Animated.View
              style={{ opacity: h ? 1 : 0, transform: [{ translateY }] }}
              onLayout={(e) => setH(Math.ceil(e.nativeEvent.layout.height))}
            >
              <View style={s.paper}>
                <TouchableOpacity onPress={close} hitSlop={10} style={s.close}>
                  <Ionicons name="close" size={20} color={SOFT} />
                </TouchableOpacity>

                <Text style={[s.mono, s.title]}>{t('w.wallet.receiptTitle')}</Text>
                <Text style={[s.mono, s.sub]}>{t('w.wallet.receiptKind')}</Text>
                <Dash />
                <Line label={t('w.wallet.receiptProvider')} value={providerName(r.provider)} />
                <Line label={t('w.wallet.receiptDate')} value={fmtDate(r.date, language)} />
                <Line label={t('w.wallet.receiptTx')} value={r.txId} />
                <Dash />
                <View style={s.line}>
                  <Text style={[s.mono, s.total]}>{t('w.wallet.receiptTotal')}</Text>
                  <Text style={[s.mono, s.total]}>{money(r.amount, t)}</Text>
                </View>
                <Dash />

                <View style={s.qrWrap}>
                  <QRCode value={qrValue} size={116} color={INK} backgroundColor={PAPER} ecl="M" />
                </View>
                <Text style={[s.mono, s.note]}>
                  {r.url ? t('w.wallet.receiptNote') : t('w.wallet.receiptPending')}
                </Text>
              </View>
              <Svg width="100%" height={10} viewBox="0 0 300 10" preserveAspectRatio="none">
                <Path d={ZIGZAG} fill={PAPER} />
              </Svg>
            </Animated.View>
          </View>

          {r.url ? (
            <Animated.View style={[s.actions, { opacity: slide }]}>
              <Btn label={t('w.wallet.receiptOpen')} onPress={() => onOpenSite(r.url)} />
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,8,14,0.45)' },
  stage: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 22,
  },
  slotBody: {
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1d2733',
    borderWidth: 1,
    borderColor: '#ffffff1f',
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 3,
    elevation: 6,
  },
  slot: { height: 6, borderRadius: 3, backgroundColor: '#04080e' },
  clip: { overflow: 'hidden', marginHorizontal: 12, paddingBottom: 6 },
  paper: {
    backgroundColor: PAPER,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
    gap: 8,
  },
  close: { position: 'absolute', top: 8, right: 8, zIndex: 2, padding: 4 },
  mono: { fontFamily: MONO, fontSize: 13, color: INK },
  title: { textAlign: 'center', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  sub: { textAlign: 'center', color: SOFT },
  dash: {
    marginVertical: 4,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#b9bec7',
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  value: { flexShrink: 1, textAlign: 'right' },
  total: { fontSize: 17, fontWeight: '800' },
  qrWrap: { alignItems: 'center', paddingVertical: 6 },
  note: { textAlign: 'center', color: SOFT, fontSize: 11.5, lineHeight: 16 },
  actions: { marginTop: 14, marginHorizontal: 12 },
});
