import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
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

export function ComplaintsScreen() {
  const { t, language } = useLanguage();
  const q = useQuery({ queryKey: ['w', 'complaints'], queryFn: api.getComplaints });
  return (
    <Wrap title={t('w.extra.complaints')} q={q}>
      {(d) => {
        const items = Array.isArray(d) ? d : d?.items || [];
        return items.length ? (
          items.map((c) => (
            <Card key={c.id}>
              <Muted>
                #{c.order_code} · {fmtDate(c.published_at || c.created_at, language)}
              </Muted>
              <Txt style={{ fontWeight: '700' }}>{c.reason}</Txt>
              {c.body ? <Txt>{c.body}</Txt> : null}
              {c.reply ? (
                <Card>
                  <Muted>{t('w.extra.yourReply')}</Muted>
                  <Txt>{c.reply}</Txt>
                </Card>
              ) : c.can_reply ? (
                <ReplyForm complaint={c} />
              ) : null}
            </Card>
          ))
        ) : (
          <Empty text={t('w.extra.noComplaints')} />
        );
      }}
    </Wrap>
  );
}

export function AccountScreen() {
  const { t } = useLanguage();
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
  return (
    <Screen title={t('w.extra.account')}>
      <Card>
        <H>Telegram</H>
        {tg.isPending ? (
          <Loading />
        ) : tg.isError ? (
          <Muted>{t('w.loadFailed')}</Muted>
        ) : (
          <Row
            label={t('w.extra.telegramStatus')}
            value={
              !tg.data?.enabled
                ? t('w.extra.tgOff')
                : tg.data?.linked
                  ? t('w.extra.tgLinked')
                  : t('w.extra.tgNotLinked')
            }
          />
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
