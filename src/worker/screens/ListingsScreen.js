import { View, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Btn, Muted, Txt, Pill, Loading, ErrorBox, Empty, money, num } from '../ui';

export default function ListingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'listings'], queryFn: () => api.getMyListings({}) });

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

  return (
    <Screen
      back={false}
      title={t('w.listings.title')}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      bottomSpace
    >
      <Btn icon="add" label={t('w.listings.add')} onPress={() => router.push('/listing-edit')} />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !q.data.length ? (
        <Empty icon="images-outline" text={t('w.listings.empty')} />
      ) : (
        q.data.map((l) => (
          <Card
            key={l.id}
            onPress={() => router.push({ pathname: '/listing-edit', params: { id: String(l.id) } })}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {l.photos?.[0] ? (
                <Image
                  source={{ uri: l.photos[0] }}
                  style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: theme.card2 }}
                />
              ) : (
                <View
                  style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: theme.card2 }}
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Txt style={{ fontWeight: '700' }} numberOfLines={2}>
                  {l.title}
                </Txt>
                <Txt style={{ color: theme.orange, fontWeight: '800' }}>
                  {num(l.price) > 0 ? money(l.price, t) : t('w.priceNegotiable')}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {l.is_top ? <Pill label="TOP" color={theme.gold} /> : null}
                  <Muted>
                    ♥ {l.like_count ?? 0} · 💬 {l.comment_count ?? 0}
                  </Muted>
                </View>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Switch
                  value={!!l.is_active}
                  onValueChange={(v) => toggle.mutate({ id: l.id, active: v })}
                  trackColor={{ true: theme.orange }}
                />
                <Muted>{l.is_active ? t('w.listings.visible') : t('w.listings.hidden')}</Muted>
              </View>
              <Btn
                kind="ghost"
                label={t('w.delete')}
                style={{ height: 38, paddingHorizontal: 14 }}
                onPress={() =>
                  appConfirm({
                    title: t('w.delete'),
                    message: t('w.listings.deleteAsk'),
                    confirmLabel: t('w.delete'),
                    destructive: true,
                    onConfirm: () => remove.mutate(l.id),
                  })
                }
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
