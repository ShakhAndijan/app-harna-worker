import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFaq } from '../queries/support';
import { FAQ_ITEMS } from '../i18n/siteTexts';
import { SUPPORT_CONTACT } from '../constants/config';
import { documentRoute, supportRoute } from '../navigation/params';
import useBottomInset from '../hooks/useBottomInset';
import usePullRefresh from '../hooks/usePullRefresh';

const DOCS = ['about', 'terms', 'privacy', 'consent'];
const DOC_ICONS = {
  about: 'information-outline',
  terms: 'file-document-outline',
  privacy: 'shield-lock-outline',
  consent: 'check-decagram-outline',
};
// Eski hujjatlar nomi `support.*` da, backenddan keladigan yangilari `legal.docs.*` da.
const docLabelKey = (key) => (key === 'consent' ? 'legal.docs.consent' : `support.${key}`);

function FaqItem({ item, index, isOpen, onToggle }) {
  const { theme: t } = useTheme();

  return (
    <View style={isOpen ? { backgroundColor: t.orange + '0F' } : null}>
      <TouchableOpacity style={s.faqRow} activeOpacity={0.7} onPress={onToggle}>
        <View style={[s.faqNum, { backgroundColor: isOpen ? t.orange : t.orange + '1F' }]}>
          <Text style={{ color: isOpen ? '#fff' : t.orange, fontSize: 12, fontWeight: '900' }}>
            {index + 1}
          </Text>
        </View>
        <Text style={[s.faqQ, { color: t.text, flex: 1 }]}>{item.q}</Text>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={isOpen ? t.orange : t.faint}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={s.faqBody}>
          <Text style={[s.faqA, { color: t.muted }]}>{item.a}</Text>
        </View>
      )}
    </View>
  );
}

// Savollar saytdagi bilan bir xil: backenddagi (/faq) ro'yxat, u bo'sh yoki yuklanmasa — ilovadagi
// zaxira matnlar (uz/ru/en).
function FaqAccordion({ items }) {
  const { theme: t } = useTheme();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <View style={[s.faqCard, { backgroundColor: t.card, borderColor: t.border }]}>
      {items.map((item, i) => (
        <View key={item.id ?? i}>
          {i > 0 && <View style={{ height: 1, backgroundColor: t.border }} />}
          <FaqItem
            item={item}
            index={i}
            isOpen={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        </View>
      ))}
    </View>
  );
}

// Bo'lim sarlavhasi: chap tomonda rangli chiziqcha.
function SectionTitle({ children }) {
  const { theme: t } = useTheme();
  return (
    <View style={s.secRow}>
      <View style={[s.secBar, { backgroundColor: t.orange }]} />
      <Text style={{ fontWeight: '900', fontSize: 15.5, color: t.text }}>{children}</Text>
    </View>
  );
}

