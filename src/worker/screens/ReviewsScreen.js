import { useMemo, useState } from 'react';
import {
  View,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as api from '../api';
import {
  Screen,
  Card,
  H,
  Btn,
  Muted,
  Txt,
  Pill,
  Loading,
  ErrorBox,
  Empty,
  fmtDate,
  num,
} from '../ui';

const PAGE = 50;
const STARS = [
  [5, 'five'],
  [4, 'four'],
  [3, 'three'],
  [2, 'two'],
  [1, 'one'],
];

// Ko'p tanlanadigan ixcham maydon: tanlanganlar chiplarda, bosilganda ro'yxat ochiladi.
function MultiSelect({ label, options, value, onChange, placeholder }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const chosen = options.filter((o) => value.includes(o.value));
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <View style={{ gap: 8 }}>
      <Txt style={{ fontWeight: '800', fontSize: 14.5 }}>{label}</Txt>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: open || chosen.length ? theme.orange : theme.border,
          backgroundColor: theme.card,
          overflow: 'hidden',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOpen((v) => !v);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 50,
            paddingHorizontal: 14,
            paddingVertical: 8,
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
                    gap: 4,
                    paddingLeft: 10,
                    paddingRight: 6,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.orange + '26',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.orange,
                      fontSize: 12.5,
                      fontWeight: '800',
                      maxWidth: 140,
                    }}
                  >
                    {o.label}
                  </Text>
                  <TouchableOpacity onPress={() => toggle(o.value)} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={theme.orange} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.muted, fontSize: 14.5 }}>
                {placeholder || t('w.reviews.all')}
              </Text>
            )}
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} />
        </TouchableOpacity>
        {open ? (
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 210, borderTopWidth: 1, borderTopColor: theme.border }}
          >
            {options.map((o) => {
              const on = value.includes(o.value);
              return (
                <TouchableOpacity
                  key={String(o.value)}
                  onPress={() => toggle(o.value)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    height: 46,
                  }}
                >
                  <Ionicons
                    name={on ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={on ? theme.orange : theme.faint}
                  />
                  <Txt style={{ flex: 1, fontWeight: on ? '800' : '600', fontSize: 14.5 }}>
                    {o.label}
                  </Txt>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

// Reyting: umumiy ball, 5★…1★ taqsimoti, filtr (yo'nalish, baho, sharh yozganlar) va sharhlar.
export default function ReviewsScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [fCats, setFCats] = useState([]);
  const [fPeople, setFPeople] = useState([]);
  const [fStar, setFStar] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const wid = me.data?.id;
  const q = useInfiniteQuery({
    queryKey: ['w', 'reviews', wid, 'all'],
    queryFn: ({ pageParam }) => api.getReviewsPage(wid, { page: pageParam, size: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last?.items?.length >= PAGE ? all.length + 1 : undefined),
    enabled: !!wid,
  });
  const all = useMemo(() => q.data?.pages.flatMap((pg) => pg?.items ?? []) ?? [], [q.data]);
  const w = me.data;
  const br = w?.rating_breakdown || {};
  const total = num(w?.review_count);
  const cats = w?.categories || [];

  const catOptions = cats.map((c) => ({ value: c.category.id, label: c.category.name }));
  const peopleOptions = useMemo(() => {
    const names = [...new Set(all.map((r) => r.customer?.full_name).filter(Boolean))];
    return names.map((n) => ({ value: n, label: n }));
  }, [all]);

  const items = all.filter(
    (r) =>
      (!fCats.length || fCats.includes(r.category?.id)) &&
      (!fPeople.length || fPeople.includes(r.customer?.full_name)) &&
      (fStar == null || r.rating === fStar)
  );
  const active = fCats.length + fPeople.length + (fStar != null ? 1 : 0);
  const reset = () => {
    setFCats([]);
    setFPeople([]);
    setFStar(null);
  };

  const filterBtn = (
    <TouchableOpacity
      onPress={() => setFilterOpen(true)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('w.reviews.filter')}
      style={{
        width: 40,
        height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? theme.orange : theme.card,
        borderWidth: 1,
        borderColor: active ? theme.orange : theme.border,
      }}
    >
      <Ionicons name="options-outline" size={22} color={active ? '#fff' : theme.text} />
      {active ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.red,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{active}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <Screen
      title={t('w.profile.reviews')}
      right={filterBtn}
      onRefresh={() => {
        me.refetch();
        q.refetch();
      }}
      refreshing={q.isRefetching}
    >
      {me.isPending ? (
        <Loading />
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <H>{w?.overall_rating ? Number(w.overall_rating).toFixed(1) : '—'}</H>
                <Muted>{t('w.site.reviewsTotal', { n: total })}</Muted>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                {STARS.map(([n, key]) => {
                  const c = num(br[key]);
                  return (
                    <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Txt style={{ width: 26, fontSize: 12 }}>{n}★</Txt>
                      <View
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.border,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${total ? (c / total) * 100 : 0}%`,
                            height: 6,
                            backgroundColor: theme.gold,
                          }}
                        />
                      </View>
                      <Txt style={{ width: 24, fontSize: 12, textAlign: 'right' }}>{c}</Txt>
                    </View>
                  );
                })}
              </View>
            </View>
          </Card>

          {q.isPending ? (
            <Loading />
          ) : q.isError ? (
            <ErrorBox error={q.error} onRetry={q.refetch} />
          ) : !items.length ? (
            <Empty icon="star-outline" text={t('w.reviews.empty')} />
          ) : (
            <>
              {items.map((r, i) => (
                <Card key={i}>
                  <Txt style={{ color: theme.gold, fontWeight: '800' }}>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(Math.max(0, 5 - r.rating))}
                  </Txt>
                  {r.comment ? <Txt>{r.comment}</Txt> : <Muted>{t('w.site.noComment')}</Muted>}
                  {r.photos?.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {r.photos.map((u) => (
                          <Image
                            key={u}
                            source={{ uri: u }}
                            style={{ width: 72, height: 72, borderRadius: 10 }}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  ) : null}
                  {r.category?.name ? <Pill label={r.category.name} color={theme.muted} /> : null}
                  <Muted>
                    {r.customer?.full_name || ''} · {fmtDate(r.created_at, language)}
                  </Muted>
                </Card>
              ))}
              {q.hasNextPage ? (
                <Btn
                  kind="ghost"
                  label={t('w.site.loadMore')}
                  loading={q.isFetchingNextPage}
                  onPress={() => q.fetchNextPage()}
                />
              ) : null}
            </>
          )}
        </>
      )}

      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onPress={() => setFilterOpen(false)}
          />
          <View
            style={{
              maxHeight: '88%',
              backgroundColor: theme.bg,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
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
                marginBottom: 14,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 20,
                paddingBottom: 8,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange + '1F',
                }}
              >
                <Ionicons name="options" size={22} color={theme.orange} />
              </View>
              <Txt style={{ flex: 1, fontWeight: '900', fontSize: 20 }}>
                {t('w.reviews.filter')}
              </Txt>
              <TouchableOpacity
                onPress={() => setFilterOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="close" size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 18 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <MultiSelect
                label={t('w.profile.categories')}
                options={catOptions}
                value={fCats}
                onChange={setFCats}
              />
              <View style={{ gap: 8 }}>
                <Txt style={{ fontWeight: '800', fontSize: 14.5 }}>{t('w.reviews.rating')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[null, 5, 4, 3, 2, 1].map((n) => {
                    const on = fStar === n;
                    return (
                      <TouchableOpacity
                        key={String(n)}
                        onPress={() => setFStar(n)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        style={{
                          paddingHorizontal: 16,
                          height: 38,
                          borderRadius: 19,
                          justifyContent: 'center',
                          backgroundColor: on ? theme.orange : theme.card,
                          borderWidth: 1,
                          borderColor: on ? theme.orange : theme.border,
                        }}
                      >
                        <Text
                          style={{
                            color: on ? '#fff' : theme.text,
                            fontSize: 14,
                            fontWeight: '800',
                          }}
                        >
                          {n == null ? t('w.reviews.all') : `${n} ★`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <MultiSelect
                label={t('w.reviews.people')}
                options={peopleOptions}
                value={fPeople}
                onChange={setFPeople}
              />
            </ScrollView>
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 28,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Btn kind="ghost" label={t('w.reviews.reset')} onPress={reset} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Btn label={t('w.reviews.apply')} onPress={() => setFilterOpen(false)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
