import { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Avatar from '../../components/Avatar';
import * as api from '../api';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Screen, Card } from '../ui';
import { supportRoute } from '../../navigation/params';
import { SessionCards } from './ProfileScreen';
import { completenessItems } from './StatsBlock';

// ☰ bosilganda ochiladigan alohida sahifa: bo'limlarga ajratilgan sozlamalar, til, mavzu va chiqish.
export default function ProfileMenuScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const go = (path) => router.push(path);
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe }).data;
  const [sel, setSel] = useState(null); // ichiga kirilgan bo'lim kaliti
  const soft = theme.isDark ? '#ffffff0D' : '#0000000A';
  const nameOf = (v) => (v && typeof v === 'object' ? v.name : v) || '';
  const place = [nameOf(me?.region), nameOf(me?.district)].filter(Boolean).join(', ');
  const fullName = [me?.first_name, me?.last_name].filter(Boolean).join(' ');
  const items = completenessItems(me);
  const done = items.filter((x) => x[1]).length;
  const pct = Math.round((done / items.length) * 100);
  const enter = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSel(key);
  };

  const sections = [
    {
      key: 'profile',
      icon: 'person-circle-outline',
      title: t('w.profile.secProfile'),
      items: [
        ['create-outline', t('w.profile.edit'), '/profile-edit'],
        ['construct-outline', t('w.profile.categories'), '/my-categories'],
        ['images-outline', t('w.extra.portfolio'), '/portfolio'],
        ['ribbon-outline', t('w.extra.certificates'), '/certificates'],
        ['star-outline', t('w.profile.reviews'), '/my-reviews'],
      ],
    },
    {
      key: 'work',
      icon: 'briefcase-outline',
      title: t('w.profile.secWork'),
      items: [
        ['calendar-outline', t('w.profile.schedule'), '/schedule'],
        ['calendar-number-outline', t('w.more.calendar'), '/calendar'],
        ['location-outline', t('w.more.location'), '/location'],
        ['stats-chart-outline', t('w.more.stats'), '/stats'],
        ['trending-up-outline', t('w.extra.top'), '/top'],
        ['people-outline', t('w.extra.brigade'), '/brigade'],
      ],
    },
    {
      key: 'grow',
      icon: 'rocket-outline',
      title: t('w.profile.secGrow'),
      items: [
        ['diamond-outline', t('w.extra.pro'), '/pro'],
        ['ribbon-outline', t('w.site.status'), '/status'],
        ['gift-outline', t('w.extra.referral'), '/referral'],
      ],
    },
    {
      key: 'help',
      icon: 'help-buoy-outline',
      title: t('w.profile.secHelp'),
      items: [
        ['headset-outline', t('w.profile.support'), '/support'],
        ['help-circle-outline', t('w.profile.help'), '/help'],
        ['bulb-outline', t('w.more.suggestions'), supportRoute('suggestion')],
        ['alert-circle-outline', t('w.extra.complaints'), '/complaints'],
      ],
    },
    {
      key: 'account',
      icon: 'settings-outline',
      title: t('w.profile.secAccount'),
      items: [
        ['notifications-outline', t('w.profile.notifications'), '/notifications'],
        ['shield-checkmark-outline', t('w.extra.account'), '/account'],
        ['settings-outline', t('w.more.settings'), '/settings'],
      ],
    },
  ];

  const others = sections.filter((x) => x.key !== 'profile');
  const cur = others.find((x) => x.key === sel);

  return (
    <Screen
      title={cur ? cur.title : t('w.profile.menu')}
      onBack={cur ? () => enter(null) : undefined}
    >
      {cur ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {cur.items.map(([icon, label, path]) => (
              <TouchableOpacity
                key={path + label}
                onPress={() => go(path)}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={{
                  width: '48%',
                  flexGrow: 1,
                  minHeight: 128,
                  justifyContent: 'space-between',
                  padding: 14,
                  borderRadius: 24,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    right: -22,
                    top: -22,
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: theme.orange + '14',
                  }}
                />
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.orange,
                  }}
                >
                  <Ionicons name={icon} size={25} color="#fff" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                  <Text
                    numberOfLines={2}
                    style={{ flex: 1, color: theme.text, fontSize: 15.5, fontWeight: '800' }}
                  >
                    {label}
                  </Text>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: soft,
                    }}
                  >
                    <Ionicons name="arrow-forward" size={15} color={theme.muted} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          <Card>
            <TouchableOpacity
              onPress={() => go('/profile-hub')}
              activeOpacity={0.8}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <Avatar size={58} letter={(me?.first_name || 'U')[0]} uri={me?.profile_photo} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}
                  numberOfLines={1}
                >
                  {fullName || t('w.profile.menu')}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>
                  {me?.phone || ''}
                </Text>
                {place ? (
                  <Text style={{ color: theme.muted, fontSize: 12.5 }} numberOfLines={1}>
                    {place}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange + '1F',
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={theme.orange} />
              </View>
            </TouchableOpacity>
          </Card>

          {me ? (
            <TouchableOpacity
              onPress={() => go('/profile-edit')}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: 18,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: (pct === 100 ? theme.green : theme.orange) + '1F',
                }}
              >
                <Text
                  style={{
                    color: pct === 100 ? theme.green : theme.orange,
                    fontSize: 14,
                    fontWeight: '900',
                  }}
                >
                  {pct}%
                </Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>
                    {t('w.site.completeness')}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>
                    {done}/{items.length}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.border,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: pct === 100 ? theme.green : theme.orange,
                    }}
                  />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </TouchableOpacity>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {others.map((sec) => (
              <TouchableOpacity
                key={sec.key}
                onPress={() => enter(sec.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={{
                  width: '48%',
                  flexGrow: 1,
                  gap: 10,
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.orange + '1F',
                    }}
                  >
                    <Ionicons name={sec.icon} size={24} color={theme.orange} />
                  </View>
                  <View
                    style={{
                      minWidth: 24,
                      height: 24,
                      borderRadius: 12,
                      paddingHorizontal: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.orange + '22',
                    }}
                  >
                    <Text style={{ color: theme.orange, fontSize: 12, fontWeight: '900' }}>
                      {sec.items.length}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
                  {sec.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <SessionCards />
        </>
      )}
    </Screen>
  );
}
