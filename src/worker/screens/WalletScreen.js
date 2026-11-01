import { useState } from 'react';
import { View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
  Muted,
  Txt,
  Btn,
  Field,
  Chips,
  Segments,
  Loading,
  ErrorBox,
  Empty,
  Pill,
  money,
  num,
  fmtDate,
} from '../ui';

const PRESETS = [50000, 100000, 200000, 500000];

export default function WalletScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [tab, setTab] = useState('tx');
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState(null);
  const [wAmount, setWAmount] = useState('');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');

  const bal = useQuery({ queryKey: ['w', 'balance'], queryFn: api.getBalance });
  const providers = useQuery({ queryKey: ['w', 'providers'], queryFn: api.getPaymentProviders });
  const tx = useQuery({ queryKey: ['w', 'tx'], queryFn: () => api.getTransactions(50) });
  const wd = useQuery({ queryKey: ['w', 'withdrawals'], queryFn: () => api.getWithdrawals(30) });

  const refresh = () => qc.invalidateQueries({ queryKey: ['w'] });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));

  const list = providers.data?.providers || [];
  const chosen = provider || list[0];

  const topup = useMutation({
    mutationFn: () => api.createTopupIntent(amount.replace(/\s/g, ''), chosen, language),
    onSuccess: async (intent) => {
      await WebBrowser.openBrowserAsync(intent.checkout_url);
      refresh();
    },
    onError,
  });

  const withdraw = useMutation({
    mutationFn: () =>
      api.requestWithdrawal({
        amount: wAmount.replace(/\s/g, ''),
        payout_target: target.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      setWAmount('');
      setNote('');
      appAlert(t('w.wallet.withdrawSent'));
      refresh();
    },
    onError,
  });

  if (bal.isPending)
    return (
      <Screen back={false} title={t('w.wallet.title')}>
        <Loading />
      </Screen>
    );
  if (bal.isError) {
    return (
      <Screen back={false} title={t('w.wallet.title')}>
        <ErrorBox error={bal.error} onRetry={bal.refetch} />
      </Screen>
    );
  }
  const b = bal.data;

  return (
    <Screen
      back={false}
      title={t('w.wallet.title')}
      onRefresh={refresh}
      refreshing={bal.isRefetching}
      bottomSpace
    >
      <Card>
        <Muted>{t('w.wallet.available')}</Muted>
        <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800' }}>
          {money(b.available_balance ?? b.wallet_balance, t)}
        </Text>
        <View style={{ gap: 4 }}>
          <Muted>
            {t('w.wallet.total')}: {money(b.wallet_balance, t)}
          </Muted>
          {num(b.held_balance) > 0 ? (
            <Muted>
              {t('w.wallet.held')}: {money(b.held_balance, t)}
            </Muted>
          ) : null}
          {num(b.bonus_balance) > 0 ? (
            <Muted>
              {t('w.wallet.bonus')}: {money(b.bonus_balance, t)}
            </Muted>
          ) : null}
          {b.fees_enabled && num(b.offer_fee) > 0 ? (
            <Muted>
              {t('w.wallet.offerFee')}: {money(b.offer_fee, t)}
            </Muted>
          ) : null}
        </View>
      </Card>

      <Segments
        value={tab}
        onChange={setTab}
        options={[
          { value: 'tx', label: t('w.wallet.history') },
          { value: 'topup', label: t('w.wallet.topup') },
          { value: 'withdraw', label: t('w.wallet.withdraw') },
        ]}
      />

      {tab === 'topup' ? (
        <Card>
          <H>{t('w.wallet.topup')}</H>
          <Chips
            value={Number(amount.replace(/\s/g, '')) || null}
            onChange={(v) => setAmount(String(v))}
            options={PRESETS.map((v) => ({ value: v, label: money(v, t) }))}
          />
          <Field
            label={t('w.wallet.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          {list.length ? (
            <Chips
              value={chosen}
              onChange={setProvider}
              options={list.map((p) => ({
                value: p,
                label: p.charAt(0).toUpperCase() + p.slice(1),
              }))}
            />
          ) : (
            <Muted>{t('w.wallet.noProviders')}</Muted>
          )}
          <Btn
            label={t('w.wallet.pay')}
            loading={topup.isPending}
            disabled={!chosen || num(amount.replace(/\s/g, '')) < 1000}
            onPress={() => topup.mutate()}
          />
        </Card>
      ) : null}

      {tab === 'withdraw' ? (
        <>
          <Card>
            <H>{t('w.wallet.withdraw')}</H>
            <Muted>
              {t('w.wallet.withdrawable', {
                sum: money(b.withdrawable_balance ?? b.wallet_balance, t),
              })}
            </Muted>
            <Field
              label={t('w.wallet.amount')}
              value={wAmount}
              onChangeText={setWAmount}
              keyboardType="numeric"
            />
            <Field
              label={t('w.wallet.target')}
              value={target}
              onChangeText={setTarget}
              placeholder="8600 0000 0000 0000"
            />
            <Field label={t('w.wallet.note')} value={note} onChangeText={setNote} />
            <Btn
              label={t('w.wallet.requestWithdraw')}
              loading={withdraw.isPending}
              disabled={num(wAmount.replace(/\s/g, '')) <= 0 || target.trim().length < 4}
              onPress={() => withdraw.mutate()}
            />
          </Card>
          {(wd.data || []).map((w) => (
            <Card key={w.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt style={{ fontWeight: '800' }}>{money(w.amount, t)}</Txt>
                <Pill label={w.state} />
              </View>
              <Muted>{w.payout_target}</Muted>
              <Muted>{fmtDate(w.created_at, language)}</Muted>
              {w.decision_note ? <Muted>{w.decision_note}</Muted> : null}
            </Card>
          ))}
        </>
      ) : null}

      {tab === 'tx' ? (
        tx.isPending ? (
          <Loading />
        ) : !tx.data?.length ? (
          <Empty icon="receipt-outline" text={t('w.wallet.noTx')} />
        ) : (
          tx.data.map((x) => {
            const plus = num(x.amount) >= 0;
            return (
              <Card key={x.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Txt style={{ fontWeight: '700', flex: 1 }}>
                    {t(`w.tx.${x.type}`) === `w.tx.${x.type}` ? x.type : t(`w.tx.${x.type}`)}
                  </Txt>
                  <Text
                    style={{
                      color: plus ? theme.green : theme.red,
                      fontWeight: '800',
                      fontSize: 15,
                    }}
                  >
                    {plus ? '+' : '−'}
                    {money(Math.abs(num(x.amount)), t)}
                  </Text>
                </View>
                {x.description ? <Muted>{x.description}</Muted> : null}
                {x.order_code ? <Muted>#{x.order_code}</Muted> : null}
                <Muted>{fmtDate(x.created_at, language)}</Muted>
              </Card>
            );
          })
        )
      ) : null}
    </Screen>
  );
}