export default function ZakazchiHelpScreen({ onBack }) {
  const { refreshControl } = usePullRefresh();
  const bottomInset = useBottomInset();
  const router = useRouter();
  const { theme: t } = useTheme();
  const { language, t: tr } = useLanguage();
  const faq = useFaq();
  const faqItems = faq.data ?? FAQ_ITEMS[language] ?? FAQ_ITEMS.uz;

  // Tezkor aloqa: yumaloq ikonli tugmalar.
  const quick = [
    {
      key: 'chat',
      icon: 'message-text',
      bg: '#e87a45',
      onPress: () => router.push('/support-chat'),
    },
    ...(SUPPORT_CONTACT.phone
      ? [
          {
            key: 'call',
            icon: 'phone',
            bg: '#2fa37a',
            onPress: () => Linking.openURL(`tel:${SUPPORT_CONTACT.phone}`),
          },
        ]
      : []),
    ...(SUPPORT_CONTACT.telegram
      ? [
          {
            key: 'telegram',
            icon: 'send',
            bg: '#2aabee',
            onPress: () =>
              Linking.openURL(`https://t.me/${SUPPORT_CONTACT.telegram.replace(/^@/, '')}`),
          },
        ]
      : []),
    ...(SUPPORT_CONTACT.email
      ? [
          {
            key: 'email',
            icon: 'email-outline',
            bg: '#3f7fd4',
            onPress: () => Linking.openURL(`mailto:${SUPPORT_CONTACT.email}`),
          },
        ]
      : []),
  ];

  // Katta karta: mutaxassis bilan bog'lanish (takliflar ham shu sahifada, tab orqali).
  const wide = [
    {
      key: 'question',
      icon: 'headset',
      grad: ['#9b82e6', '#7556cf'],
      sub: tr('support.contactHint'),
      onPress: () => router.push(supportRoute('question')),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      <ScrollView
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 40 + bottomInset,
          gap: 14,
        }}
      >
        {/* ── Hero: orqaga tugmasi, sarlavha va tezkor aloqa bir kartada ── */}
        <LinearGradient
          colors={['#f08a55', '#d9582a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroDeco} />
          <MaterialCommunityIcons
            name="lifebuoy"
            size={96}
            color="rgba(255,255,255,0.14)"
            style={s.heroBg}
          />
          <View style={s.heroRow}>
            <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.heroTitle} numberOfLines={1}>
                {tr('profile.settings.helpCenter')}
              </Text>
              <Text style={s.heroSub} numberOfLines={2}>
                {tr('help.heroSubtitle')}
              </Text>
            </View>
          </View>
          <View style={s.quickRow}>
            {quick.map((q) => (
              <TouchableOpacity
                key={q.key}
                style={s.quick}
                activeOpacity={0.85}
                onPress={q.onPress}
                accessibilityRole="button"
              >
                <View style={[s.quickIcon, { backgroundColor: q.bg }]}>
                  <MaterialCommunityIcons name={q.icon} size={20} color="#fff" />
                </View>
                <Text style={s.quickText} numberOfLines={1}>
                  {q.key === 'telegram'
                    ? 'Telegram'
                    : q.key === 'chat'
                      ? 'Chat'
                      : tr(`help.contacts.${q.key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* ── Mutaxassis va takliflar: rangli kartalar ── */}
        {wide.map((w) => (
          <TouchableOpacity key={w.key} activeOpacity={0.88} onPress={w.onPress}>
            <LinearGradient
              colors={w.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.wide}
            >
              <MaterialCommunityIcons
                name={w.icon}
                size={84}
                color="rgba(255,255,255,0.18)"
                style={s.wideBg}
              />
              <View style={s.wideIcon}>
                <MaterialCommunityIcons name={w.icon} size={24} color="#fff" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.wideTitle} numberOfLines={1}>
                  {tr(`help.contacts.${w.key}`)}
                </Text>
                <Text style={s.wideSub} numberOfLines={2}>
                  {w.sub}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right-circle" size={26} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* ── Tez-tez so'raladi ── */}
        <SectionTitle>{tr('help.faqTitle')}</SectionTitle>
        <FaqAccordion items={faqItems} />

        <View style={[s.notFound, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={[s.nfIcon, { backgroundColor: t.orange + '1F' }]}>
            <MaterialCommunityIcons name="chat-question-outline" size={22} color={t.orange} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: t.text }}>
              {tr('support.faqNotFoundTitle')}
            </Text>
            <Text style={{ fontSize: 12.5, color: t.muted }}>{tr('support.faqNotFoundHint')}</Text>
          </View>
          <TouchableOpacity
            style={[s.nfBtn, { backgroundColor: t.orange }]}
            activeOpacity={0.85}
            onPress={() => router.push(supportRoute('question'))}
            accessibilityRole="button"
            accessibilityLabel={tr('help.contacts.question')}
          >
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Foydali maqolalar (saytda ham yordam bo'limida) ── */}
        <TouchableOpacity
          style={[s.linkRow, { backgroundColor: t.card, borderColor: t.border }]}
          activeOpacity={0.7}
          onPress={() => router.push('/articles')}
        >
          <View style={[s.linkIcon, { backgroundColor: t.orange + '1F' }]}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={22} color={t.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.faqQ, { color: t.text }]}>{tr('articles.menu')}</Text>
            <Text style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>
              {tr('articles.menuHint')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={t.faint} />
        </TouchableOpacity>

        {/* ── Hujjatlar ── */}
        <SectionTitle>{tr('support.legal')}</SectionTitle>
        <View style={s.docGrid}>
          {DOCS.map((key) => (
            <TouchableOpacity
              key={key}
              style={[s.doc, { backgroundColor: t.card, borderColor: t.border }]}
              activeOpacity={0.8}
              onPress={() => router.push(documentRoute(key))}
            >
              <View style={[s.docIcon, { backgroundColor: t.orange + '1F' }]}>
                <MaterialCommunityIcons name={DOC_ICONS[key]} size={20} color={t.orange} />
              </View>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: 14, color: t.text }}>
                {tr(docLabelKey(key))}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={t.faint} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: 24, padding: 14, gap: 14, overflow: 'hidden' },
  heroDeco: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  heroBg: { position: 'absolute', right: 10, top: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 16, maxWidth: '75%' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { color: '#fff', fontSize: 11.5, fontWeight: '800', paddingHorizontal: 2 },

  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    overflow: 'hidden',
  },
  wideBg: { position: 'absolute', right: 30, bottom: -14 },
  wideIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  wideTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  wideSub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 16 },

  secRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  secBar: { width: 4, height: 18, borderRadius: 2 },

  faqCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  faqNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQ: { fontWeight: '700', fontSize: 13.8 },
  faqBody: { paddingLeft: 52, paddingRight: 16, paddingBottom: 14 },
  faqA: { fontSize: 13, lineHeight: 20 },

  notFound: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  nfIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  docGrid: { gap: 8 },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 11,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
