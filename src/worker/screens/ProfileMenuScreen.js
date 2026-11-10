import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import * as api from '../api';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Screen } from '../ui';
import { SessionCards } from './ProfileScreen';
import { completenessItems } from '../completeness';

// Zamonaviy kun/tun almashtirgich: tabletka shaklidagi yo'lak, ustida siljiydigan doira.
function ThemeSwitch({ dark, onPress, label }) {
  const { theme } = useTheme();
  const [x] = useState(() => new Animated.Value(dark ? 1 : 0));
  useEffect(() => {
    Animated.spring(x, { toValue: dark ? 1 : 0, useNativeDriver: true, bounciness: 8 }).start();
  }, [dark, x]);
  const W = 68;
  const H = 36;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel={label}
      style={{
        width: W,
        height: H,
        borderRadius: H / 2,
        padding: 3,
        justifyContent: 'center',
        backgroundColor: dark ? '#1d2a44' : '#dbe7fb',
        borderWidth: 1,
        borderColor: dark ? '#2f4268' : '#b9cdf0',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 9,
          right: 9,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Ionicons name="sunny" size={15} color={dark ? '#5d6f93' : '#f5a623'} />
        <Ionicons name="moon" size={14} color={dark ? '#cfd9f2' : '#8fa4cc'} />
      </View>
      <Animated.View
        style={{
          width: H - 8,
          height: H - 8,
          borderRadius: (H - 8) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? theme.orange : '#fff',
          transform: [
            { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, W - H] }) },
          ],
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
          elevation: 3,
        }}
      >
        <Ionicons name={dark ? 'moon' : 'sunny'} size={15} color={dark ? '#fff' : '#f5a623'} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// Plitka: rangli yumaloq ikon va ostida nom.
function Tile({ icon, label, color, onPress }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={{
        flexBasis: '31%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 9,
        paddingVertical: 14,
        paddingHorizontal: 6,
        borderRadius: 22,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: theme.text,
          fontSize: 12.5,
          fontWeight: '800',
          textAlign: 'center',
          minHeight: 32,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Label({ children }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        color: theme.muted,
        fontSize: 12.5,
        fontWeight: '900',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingHorizontal: 4,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}

// ☰ bosilganda ochiladigan sahifa: hammasi bitta ekranda, ichma-ich o'tishlarsiz.
export default function ProfileMenuScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const go = (path) => router.push(path);
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe }).data;
  const nameOf = (v) => (v && typeof v === 'object' ? v.name : v) || '';
  const place = [nameOf(me?.region), nameOf(me?.district)].filter(Boolean).join(', ');
  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(' ');
  const items = completenessItems(me);
  const done = items.filter((x) => x[1]).length;
  const pct = Math.round((done / items.length) * 100);

  const sections = [
    {
      key: 'work',
      title: t('w.profile.secWork'),
      items: [
        ['calendar', t('w.profile.schedule'), '/schedule', '#e87a45'],
        ['calendar-number', t('w.more.calendar'), '/calendar', '#3f7fd4'],
        ['location', t('w.more.location'), '/location', '#2fa37a'],
        ['trending-up', t('w.extra.top'), '/top', '#e5a512'],
        ['people', t('w.extra.brigade'), '/brigade', '#7c5cff'],
      ],
    },
    {
      key: 'grow',
      title: t('w.profile.secGrow'),
      items: [
        ['ribbon', t('w.site.status'), '/status', '#d4883a'],
        ['gift', t('w.extra.referral'), '/referral', '#e5546b'],
      ],
    },
    {
      key: 'help',
      title: t('w.profile.secHelp'),
      items: [
        ['headset', t('w.profile.support'), '/support', '#2fa37a'],
        ['help-buoy', t('w.profile.help'), '/help', '#3f7fd4'],
        ['alert-circle', t('w.extra.complaints'), '/complaints', '#e5546b'],
        ['notifications', t('w.profile.notifications'), '/notifications', '#e87a45'],
        ['settings', t('w.more.settings'), '/settings', '#6b7a99'],
      ],
    },
  ];

  return (
    <Screen
      title={t('w.profile.menu')}
      right={
        <ThemeSwitch
          dark={!!theme.isDark}
          label={t('w.profile.theme')}
          onPress={() => {
            toggleTheme();
            api.setPreferences({ theme: theme.isDark ? 'light' : 'dark' }).catch(() => {});
          }}
        />
      }
    >
      {/* Profil kartasi: gradient, avatar, to'ldirilganlik */}
      <LinearGradient
        colors={['#f08a55', '#d9582a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 26, padding: 16, gap: 14, overflow: 'hidden' }}
      >
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -50,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: 'rgba(255,255,255,0.14)',
          }}
        />
        <TouchableOpacity
          onPress={() => go('/profile-hub')}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)' }}>
            <Avatar size={58} letter={(me?.first_name || 'U')[0]} uri={me?.profile_photo} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: '#fff', fontSize: 19, fontWeight: '900' }} numberOfLines={1}>
              {fullName || t('w.profile.menu')}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 12.5 }} numberOfLines={1}>
              {me?.phone || ''}
            </Text>
            {place ? (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
        {me ? (
          <TouchableOpacity
            onPress={() => go('/profile-edit')}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={{
              gap: 7,
              padding: 11,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={pct === 100 ? 'checkmark-circle' : 'create'} size={16} color="#fff" />
              <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '800' }}>
                {t('w.site.completeness')}
              </Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>{pct}%</Text>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.28)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: '#fff' }}
              />
            </View>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>

      {/* Pro: ajratilgan banner */}
      <TouchableOpacity activeOpacity={0.88} onPress={() => go('/pro')} accessibilityRole="button">
        <LinearGradient
          colors={['#8b6cf5', '#5b3fd0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 13,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          <Ionicons
            name="diamond"
            size={78}
            color="rgba(255,255,255,0.16)"
            style={{ position: 'absolute', right: 40, bottom: -12 }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.22)',
            }}
          >
            <Ionicons name="diamond" size={22} color="#fff" />
          </View>
          <Text style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '900' }}>
            {t('w.extra.pro')}
          </Text>
          <Ionicons name="arrow-forward-circle" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {sections.map((sec) => (
        <View key={sec.key} style={{ gap: 9 }}>
          <Label>{sec.title}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {sec.items.map(([icon, label, path, color]) => (
              <Tile key={path} icon={icon} label={label} color={color} onPress={() => go(path)} />
            ))}
          </View>
        </View>
      ))}
      <SessionCards />
    </Screen>
  );
}
