import { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Avatar from '../../components/Avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { TileVideo } from './ProfileScreen';
import {
  Screen,
  H,
  Txt,
  Muted,
  Btn,
  Field,
  Pill,
  Loading,
  ErrorBox,
  Empty,
  fmtDate,
  money,
  num,
} from '../ui';

const DAY_CHOICES = [1, 3, 7, 14, 30];

function Wrap({ title, q, children }) {
  if (q.isPending || q.isError) {
    return (
      <Screen title={title}>
        {q.isError ? <ErrorBox error={q.error} onRetry={q.refetch} /> : <Loading />}
      </Screen>
    );
  }
  return <Screen title={title}>{children(q.data)}</Screen>;
}

export function TopScreen() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'promoOptions'], queryFn: api.getPromotionOptions });
  const [days, setDays] = useState(7);
  // E'lonlarning o'z rasmi va videosi uchun (TOP varianti ro'yxatida ular yo'q).
  const mineQ = useQuery({ queryKey: ['w', 'listings'], queryFn: () => api.getMyListings({}) });
  const mineList = Array.isArray(mineQ.data) ? mineQ.data : mineQ.data?.items || [];
  const byId = Object.fromEntries(mineList.map((x) => [x.id, x]));
  const buy = useMutation({
    mutationFn: (body) => api.buyPromotion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w'] });
      appAlert(t('w.extra.topDone'), '');
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  return (
    <Wrap title={t('w.extra.top')} q={q}>
      {(d) => {
        const max = d.max_days || 30;
        const choices = DAY_CHOICES.filter((x) => x <= max);
        const d0 = choices.includes(days) ? days : choices[0] || 1;
        const total = (price) => money(num(price) * d0, t);
        return (
          <>
            {/* Tepa kartochka: TOP nima beradi va hisobdagi mablag' */}
            <View
              style={{
                padding: 18,
                borderRadius: 24,
                gap: 14,
                overflow: 'hidden',
                backgroundColor: theme.gold + '1C',
                borderWidth: 1,
                borderColor: theme.gold + '55',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  right: -30,
                  top: -30,
                  width: 130,
                  height: 130,
                  borderRadius: 65,
                  backgroundColor: theme.gold + '22',
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.gold,
                  }}
                >
                  <Ionicons name="trending-up" size={27} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 20, fontWeight: '900' }}>TOP</Txt>
                  <Muted style={{ fontSize: 12.5 }}>{t('w.extra.canPay')}</Muted>
                  <Txt style={{ fontSize: 17, fontWeight: '800', color: theme.gold }}>
                    {money(d.available, t)}
                  </Txt>
                </View>
              </View>
              <Muted style={{ fontSize: 13, lineHeight: 19 }}>{t('w.extra.topHint')}</Muted>
            </View>

            {/* Muddat tanlash: yumaloq chiplar */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {choices.map((x) => {
                const on = x === d0;
                return (
                  <TouchableOpacity
                    key={x}
                    onPress={() => setDays(x)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: on ? theme.orange : theme.card,
                      borderWidth: 1,
                      borderColor: on ? theme.orange : theme.border,
                    }}
                  >
                    <Txt
                      style={{ fontSize: 17, fontWeight: '900', color: on ? '#fff' : theme.text }}
                    >
                      {x}
                    </Txt>
                    <Txt style={{ fontSize: 11, color: on ? '#ffffffcc' : theme.muted }}>
                      {t('w.extra.days')}
                    </Txt>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Profilni TOP qilish */}
            <View
              style={{
                padding: 16,
                borderRadius: 22,
                gap: 12,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: d.profile_top_until ? theme.gold : theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.orange + '1F',
                  }}
                >
                  <Ionicons name="person-circle-outline" size={24} color={theme.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 16, fontWeight: '800' }}>{t('w.extra.topProfile')}</Txt>
                  <Muted style={{ fontSize: 12.5 }}>
                    {money(d.profile_day_price, t)} / {t('w.extra.perDay')}
                  </Muted>
                </View>
                {d.profile_top_until ? (
                  <Pill
                    label={`TOP · ${fmtDate(d.profile_top_until, language)}`}
                    color={theme.gold}
                  />
                ) : null}
              </View>
              <Btn
                icon="flash"
                label={`${t('w.extra.topBuy')} · ${total(d.profile_day_price)}`}
                loading={buy.isPending}
                onPress={() => buy.mutate({ kind: 'profile', days: d0 })}
              />
            </View>

            {/* E'lonlarni TOP qilish */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Ionicons name="megaphone-outline" size={18} color={theme.orange} />
              <H>{t('w.extra.topListings')}</H>
            </View>
            {(d.listings || []).length ? (
              d.listings.map((l) => {
                const isTop = l.is_top || l.top_until;
                const full = byId[l.id] || {};
                const photos = full.photos || [];
                const photo = photos[0] || null;
                const video = full.video_url || null;
                return (
                  <View
                    key={l.id}
                    style={{
                      borderRadius: 24,
                      overflow: 'hidden',
                      backgroundColor: theme.card,
                      borderWidth: 1,
                      borderColor: isTop ? theme.gold + '99' : theme.border,
                    }}
                  >
                    {/* E'lonning o'z rasmi / videosi */}
                    <View style={{ width: '100%', aspectRatio: 1.7, backgroundColor: theme.card2 }}>
                      {photo ? (
                        <Image
                          source={{ uri: photo }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="image-outline" size={38} color={theme.faint} />
                        </View>
                      )}
                      {video ? <TileVideo uri={video} /> : null}
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 56,
                          backgroundColor: 'rgba(0,0,0,0.28)',
                        }}
                      />
                      {isTop ? (
                        <View
                          style={{
                            position: 'absolute',
                            top: 10,
                            left: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 9,
                            paddingVertical: 4,
                            borderRadius: 11,
                            backgroundColor: theme.gold,
                          }}
                        >
                          <Ionicons name="flame" size={13} color="#1b1200" />
                          <Txt style={{ color: '#1b1200', fontSize: 11.5, fontWeight: '900' }}>
                            {l.top_until ? `TOP · ${fmtDate(l.top_until, language)}` : 'TOP'}
                          </Txt>
                        </View>
                      ) : null}
                      <View
                        style={{
                          position: 'absolute',
                          right: 10,
                          bottom: 10,
                          flexDirection: 'row',
                          gap: 6,
                        }}
                      >
                        {video ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 10,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                            }}
                          >
                            <Ionicons name="videocam" size={12} color="#fff" />
                            <Txt style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                              Video
                            </Txt>
                          </View>
                        ) : null}
                        {photos.length > 1 ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 10,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                            }}
                          >
                            <Ionicons name="images" size={12} color="#fff" />
                            <Txt style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                              {photos.length}
                            </Txt>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ padding: 14, gap: 12 }}>
                      <View style={{ gap: 4 }}>
                        <Txt style={{ fontWeight: '800', fontSize: 16 }} numberOfLines={2}>
                          {l.title || l.listing_title}
                        </Txt>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {num(full.price) > 0 ? (
                            <Txt style={{ fontWeight: '900', fontSize: 15, color: theme.orange }}>
                              {money(full.price, t)}
                            </Txt>
                          ) : null}
                          <Muted style={{ fontSize: 12.5 }}>
                            TOP: {money(d.listing_day_price, t)} / {t('w.extra.perDay')}
                          </Muted>
                        </View>
                      </View>
                      <Btn
                        kind={isTop ? 'primary' : 'ghost'}
                        icon="flash-outline"
                        label={`${t('w.extra.topBuy')} · ${total(d.listing_day_price)}`}
                        loading={buy.isPending}
                        onPress={() => buy.mutate({ kind: 'listing', listing_id: l.id, days: d0 })}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <Empty text={t('w.extra.noListings')} />
            )}
          </>
        );
      }}
    </Wrap>
  );
}

