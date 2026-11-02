import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import {
  Screen,
  Card,
  H,
  Txt,
  Muted,
  Btn,
  Field,
  Segments,
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
        return (
          <>
            <Muted>{t('w.extra.topHint')}</Muted>
            <Card>
              <Muted>{t('w.extra.canPay')}</Muted>
              <H>{money(d.available, t)}</H>
            </Card>
            <Segments
              value={d0}
              onChange={setDays}
              options={choices.map((x) => ({ value: x, label: `${x} ${t('w.extra.days')}` }))}
            />
            <Card>
              <H>{t('w.extra.topProfile')}</H>
              <Muted>
                {money(d.profile_day_price, t)} / {t('w.extra.perDay')}
              </Muted>
              {d.profile_top_until ? (
                <Pill
                  label={`TOP · ${fmtDate(d.profile_top_until, language)}`}
                  color={theme.gold}
                />
              ) : null}
              <Btn
                label={`${t('w.extra.topBuy')} · ${money(num(d.profile_day_price) * d0, t)}`}
                loading={buy.isPending}
                onPress={() => buy.mutate({ kind: 'profile', days: d0 })}
              />
            </Card>
            <H>{t('w.extra.topListings')}</H>
            {(d.listings || []).length ? (
              d.listings.map((l) => (
                <Card key={l.id}>
                  <Txt style={{ fontWeight: '700' }}>{l.title || l.listing_title}</Txt>
                  {l.is_top || l.top_until ? (
                    <Pill
                      label={l.top_until ? `TOP · ${fmtDate(l.top_until, language)}` : 'TOP'}
                      color={theme.gold}
                    />
                  ) : null}
                  <Muted>
                    {money(d.listing_day_price, t)} / {t('w.extra.perDay')}
                  </Muted>
                  <Btn
                    kind="ghost"
                    label={`${t('w.extra.topBuy')} · ${money(num(d.listing_day_price) * d0, t)}`}
                    loading={buy.isPending}
                    onPress={() => buy.mutate({ kind: 'listing', listing_id: l.id, days: d0 })}
                  />
                </Card>
              ))
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
          <Muted>{t('w.extra.brigadeHint')}</Muted>
          {(d.invites || []).map((inv) => (
            <Card key={inv.id}>
              <Txt style={{ fontWeight: '700' }}>{inv.brigade_name}</Txt>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn
                  style={{ flex: 1 }}
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
            </Card>
          ))}
          {d.brigade ? (
            <>
              <Card>
                <H>{d.brigade.name}</H>
                {d.brigade.description ? <Muted>{d.brigade.description}</Muted> : null}
                <Muted>
                  {t('w.extra.members')}: {d.brigade.size ?? d.brigade.members?.length ?? 0}
                </Muted>
              </Card>
              {(d.brigade.members || []).map((m) => (
                <Card key={m.id}>
                  <Txt style={{ fontWeight: '700' }}>{m.name || m.nickname}</Txt>
                  <Muted>{[m.role, m.status].filter(Boolean).join(' · ')}</Muted>
                </Card>
              ))}
              <Btn
                kind="ghost"
                label={t('w.extra.leave')}
                loading={leave.isPending}
                onPress={() => leave.mutate()}
              />
            </>
          ) : (
            <Card>
              <Field label={t('w.extra.brigadeName')} value={name} onChangeText={setName} />
              <Field
                label={t('w.extra.brigadeDesc')}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Btn
                label={t('w.extra.createBrigade')}
                loading={create.isPending}
                disabled={!name.trim()}
                onPress={() => create.mutate()}
              />
            </Card>
          )}
        </>
      )}
    </Wrap>
  );
}
