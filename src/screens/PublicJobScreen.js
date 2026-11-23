import { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import SectionError from './zakazchi-main/components/SectionError';
import AppLoader from '../components/AppLoader';
import Avatar from '../components/Avatar';
import { getPublicOrder } from '../api/reviews';
import { SITE_URL } from '../constants/config';
import { formatDate } from '../utils/format';
import { encodeImageUri } from './listings/utils';
import useBottomInset from '../hooks/useBottomInset';

const TEXTS = {
  uz: {
    badge: 'Bajarilgan ish',
    before: 'Ishdan oldin',
    after: 'Ishdan keyin',
    doneBy: 'Ishni bajargan mutaxassis',
    noPhotos: 'Bu ish uchun rasm yuklanmagan.',
    share: 'Ulashish',
    shareText: '{category} — bajarilgan ish',
    notFound: 'Ish topilmadi yoki hali yakunlanmagan.',
  },
  ru: {
    badge: 'Выполненная работа',
    before: 'До работы',
    after: 'После работы',
    doneBy: 'Мастер, выполнивший работу',
    noPhotos: 'Для этой работы фото не загружены.',
    share: 'Поделиться',
    shareText: '{category} — выполненная работа',
    notFound: 'Работа не найдена или ещё не завершена.',
  },
  en: {
    badge: 'Completed job',
    before: 'Before',
    after: 'After',
    doneBy: 'Done by',
    noPhotos: 'No photos were uploaded for this job.',
    share: 'Share',
    shareText: '{category} — completed job',
    notFound: 'Job not found or not completed yet.',
  },
};

const W = Dimensions.get('window').width;
const PHOTO = (W - 40 - 16) / 3;

// Havola orqali ochiladigan bajarilgan ish (GET /orders/public/{token}; saytda /ish/{token}): oldin va
// keyin suratlari hamda ishni bajargan usta. Mijoz, manzil va narx ko'rsatilmaydi — server yubormaydi.
export default function PublicJobScreen({ token, onBack, onSelectUsta }) {
  const { theme: t } = useTheme();
  const { language } = useLanguage();
  const tx = TEXTS[language] ?? TEXTS.uz;
  const bottomInset = useBottomInset();
  const [viewer, setViewer] = useState(null);
  const job = useQuery({
    queryKey: ['publicJob', token],
    queryFn: () => getPublicOrder(token),
    enabled: !!token,
    retry: 1,
  });
  const data = job.data;

  const photos = useMemo(
    () => ({ before: data?.before_photos ?? [], after: data?.after_photos ?? [] }),
    [data]
  );
  const name = data?.category?.name ?? tx.badge;

  const share = async () => {
    try {
      await Share.share({
        title: name,
        message: `${tx.shareText.replace('{category}', name)} ${SITE_URL}/ish/${token}`,
      });
    } catch {
      // Ulashish bekor qilindi yoki mavjud emas.
    }
  };

  const strip = (label, list) =>
    list.length ? (
      <View style={{ gap: 8 }}>
        <Text style={[s.stripLabel, { color: t.muted }]}>{label}</Text>
        <View style={s.photos}>
          {list.map((uri, i) => (
            <Pressable key={`${uri}-${i}`} onPress={() => setViewer({ list, at: i })}>
              <Image
                source={{ uri: encodeImageUri(uri) }}
                style={[s.photo, { backgroundColor: t.card }]}
              />
            </Pressable>
          ))}
        </View>
      </View>
    ) : null;

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
        <Text style={[s.title, { color: t.text }]} numberOfLines={1}>
          {tx.badge}
        </Text>
      </View>

      {job.isPending ? (
        <View style={s.center}>
          <AppLoader size={160} />
        </View>
      ) : job.isError || !data ? (
        <SectionError style={{ marginHorizontal: 20, marginTop: 24 }} onRetry={job.refetch} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32 + bottomInset,
            gap: 16,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={[s.badge, { color: t.green, backgroundColor: t.green + '1f' }]}>
              {tx.badge}
            </Text>
            <Text style={[s.name, { color: t.text }]}>{name}</Text>
            {data.completed_at ? (
              <Text style={{ color: t.muted, fontSize: 13 }}>{formatDate(data.completed_at)}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[s.shareBtn, { borderColor: t.border }]}
            activeOpacity={0.85}
            onPress={share}
          >
            <MaterialCommunityIcons name="share-variant-outline" size={18} color={t.text} />
            <Text style={[s.shareText, { color: t.text }]}>{tx.share}</Text>
          </TouchableOpacity>

          {data.worker ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onSelectUsta?.(data.worker)}
              style={[s.worker, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Avatar
                size={52}
                letter={(data.worker.full_name || 'U')[0]}
                uri={data.worker.profile_photo ?? null}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.muted, fontSize: 12 }}>{tx.doneBy}</Text>
                <Text style={[s.workerName, { color: t.text }]} numberOfLines={1}>
                  {data.worker.full_name}
                </Text>
                {data.worker.overall_rating != null ? (
                  <Text style={{ color: t.gold, fontWeight: '800', fontSize: 13 }}>
                    {`★ ${Number(data.worker.overall_rating).toFixed(1)} (${data.worker.review_count})`}
                  </Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={t.muted} />
            </TouchableOpacity>
          ) : null}

          {strip(tx.before, photos.before)}
          {strip(tx.after, photos.after)}
          {!photos.before.length && !photos.after.length ? (
            <Text style={{ color: t.muted, textAlign: 'center' }}>{tx.noPhotos}</Text>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <Pressable style={s.viewer} onPress={() => setViewer(null)}>
          {viewer ? (
            <Image
              source={{ uri: encodeImageUri(viewer.list[viewer.at]) }}
              style={s.viewerImg}
              resizeMode="contain"
            />
          ) : null}
          {viewer && viewer.list.length > 1 ? (
            <View style={s.viewerNav}>
              <TouchableOpacity
                hitSlop={14}
                onPress={() =>
                  setViewer((v) => ({ ...v, at: (v.at - 1 + v.list.length) % v.list.length }))
                }
              >
                <MaterialCommunityIcons name="chevron-left" size={36} color="#fff" />
              </TouchableOpacity>
              <Text style={s.viewerCount}>{`${viewer.at + 1} / ${viewer.list.length}`}</Text>
              <TouchableOpacity
                hitSlop={14}
                onPress={() => setViewer((v) => ({ ...v, at: (v.at + 1) % v.list.length }))}
              >
                <MaterialCommunityIcons name="chevron-right" size={36} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
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
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  name: { fontSize: 24, fontWeight: '900' },
  shareBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareText: { fontWeight: '800', fontSize: 14.5 },
  worker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  workerName: { fontSize: 16, fontWeight: '800' },
  stripLabel: { fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: PHOTO, height: PHOTO, borderRadius: 12 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '80%' },
  viewerNav: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  viewerCount: { color: '#fff', fontWeight: '700' },
});
