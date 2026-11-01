import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Loading, ErrorBox, Muted, money, fmtDate } from '../ui';

// Buyurtma bo'yicha mijoz bilan yozishma. Usta faqat o'z ipini ko'radi (threads[0]).
export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const q = useQuery({
    queryKey: ['w', 'chat', id],
    queryFn: () => api.getChat(id),
    refetchInterval: 6000,
  });
  const messages = q.data?.threads?.[0]?.messages ?? [];

  // O'qilgan deb belgilash: yangi xabar kelganda.
  useEffect(() => {
    if (messages.length) api.markChatRead(id).catch(() => {});
  }, [id, messages.length]);

  const send = useMutation({
    mutationFn: (body) => api.sendChat(id, body),
    onSuccess: (data) => {
      setText('');
      qc.setQueryData(['w', 'chat', id], data);
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  const ordered = [...messages].reverse();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
          {t('w.order.chat')}
        </Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorBox error={q.error} onRetry={q.refetch} />
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={ordered}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 14, gap: 8 }}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <Muted style={{ textAlign: 'center' }}>{t('w.chat.empty')}</Muted>
              </View>
            }
            renderItem={({ item: m }) => {
              const mine = m.sender_type === 'worker';
              const system = m.sender_type === 'system' || m.kind === 'system';
              if (system) {
                return <Muted style={{ textAlign: 'center' }}>{m.body}</Muted>;
              }
              const isOffer = m.kind === 'offer';
              return (
                <View
                  style={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    backgroundColor: mine ? theme.orange : theme.card,
                    borderRadius: 16,
                    paddingHorizontal: 13,
                    paddingVertical: 9,
                    borderWidth: mine ? 0 : 1,
                    borderColor: theme.border,
                  }}
                >
                  {isOffer ? (
                    <Text style={{ color: mine ? '#fff' : theme.orange, fontWeight: '800' }}>
                      {money(m.offer_price, t)}
                    </Text>
                  ) : null}
                  {m.body ? (
                    <Text style={{ color: mine ? '#fff' : theme.text, fontSize: 15 }}>
                      {m.body}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: mine ? 'rgba(255,255,255,0.75)' : theme.faint,
                      fontSize: 11,
                      marginTop: 3,
                      textAlign: 'right',
                    }}
                  >
                    {fmtDate(m.created_at, language)}
                  </Text>
                </View>
              );
            }}
          />
        )}
        {q.data?.can_send === false ? (
          <Muted style={{ textAlign: 'center', padding: 12 }}>{t('w.chat.closed')}</Muted>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('w.chat.placeholder')}
              placeholderTextColor={theme.faint}
              multiline
              maxLength={1000}
              style={{
                flex: 1,
                maxHeight: 110,
                backgroundColor: theme.inputBg,
                color: theme.text,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 15,
              }}
            />
            <TouchableOpacity
              onPress={() => text.trim() && !send.isPending && send.mutate(text.trim())}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: theme.orange,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: text.trim() ? 1 : 0.5,
              }}
              accessibilityRole="button"
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
