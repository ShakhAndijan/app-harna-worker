import { useState } from 'react';
import { View, Image, Linking, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Txt, Muted, Btn, Field, Pill, Loading, ErrorBox, Empty } from '../ui';

const MAX_PHOTOS = 6;

function confirmDelete(t, onYes) {
  appAlert(t('w.site.confirmDelete'), undefined, [
    { text: t('w.site.delete'), style: 'destructive', onPress: onYes },
    { text: t('common.cancel'), style: 'cancel' },
  ]);
}

// ── Portfolio ────────────────────────────────────────────────────────────────
export function PortfolioScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [uris, setUris] = useState([]);
  const q = useQuery({ queryKey: ['w', 'portfolio'], queryFn: api.getPortfolio });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['w', 'portfolio'] });
    qc.invalidateQueries({ queryKey: ['w', 'me'] });
  };

  const pick = async () => {
    const left = MAX_PHOTOS - uris.length;
    if (left <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: left,
      quality: 0.8,
    });
    if (!res.canceled) setUris((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const add = useMutation({
    mutationFn: () => api.addPortfolioItem({ title: title.trim(), description: desc.trim(), uris }),
    onSuccess: () => {
      setAdding(false);
      setTitle('');
      setDesc('');
      setUris([]);
      refresh();
    },
    onError,
  });
  const del = useMutation({ mutationFn: api.deletePortfolio, onSuccess: refresh, onError });

  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const showcase = useMutation({
    mutationFn: api.setShowcasePhoto,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'me'] }),
    onError,
  });
  const items = q.data || [];
  const photoUrl = (p) => (typeof p === 'string' ? p : p?.url);
  const allPhotos = items.flatMap((it) => (it.photos || []).map(photoUrl)).filter(Boolean);
  const picked = me.data?.showcase_photo;
  return (
    <Screen title={t('w.extra.portfolio')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {adding ? (
        <Card>
          <Field
            label={t('w.site.workTitle')}
            value={title}
            onChangeText={setTitle}
            maxLength={255}
          />
          <Field label={t('w.site.workDesc')} value={desc} onChangeText={setDesc} multiline />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {uris.map((u) => (
              <TouchableOpacity key={u} onPress={() => setUris((p) => p.filter((x) => x !== u))}>
                <Image source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 10 }} />
              </TouchableOpacity>
            ))}
          </View>
          <Btn kind="ghost" icon="images-outline" label={t('w.site.pickPhotos')} onPress={pick} />
          <Btn
            label={t('w.site.save')}
            loading={add.isPending}
            disabled={!title.trim()}
            onPress={() => add.mutate()}
          />
        </Card>
      ) : (
        <Btn icon="add" label={t('w.site.addWork')} onPress={() => setAdding(true)} />
      )}
      {allPhotos.length ? (
        <Card>
          <Txt style={{ fontWeight: '700' }}>{t('w.site.showcase')}</Txt>
          <Muted>{t('w.site.showcaseHint')}</Muted>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {allPhotos.map((u) => (
                <TouchableOpacity key={u} onPress={() => showcase.mutate(u)}>
                  <Image
                    source={{ uri: u }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: u === picked ? theme.orange : 'transparent',
                    }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {picked ? (
            <Btn
              kind="ghost"
              label={t('w.site.showcaseClear')}
              loading={showcase.isPending}
              onPress={() => showcase.mutate(null)}
            />
          ) : null}
        </Card>
      ) : null}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <Empty text={t('w.extra.noPortfolio')} />
      ) : (
        items.map((it) => {
          const p = it.photos?.[0];
          const photo = typeof p === 'string' ? p : p?.url;
          return (
            <Card key={it.id}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ height: 160, borderRadius: 10 }} />
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt style={{ fontWeight: '700', flex: 1 }}>{it.title}</Txt>
                <TouchableOpacity
                  hitSlop={10}
                  onPress={() => confirmDelete(t, () => del.mutate(it.id))}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.red} />
                </TouchableOpacity>
              </View>
              {it.description ? <Muted>{it.description}</Muted> : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

// ── Sertifikatlar ────────────────────────────────────────────────────────────
const STATUS_COLOR = (theme) => ({
  approved: theme.green,
  pending: theme.orange,
  rejected: theme.red,
});

export function CertificatesScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', issued_by: '', issued_at: '', expires_at: '' });
  const [doc, setDoc] = useState(null);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const pickDoc = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) setDoc(res.assets[0].uri);
  };
  const q = useQuery({ queryKey: ['w', 'certs'], queryFn: api.getMyCertificates });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const refresh = () => qc.invalidateQueries({ queryKey: ['w', 'certs'] });

  const add = useMutation({
    mutationFn: () => {
      const body = {
        title: f.title.trim(),
        issued_by: f.issued_by.trim() || null,
        issued_at: f.issued_at.trim() || null,
        expires_at: f.expires_at.trim() || null,
      };
      return doc ? api.addCertificateWithDocument({ uri: doc, ...body }) : api.addCertificate(body);
    },
    onSuccess: () => {
      setDoc(null);
      setAdding(false);
      setF({ title: '', issued_by: '', issued_at: '', expires_at: '' });
      refresh();
    },
    onError,
  });
  const del = useMutation({ mutationFn: api.deleteCertificate, onSuccess: refresh, onError });
  const openDoc = async (id) => {
    try {
      const r = await api.getDocumentUrl(id);
      const url =
        r?.url ||
        r?.download_url ||
        Object.values(r || {}).find((v) => typeof v === 'string' && v.startsWith('http'));
      if (url) Linking.openURL(url);
    } catch (e) {
      onError(e);
    }
  };

  const items = Array.isArray(q.data) ? q.data : q.data?.items || [];
  const colors = STATUS_COLOR(theme);
  return (
    <Screen title={t('w.extra.certificates')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {adding ? (
        <Card>
          <Field label={t('w.site.certTitle')} value={f.title} onChangeText={set('title')} />
          <Field label={t('w.site.issuedBy')} value={f.issued_by} onChangeText={set('issued_by')} />
          <Field
            label={t('w.site.issuedAt')}
            value={f.issued_at}
            onChangeText={set('issued_at')}
            placeholder="2025-01-31"
          />
          <Field
            label={t('w.site.expiresAt')}
            value={f.expires_at}
            onChangeText={set('expires_at')}
            placeholder="2030-01-31"
          />
          {doc ? (
            <TouchableOpacity onPress={() => setDoc(null)}>
              <Image source={{ uri: doc }} style={{ width: 96, height: 96, borderRadius: 10 }} />
            </TouchableOpacity>
          ) : null}
          <Btn
            kind="ghost"
            icon="image-outline"
            label={t('w.site.certPickPhoto')}
            onPress={pickDoc}
          />
          <Btn
            label={t('w.site.save')}
            loading={add.isPending}
            disabled={!f.title.trim()}
            onPress={() => add.mutate()}
          />
        </Card>
      ) : (
        <Btn icon="add" label={t('w.site.addCert')} onPress={() => setAdding(true)} />
      )}
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <Empty text={t('w.extra.noCerts')} />
      ) : (
        items.map((c) => (
          <Card key={c.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt style={{ fontWeight: '700', flex: 1 }}>{c.title}</Txt>
              <TouchableOpacity
                hitSlop={10}
                onPress={() => confirmDelete(t, () => del.mutate(c.id))}
              >
                <Ionicons name="trash-outline" size={20} color={theme.red} />
              </TouchableOpacity>
            </View>
            {c.status ? (
              <Pill label={t(`w.site.${c.status}`)} color={colors[c.status] || theme.faint} />
            ) : null}
            {c.photo_url ? (
              <Btn
                kind="ghost"
                icon="document-outline"
                label={t('w.site.viewDoc')}
                onPress={() => openDoc(c.id)}
              />
            ) : null}
            {c.issued_by ? <Muted>{c.issued_by}</Muted> : null}
            {c.rejected_reason ? <Muted>{c.rejected_reason}</Muted> : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
