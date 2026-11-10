import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLanguage } from '../context/LanguageContext';
import { formatNumber } from '../utils/format';

const money = (v) =>
  v === null || v === undefined || v === '' ? null : formatNumber(Math.round(Number(v)));

// "Do'stingizni taklif qiling": qadamlar, kod "chiptasi", ulashish va natijalar (bosh sahifa va "Imkoniyatlar" uchun umumiy).
export default function ReferralPanel({ r, style }) {
  const { t: tr } = useLanguage();
  const you = money(r.inviter_bonus) ?? '—';
  const friend = money(r.invitee_bonus) ?? '—';
  const share = () =>
    Share.share({ message: tr('workerHome.refMsg', { code: r.code }) }).catch(() => {});
  const steps = [
    ['paper-plane', tr('workerHome.refStep1'), null],
    ['person-add', tr('workerHome.refStep2'), tr('workerHome.refGets', { n: friend })],
    ['trophy', tr('workerHome.refStep3'), tr('workerHome.refYouGet', { n: you })],
  ];
  return (
    <LinearGradient
      colors={['#25405f', '#12223a', '#0b1626']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.ref, style]}
    >
      <View style={s.refGlow} />

      {/* Sarlavha va sovrin */}
      <View style={s.refTop}>
        <View style={s.refGift}>
          <Ionicons name="gift" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
            {tr('workerHome.refTitle')}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            {tr('workerHome.refReward')}
          </Text>
        </View>
        <Text style={s.refAmount}>
          {you}
          <Text style={{ fontSize: 12, fontWeight: '700' }}> {tr('workerHome.som')}</Text>
        </Text>
      </View>

      {/* Qadamlar */}
      <View style={s.refSteps}>
        {steps.map(([icon, title, reward], i) => (
          <View key={title} style={s.refStep}>
            <View style={s.refStepIcon}>
              <Ionicons name={icon} size={18} color="#fff" />
              <View style={s.refStepNum}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{i + 1}</Text>
              </View>
            </View>
            <Text style={s.refStepTxt} numberOfLines={2}>
              {title}
            </Text>
            {!!reward && <Text style={s.refStepReward}>{reward}</Text>}
          </View>
        ))}
      </View>

      {/* Kod "chipta" */}
      <View style={s.refTicket}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 1 }}>
            {tr('workerHome.refCode').toUpperCase()}
          </Text>
          <Text style={s.refCodeTxt}>{r.code}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={share} style={s.refBtn}>
          <Ionicons name="share-social" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13.5 }}>
            {tr('workerHome.refShare')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Natijalar */}
      <View style={s.refStats}>
        <RefStat value={r.invited ?? r.invited_count ?? 0} label={tr('workerHome.refInvited')} />
        <View style={s.refSep} />
        <RefStat
          value={r.rewarded ?? r.started_count ?? r.started ?? 0}
          label={tr('workerHome.refRewarded')}
        />
        <View style={s.refSep} />
        <RefStat
          value={money(r.earned ?? r.earned_bonus) ?? 0}
          label={tr('workerHome.refEarned')}
        />
      </View>
    </LinearGradient>
  );
}

function RefStat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{value}</Text>
      <Text
        style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  ref: {
    padding: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  refGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -90,
    right: -70,
    backgroundColor: 'rgba(232,122,69,0.22)',
  },
  refTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refGift: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e87a45',
  },
  refAmount: { color: '#f5b81f', fontSize: 22, fontWeight: '900' },
  refSteps: { flexDirection: 'row', gap: 10, marginTop: 20 },
  refStep: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refStepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  refStepNum: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e87a45',
  },
  refStepTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    minHeight: 28,
  },
  refStepReward: {
    color: '#f5b81f',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  refTicket: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  refCodeTxt: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 3, marginTop: 2 },
  refBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e87a45',
  },
  refStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  refSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },
});
