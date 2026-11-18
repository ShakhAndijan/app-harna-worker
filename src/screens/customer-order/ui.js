import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';

// Mijoz buyurtma bloklari uchun umumiy yordamchilar.
export { Button } from '../worker/OrderFieldActions';

export const useL = (texts) => {
  const { language } = useLanguage();
  return texts[language] ?? texts.uz;
};

export const fill = (s, vars) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v ?? '—')), s);

export const stamp = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const money = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU');

export const photoUrl = (p) => (typeof p === 'string' ? p : (p?.url ?? p?.file_url ?? null));

export const confirmBox = (title, message, cancel, label, onOk, destructive = false) =>
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: label, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);

/** Rangli xabar kartasi (sayt `Alert` bloklari o'rniga). tone: info | warn | ok */
export function Notice({ tone = 'info', title, children, icon = 'information-circle' }) {
  const { theme: t } = useTheme();
  const color = tone === 'ok' ? '#2eb872' : tone === 'warn' ? '#f5b81f' : t.muted;
  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: t.card,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Ionicons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, color: t.text, fontWeight: '800', fontSize: 14.5, lineHeight: 20 }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function Muted({ children }) {
  const { theme: t } = useTheme();
  return <Text style={{ color: t.muted, fontSize: 13, lineHeight: 19 }}>{children}</Text>;
}

/** Galereyadan suratlarni tanlab, `upload(uri, mime)` bilan yuklaydigan hook. */
export function usePhotoPicker(max, upload, errText) {
  const [items, setItems] = useState([]); // { uri, key }
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const left = max - items.length;
    if (left <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: left,
      quality: 0.8,
    });
    if (res.canceled) return;
    setBusy(true);
    try {
      const added = [];
      for (const a of res.assets.slice(0, left)) {
        added.push({ uri: a.uri, key: await upload(a.uri, a.mimeType || 'image/jpeg') });
      }
      setItems((p) => [...p, ...added]);
    } catch (e) {
      appAlert(e?.message || errText);
    } finally {
      setBusy(false);
    }
  };
  const remove = (key) => setItems((p) => p.filter((i) => i.key !== key));
  const reset = () => setItems([]);
  return { items, keys: items.map((i) => i.key), busy, add, remove, reset };
}

export function PhotoStrip({ items, onRemove, size = 64 }) {
  const { theme: t } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((i) => (
        <View key={i.key ?? i.uri}>
          <Image source={{ uri: i.uri }} style={{ width: size, height: size, borderRadius: 10 }} />
          {!!onRemove && (
            <TouchableOpacity
              onPress={() => onRemove(i.key)}
              hitSlop={6}
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: t.red,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

export function Chip({ label, active, onPress, disabled }) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: active ? t.orange : t.border,
        backgroundColor: active ? t.orange + '1f' : t.card,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: active ? t.orange : t.text, fontWeight: '700', fontSize: 13.5 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
