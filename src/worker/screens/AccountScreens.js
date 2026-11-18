import { useState } from 'react';
import { View, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import useTelegramLink from '../../screens/profile/hooks/useTelegramLink';
import { formatPhoneDisplay } from '../../screens/profile/utils';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import PushPermissionBanner from '../../screens/notifications/PushPermissionBanner';
import {
  Screen,
  Card,
  H,
  Txt,
  Muted,
  Btn,
  Field,
  Pill,
  Loading,
  ErrorBox,
  Empty,
  Row,
  fmtDate,
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

function ReplyForm({ complaint }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => api.replyComplaint(complaint.id, body.trim()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'complaints'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  return (
    <>
      <Field
        label={t('w.extra.yourReply')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={1000}
      />
      <Btn
        label={t('w.extra.sendReply')}
        loading={send.isPending}
        disabled={!body.trim()}
        onPress={() => send.mutate()}
      />
    </>
  );
}

function ComplaintCard({ c }) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const replied = !!c.reply;
  const tone = replied ? theme.green : c.can_reply ? theme.red : theme.faint;
  return (
    <View
      style={{
        gap: 10,
        padding: 13,
        borderRadius: 20,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderLeftWidth: 5,
        borderColor: theme.border,
        borderLeftColor: tone,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tone + '22',
          }}
        >
          <Ionicons name={replied ? 'checkmark-done' : 'alert-circle'} size={19} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '900', fontSize: 14.5 }} numberOfLines={2}>
            {c.reason}
          </Txt>
          <Muted style={{ fontSize: 12 }}>
            #{c.order_code} · {fmtDate(c.published_at || c.created_at, language)}
          </Muted>
        </View>
      </View>
      {c.body ? <Txt style={{ fontSize: 13.5, lineHeight: 19 }}>{c.body}</Txt> : null}
      {replied ? (
        <View
          style={{
            gap: 3,
            padding: 11,
            borderRadius: 14,
            borderTopLeftRadius: 4,
            backgroundColor: theme.green + '14',
          }}
        >
          <Txt style={{ fontSize: 11.5, fontWeight: '900', color: theme.green }}>
            {t('w.extra.yourReply')}
          </Txt>
          <Txt style={{ fontSize: 13.5, lineHeight: 19 }}>{c.reply}</Txt>
        </View>
      ) : c.can_reply ? (
        <ReplyForm complaint={c} />
      ) : null}
    </View>
  );
}

export function ComplaintsScreen() {
  const { t } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'complaints'], queryFn: api.getComplaints });
  return (
    <Wrap title={t('w.extra.complaints')} q={q}>
      {(d) => {
        const items = Array.isArray(d) ? d : d?.items || [];
        return items.length ? (
          items.map((c) => <ComplaintCard key={c.id} c={c} />)
        ) : (
          <Empty text={t('w.extra.noComplaints')} />
        );
      }}
    </Wrap>
  );
}

const ACCOUNT_TEXTS = {
  uz: {
    login: 'Kirish ma‘lumotlari',
    phone: 'Telefon raqami',
    email: 'Email',
    change: 'O‘zgartirish',
    verify: 'Tasdiqlash',
  },
  ru: {
    login: 'Данные для входа',
    phone: 'Номер телефона',
    email: 'Email',
    change: 'Изменить',
    verify: 'Подтвердить',
  },
  en: {
    login: 'Sign-in details',
    phone: 'Phone number',
    email: 'Email',
    change: 'Change',
    verify: 'Verify',
  },
};

// Hisob qatori: ikonka, nom, qiymat (+ holat belgisi) va o'ngda amal tugmasi.
function LinkRow({ icon, label, value, tag, tagOk, action, danger, onPress }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.orange + '22',
        }}
      >
        <Ionicons name={icon} size={19} color={theme.orange} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Muted style={{ fontSize: 12 }}>{label}</Muted>
        <Txt style={{ fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {value}
        </Txt>
        {tag ? (
          <Txt
            style={{ fontSize: 11.5, fontWeight: '800', color: tagOk ? theme.green : theme.gold }}
          >
            {tag}
          </Txt>
        ) : null}
      </View>
      <TouchableOpacity onPress={onPress} hitSlop={8} activeOpacity={0.7}>
        <Txt
          style={{ fontWeight: '800', fontSize: 13.5, color: danger ? theme.red : theme.orange }}
        >
          {action}
        </Txt>
      </TouchableOpacity>
    </View>
  );
}

