import { useState } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Btn, Field, Chips, Muted, Loading, num } from '../ui';

const DEFAULT_MAX_PHOTOS = 6;

// E'lon yaratish / tahrirlash. Rasmlar: mavjudlari (URL) saqlanadi, yangilari presigned havola orqali yuklanadi.
export default function ListingEditScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const editing = !!id;
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const list = useQuery({
    queryKey: ['w', 'listings'],
    queryFn: () => api.getMyListings({}),
    enabled: editing,
  });
  if (me.isPending || (editing && list.isPending)) {
    return (
      <Screen title={t('w.listings.edit')}>
        <Loading />
      </Screen>
    );
  }
  const initial = editing ? list.data?.find((x) => String(x.id) === String(id)) : null;
  return <ListingForm id={id} initial={initial} categories={me.data?.categories || []} />;
}

function ListingForm({ id, initial, categories }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const editing = !!id;
  const priceTypes = useQuery({ queryKey: ['w', 'priceTypes'], queryFn: api.getPriceTypes });
  const limits = useQuery({ queryKey: ['w', 'mediaLimits'], queryFn: api.getMediaLimits });
  const MAX_PHOTOS = limits.data?.max_photos ?? DEFAULT_MAX_PHOTOS;
  const [video, setVideo] = useState(null); // yangi tanlangan video

  const primary = categories.find((c) => c.is_primary) || categories[0];
  const [categoryId, setCategoryId] = useState(
    initial?.category_id ?? primary?.category.id ?? null
  );
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [price, setPrice] = useState(initial?.price ? String(Math.round(num(initial.price))) : '');
  const [priceTypeId, setPriceTypeId] = useState(initial?.price_type_id ?? null);
  const [kept, setKept] = useState(initial?.photos || []); // mavjud rasm URL'lari
  const [fresh, setFresh] = useState([]); // yangi tanlangan rasmlar (mahalliy uri)

  const pick = async () => {
    const left = MAX_PHOTOS - kept.length - fresh.length;
    if (left <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: left,
      quality: 0.8,
    });
    if (!res.canceled)
      setFresh((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    const seconds = a.duration ? Math.round(a.duration / 1000) : null;
    const sizeBytes = a.fileSize ?? 0;
    const maxS = limits.data?.video_max_seconds;
    const maxMb = limits.data?.video_max_mb;
    if ((maxS && seconds && seconds > maxS) || (maxMb && sizeBytes > maxMb * 1024 * 1024)) {
      appAlert(t('common.errorTitle'), t('w.site.videoTooBig'));
      return;
    }
    setVideo({
      uri: a.uri,
      contentType: a.mimeType || (/\.mov$/i.test(a.uri) ? 'video/quicktime' : 'video/mp4'),
      sizeBytes,
      durationSeconds: seconds,
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      const keys = [];
      for (const uri of fresh) keys.push(await api.uploadListingPhoto(uri));
      const videoKey = video ? await api.uploadListingVideo(video) : null;
      const body = {
        ...(videoKey ? { video_temp_key: videoKey } : {}),
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        price: price.trim() ? price.replace(/\s/g, '') : undefined,
        price_type_id: priceTypeId ?? undefined,
        currency: 'UZS',
      };
      if (editing) {
        return api.updateListing(id, {
          ...body,
          keep_photos: kept,
          ...(keys.length ? { photo_temp_keys: keys } : {}),
        });
      }
      return api.createListing({ ...body, photo_temp_keys: keys });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w', 'listings'] });
      router.back();
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  return (
    <Screen title={editing ? t('w.listings.edit') : t('w.listings.add')}>
      <Card>
        <Muted>{t('w.listings.category')}</Muted>
        <Chips
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.category.id, label: c.category.name }))}
        />
        <Field
          label={t('w.listings.titleField')}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <Field
          label={t('w.listings.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
        />
        <Field
          label={t('w.listings.price')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
        {priceTypes.data?.length ? (
          <>
            <Muted>{t('w.listings.priceType')}</Muted>
            <Chips
              value={priceTypeId}
              onChange={setPriceTypeId}
              options={priceTypes.data.map((p) => ({ value: p.id, label: p.name }))}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <Muted>{t('w.listings.photos', { n: kept.length + fresh.length, max: MAX_PHOTOS })}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {kept.map((u) => (
            <Thumb key={u} uri={u} onRemove={() => setKept((p) => p.filter((x) => x !== u))} />
          ))}
          {fresh.map((u) => (
            <Thumb key={u} uri={u} onRemove={() => setFresh((p) => p.filter((x) => x !== u))} />
          ))}
          {kept.length + fresh.length < MAX_PHOTOS ? (
            <TouchableOpacity
              onPress={pick}
              style={{
                width: 84,
                height: 84,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={28} color={theme.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </Card>

      <Card>
        <Muted>{t('w.site.video')}</Muted>
        {limits.data?.video_max_seconds ? (
          <Muted>
            {t('w.site.videoLimits', {
              s: limits.data.video_max_seconds,
              mb: limits.data.video_max_mb,
            })}
          </Muted>
        ) : null}
        {video ? (
          <Btn
            kind="ghost"
            icon="close-circle-outline"
            label={t('w.site.removeVideo')}
            onPress={() => setVideo(null)}
          />
        ) : (
          <Btn
            kind="ghost"
            icon="videocam-outline"
            label={initial?.video_url ? `${t('w.site.pickVideo')} ✓` : t('w.site.pickVideo')}
            onPress={pickVideo}
          />
        )}
      </Card>

      <Btn
        label={t('w.save')}
        loading={save.isPending}
        disabled={!categoryId || title.trim().length < 3}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}

function Thumb({ uri, onRemove }) {
  return (
    <View>
      <Image source={{ uri }} style={{ width: 84, height: 84, borderRadius: 14 }} />
      <TouchableOpacity
        onPress={onRemove}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: '#e0473a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
      >
        <Ionicons name="close" size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
