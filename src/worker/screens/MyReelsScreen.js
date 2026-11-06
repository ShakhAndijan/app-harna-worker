import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppLoader from '../../components/AppLoader';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { mapListing } from '../../api/listings';
import ReelPage from '../../screens/listings/components/ReelPage';
import CommentsSheet from '../../screens/listings/components/CommentsSheet';
import { shareListing } from '../../screens/listings/utils';
import * as api from '../api';

const SHEET_RATIO = 0.62;
const noop = () => {};

// Ustaning o'z e'lonlari to'liq ekranda (Reels ko'rinishida): yuqoriga/pastga surib keyingisiga o'tiladi.
// Bosilgan e'lon (`id`) bilan ochiladi. Tahrirlash uchun bitta joy — pastdagi "E'lonni tahrirlash" tugmasi.
export default function MyReelsScreen({ id, onBack }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t: tr } = useLanguage();
  const { signedIn } = useAuth();
  const q = useQuery({ queryKey: ['w', 'listings'], queryFn: () => api.getMyListings({}) });
  const [size, setSize] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null);

  const items = useMemo(() => {
    const raw = Array.isArray(q.data) ? q.data : q.data?.items || [];
    return raw.map((l) => ({
      ...mapListing(l),
      videoUrl: l.video_url || null,
      isActive: l.is_active !== false,
    }));
  }, [q.data]);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev?.width === width && prev?.height === height ? prev : { width, height }
    );
  };

  const onEdit = useCallback(
    (l) => router.push({ pathname: '/listing-edit', params: { id: String(l.id) } }),
    [router]
  );
  const onShare = useCallback((l) => shareListing(l, tr), [tr]);
  const onComments = useCallback((l) => setCommentsFor(l.id), []);

  const backBtn = (
    <TouchableOpacity
      onPress={onBack}
      style={[s.backBtn, { top: insets.top + 10 }]}
      accessibilityRole="button"
      accessibilityLabel={tr('common.back')}
    >
      <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <View style={s.root} onLayout={onLayout}>
      <StatusBar style="light" />
      {size && items.length > 0 ? (
        <Pager
          items={items}
          size={size}
          insets={insets}
          initialId={id}
          onBack={onBack}
          onShare={onShare}
          onComments={onComments}
          onEdit={onEdit}
          scrollEnabled={commentsFor == null}
        />
      ) : (
        <View style={s.center}>{q.isPending || !size ? <AppLoader size={120} /> : null}</View>
      )}
      {(!size || items.length === 0) && backBtn}
      {commentsFor != null && size && (
        <CommentsSheet
          listingId={commentsFor}
          signedIn={signedIn}
          onLogin={() => router.push('/login')}
          onClose={() => setCommentsFor(null)}
          height={size.height * SHEET_RATIO}
          bottomInset={insets.bottom}
        />
      )}
    </View>
  );
}

// Sahifalar ro'yxati: ochilganda bosilgan e'londan boshlanadi; faqat ko'rinib turgan e'londagi video ijro etiladi.
function Pager({
  items,
  size,
  insets,
  initialId,
  onBack,
  onShare,
  onComments,
  onEdit,
  scrollEnabled,
}) {
  const [startIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((i) => String(i.id) === String(initialId))
    )
  );
  const [activeId, setActiveId] = useState(items[startIndex]?.id ?? null);
  const [viewabilityConfig] = useState({ itemVisiblePercentThreshold: 60 });
  const [onViewableItemsChanged] = useState(() => ({ viewableItems }) => {
    const first = viewableItems[0];
    if (first) setActiveId(first.item.id);
  });
  return (
    <FlatList
      data={items}
      extraData={activeId}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <ReelPage
          listing={item}
          width={size.width}
          height={size.height}
          insets={insets}
          onBack={onBack}
          onLike={noop}
          onSave={noop}
          onDetails={noop}
          onContact={noop}
          onOpenWorker={noop}
          onShare={onShare}
          onComments={onComments}
          onEdit={onEdit}
          active={activeId === item.id}
        />
      )}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: size.height, offset: size.height * index, index })}
      initialScrollIndex={startIndex}
      initialNumToRender={1}
      windowSize={3}
      maxToRenderPerBatch={1}
      removeClippedSubviews
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      scrollEnabled={scrollEnabled}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
