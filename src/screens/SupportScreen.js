import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { appAlert } from '../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import AppLoader from '../components/AppLoader';
import SectionError from './zakazchi-main/components/SectionError';
import SupportItemCard from './support/SupportItemCard';
import { useSendSupportItem, useSupportItems } from '../queries/support';
import { SUPPORT_MAX_LENGTH, SUPPORT_MIN_LENGTH } from '../api/support';
import { getErrorMessage } from '../utils/errors';
import useBottomInset from '../hooks/useBottomInset';
import usePullRefresh from '../hooks/usePullRefresh';

// "Murojaatlarim" va "Takliflarim" (saytdagi /support va kabinet): yangi murojaat/taklif yozish va
// yuborilganlar ro'yxati; jamoa javobi shu yerda va bildirishnomalarda ko'rinadi.
export default function SupportScreen({ kind: initialKind = 'question', onBack }) {
  const { refreshControl } = usePullRefresh();
  const bottomInset = useBottomInset();
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const { user } = useUser();

  const [kind, setKind] = useState(initialKind === 'suggestion' ? 'suggestion' : 'question');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const isSuggestion = kind === 'suggestion';

  const items = useSupportItems(kind);
  const send = useSendSupportItem(kind);

  const text = body.trim();
  const tooShort = text.length < SUPPORT_MIN_LENGTH;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();

  const switchKind = (next) => {
    setKind(next);
    setSent(false);
    setBody('');
  };

  const submit = () => {
    if (tooShort || send.isPending) return;
    send.mutate(
      { body: text, name: name.length >= 2 ? name : undefined },
      {
        onSuccess: () => {
          setBody('');
          setSent(true);
        },
        onError: (e) => appAlert(tr('common.errorTitle'), getErrorMessage(e, tr)),
      }
    );
  };

  const grad = isSuggestion ? ['#f5b81f', '#e87a45'] : ['#f08a55', '#d9582a'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 32 + bottomInset,
            gap: 10,
          }}
        >
          {/* Katta rangli sarlavha kartasi: orqaga tugmasi, ikon va izoh bir joyda */}
          <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
            <View style={s.heroDeco1} />

            <MaterialCommunityIcons
              name={isSuggestion ? 'lightbulb-on-outline' : 'headset'}
              size={76}
              color="rgba(255,255,255,0.16)"
              style={s.heroBgIcon}
            />
            <View style={s.heroRow}>
              <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.heroTitle} numberOfLines={1}>
                  {tr(isSuggestion ? 'support.suggestionTitle' : 'support.contactTitle')}
                </Text>
                <Text style={s.heroHint} numberOfLines={2}>
                  {tr(isSuggestion ? 'support.suggestionHint' : 'support.contactHint')}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Almashtirgich */}
          <View style={[s.tabs, { backgroundColor: t.card, borderColor: t.border }]}>
            {['question', 'suggestion'].map((k) => (
              <TouchableOpacity
                key={k}
                style={[s.tab, kind === k && { backgroundColor: t.orange }]}
                activeOpacity={0.85}
                onPress={() => switchKind(k)}
              >
                <MaterialCommunityIcons
                  name={k === 'question' ? 'chat-processing-outline' : 'lightbulb-on-outline'}
                  size={18}
                  color={kind === k ? '#fff' : t.muted}
                />
                <Text style={[s.tabText, { color: kind === k ? '#fff' : t.muted }]}>
                  {tr(k === 'question' ? 'support.tabQuestions' : 'support.tabSuggestions')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {sent && (
            <View
              style={[s.banner, { backgroundColor: t.green + '1a', borderColor: t.green + '55' }]}
            >
              <MaterialCommunityIcons name="check-circle" size={22} color={t.green} />
              <Text style={[s.bannerText, { color: t.green }]}>{tr('support.sentAuthed')}</Text>
            </View>
          )}

          {/* Yozish: ichida yumaloq "yuborish" tugmasi */}
          <View style={[s.compose, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[s.label, { color: t.text }]}>
              {tr(isSuggestion ? 'support.suggestionBody' : 'support.questionBody')}
            </Text>
            <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <TextInput
                style={[s.input, { color: t.text }]}
                value={body}
                onChangeText={(x) => {
                  setBody(x);
                  if (sent) setSent(false);
                }}
                placeholder={tr(
                  isSuggestion ? 'support.suggestionPlaceholder' : 'support.questionPlaceholder'
                )}
                placeholderTextColor={t.faint}
                multiline
                maxLength={SUPPORT_MAX_LENGTH}
                textAlignVertical="top"
              />
              <View style={s.inputFoot}>
                <Text style={[s.count, { color: t.faint }]}>
                  {body.length} / {SUPPORT_MAX_LENGTH}
                </Text>
                <TouchableOpacity
                  style={[
                    s.sendCircle,
                    { backgroundColor: t.orange, opacity: tooShort || send.isPending ? 0.4 : 1 },
                  ]}
                  activeOpacity={0.85}
                  disabled={tooShort || send.isPending}
                  onPress={submit}
                  accessibilityRole="button"
                  accessibilityLabel={tr('support.send')}
                >
                  {send.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.noteRow}>
              <MaterialCommunityIcons
                name={tooShort && text.length > 0 ? 'alert-circle-outline' : 'information-outline'}
                size={15}
                color={tooShort && text.length > 0 ? t.gold : t.faint}
              />
              <Text style={[s.note, { color: t.faint }]}>
                {tooShort && text.length > 0
                  ? tr('support.tooShort', { n: SUPPORT_MIN_LENGTH })
                  : tr('support.replyNote')}
              </Text>
            </View>
          </View>

          {/* Yuborilganlar */}
          <View style={s.sectionRow}>
            <Text style={[s.section, { color: t.text }]}>
              {tr(isSuggestion ? 'support.mineSuggestions' : 'support.mineQuestions')}
            </Text>
            {items.data?.length ? (
              <View style={[s.pill, { backgroundColor: t.orange + '22' }]}>
                <Text style={{ color: t.orange, fontSize: 12, fontWeight: '900' }}>
                  {items.data.length}
                </Text>
              </View>
            ) : null}
          </View>
          {items.isPending ? (
            <View style={s.center}>
              <AppLoader size={100} />
            </View>
          ) : items.isError ? (
            <SectionError onRetry={items.refetch} />
          ) : items.data.length === 0 ? (
            <View style={s.center}>
              <View style={[s.emptyIcon, { backgroundColor: t.orange + '14' }]}>
                <MaterialCommunityIcons
                  name={isSuggestion ? 'lightbulb-outline' : 'inbox-outline'}
                  size={28}
                  color={t.orange}
                />
              </View>
              <Text style={{ color: t.muted, fontSize: 14 }}>
                {tr(isSuggestion ? 'support.noSuggestions' : 'support.mineEmpty')}
              </Text>
            </View>
          ) : (
            items.data.map((it) => <SupportItemCard key={it.id} item={it} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 22, padding: 12, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroDeco1: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroDeco2: {
    position: 'absolute',
    right: 60,
    bottom: -60,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBgIcon: { position: 'absolute', right: 8, bottom: 4 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  heroHint: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 16 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 15, padding: 3 },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { fontSize: 13.5, fontWeight: '800' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
  },
  bannerText: { flex: 1, fontSize: 13.5, fontWeight: '700', lineHeight: 19 },
  compose: { borderWidth: 1, borderRadius: 20, padding: 12, gap: 8 },
  label: { fontSize: 14, fontWeight: '900' },
  inputWrap: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingTop: 8 },
  input: { minHeight: 64, maxHeight: 180, fontSize: 14.5, lineHeight: 20 },
  inputFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  count: { fontSize: 12, fontWeight: '700' },
  sendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { fontSize: 12.5, flex: 1 },
  section: { fontSize: 15.5, fontWeight: '900' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
