import { useState } from 'react';
import { Share, Switch, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
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
  Row,
  Segments,
  Loading,
  ErrorBox,
  fmtDate,
  money,
} from '../ui';

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

// Kim taklif qilganini bir marta, ro'yxatdan o'tgandan keyin belgilangan muddat ichida kiritish mumkin.
function ClaimCard({ d }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const claim = useMutation({
    mutationFn: () => api.claimReferral(code.trim()),
    onSuccess: () => {
      setCode('');
      appAlert(t('w.site.claimDone'));
      qc.invalidateQueries({ queryKey: ['w'] });
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  if (d.referred_by_name)
    return (
      <Muted>
        {t('w.site.claimTitle')} {d.referred_by_name}
      </Muted>
    );
  if (!d.claim_until) return null;
  return (
    <Card>
      <H>{t('w.site.claimTitle')}</H>
      <Muted>{t('w.site.claimHint')}</Muted>
      <Field
        value={code}
        onChangeText={setCode}
        placeholder={t('w.site.claimPlaceholder')}
        autoCapitalize="characters"
      />
      <Btn
        label={t('w.site.claimBtn')}
        loading={claim.isPending}
        disabled={!code.trim()}
        onPress={() => claim.mutate()}
      />
    </Card>
  );
}

export function ReferralScreen() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'referrals'], queryFn: api.getReferrals });
  return (
    <Wrap title={t('w.extra.referral')} q={q}>
      {(d) => {
        const code = d.code || d.referral_code || '';
        const link = d.link || d.url || (code ? `https://dev.harna.uz/r/${code}` : '');
        return (
          <>
            <Muted>{t('w.extra.referralHint')}</Muted>
            <Card>
              <Muted>{t('w.extra.yourCode')}</Muted>
              <H>{code}</H>
              <Txt numberOfLines={1}>{link}</Txt>
              <Btn label={t('w.extra.share')} onPress={() => Share.share({ message: link })} />
            </Card>
            <ClaimCard d={d} />
            <Card>
              <Row label={t('w.extra.invited')} value={String(d.invited_count ?? d.invited ?? 0)} />
              <Row
                label={t('w.extra.started')}
                value={String(d.rewarded ?? d.started_count ?? d.started ?? 0)}
              />
              <Row label={t('w.extra.earned')} value={money(d.earned_bonus ?? d.earned ?? 0, t)} />
            </Card>
          </>
        );
      }}
    </Wrap>
  );
}

export function ProScreen() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'pro'], queryFn: api.getPro });
  const hist = useQuery({
    queryKey: ['w', 'proHistory'],
    queryFn: api.getProHistory,
    retry: false,
  });
  const [months, setMonths] = useState(1);
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['w'] });
  };
  const buy = useMutation({
    mutationFn: () => api.subscribePro(months),
    onSuccess: refresh,
    onError,
  });
  const renew = useMutation({ mutationFn: api.setProAutoRenew, onSuccess: refresh, onError });
  return (
    <Wrap title={t('w.extra.pro')} q={q}>
      {(d) => {
        const price = Number(d?.month_price) || 0;
        return (
          <>
            <Muted>{t('w.extra.proHint')}</Muted>
            {d?.fee_discount_percent ? (
              <Muted>{t('w.site.proDiscount', { n: d.fee_discount_percent })}</Muted>
            ) : null}
            {d?.is_pro ? (
              <Card>
                <H>{t('w.extra.proActive')}</H>
                <Muted>{t('w.site.proUntil', { d: fmtDate(d.pro_until, language) })}</Muted>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontWeight: '700' }}>{t('w.site.autoRenew')}</Txt>
                    <Muted>{t('w.site.autoRenewHint')}</Muted>
                  </View>
                  <Switch
                    value={!!d.auto_renew}
                    disabled={renew.isPending}
                    onValueChange={(v) => renew.mutate(v)}
                    trackColor={{ true: theme.orange }}
                  />
                </View>
              </Card>
            ) : null}
            {d?.enabled === false ? null : (
              <>
                <Segments
                  value={months}
                  onChange={setMonths}
                  options={[1, 3, 6, 12].map((m) => ({
                    value: m,
                    label: `${m} ${t('w.extra.months')}`,
                  }))}
                />
                <Card>
                  <Row label={t('w.extra.total')} value={money(price * months, t)} bold />
                </Card>
                <Btn
                  label={t('w.extra.subscribe')}
                  loading={buy.isPending}
                  onPress={() => buy.mutate()}
                />
              </>
            )}
            {hist.data?.length ? (
              <Card>
                <H>{t('w.site.proHistory')}</H>
                {hist.data.map((h) => (
                  <Row
                    key={h.id}
                    label={`${fmtDate(h.starts_at, language)} → ${fmtDate(h.ends_at, language)}`}
                    value={money(h.price, t)}
                  />
                ))}
              </Card>
            ) : null}
          </>
        );
      }}
    </Wrap>
  );
}

export { PortfolioScreen, CertificatesScreen } from './PortfolioCerts';
