import { View, Image, Switch, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import {
  Screen,
  Btn,
  Muted,
  Txt,
  SegmentedTabs,
  Loading,
  ErrorBox,
  Empty,
  money,
  num,
} from '../ui';

// Rasm (yoki rasm bo'lmasa chiroyli joy egasi) + pastdan qorayish; ustiga belgilar qo'yiladi.
function Cover({ uri, height, children, radius = 0 }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height,
        backgroundColor: theme.card2,
        overflow: 'hidden',
        borderRadius: radius,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[`${theme.orange}33`, theme.card2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="image-outline" size={38} color={`${theme.orange}99`} />
        </LinearGradient>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.55 }}
      />
      {children}
    </View>
  );
}

// Rasm ustidagi shaffof-qora belgi (narx, holat).
function Chip({ children, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 11,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: 'rgba(8,16,28,0.62)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Metric({ icon, n, color }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name={icon} size={15} color={color || theme.muted} />
      <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>{n ?? 0}</Text>
    </View>
  );
}

function IconBtn({ icon, onPress, color, label }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={18} color={color || theme.text} />
    </TouchableOpacity>
  );
}

function Price({ value, t }) {
  return (
    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
      {num(value) > 0 ? money(value, t) : t('w.priceNegotiable')}
    </Text>
  );
}

// Yuqoridagi to'q sariq "hero": umumiy son, ko'rsatkichlar va e'lon qo'shish tugmasi.
function Hero({ items, onAdd, t }) {
  const { theme } = useTheme();
  const visible = items.filter((l) => l.is_active).length;
  const likes = items.reduce((a, l) => a + num(l.like_count), 0);
  const comments = items.reduce((a, l) => a + num(l.comment_count), 0);
  const stat = (icon, n, label) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
        {n}
        {label ? ` ${label}` : ''}
      </Text>
    </View>
  );
  return (
    <LinearGradient
      colors={[theme.orange, theme.orangeD]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22, padding: 18, gap: 16, overflow: 'hidden' }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -30,
          top: -40,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(255,255,255,0.13)',
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Text style={{ color: '#fff', fontSize: 44, fontWeight: '800', lineHeight: 48 }}>
          {items.length}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 15,
            fontWeight: '700',
            paddingBottom: 6,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {t('w.site.myListings')}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 }}>
        {stat('eye-outline', visible, t('w.listings.visible'))}
        {stat('heart', likes)}
        {stat('chatbubble', comments)}
      </View>
      <TouchableOpacity
        onPress={onAdd}
        activeOpacity={0.9}
        accessibilityRole="button"
        style={{
          height: 48,
          borderRadius: 14,
          backgroundColor: '#fff',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Ionicons name="add-circle" size={20} color={theme.orangeD} />
        <Text style={{ color: theme.orangeD, fontSize: 15, fontWeight: '800' }}>
          {t('w.listings.add')}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function MyListingCard({ l, onOpen, onToggle, onDelete, t }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
        overflow: 'hidden',
      }}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onOpen}>
        <Cover uri={l.photos?.[0]} height={176}>
          <Chip style={{ position: 'absolute', left: 12, top: 12 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: l.is_active ? theme.green : theme.faint,
              }}
            />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              {l.is_active ? t('w.listings.visible') : t('w.listings.hidden')}
            </Text>
          </Chip>
          {l.is_top ? (
            <Chip
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                backgroundColor: theme.gold,
              }}
            >
              <Ionicons name="flame" size={13} color="#1b1200" />
              <Text style={{ color: '#1b1200', fontSize: 12, fontWeight: '800' }}>TOP</Text>
            </Chip>
          ) : null}
          <View style={{ position: 'absolute', left: 14, bottom: 12, right: 14 }}>
            <Price value={l.price} t={t} />
          </View>
        </Cover>
        <View style={{ padding: 14, gap: 8 }}>
          <Txt style={{ fontWeight: '800', fontSize: 16 }} numberOfLines={2}>
            {l.title}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Metric icon="heart" n={l.like_count} color={theme.red} />
            <Metric icon="chatbubble-ellipses" n={l.comment_count} />
          </View>
        </View>
      </TouchableOpacity>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch
            value={!!l.is_active}
            onValueChange={onToggle}
            trackColor={{ true: theme.orange }}
          />
          <Muted>{l.is_active ? t('w.listings.visible') : t('w.listings.hidden')}</Muted>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn icon="create-outline" label={t('w.listings.edit')} onPress={onOpen} />
          <IconBtn
            icon="trash-outline"
            color={theme.red}
            label={t('w.delete')}
            onPress={onDelete}
          />
        </View>
      </View>
    </View>
  );
}

