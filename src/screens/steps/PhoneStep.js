import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import PhoneInput from '../../components/login/PhoneInput';
import EmailInput from '../../components/login/EmailInput';
import ConsentCheck from '../../components/login/ConsentCheck';
import BrandLogo from '../../components/BrandLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PhoneStep({
  identifier,
  onIdentifierChange,
  mode = 'phone',
  onModeChange,
  onRequestOtp,
  loginLoading,
  telegramLoading,
  error,
  onGoogle,
  googleLoading,
  onBack,
  actorType = 'customer',
  consent = false,
  onConsentChange,
  onPasswordLogin,
}) {
  const { theme } = useTheme();
  // Rozilik belgisiz kod yuborish, Telegram va Google ishlamaydi: belgi qizarib turadi.
  const [consentError, setConsentError] = useState(false);
  const guarded = (action) => () => {
    if (!consent) {
      setConsentError(true);
      return;
    }
    action();
  };
  const { t } = useLanguage();
  const isDark = theme.isDark !== false;
  const isUsta = actorType === 'worker';
  const isEmail = mode === 'email';
  const isIdentifierReady = isEmail ? EMAIL_REGEX.test(identifier.trim()) : identifier.length === 9;
  // Telegram orqali kod faqat telefon raqamga yuboriladi.
  const telegramReady = !isEmail && isIdentifierReady;
  const anyOtpLoading = loginLoading || telegramLoading;
  const isReady = isIdentifierReady && !anyOtpLoading;
  const handleCta = () => onRequestOtp('sms');

  return (
    <View style={[s.flex, { backgroundColor: theme.bg }]}>
      {/* Klaviatura ochilganda maydon bilan birga pastdagi Google/Telegram tugmalari ham ko'rinib turishi uchun
          yetarli `bottomOffset` qoldiriladi: kontent shuncha tepaga suriladi. */}
      <KeyboardAwareScrollView
        contentContainerStyle={s.scroll}
        bottomOffset={340}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={onBack}
            activeOpacity={0.75}
          >
            <Feather name="arrow-left" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* ── Hero ── */}
          <View style={s.hero}>
            <View
              style={[
                s.orb,
                isUsta
                  ? { backgroundColor: isDark ? 'rgba(63,127,212,0.16)' : 'rgba(63,127,212,0.10)' }
                  : isDark
                    ? { backgroundColor: 'rgba(240,122,48,0.13)' }
                    : { backgroundColor: 'rgba(240,122,48,0.08)' },
              ]}
            />
            {/* Logo + "USTA" yozuvi: HARNA dan keyin, yuqori o'ng burchakda */}
            <View style={s.logoRow}>
              <BrandLogo width={isUsta ? 262 : 310} />
              {isUsta && (
                <View style={[s.ustaPill, { backgroundColor: theme.orange }]}>
                  <Text style={s.ustaPillTxt}>USTA</Text>
                </View>
              )}
            </View>
            <Text style={[s.h1, { color: theme.text }]}>
              {isUsta ? t('login.phoneStep.titleUsta') : t('login.phoneStep.titleCustomer')}
            </Text>
            <Text style={[s.sub, { color: theme.muted }]}>
              {isUsta ? t('login.phoneStep.subtitleUsta') : t('login.phoneStep.subtitleCustomer')}
            </Text>
          </View>

          {/* ── Telefon yoki email maydoni ── */}
          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: theme.muted }]}>
              {t(isEmail ? 'login.phoneStep.emailLabel' : 'login.phoneStep.phoneLabel')}
            </Text>
            {isEmail ? (
              <EmailInput
                value={identifier}
                onChangeText={onIdentifierChange}
                theme={theme}
                placeholder={t('login.phoneStep.emailPlaceholder')}
              />
            ) : (
              <PhoneInput value={identifier} onChangeText={onIdentifierChange} theme={theme} />
            )}
          </View>

          {/* ── Error ── */}
          {!!error && (
            <View
              style={[
                s.errorBox,
                {
                  backgroundColor: isDark ? 'rgba(224,71,58,0.13)' : 'rgba(224,71,58,0.08)',
                  borderColor: 'rgba(224,71,58,0.32)',
                },
              ]}
            >
              <MaterialCommunityIcons name="alert-circle" size={18} color={theme.red} />
              <Text style={[s.errorTxt, { color: theme.red }]}>{error}</Text>
            </View>
          )}

          {/* ── CTA ── */}
          <TouchableOpacity
            style={[s.cta, !isReady && s.ctaDisabled]}
            onPress={isReady ? guarded(handleCta) : undefined}
            activeOpacity={0.85}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={[s.ctaTxt, !isReady && s.ctaTxtDisabled]}>
                  {t('login.phoneStep.continueCta')}
                </Text>
                <Feather name="arrow-right" size={18} color={isReady ? '#fff' : '#7a6253'} />
              </>
            )}
          </TouchableOpacity>

          {/* ── Parol bilan kirish (saytdagi oynadagi kabi, kodsiz) ── */}
          {!!onPasswordLogin && (
            <TouchableOpacity
              style={s.passwordLink}
              onPress={isIdentifierReady ? guarded(onPasswordLogin) : undefined}
              activeOpacity={0.7}
              accessibilityRole="button"
              disabled={!isIdentifierReady}
            >
              <Text
                style={[
                  s.passwordLinkTxt,
                  { color: isIdentifierReady ? theme.orange : theme.muted },
                ]}
              >
                {t('login.phoneStep.usePassword')}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Kirish usulini almashtirish: email <-> telefon ── */}
          <TouchableOpacity
            style={s.switchRow}
            onPress={() => onModeChange?.(isEmail ? 'phone' : 'email')}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <View style={[s.switchIcon, { backgroundColor: `${theme.orange}22` }]}>
              <Feather name={isEmail ? 'smartphone' : 'mail'} size={15} color={theme.orange} />
            </View>
            <Text style={[s.switchTxt, { color: theme.muted }]}>
              {t(isEmail ? 'login.phoneStep.usePhonePrompt' : 'login.phoneStep.useEmailPrompt')}{' '}
              <Text style={[s.switchLink, { color: theme.orange }]}>
                {t(isEmail ? 'login.phoneStep.usePhone' : 'login.phoneStep.useEmail')}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* ── Shaxsiy ma'lumotlarga rozilik (saytdagi kirish oynasidagi kabi) ── */}
          <View style={s.consentWrap}>
            <ConsentCheck
              checked={consent}
              error={consentError}
              onToggle={() => {
                setConsentError(false);
                onConsentChange?.(!consent);
              }}
              colors={{
                text: theme.muted,
                link: theme.text,
                border: theme.faint ?? theme.muted,
                active: theme.orange,
              }}
            />
            {consentError && !consent && (
              <Text style={[s.consentErr, { color: theme.red }]}>{t('legal.check.required')}</Text>
            )}
          </View>

          {/* ── Social ── */}
          <View style={s.orWrap}>
            <View style={[s.line, { backgroundColor: theme.border }]} />
            <Text style={[s.orTxt, { color: theme.muted }]}>{t('login.phoneStep.or')}</Text>
            <View style={[s.line, { backgroundColor: theme.border }]} />
          </View>

          <View style={s.socialRow}>
            <TouchableOpacity
              style={[
                s.socBtn,
                { borderColor: theme.border, backgroundColor: isDark ? theme.card : '#fff' },
              ]}
              onPress={googleLoading ? undefined : guarded(onGoogle)}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
              )}
              <Text style={[s.socTxt, { color: isDark ? theme.text : '#1f2937' }]}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.socBtn,
                { borderColor: theme.border, backgroundColor: theme.card },
                !telegramReady && s.socBtnDisabled,
              ]}
              onPress={
                anyOtpLoading || !telegramReady
                  ? undefined
                  : guarded(() => onRequestOtp('telegram'))
              }
              activeOpacity={0.85}
            >
              {telegramLoading ? (
                <ActivityIndicator size="small" color="#229ED9" />
              ) : (
                <Ionicons name="paper-plane" size={20} color="#229ED9" />
              )}
              <Text style={[s.socTxt, { color: theme.text }]}>Telegram</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  consentWrap: { marginTop: 18, gap: 6 },
  passwordLink: { alignSelf: 'center', paddingVertical: 4 },
  passwordLinkTxt: { fontSize: 14, fontWeight: '700' },
  consentErr: { fontSize: 12.5, fontWeight: '600', marginLeft: 36 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 32,
    gap: 22,
  },

  hero: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: 16,
    gap: 8,
  },
  orb: {
    position: 'absolute',
    top: -20,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  logo: { width: 220, height: 120 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 18,
  },
  ustaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    marginTop: -6,
  },
  ustaPillTxt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  h1: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },

  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  errorTxt: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 15,
    gap: 8,
    backgroundColor: '#e87a45',
    shadowColor: '#e87a45',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 9,
  },
  ctaDisabled: {
    backgroundColor: '#3a2a22',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ctaTxtDisabled: { color: '#7a6253' },

  orWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1 },
  orTxt: { fontSize: 13 },

  socialRow: { flexDirection: 'row', gap: 12 },
  socBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  socTxt: { fontSize: 14, fontWeight: '700' },
  socBtnDisabled: { opacity: 0.45 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  switchIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTxt: { fontSize: 13.5, fontWeight: '500', flexShrink: 1 },
  switchLink: { fontWeight: '800', textDecorationLine: 'underline' },

  footer: { gap: 12, alignItems: 'center' },
  terms: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
