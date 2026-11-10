import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationsList from './notifications/NotificationsList';
import { useUnreadNotifications } from '../queries/notifications';

// Bildirishnomalar: faqat xabarlar ro'yxati; sozlamalar tepadagi nastroyka belgisi orqali ochiladi.
export default function ZakazchiNotifScreen({ onBack }) {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const unread = useUnreadNotifications();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      <View style={s.header}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: t.text }]}>{tr('notif.headerTitle')}</Text>
        {unread > 0 ? (
          <View style={[s.pill, { backgroundColor: t.orange + '22' }]}>
            <Text style={{ color: t.orange, fontSize: 12, fontWeight: '900' }}>{unread}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={() => router.push('/notification-settings')}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="cog-outline" size={21} color={t.text} />
        </TouchableOpacity>
      </View>

      <NotificationsList />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontWeight: '800', fontSize: 20 },
  pill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