function CompetitorCard({ l, onOpen, t }) {
  const { theme } = useTheme();
  const name = [l.worker?.first_name, l.worker?.last_name].filter(Boolean).join(' ');
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        gap: 12,
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.card,
      }}
    >
      <View style={{ width: 96, borderRadius: 14, overflow: 'hidden' }}>
        <Cover uri={l.photos?.[0]} height={112} />
      </View>
      <View style={{ flex: 1, gap: 6, paddingVertical: 2, justifyContent: 'space-between' }}>
        <Txt style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={2}>
          {l.title}
        </Txt>
        <Text style={{ color: theme.orange, fontWeight: '800', fontSize: 15 }}>
          {num(l.price) > 0 ? money(l.price, t) : t('w.priceNegotiable')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: `${theme.orange}26`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: theme.orange, fontSize: 11, fontWeight: '800' }}>{initial}</Text>
          </View>
          <Muted numberOfLines={1} style={{ flex: 1 }}>
            {name}
            {l.worker?.district ? ` · ${l.worker.district}` : ''}
          </Muted>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Metric icon="heart" n={l.like_count} color={theme.red} />
          <Metric icon="chatbubble-ellipses" n={l.comment_count} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ListingsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState('mine');
  const q = useQuery({ queryKey: ['w', 'listings'], queryFn: () => api.getMyListings({}) });
  const comp = useQuery({
    queryKey: ['w', 'competitors'],
    queryFn: () => api.getCompetitorListings(),
    enabled: tab === 'competitors',
  });

  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const toggle = useMutation({
    mutationFn: ({ id, active }) => api.updateListing(id, { is_active: active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'listings'] }),
    onError,
  });
  const remove = useMutation({
    mutationFn: (id) => api.deleteListing(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'listings'] }),
    onError,
  });

  const goAdd = () => router.push('/listing-edit');
  const mine = q.data || [];

  return (
    <Screen
      back={false}
      title={t('w.listings.title')}
      onRefresh={tab === 'mine' ? q.refetch : comp.refetch}
      refreshing={tab === 'mine' ? q.isRefetching : comp.isRefetching}
      bottomSpace
    >
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: t('w.site.myListings'), icon: 'images-outline' },
          { value: 'competitors', label: t('w.site.competitors'), icon: 'trophy-outline' },
        ]}
      />

      {tab === 'competitors' ? (
        <>
          <Muted>{t('w.site.competitorsHint')}</Muted>
          {comp.isPending ? (
            <Loading />
          ) : comp.isError ? (
            <ErrorBox error={comp.error} onRetry={comp.refetch} />
          ) : !(comp.data?.items || []).length ? (
            <Empty icon="images-outline" text={t('w.site.noCompetitors')} />
          ) : (
            comp.data.items.map((l) => (
              <CompetitorCard
                key={l.id}
                l={l}
                t={t}
                onOpen={() => router.push(`/listing/${l.id}`)}
              />
            ))
          )}
        </>
      ) : q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <>
          <Btn icon="add" label={t('w.listings.add')} onPress={goAdd} />
          <ErrorBox error={q.error} onRetry={q.refetch} />
        </>
      ) : (
        <>
          <Hero items={mine} onAdd={goAdd} t={t} />
          {!mine.length ? (
            <Empty icon="images-outline" text={t('w.listings.empty')} />
          ) : (
            mine.map((l) => (
              <MyListingCard
                key={l.id}
                l={l}
                t={t}
                onOpen={() =>
                  router.push({ pathname: '/listing-edit', params: { id: String(l.id) } })
                }
                onToggle={(v) => toggle.mutate({ id: l.id, active: v })}
                onDelete={() =>
                  appConfirm({
                    title: t('w.delete'),
                    message: t('w.listings.deleteAsk'),
                    confirmLabel: t('w.delete'),
                    destructive: true,
                    onConfirm: () => remove.mutate(l.id),
                  })
                }
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
