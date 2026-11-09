import { useState } from 'react';
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Txt, Muted, Btn, Field, Loading, ErrorBox } from '../ui';

const MAX_PHOTOS = 6;

function confirmDelete(t, onYes) {
  appAlert(t('w.site.confirmDelete'), undefined, [
    { text: t('w.site.delete'), style: 'destructive', onPress: onYes },
    { text: t('common.cancel'), style: 'cancel' },
  ]);
}

// ── Portfolio ────────────────────────────────────────────────────────────────
const photoUrl = (p) => (typeof p === 'string' ? p : p?.url);

// Ish namunasini to'liq ekranda ko'rish: rasmlar varaqlanadi, pastda ma'lumot paneli.
function WorkViewer({ work, onClose, onDelete }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const photos = (work.photos || []).map(photoUrl).filter(Boolean);
  const round = {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#07090D' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" style={round}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        {photos.length > 1 ? (
          <View
            style={{
              paddingHorizontal: 12,
              height: 30,
              borderRadius: 15,
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
              {idx + 1} / {photos.length}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <TouchableOpacity onPress={onDelete} hitSlop={10} accessibilityRole="button" style={round}>
          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {photos.length ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {photos.map((u) => (
              <View key={u} style={{ width, paddingHorizontal: 12 }}>
                <Image
                  source={{ uri: u }}
                  resizeMode="contain"
                  style={{ width: '100%', height: width * 1.2, borderRadius: 20 }}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Ionicons name="image-outline" size={64} color="rgba(255,255,255,0.25)" />
          </View>
        )}
        {photos.length > 1 ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
            }}
          >
            {photos.map((u, i) => (
              <View
                key={u}
                style={{
                  width: i === idx ? 20 : 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: i === idx ? theme.orange : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={{
          gap: 8,
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: insets.bottom + 18,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            alignSelf: 'center',
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
        />
        <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900' }}>{work.title}</Text>
        {work.description ? (
          <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14.5, lineHeight: 21 }}>
            {work.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PortfolioScreen() {
  const { theme } = useTheme();
  const { width: winW } = useWindowDimensions();
  const thumb = Math.floor((winW - 40 - 20) / 3);
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [uris, setUris] = useState([]);
  const [viewer, setViewer] = useState(null); // ko'rilayotgan namuna
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
  const closeAdd = () => {
    setAdding(false);
    setTitle('');
    setDesc('');
    setUris([]);
  };

  const add = useMutation({
    mutationFn: () => api.addPortfolioItem({ title: title.trim(), description: desc.trim(), uris }),
    onSuccess: () => {
      closeAdd();
      refresh();
    },
    onError,
  });
  const del = useMutation({
    mutationFn: api.deletePortfolio,
    onSuccess: () => {
      setViewer(null);
      refresh();
    },
    onError,
  });

  const items = q.data || [];

  const plus = (
    <TouchableOpacity
      onPress={() => setAdding(true)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('w.site.addWork')}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.orange,
      }}
    >
      <Ionicons name="add" size={24} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Screen
      title={t('w.extra.portfolio')}
      right={plus}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
    >
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.orange + '1F',
            }}
          >
            <Ionicons name="images" size={40} color={theme.orange} />
          </View>
          <Muted style={{ textAlign: 'center' }}>{t('w.extra.noPortfolio')}</Muted>
          <Btn icon="add" label={t('w.site.addWork')} onPress={() => setAdding(true)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((it) => {
            const photos = (it.photos || []).map(photoUrl).filter(Boolean);
            return (
              <View
                key={it.id}
                style={{
                  width: '48%',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity
                  onPress={() => setViewer(it)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={[theme.orange, theme.orange + '66']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#ffffffEE', fontSize: 56, fontWeight: '900' }}>
                      {(it.title || '?').trim().charAt(0).toUpperCase()}
                    </Text>
                    {photos[0] ? (
                      <Image
                        source={{ uri: photos[0] }}
                        resizeMode="cover"
                        style={{ ...StyleSheet.absoluteFillObject }}
                      />
                    ) : null}
                    {photos.length > 1 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 9,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                        }}
                      >
                        <Ionicons name="images" size={13} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>
                          {photos.length}
                        </Text>
                      </View>
                    ) : null}
                  </LinearGradient>
                  <View style={{ padding: 10, gap: 4 }}>
                    <Txt style={{ fontWeight: '800', fontSize: 14.5 }} numberOfLines={2}>
                      {it.title}
                    </Txt>
                    {it.description ? (
                      <Muted style={{ fontSize: 12 }} numberOfLines={2}>
                        {it.description}
                      </Muted>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <View
                  style={{
                    flexDirection: 'row',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setViewer(it)}
                    accessibilityRole="button"
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 11,
                    }}
                  >
                    <Ionicons name="images-outline" size={17} color={theme.muted} />
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>
                      {photos.length}
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={{ width: StyleSheet.hairlineWidth, backgroundColor: theme.border }}
                  />
                  <TouchableOpacity
                    onPress={() => confirmDelete(t, () => del.mutate(it.id))}
                    accessibilityRole="button"
                    accessibilityLabel={t('w.site.delete')}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 11,
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.red} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Qo'shish oynasi */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onPress={closeAdd}
          />
          <View
            style={{
              maxHeight: '92%',
              backgroundColor: theme.bg,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingTop: 10,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                marginBottom: 14,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange + '1F',
                }}
              >
                <Ionicons name="images" size={22} color={theme.orange} />
              </View>
              <Txt style={{ flex: 1, fontWeight: '900', fontSize: 20 }}>{t('w.site.addWork')}</Txt>
              <TouchableOpacity
                onPress={closeAdd}
                hitSlop={10}
                accessibilityRole="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="close" size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt style={{ flex: 1, fontWeight: '800', fontSize: 14.5 }}>
                    {t('w.site.pickPhotos')}
                  </Txt>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      height: 24,
                      borderRadius: 12,
                      justifyContent: 'center',
                      backgroundColor: theme.orange + '1F',
                    }}
                  >
                    <Text style={{ color: theme.orange, fontSize: 12.5, fontWeight: '900' }}>
                      {uris.length}/{MAX_PHOTOS}
                    </Text>
                  </View>
                </View>
                {uris.length === 0 ? (
                  <TouchableOpacity
                    onPress={pick}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    style={{
                      height: 132,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderColor: theme.orange + 'AA',
                      backgroundColor: theme.orange + '0D',
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.orange,
                      }}
                    >
                      <Ionicons name="camera" size={24} color="#fff" />
                    </View>
                    <Text style={{ color: theme.orange, fontSize: 14, fontWeight: '800' }}>
                      {t('w.site.pickPhotos')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {uris.map((u, i) => (
                      <View key={u} style={{ width: thumb, height: thumb }}>
                        <Image
                          source={{ uri: u }}
                          style={{ width: thumb, height: thumb, borderRadius: 18 }}
                        />
                        {i === 0 ? (
                          <View
                            style={{
                              position: 'absolute',
                              left: 6,
                              bottom: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: theme.orange,
                            }}
                          >
                            <Ionicons name="star" size={12} color="#fff" />
                          </View>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => setUris((q) => q.filter((x) => x !== u))}
                          hitSlop={8}
                          accessibilityRole="button"
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                          }}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {uris.length < MAX_PHOTOS ? (
                      <TouchableOpacity
                        onPress={pick}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        style={{
                          width: thumb,
                          height: thumb,
                          borderRadius: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: theme.orange + 'AA',
                          backgroundColor: theme.orange + '0D',
                        }}
                      >
                        <Ionicons name="add" size={30} color={theme.orange} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </View>
              <Field
                label={t('w.site.workTitle')}
                value={title}
                onChangeText={setTitle}
                maxLength={255}
              />
              <Field label={t('w.site.workDesc')} value={desc} onChangeText={setDesc} multiline />
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 28,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <Btn
                icon="checkmark-circle"
                label={t('w.site.save')}
                loading={add.isPending}
                disabled={!title.trim()}
                onPress={() => add.mutate()}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ko'rish oynasi */}
      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        {viewer ? (
          <WorkViewer
            key={viewer.id}
            work={viewer}
            onClose={() => setViewer(null)}
            onDelete={() => confirmDelete(t, () => del.mutate(viewer.id))}
          />
        ) : null}
      </Modal>
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
  const closeAdd = () => {
    setAdding(false);
    setDoc(null);
  };

  const plus = (
    <TouchableOpacity
      onPress={() => setAdding(true)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={t('w.site.addCert')}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.orange,
      }}
    >
      <Ionicons name="add" size={24} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Screen
      title={t('w.extra.certificates')}
      right={plus}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
    >
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorBox error={q.error} onRetry={q.refetch} />
      ) : !items.length ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.orange + '1F',
            }}
          >
            <Ionicons name="ribbon" size={40} color={theme.orange} />
          </View>
          <Muted style={{ textAlign: 'center' }}>{t('w.extra.noCerts')}</Muted>
          <Btn icon="add" label={t('w.site.addCert')} onPress={() => setAdding(true)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((c) => {
            const col = colors[c.status] || theme.faint;
            return (
              <View
                key={c.id}
                style={{
                  width: '48%',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  overflow: 'hidden',
                }}
              >
                <TouchableOpacity
                  onPress={() => (c.photo_url ? openDoc(c.id) : null)}
                  activeOpacity={c.photo_url ? 0.85 : 1}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={[theme.orange, theme.orange + '66']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="ribbon" size={48} color="#ffffffEE" />
                    {c.status ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 9,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                        }}
                      >
                        <View
                          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col }}
                        />
                        <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>
                          {t(`w.site.${c.status}`)}
                        </Text>
                      </View>
                    ) : null}
                  </LinearGradient>
                  <View style={{ padding: 10, gap: 4 }}>
                    <Txt style={{ fontWeight: '800', fontSize: 14.5 }} numberOfLines={2}>
                      {c.title}
                    </Txt>
                    {c.issued_by ? (
                      <Muted style={{ fontSize: 12 }} numberOfLines={1}>
                        {c.issued_by}
                      </Muted>
                    ) : null}
                    {c.issued_at ? (
                      <Muted style={{ fontSize: 11.5 }} numberOfLines={1}>
                        {String(c.issued_at).slice(0, 10)}
                      </Muted>
                    ) : null}
                    {c.rejected_reason ? (
                      <Text style={{ color: theme.red, fontSize: 11.5 }} numberOfLines={2}>
                        {c.rejected_reason}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <View
                  style={{
                    flexDirection: 'row',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => openDoc(c.id)}
                    disabled={!c.photo_url}
                    accessibilityRole="button"
                    accessibilityLabel={t('w.site.viewDoc')}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 11,
                      opacity: c.photo_url ? 1 : 0.35,
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color={theme.muted} />
                  </TouchableOpacity>
                  <View
                    style={{ width: StyleSheet.hairlineWidth, backgroundColor: theme.border }}
                  />
                  <TouchableOpacity
                    onPress={() => confirmDelete(t, () => del.mutate(c.id))}
                    accessibilityRole="button"
                    accessibilityLabel={t('w.site.delete')}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 11,
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.red} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Qo'shish oynasi */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' }}
            onPress={closeAdd}
          />
          <View
            style={{
              maxHeight: '92%',
              backgroundColor: theme.bg,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingTop: 10,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                marginBottom: 14,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange + '1F',
                }}
              >
                <Ionicons name="ribbon" size={22} color={theme.orange} />
              </View>
              <Txt style={{ flex: 1, fontWeight: '900', fontSize: 20 }}>{t('w.site.addCert')}</Txt>
              <TouchableOpacity
                onPress={closeAdd}
                hitSlop={10}
                accessibilityRole="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="close" size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {doc ? (
                <View style={{ height: 150 }}>
                  <Image
                    source={{ uri: doc }}
                    resizeMode="cover"
                    style={{ width: '100%', height: 150, borderRadius: 22 }}
                  />
                  <TouchableOpacity
                    onPress={() => setDoc(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                    }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickDoc}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  style={{
                    height: 120,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: theme.orange + 'AA',
                    backgroundColor: theme.orange + '0D',
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.orange,
                    }}
                  >
                    <Ionicons name="camera" size={22} color="#fff" />
                  </View>
                  <Text style={{ color: theme.orange, fontSize: 14, fontWeight: '800' }}>
                    {t('w.site.certPickPhoto')}
                  </Text>
                </TouchableOpacity>
              )}
              <Field label={t('w.site.certTitle')} value={f.title} onChangeText={set('title')} />
              <Field
                label={t('w.site.issuedBy')}
                value={f.issued_by}
                onChangeText={set('issued_by')}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field
                  style={{ flex: 1 }}
                  label={t('w.site.issuedAt')}
                  value={f.issued_at}
                  onChangeText={set('issued_at')}
                  placeholder="2025-01-31"
                />
                <Field
                  style={{ flex: 1 }}
                  label={t('w.site.expiresAt')}
                  value={f.expires_at}
                  onChangeText={set('expires_at')}
                  placeholder="2030-01-31"
                />
              </View>
            </ScrollView>
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 28,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <Btn
                icon="checkmark-circle"
                label={t('w.site.save')}
                loading={add.isPending}
                disabled={!f.title.trim()}
                onPress={() => add.mutate()}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
