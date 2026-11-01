import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { formatNumber } from '../utils/format';

// ── Yordamchilar ──
export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const money = (v, t) => `${formatNumber(Math.round(num(v)))} ${t('w.currency')}`;

export function fmtDate(iso, language = 'uz') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const loc = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-GB' : 'uz-UZ';
  try {
    return d.toLocaleString(loc, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

// ── Ekran qobig'i ──
// Sarlavha (orqaga tugmasi bilan), skroll va tortib yangilash. Tab ichidagi ekranlar `back={false}`.
export function Screen({
  title,
  back = true,
  right,
  children,
  onRefresh,
  refreshing,
  scroll = true,
  pad = true,
  bottomSpace = false,
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        s.scroll,
        pad && { padding: 18 },
        bottomSpace && { paddingBottom: 110 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.orange}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, pad && { padding: 18 }]}>{children}</View>
  );
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      {(title || back) && (
        <View style={s.header}>
          {back ? (
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : null}
          <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {right}
        </View>
      )}
      {body}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }) {
  const { theme } = useTheme();
  const base = [s.card, { backgroundColor: theme.card, borderColor: theme.border }, style];
  if (onPress) {
    return (
      <TouchableOpacity style={base} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base}>{children}</View>;
}

export function H({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[s.h, { color: theme.text }, style]}>{children}</Text>;
}

export function Muted({ children, style, numberOfLines }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[{ color: theme.muted, fontSize: 13, lineHeight: 18 }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
}

export function Txt({ children, style, numberOfLines }) {
  const { theme } = useTheme();
  return (
    <Text style={[{ color: theme.text, fontSize: 15 }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Pill({ label, color }) {
  const { theme } = useTheme();
  const c = color || theme.orange;
  return (
    <View style={[s.pill, { backgroundColor: `${c}26` }]}>
      <Text style={{ color: c, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Btn({ label, onPress, loading, disabled, kind = 'primary', icon, style }) {
  const { theme } = useTheme();
  const off = disabled || loading;
  const bg =
    kind === 'primary'
      ? theme.orange
      : kind === 'danger'
        ? theme.red
        : kind === 'green'
          ? theme.green
          : 'transparent';
  const fg = kind === 'ghost' ? theme.text : '#fff';
  return (
    <TouchableOpacity
      style={[
        s.btn,
        { backgroundColor: bg, opacity: off ? 0.5 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: theme.border },
        style,
      ]}
      onPress={off ? undefined : onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 15, fontWeight: '700' }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  placeholder,
  secure,
  style,
  maxLength,
}) {
  const { theme } = useTheme();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Muted>{label}</Muted> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          s.input,
          { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
          multiline && { minHeight: 96, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

// Bir nechta variantdan tanlash (chiplar).
export function Chips({ options, value, onChange }) {
  const { theme } = useTheme();
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[
              s.chip,
              {
                borderColor: on ? theme.orange : theme.border,
                backgroundColor: on ? `${theme.orange}22` : theme.card,
              },
            ]}
          >
            <Text
              style={{ color: on ? theme.orange : theme.text, fontWeight: '600', fontSize: 13 }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Segments({ options, value, onChange }) {
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              s.seg,
              {
                backgroundColor: on ? theme.orange : theme.card,
                borderColor: on ? theme.orange : theme.border,
              },
            ]}
          >
            <Text style={{ color: on ? '#fff' : theme.text, fontWeight: '700', fontSize: 13 }}>
              {o.label}
              {o.count != null ? `  ${o.count}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function Row({ label, value, bold }) {
  if (value == null || value === '') return null;
  return (
    <View style={s.row}>
      <Muted style={{ flex: 1 }}>{label}</Muted>
      <Txt style={[{ flex: 1.4, textAlign: 'right', fontSize: 14 }, bold && { fontWeight: '800' }]}>
        {value}
      </Txt>
    </View>
  );
}

export function Loading() {
  const { theme } = useTheme();
  return (
    <View style={s.center}>
      <ActivityIndicator color={theme.orange} />
    </View>
  );
}

export function ErrorBox({ error, onRetry }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return (
    <View style={s.center}>
      <Text style={{ color: theme.red, textAlign: 'center' }}>
        {error?.message || t('w.loadFailed')}
      </Text>
      {onRetry ? (
        <Btn kind="ghost" label={t('w.retry')} onPress={onRetry} style={{ marginTop: 12 }} />
      ) : null}
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text }) {
  const { theme } = useTheme();
  return (
    <View style={s.center}>
      <Ionicons name={icon} size={40} color={theme.faint} />
      <Muted style={{ marginTop: 10, textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  h: { fontSize: 17, fontWeight: '800' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  btn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  seg: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 160 },
});
