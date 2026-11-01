import { useState } from 'react';
import { Share, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Row,
  Segments,
  Loading,
  ErrorBox,
  Empty,
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
            <Card>
              <Row label={t('w.extra.invited')} value={String(d.invited_count ?? d.invited ?? 0)} />
              <Row label={t('w.extra.started')} value={String(d.started_count ?? d.started ?? 0)} />
              <Row label={t('w.extra.earned')} value={money(d.earned_bonus ?? d.earned ?? 0, t)} />
            </Card>
          </>
        );
      }}
    </Wrap>
  );
}

const PRO_PRICE = 49000;

export function ProScreen() {
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['w', 'pro'], queryFn: api.getPro });
  const [months, setMonths] = useState(1);
  const buy = useMutation({
    mutationFn: () => api.subscribePro(months),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  return (
    <Wrap title={t('w.extra.pro')} q={q}>
      {(d) => (
        <>
          <Muted>{t('w.extra.proHint')}</Muted>
          {d?.active || d?.is_active || d?.pro_until ? (
            <Card>
              <H>{t('w.extra.proActive')}</H>
              <Muted>
                {t('w.extra.until')}: {fmtDate(d.pro_until || d.expires_at || d.until, language)}
              </Muted>
            </Card>
          ) : null}
          <Segments
            value={months}
            onChange={setMonths}
            options={[1, 3, 6, 12].map((m) => ({ value: m, label: `${m} ${t('w.extra.months')}` }))}
          />
          <Card>
            <Row label={t('w.extra.total')} value={money(PRO_PRICE * months, t)} bold />
          </Card>
          <Btn
            label={t('w.extra.subscribe')}
            loading={buy.isPending}
            onPress={() => buy.mutate()}
          />
        </>
      )}
    </Wrap>
  );
}

export function PortfolioScreen() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'portfolio'], queryFn: api.getPortfolio });
  return (
    <Wrap title={t('w.extra.portfolio')} q={q}>
      {(d) => {
        const items = Array.isArray(d) ? d : d?.items || [];
        return items.length ? (
          items.map((it) => {
            const photo = it.photos?.[0]?.url || it.photos?.[0] || it.photo_url;
            return (
              <Card key={it.id}>
                {typeof photo === 'string' ? (
                  <Image source={{ uri: photo }} style={{ height: 160, borderRadius: 10 }} />
                ) : null}
                <Txt style={{ fontWeight: '700' }}>{it.title}</Txt>
                {it.description ? <Muted>{it.description}</Muted> : null}
              </Card>
            );
          })
        ) : (
          <Empty text={t('w.extra.noPortfolio')} />
        );
      }}
    </Wrap>
  );
}

export function CertificatesScreen() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'certs'], queryFn: api.getMyCertificates });
  return (
    <Wrap title={t('w.extra.certificates')} q={q}>
      {(d) => {
        const items = Array.isArray(d) ? d : d?.items || [];
        return items.length ? (
          items.map((c) => (
            <Card key={c.id}>
              <Txt style={{ fontWeight: '700' }}>{c.title || c.name}</Txt>
              {c.status ? <Muted>{c.status}</Muted> : null}
            </Card>
          ))
        ) : (
          <Empty text={t('w.extra.noCerts')} />
        );
      }}
    </Wrap>
  );
}
