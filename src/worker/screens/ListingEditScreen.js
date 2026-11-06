import { useMemo, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Btn, Field, Muted, Loading, Txt, num } from '../ui';

// Yo'nalishlar daraxti (ichma-ich) bo'yicha: id -> { icon, group, path } (group — eng yuqori toifa).
function indexTree(nodes) {
  const map = new Map();
  const walk = (list, top, path) => {
    for (const n of list || []) {
      const group = top || n;
      if (n.children?.length) walk(n.children, group, top ? [...path, n.name] : []);
      map.set(n.id, {
        icon: n.icon,
        group: group.name,
        groupIcon: group.icon,
        path: path.join(' › '),
      });
    }
  };
  walk(nodes, null, []);
  return map;
}

// Yo'nalishlar: bitta maydon, bosilganda qidiruvli oyna ochiladi; toifalar bo'yicha guruhlangan, bir nechtasini belgilash mumkin.
function CategoryPicker({ options, value, onChange, label, doneLabel, searchLabel }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState({}); // ochilgan toifalar (accordion)
  const chosen = options.filter((o) => value.includes(o.value));
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    for (const o of options) {
      if (q && !`${o.label} ${o.group || ''}`.toLowerCase().includes(q)) continue;
      const key = o.group || '';
      let g = out.find((x) => x.key === key);
      if (!g) {
        g = { key, icon: o.groupIcon, items: [] };
        out.push(g);
      }
      g.items.push(o);
    }
    return out;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={{ gap: 6 }}>
      <Muted>{label}</Muted>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 54,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: chosen.length ? theme.orange : theme.border,
          backgroundColor: theme.card,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {chosen.length ? (
            chosen.map((o) => (
              <View
                key={String(o.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingLeft: 9,
                  paddingRight: 6,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: `${theme.orange}22`,
                }}
              >
                {!!o.icon && <Text style={{ fontSize: 13 }}>{o.icon}</Text>}
                <Text style={{ color: theme.orange, fontWeight: '700', fontSize: 13 }}>
                  {o.label}
                </Text>
                <TouchableOpacity onPress={() => toggle(o.value)} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={theme.orange} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: theme.faint, fontSize: 15 }}>{label}</Text>
          )}
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={close} />
        <View
          style={{
            height: '82%',
            backgroundColor: theme.bg,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
            <Txt style={{ flex: 1, fontWeight: '800', fontSize: 19 }}>{label}</Txt>
            {value.length > 0 && (
              <View
                style={{
                  minWidth: 26,
                  height: 26,
                  borderRadius: 13,
                  paddingHorizontal: 8,
                  backgroundColor: theme.orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                  {value.length}
                </Text>
              </View>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginHorizontal: 16,
              marginTop: 12,
              paddingHorizontal: 14,
              height: 46,
              borderRadius: 14,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name="search" size={18} color={theme.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchLabel}
              placeholderTextColor={theme.faint}
              style={{ flex: 1, color: theme.text, fontSize: 15, padding: 0 }}
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.muted} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 12, gap: 16 }}
          >
            {groups.map((g) => {
              const searching = !!query.trim();
              const expanded = !g.key || searching || !!openGroups[g.key];
              const picked = g.items.filter((o) => value.includes(o.value)).length;
              return (
                <View
                  key={g.key}
                  style={
                    g.key
                      ? {
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: picked ? theme.orange : theme.border,
                          backgroundColor: theme.card,
                          overflow: 'hidden',
                        }
                      : { gap: 8 }
                  }
                >
                  {!!g.key && (
                    <TouchableOpacity
                      onPress={() => setOpenGroups((p) => ({ ...p, [g.key]: !p[g.key] }))}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{g.icon || '📁'}</Text>
                      <Text
                        style={{ flex: 1, color: theme.text, fontWeight: '800', fontSize: 15.5 }}
                        numberOfLines={1}
                      >
                        {g.key}
                      </Text>
                      {picked > 0 && (
                        <View
                          style={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: 11,
                            paddingHorizontal: 6,
                            backgroundColor: theme.orange,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
                            {picked}
                          </Text>
                        </View>
                      )}
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.muted}
                      />
                    </TouchableOpacity>
                  )}
                  {expanded && (
                    <View
                      style={
                        g.key
                          ? {
                              paddingHorizontal: 8,
                              paddingBottom: 8,
                              gap: 4,
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: theme.border,
                              paddingTop: 8,
                            }
                          : { gap: 8 }
                      }
                    >
                      {g.items.map((o) => {
                        const on = value.includes(o.value);
                        return (
                          <TouchableOpacity
                            key={String(o.value)}
                            onPress={() => toggle(o.value)}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              paddingHorizontal: 8,
                              paddingVertical: 9,
                              borderRadius: 12,
                              backgroundColor: on ? `${theme.orange}14` : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 18 }}>{o.icon || '•'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  color: on ? theme.orange : theme.text,
                                  fontWeight: on ? '800' : '600',
                                  fontSize: 14.5,
                                }}
                              >
                                {o.label}
                              </Text>
                              {!!o.path && <Muted>{o.path}</Muted>}
                            </View>
                            <Ionicons
                              name={on ? 'checkmark-circle' : 'ellipse-outline'}
                              size={22}
                              color={on ? theme.orange : theme.faint}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={{ padding: 16, paddingBottom: 28 }}>
            <Btn label={doneLabel} onPress={close} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  const tree = useQuery({ queryKey: ['w', 'categories'], queryFn: api.getCategories });
  const catIndex = useMemo(() => indexTree(tree.data), [tree.data]);
  const priceTypes = useQuery({ queryKey: ['w', 'priceTypes'], queryFn: api.getPriceTypes });
  const limits = useQuery({ queryKey: ['w', 'mediaLimits'], queryFn: api.getMediaLimits });
  const MAX_PHOTOS = limits.data?.max_photos ?? DEFAULT_MAX_PHOTOS;
  const [video, setVideo] = useState(null); // yangi tanlangan video

  const primary = categories.find((c) => c.is_primary) || categories[0];
  const [categoryIds, setCategoryIds] = useState(() => {
    if (initial?.category_ids?.length) return initial.category_ids;
    const one = initial?.category_id ?? primary?.category.id;
    return one != null ? [one] : [];
  });
  const categoryId = categoryIds[0] ?? null;
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

  const photos = [
    ...kept.map((uri) => ({ uri, fresh: false })),
    ...fresh.map((uri) => ({ uri, fresh: true })),
  ];
  const canSave = !!categoryId && title.trim().length >= 3;

  const save = useMutation({
    mutationFn: async () => {
      const keys = [];
      for (const uri of fresh) keys.push(await api.uploadListingPhoto(uri));
      const videoKey = video ? await api.uploadListingVideo(video) : null;
      const body = {
        ...(videoKey ? { video_temp_key: videoKey } : {}),
        category_id: categoryId,
        ...(categoryIds.length > 1 ? { category_ids: categoryIds } : {}),
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
      <Card style={{ gap: 10, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="images" size={17} color={theme.orange} />
          <Txt style={{ fontWeight: '800', fontSize: 15 }}>{t('w.listings.secMedia')}</Txt>
          <Muted style={{ flex: 1 }} numberOfLines={1}>
            {photos.length}/{MAX_PHOTOS}
            {limits.data?.video_max_seconds ? ` · ≤${limits.data.video_max_seconds}s` : ''}
          </Muted>
          <VideoChip
            active={!!video || !!initial?.video_url}
            label={video ? t('w.site.removeVideo') : t('w.site.video')}
            onPress={video ? () => setVideo(null) : pickVideo}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {photos.length < MAX_PHOTOS ? (
            <AddTile onPress={pick} label={t('w.listings.addPhoto')} />
          ) : null}
          {photos.map((p, i) => (
            <Thumb
              key={p.uri}
              uri={p.uri}
              size={THUMB}
              cover={i === 0}
              onRemove={() =>
                p.fresh
                  ? setFresh((x) => x.filter((u) => u !== p.uri))
                  : setKept((x) => x.filter((u) => u !== p.uri))
              }
            />
          ))}
        </ScrollView>
      </Card>

      <Section icon="create" title={t('w.listings.secMain')}>
        <CategoryPicker
          label={t('w.listings.category')}
          doneLabel={t('common.ok')}
          value={categoryIds}
          onChange={setCategoryIds}
          searchLabel={t('common.search')}
          options={categories.map((c) => {
            const info = catIndex.get(c.category.id);
            return {
              value: c.category.id,
              label: c.category.name,
              icon: info?.icon,
              group: info?.group,
              groupIcon: info?.groupIcon,
              path: info?.path,
            };
          })}
        />
        <View style={{ gap: 6 }}>
          <Field
            label={t('w.listings.titleField')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('w.listings.titlePh')}
            maxLength={120}
          />
          <Text style={{ alignSelf: 'flex-end', color: theme.faint, fontSize: 11.5 }}>
            {title.length}/120
          </Text>
        </View>
        <View style={{ gap: 6 }}>
          <Field
            label={t('w.listings.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('w.listings.descHint')}
            multiline
            maxLength={2000}
          />
          <Text style={{ alignSelf: 'flex-end', color: theme.faint, fontSize: 11.5 }}>
            {description.length}/2000
          </Text>
        </View>
      </Section>

      <Section icon="cash" title={t('w.listings.secPrice')} gap={10}>
        <View style={{ gap: 6 }}>
          <Muted>{t('w.listings.price')}</Muted>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBg,
              paddingHorizontal: 14,
              height: 48,
            }}
          >
            <TextInput
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.faint}
              style={{ flex: 1, color: theme.text, fontSize: 18, fontWeight: '800', padding: 0 }}
            />
            <Text style={{ color: theme.muted, fontWeight: '700' }}>{t('common.currencySom')}</Text>
          </View>
        </View>
        {priceTypes.data?.length ? (
          <View style={{ gap: 6 }}>
            <Muted>{t('w.listings.priceType')}</Muted>
            <PriceTypeBar value={priceTypeId} onChange={setPriceTypeId} items={priceTypes.data} />
          </View>
        ) : null}
      </Section>

      {!canSave ? (
        <Muted style={{ textAlign: 'center' }}>
          {!categoryId ? t('w.listings.needCategory') : t('w.listings.needTitle')}
        </Muted>
      ) : null}
      <Btn
        label={t('w.save')}
        icon="checkmark-circle-outline"
        loading={save.isPending}
        disabled={!canSave}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}

// Narx turi: bitta qatorda teng bo'laklarga bo'lingan tanlov (faol bo'lagi to'q sariq).
function PriceTypeBar({ items, value, onChange }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        gap: 3,
        borderRadius: 14,
        backgroundColor: theme.card2,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {items.map((p) => {
        const on = p.id === value;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onChange(p.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              minHeight: 40,
              paddingHorizontal: 4,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? theme.orange : 'transparent',
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{
                color: on ? '#fff' : theme.text,
                fontWeight: on ? '800' : '600',
                fontSize: 12.5,
                textAlign: 'center',
              }}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const THUMB = 58;

// Bo'lim: ikonkali sarlavha va ichida kontent.
function Section({ icon, title, hint, children, gap = 14 }) {
  const { theme } = useTheme();
  return (
    <Card style={{ gap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: `${theme.orange}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={theme.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '800', fontSize: 16 }}>{title}</Txt>
          {hint ? <Muted>{hint}</Muted> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

// Sarlavha qatoridagi video "chip"i: tanlangan bo'lsa to'q sariq to'ldirilgan.
function VideoChip({ active, label, onPress }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 30,
        paddingHorizontal: 11,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: theme.orange,
        backgroundColor: active ? theme.orange : `${theme.orange}14`,
      }}
    >
      <Ionicons
        name={active ? 'checkmark-circle' : 'videocam'}
        size={15}
        color={active ? '#fff' : theme.orange}
      />
      <Text
        numberOfLines={1}
        style={{ color: active ? '#fff' : theme.orange, fontWeight: '800', fontSize: 12.5 }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Rasm qo'shish plitkasi: qatorning boshida, rasmlar bilan bir xil o'lchamda.
function AddTile({ onPress, label }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: THUMB,
        height: THUMB,
        borderRadius: 12,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.orange,
        backgroundColor: `${theme.orange}0f`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="add" size={26} color={theme.orange} />
    </TouchableOpacity>
  );
}

function Thumb({ uri, onRemove, cover, size = THUMB }) {
  const { theme } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          borderWidth: cover ? 2 : 0,
          borderColor: theme.orange,
        }}
      />
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: 3,
          right: 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: 'rgba(0,0,0,0.65)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
      >
        <Ionicons name="close" size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