export function AccountScreen() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const x = ACCOUNT_TEXTS[language] ?? ACCOUNT_TEXTS.uz;
  const acct = useQuery({ queryKey: ['w', 'account-me'], queryFn: api.getAccountMe });
  const tgLink = useTelegramLink(true);
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const tg = useQuery({ queryKey: ['w', 'tgStatus'], queryFn: api.getTelegramStatus });
  const preview = useQuery({ queryKey: ['w', 'delPreview'], queryFn: api.getDeletionPreview });
  const del = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => signOut(),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  const blockers = preview.data?.blockers || [];
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const patch = useMutation({
    mutationFn: (body) => api.patchMe(body),
    onSuccess: (data) => qc.setQueryData(['w', 'me'], data),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  const alerts = [
    {
      key: 'notify_new_orders_telegram',
      icon: 'chatbubble-ellipses',
      color: '#2aabee',
      title: t('w.site.alertsText'),
    },
    {
      key: 'urgent_sound_only',
      icon: 'volume-high',
      color: theme.orange,
      title: t('w.site.urgentOnly'),
      sub: t('w.site.urgentOnlyText'),
    },
  ];
  return (
    <Screen title={t('w.extra.account')}>
      <PushPermissionBanner />
      {me.data ? (
        <View
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.orange,
              }}
            >
              <Ionicons name="notifications" size={21} color="#fff" />
            </View>
            <H style={{ flex: 1 }}>{t('w.site.alerts')}</H>
          </View>
          {alerts.map((a) => {
            const on = !!me.data[a.key];
            return (
              <View
                key={a.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: a.color + '22',
                  }}
                >
                  <Ionicons name={on ? a.icon : a.icon + '-outline'} size={19} color={a.color} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt style={{ fontWeight: '700', fontSize: 14 }}>{a.title}</Txt>
                  {a.sub ? <Muted style={{ fontSize: 12 }}>{a.sub}</Muted> : null}
                </View>
                <Switch
                  value={on}
                  disabled={patch.isPending}
                  onValueChange={(v) => patch.mutate({ [a.key]: v })}
                  trackColor={{ true: theme.orange }}
                />
              </View>
            );
          })}
        </View>
      ) : null}
      <Card style={{ gap: 4 }}>
        <H>{x.login}</H>
        <LinkRow
          icon="call-outline"
          label={x.phone}
          value={acct.data?.phone ? formatPhoneDisplay(acct.data.phone) : '—'}
          action={x.change}
          onPress={() => router.push('/change-phone')}
        />
        <LinkRow
          icon="mail-outline"
          label={x.email}
          value={acct.data?.email || t('account.email.statusNone')}
          tag={
            acct.data?.email
              ? t(
                  acct.data.is_email_verified !== false
                    ? 'account.email.statusVerified'
                    : 'account.email.statusUnverified'
                )
              : null
          }
          tagOk={acct.data?.is_email_verified !== false}
          action={acct.data?.email && acct.data.is_email_verified !== false ? x.change : x.verify}
          onPress={() => router.push('/verify-email')}
        />
        {tgLink.available ? (
          <LinkRow
            icon="paper-plane-outline"
            label="Telegram"
            value={tgLink.linked ? t('account.telegram.linked') : t('w.extra.tgNotLinked')}
            tagOk={tgLink.linked}
            action={tgLink.linked ? t('account.telegram.unlink') : t('account.telegram.connect')}
            danger={tgLink.linked}
            onPress={tgLink.toggle}
          />
        ) : (
          <Row label="Telegram" value={tg.isPending ? '…' : t('w.extra.tgOff')} />
        )}
      </Card>
      <Card style={{ borderColor: theme.red }}>
        <H style={{ color: theme.red }}>{t('w.extra.deleteAccount')}</H>
        <Muted>{t('w.extra.deleteHint')}</Muted>
        {blockers.map((b, i) => (
          <Pill key={i} label={String(b.message || b.code || b)} color={theme.red} />
        ))}
        <Btn
          kind="danger"
          label={t('w.extra.deleteAccount')}
          loading={del.isPending}
          disabled={preview.isPending || blockers.length > 0}
          onPress={() =>
            appConfirm({
              title: t('w.extra.deleteAccount'),
              message: t('w.extra.deleteConfirm'),
              confirmLabel: t('w.delete'),
              destructive: true,
              onConfirm: () => del.mutate(),
            })
          }
        />
      </Card>
    </Screen>
  );
}
