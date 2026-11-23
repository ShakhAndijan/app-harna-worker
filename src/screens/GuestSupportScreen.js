import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import Turnstile from '../components/Turnstile';
import { useTurnstileSiteKey } from '../queries/system';
import { SUPPORT_MAX_LENGTH, SUPPORT_MIN_LENGTH, sendGuestSupport } from '../api/support';
import { parseContact } from './support/utils';
import { getErrorMessage } from '../utils/errors';

const TEXTS = {
  uz: {
    title: 'Yordam',
    hint: 'Hisobga kirmasdan ham jamoaga yozishingiz mumkin. Javob siz ko‘rsatgan aloqa orqali keladi.',
    name: 'Ismingiz',
    contact: 'Telefon, email yoki @telegram',
    body: 'Savol yoki taklif',
    send: 'Yuborish',
    sent: '✓ Xabaringiz yuborildi. Javobni ko‘rsatgan aloqangiz orqali yuboramiz.',
    needName: 'Ismingizni kiriting (kamida 2 ta belgi).',
    badContact: 'Aloqa: telefon +998XXXXXXXXX, email yoki @telegram ko‘rinishida.',
    tooShort: 'Xabar kamida {n} ta belgidan iborat bo‘lsin.',
    needCaptcha: 'Avval “Men robot emasman” tekshiruvidan o‘ting.',
    errorTitle: 'Xatolik',
  },
  ru: {
    title: 'Помощь',
    hint: 'Написать команде можно и без входа. Ответ придёт по указанному контакту.',
    name: 'Ваше имя',
    contact: 'Телефон, email или @telegram',
    body: 'Вопрос или предложение',
    send: 'Отправить',
    sent: '✓ Сообщение отправлено. Ответим по указанному контакту.',
    needName: 'Введите имя (минимум 2 символа).',
    badContact: 'Контакт: телефон +998XXXXXXXXX, email или @telegram.',
    tooShort: 'Сообщение должно быть не короче {n} символов.',
    needCaptcha: 'Сначала пройдите проверку «Я не робот».',
    errorTitle: 'Ошибка',
  },
  en: {
    title: 'Help',
    hint: 'You can write to the team without signing in. The reply comes through the contact you give.',
    name: 'Your name',
    contact: 'Phone, email or @telegram',
    body: 'Question or suggestion',
    send: 'Send',
    sent: '✓ Message sent. We will reply through the contact you gave.',
    needName: 'Enter your name (at least 2 characters).',
    badContact: 'Contact: a phone as +998XXXXXXXXX, an email, or @telegram.',
    tooShort: 'The message must be at least {n} characters.',
    needCaptcha: 'Please pass the “I am not a robot” check first.',
    errorTitle: 'Error',
  },
};

// Mehmon yordam shakli (saytdagi /support, kirmagan odam uchun): ism, aloqa, xabar (10–4000 belgi)
// va Cloudflare Turnstile (yoqilgan bo'lsa). Token bitta xabar uchun yaroqli: yuborgach vidjet yangilanadi.
export default function GuestSupportScreen({ onBack }) {
  const { theme: t } = useTheme();
  const { language, t: tr } = useLanguage();
  const captchaOn = !!useTurnstileSiteKey();
  const tx = TEXTS[language] ?? TEXTS.uz;
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [body, setBody] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [round, setRound] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState(null);

  const submit = async () => {
    const sender = name.trim();
    const text = body.trim();
    const parsed = parseContact(contact);
    if (sender.length < 2) return setProblem(tx.needName);
    if (!parsed) return setProblem(tx.badContact);
    if (text.length < SUPPORT_MIN_LENGTH)
      return setProblem(tx.tooShort.replace('{n}', SUPPORT_MIN_LENGTH));
    if (captchaOn && !captcha) return setProblem(tx.needCaptcha);
    setSending(true);
    setProblem(null);
    try {
      await sendGuestSupport({
        kind: 'question',
        body: text,
        name: sender,
        contact: parsed.value,
        captcha,
      });
      setSent(true);
      setBody('');
    } catch (e) {
      setProblem(getErrorMessage(e, tr));
    } finally {
      // Token bir martalik: muvaffaqiyatda ham, xatoda ham yangisi olinadi.
      setCaptcha('');
      setRound((n) => n + 1);
      setSending(false);
    }
  };

  const input = [s.input, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <View style={s.header}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: t.text }]}>{tx.title}</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={{ color: t.muted, lineHeight: 20 }}>{tx.hint}</Text>
          {sent && (
            <View style={[s.sent, { backgroundColor: t.green + '1f' }]}>
              <Text style={{ color: t.green, fontWeight: '700', lineHeight: 20 }}>{tx.sent}</Text>
            </View>
          )}
          <TextInput
            style={input}
            value={name}
            onChangeText={setName}
            placeholder={tx.name}
            placeholderTextColor={t.faint}
            autoComplete="name"
            maxLength={100}
          />
          <TextInput
            style={input}
            value={contact}
            onChangeText={setContact}
            placeholder={tx.contact}
            placeholderTextColor={t.faint}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={120}
          />
          <TextInput
            style={[...input, s.multi]}
            value={body}
            onChangeText={setBody}
            placeholder={`${tx.body} · ${body.length} / ${SUPPORT_MAX_LENGTH}`}
            placeholderTextColor={t.faint}
            multiline
            maxLength={SUPPORT_MAX_LENGTH}
          />
          {captchaOn && <Turnstile key={round} onToken={setCaptcha} />}
          {!!problem && <Text style={{ color: t.red, fontWeight: '600' }}>{problem}</Text>}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: t.orange, opacity: sending ? 0.6 : 1 }]}
            activeOpacity={0.85}
            onPress={submit}
            disabled={sending}
          >
            <Text style={s.btnTxt}>{tx.send}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontWeight: '700', fontSize: 20 },
  body: { padding: 20, gap: 12, paddingBottom: 32 },
  sent: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 50, fontSize: 15 },
  multi: { height: 140, paddingTop: 12, textAlignVertical: 'top' },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
