import { useState } from 'react';
import { View, Image, ScrollView } from 'react-native';
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
  Chips,
  Loading,
  ErrorBox,
  Empty,
  fmtDate,
  num,
} from '../ui';

const PAGE = 20;
const STARS = [
  [5, 'five'],
  [4, 'four'],
  [3, 'three'],
  [2, 'two'],
  [1, 'one'],
];

// Reyting: umumiy ball, 5★…1★ taqsimoti, yo'nalish bo'yicha filtr va sharhlar (sayt "Reyting" sahifasi).
export default function ReviewsScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [categoryId, setCategoryId] = useState(null);
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const wid = me.data?.id;
  const q = useInfiniteQuery({
    queryKey: ['w', 'reviews', wid, categoryId],
    queryFn: ({ pageParam }) =>
      api.getReviewsPage(wid, { page: pageParam, size: PAGE, categoryId: categoryId ?? undefined }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last?.items?.length >= PAGE ? all.length + 1 : undefined),
    enabled: !!wid,
  });
  const items = q.data?.pages.flatMap((p) => p?.items ?? []) ?? [];
  const w = me.data;
  const br = w?.rating_breakdown || {};
  const total = num(w?.review_count);
  const cats = w?.categories || [];

  return (
    <Screen
      title={t('w.profile.reviews')}
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

          {cats.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chips
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { value: null, label: t('w.site.allReviews') },
                  ...cats.map((c) => ({ value: c.category.id, label: c.category.name })),
                ]}
              />
            </ScrollView>
          ) : null}

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
    </Screen>
  );
}
