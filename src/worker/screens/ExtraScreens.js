import { useState } from 'react';
import { Switch, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import ReferralPanel from '../../components/ReferralPanel';
import { useReferral } from '../../queries/workerHome';
import { Screen, Card, H, Txt, Muted, Btn, Field, Loading, ErrorBox, fmtDate, money } from '../ui';

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

// Katta taklif paneli (bosh sahifadagi dizayn) + "kim taklif qilgan" kodi.
function ReferralBody({ d }) {
  const r = useReferral();
  return (
    <>
      {r.data || d ? (
        <ReferralPanel r={{ ...d, code: d.code ?? d.referral_code, ...(r.data || {}) }} />
      ) : (
        <Loading />
      )}
      <ClaimCard d={d} />
    </>
  );
}

export function ReferralScreen() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'referrals'], queryFn: api.getReferrals });
  return (
    <Wrap title={t('w.extra.referral')} q={q}>
      {(d) => <ReferralBody d={d} />}
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
        const soft = theme.isDark ? '#ffffff0D' : '#0000000A';
        return (
          <>
            {/* Tepa kartochka: PRO belgisi, holat va qisqa izoh */}
            <View
              style={{
                padding: 20,
                borderRadius: 28,
                gap: 14,
                overflow: 'hidden',
                backgroundColor: theme.violet,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  right: -40,
                  top: -40,
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  backgroundColor: 'rgba(255,255,255,0.13)',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 40,
                  bottom: -50,
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.22)',
                  }}
                >
                  <Ionicons name="diamond" size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>PRO</Txt>
                  {d?.is_pro ? (
                    <Txt
                      style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' }}
                    >
                      {t('w.site.proUntil', { d: fmtDate(d.pro_until, language) })}
                    </Txt>
                  ) : null}
                </View>
                {d?.is_pro ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.22)',
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={15} color="#fff" />
                    <Txt style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                      {t('w.extra.proActive')}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <Txt style={{ color: 'rgba(255,255,255,0.92)', fontSize: 13.5, lineHeight: 20 }}>
                {t('w.extra.proHint')}
              </Txt>
              {d?.fee_discount_percent ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 13,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Ionicons name="pricetag" size={14} color="#fff" />
                  <Txt style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>
                    {t('w.site.proDiscount', { n: d.fee_discount_percent })}
                  </Txt>
                </View>
              ) : null}
            </View>

            {/* Avto-yangilash (faol obunada) */}
            {d?.is_pro ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.violet + '1F',
                  }}
                >
                  <Ionicons name="sync" size={20} color={theme.violet} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '800', fontSize: 15 }}>{t('w.site.autoRenew')}</Txt>
                  <Muted style={{ fontSize: 12.5 }}>{t('w.site.autoRenewHint')}</Muted>
                </View>
                <Switch
                  value={!!d.auto_renew}
                  disabled={renew.isPending}
                  onValueChange={(v) => renew.mutate(v)}
                  trackColor={{ true: theme.violet }}
                />
              </View>
            ) : null}

            {d?.enabled === false ? null : (
              <>
                {/* Tarif tanlash: 2x2 plitka */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[1, 3, 6, 12].map((m) => {
                    const on = m === months;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setMonths(m)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={{
                          width: '48%',
                          flexGrow: 1,
                          gap: 4,
                          padding: 14,
                          borderRadius: 22,
                          backgroundColor: on ? theme.violet + '1A' : theme.card,
                          borderWidth: 2,
                          borderColor: on ? theme.violet : theme.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Txt style={{ fontSize: 26, fontWeight: '900' }}>{m}</Txt>
                          <Ionicons
                            name={on ? 'checkmark-circle' : 'ellipse-outline'}
                            size={22}
                            color={on ? theme.violet : theme.faint}
                          />
                        </View>
                        <Muted style={{ fontSize: 13, fontWeight: '700' }}>
                          {t('w.extra.months')}
                        </Muted>
                        <Txt style={{ fontSize: 14, fontWeight: '800', color: theme.violet }}>
                          {money(price * m, t)}
                        </Txt>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Jami va obuna bo'lish */}
                <View
                  style={{
                    padding: 14,
                    borderRadius: 22,
                    gap: 12,
                    backgroundColor: soft,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Muted style={{ fontSize: 14 }}>{t('w.extra.total')}</Muted>
                    <Txt style={{ fontSize: 22, fontWeight: '900' }}>
                      {money(price * months, t)}
                    </Txt>
                  </View>
                  <Btn
                    icon="diamond"
                    label={t('w.extra.subscribe')}
                    loading={buy.isPending}
                    onPress={() => buy.mutate()}
                  />
                </View>
              </>
            )}

            {/* Obunalar tarixi */}
            {hist.data?.length ? (
              <View
                style={{
                  borderRadius: 22,
                  overflow: 'hidden',
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 14,
                    paddingBottom: 8,
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={theme.violet} />
                  <H>{t('w.site.proHistory')}</H>
                </View>
                {hist.data.map((h) => (
                  <View
                    key={h.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                    }}
                  >
                    <Txt style={{ flex: 1, fontSize: 13.5 }}>
                      {fmtDate(h.starts_at, language)} → {fmtDate(h.ends_at, language)}
                    </Txt>
                    <Txt style={{ fontWeight: '800', fontSize: 13.5 }}>{money(h.price, t)}</Txt>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        );
      }}
    </Wrap>
  );
}

export { PortfolioScreen, CertificatesScreen } from './PortfolioCerts';
