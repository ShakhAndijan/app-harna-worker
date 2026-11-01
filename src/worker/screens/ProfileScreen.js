import { View, Text, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import Avatar from '../../components/Avatar';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, H, Muted, Txt, Pill, Chips, Loading, ErrorBox } from '../ui';

function MenuItem({ icon, label, onPress, danger }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={22} color={danger ? theme.red : theme.orange} />
      <Text
        style={{ flex: 1, color: danger ? theme.red : theme.text, fontSize: 15, fontWeight: '600' }}
      >
        {label}
      </Text>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={theme.faint} /> : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });

  const avatar = useMutation({
    mutationFn: async () => {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled) return null;
      return api.uploadAvatar(res.assets[0].uri);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'me'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  if (q.isPending)
    return (
      <Screen back={false} title={t('w.profile.title')}>
        <Loading />
      </Screen>
    );
  if (q.isError) {
    return (
      <Screen back={false} title={t('w.profile.title')}>
        <ErrorBox error={q.error} onRetry={q.refetch} />
      </Screen>
    );
  }
  const w = q.data;
  const name = [w.first_name, w.last_name].filter(Boolean).join(' ');
  const rating = w.overall_rating ? Number(w.overall_rating).toFixed(1) : null;

  return (
    <Screen
      back={false}
      title={t('w.profile.title')}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      bottomSpace
    >
      <Card>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => !avatar.isPending && avatar.mutate()}
            accessibilityRole="button"
          >
            <Avatar size={72} letter={(w.first_name || 'U')[0]} uri={w.profile_photo} />
            <View
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.orange,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={avatar.isPending ? 'hourglass-outline' : 'camera'}
                size={13}
                color="#fff"
              />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 4 }}>
            <H>{name}</H>
            {w.phone ? <Muted>{w.phone}</Muted> : null}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {rating ? (
                <Pill label={`★ ${rating} (${w.review_count ?? 0})`} color={theme.gold} />
              ) : null}
              {w.is_identity_verified ? (
                <Pill label={t('w.profile.verified')} color={theme.green} />
              ) : null}
              {w.is_pro ? <Pill label="PRO" color={theme.violet} /> : null}
              {w.is_top ? <Pill label="TOP" color={theme.gold} /> : null}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View>
            <Txt style={{ fontWeight: '800', fontSize: 18 }}>{w.completed_jobs_count ?? 0}</Txt>
            <Muted>{t('w.profile.jobs')}</Muted>
          </View>
          <View>
            <Txt style={{ fontWeight: '800', fontSize: 18 }}>{w.experience_years ?? 0}</Txt>
            <Muted>{t('w.profile.years')}</Muted>
          </View>
          <View>
            <Txt style={{ fontWeight: '800', fontSize: 18 }}>{w.likes_count ?? 0}</Txt>
            <Muted>{t('w.profile.likes')}</Muted>
          </View>
        </View>
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <MenuItem
          icon="create-outline"
          label={t('w.profile.edit')}
          onPress={() => router.push('/profile-edit')}
        />
        <MenuItem
          icon="construct-outline"
          label={t('w.profile.categories')}
          onPress={() => router.push('/my-categories')}
        />
        <MenuItem
          icon="calendar-outline"
          label={t('w.profile.schedule')}
          onPress={() => router.push('/schedule')}
        />
        <MenuItem
          icon="star-outline"
          label={t('w.profile.reviews')}
          onPress={() => router.push('/my-reviews')}
        />
        <MenuItem
          icon="gift-outline"
          label={t('w.extra.referral')}
          onPress={() => router.push('/referral')}
        />
        <MenuItem
          icon="diamond-outline"
          label={t('w.extra.pro')}
          onPress={() => router.push('/pro')}
        />
        <MenuItem
          icon="images-outline"
          label={t('w.extra.portfolio')}
          onPress={() => router.push('/portfolio')}
        />
        <MenuItem
          icon="ribbon-outline"
          label={t('w.extra.certificates')}
          onPress={() => router.push('/certificates')}
        />
        <MenuItem
          icon="trending-up-outline"
          label={t('w.extra.top')}
          onPress={() => router.push('/top')}
        />
        <MenuItem
          icon="people-outline"
          label={t('w.extra.brigade')}
          onPress={() => router.push('/brigade')}
        />
        <MenuItem
          icon="alert-circle-outline"
          label={t('w.extra.complaints')}
          onPress={() => router.push('/complaints')}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label={t('w.extra.account')}
          onPress={() => router.push('/account')}
        />
        <MenuItem
          icon="notifications-outline"
          label={t('w.profile.notifications')}
          onPress={() => router.push('/notifications')}
        />
        <MenuItem
          icon="headset-outline"
          label={t('w.profile.support')}
          onPress={() => router.push('/support')}
        />
        <MenuItem
          icon="help-circle-outline"
          label={t('w.profile.help')}
          onPress={() => router.push('/help')}
        />
      </Card>

      <Card>
        <Muted>{t('w.profile.language')}</Muted>
        <Chips
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'uz', label: "O'zbekcha" },
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]}
        />
        <MenuItem
          icon={theme.isDark ? 'sunny-outline' : 'moon-outline'}
          label={t('w.profile.theme')}
          onPress={toggleTheme}
        />
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <MenuItem
          icon="log-out-outline"
          danger
          label={t('w.profile.logout')}
          onPress={() =>
            appConfirm({
              title: t('w.profile.logout'),
              message: t('w.profile.logoutAsk'),
              confirmLabel: t('w.profile.logout'),
              destructive: true,
              onConfirm: signOut,
            })
          }
        />
      </Card>
    </Screen>
  );
}