export function BrigadeScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'brigade'], queryFn: api.getMyBrigade });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['w', 'brigade'] });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const create = useMutation({
    mutationFn: () =>
      api.createBrigade({ name: name.trim(), description: description.trim() || null }),
    onSuccess: refresh,
    onError,
  });
  const leave = useMutation({ mutationFn: api.leaveBrigade, onSuccess: refresh, onError });
  const answer = useMutation({
    mutationFn: ({ id, ok }) => (ok ? api.acceptBrigadeInvite(id) : api.declineBrigadeInvite(id)),
    onSuccess: refresh,
    onError,
  });
  return (
    <Wrap title={t('w.extra.brigade')} q={q}>
      {(d) => (
        <>
          {/* Tepa kartochka: brigada nima ekani */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 24,
              overflow: 'hidden',
              backgroundColor: theme.violet + '18',
              borderWidth: 1,
              borderColor: theme.violet + '44',
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.violet,
              }}
            >
              <Ionicons name="people" size={28} color="#fff" />
            </View>
            <Muted style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
              {t('w.extra.brigadeHint')}
            </Muted>
          </View>

          {/* Kelgan takliflar */}
          {(d.invites || []).map((inv) => (
            <View
              key={inv.id}
              style={{
                padding: 14,
                borderRadius: 22,
                gap: 12,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.orange + '66',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.orange + '1F',
                  }}
                >
                  <Ionicons name="mail-unread-outline" size={22} color={theme.orange} />
                </View>
                <Txt style={{ flex: 1, fontWeight: '800', fontSize: 16 }} numberOfLines={2}>
                  {inv.brigade_name}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn
                  style={{ flex: 1 }}
                  icon="checkmark"
                  label={t('w.extra.accept')}
                  onPress={() => answer.mutate({ id: inv.id, ok: true })}
                />
                <Btn
                  style={{ flex: 1 }}
                  kind="ghost"
                  label={t('w.extra.decline')}
                  onPress={() => answer.mutate({ id: inv.id, ok: false })}
                />
              </View>
            </View>
          ))}

          {d.brigade ? (
            <>
              {/* Brigada kartochkasi */}
              <View
                style={{
                  padding: 16,
                  borderRadius: 24,
                  gap: 12,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.orange,
                    }}
                  >
                    <Txt style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>
                      {(d.brigade.name || 'B')[0].toUpperCase()}
                    </Txt>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt style={{ fontSize: 19, fontWeight: '900' }} numberOfLines={2}>
                      {d.brigade.name}
                    </Txt>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                        borderRadius: 11,
                        backgroundColor: theme.violet + '1F',
                      }}
                    >
                      <Ionicons name="people-outline" size={13} color={theme.violet} />
                      <Txt style={{ fontSize: 12, fontWeight: '800', color: theme.violet }}>
                        {t('w.extra.members')}: {d.brigade.size ?? d.brigade.members?.length ?? 0}
                      </Txt>
                    </View>
                  </View>
                </View>
                {d.brigade.description ? (
                  <Muted style={{ fontSize: 13.5, lineHeight: 20 }}>{d.brigade.description}</Muted>
                ) : null}
              </View>

              {/* A'zolar */}
              {(d.brigade.members || []).length ? (
                <View
                  style={{
                    borderRadius: 22,
                    overflow: 'hidden',
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  {(d.brigade.members || []).map((m, i) => {
                    const nm = m.name || m.nickname || '';
                    return (
                      <View
                        key={m.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          borderTopWidth: i ? 1 : 0,
                          borderTopColor: theme.border,
                        }}
                      >
                        <Avatar
                          size={44}
                          letter={(nm || 'U')[0]}
                          uri={m.profile_photo || m.photo || null}
                        />
                        <View style={{ flex: 1 }}>
                          <Txt style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={1}>
                            {nm}
                          </Txt>
                          {m.role || m.status ? (
                            <Muted style={{ fontSize: 12.5 }}>
                              {[m.role, m.status].filter(Boolean).join(' · ')}
                            </Muted>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              <Btn
                kind="ghost"
                icon="log-out-outline"
                label={t('w.extra.leave')}
                loading={leave.isPending}
                onPress={() => leave.mutate()}
              />
            </>
          ) : (
            <View
              style={{
                padding: 16,
                borderRadius: 24,
                gap: 12,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.orange + '1F',
                  }}
                >
                  <Ionicons name="add-circle-outline" size={22} color={theme.orange} />
                </View>
                <H>{t('w.extra.createBrigade')}</H>
              </View>
              <Field label={t('w.extra.brigadeName')} value={name} onChangeText={setName} />
              <Field
                label={t('w.extra.brigadeDesc')}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Btn
                icon="people"
                label={t('w.extra.createBrigade')}
                loading={create.isPending}
                disabled={!name.trim()}
                onPress={() => create.mutate()}
              />
            </View>
          )}
        </>
      )}
    </Wrap>
  );
}
