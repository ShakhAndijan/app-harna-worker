import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { appAlert } from '../../components/AppAlert';
import LocationMapPicker from '../../components/LocationMapPicker';
import TilBottomSheet, { LANGS } from '../../components/TilBottomSheet';
import { getErrorMessage } from '../../utils/errors';
import { supportRoute } from '../../navigation/params';
import * as api from '../api';
import { Screen, Card, H, Muted, Btn, Field, Segments, Loading, ErrorBox, num } from '../ui';

const pad = (n) => String(n).padStart(2, '0');

export { default as StatsScreen } from './StatsBlock';

// ── Kalendar ─────────────────────────────────────────────────────────────────
// days[]: { day, status: 'off' | 'full' | 'open', weekly_off, booked, ... }
const dayMap = (data) => {
  const out = new Map();
  for (const it of data?.days || []) out.set(String(it.day).slice(0, 10), it);
  return out;
};

export function CalendarScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const month = `${cursor.y}-${pad(cursor.m + 1)}`;
  const q = useQuery({
    queryKey: ['w', 'calendar', month],
    queryFn: () => api.getCalendar(month),
    retry: false,
  });
  const router = useRouter();
  const [cap, setCap] = useState(null);
  const capacity = cap ?? (q.data?.daily_capacity != null ? String(q.data.daily_capacity) : '');
  const saveCap = useMutation({
    mutationFn: () => {
      const n =
        capacity.trim() === ''
          ? null
          : Math.min(50, Math.max(1, Math.round(Number(capacity)) || 1));
      return api.setCapacity(n);
    },
    onSuccess: () => {
      setCap(null);
      qc.invalidateQueries({ queryKey: ['w', 'calendar'] });
      appAlert(t('w.more.saved'));
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  const noSchedule = q.error?.code === 'schedule_missing';
  const toggle = useMutation({
    mutationFn: ({ day, off }) => api.toggleOffDate(day, off),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'calendar'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  const days = dayMap(q.data);
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // Dushanba — birinchi
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const shift = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <Screen title={t('w.more.calendar')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Muted>{t('w.more.calendarHint')}</Muted>
      <Card>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <TouchableOpacity onPress={() => shift(-1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <H>{`${month}`}</H>
          <TouchableOpacity onPress={() => shift(1)} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        {noSchedule ? (
          <>
            <Muted>{t('w.site.needSchedule')}</Muted>
            <Btn label={t('w.more.scheduleBtn')} onPress={() => router.push('/schedule')} />
          </>
        ) : q.isError ? (
          <ErrorBox error={q.error} onRetry={q.refetch} />
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={{ width: '14.28%', height: 44 }} />;
            const iso = `${month}-${pad(day)}`;
            const info = days.get(iso);
            const isOff = info?.status === 'off';
            const isFull = info?.status === 'full';
            return (
              <TouchableOpacity
                key={iso}
                disabled={toggle.isPending || !!info?.weekly_off}
                onPress={() => toggle.mutate({ day: iso, off: !isOff })}
                style={{
                  width: '14.28%',
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isOff ? theme.red : isFull ? theme.orange : 'transparent',
                    opacity: info?.weekly_off ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: isOff || isFull ? '#fff' : theme.text, fontWeight: '700' }}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Muted>● {t('w.more.working')}</Muted>
          <Text style={{ color: theme.red, fontSize: 13 }}>● {t('w.more.off')}</Text>
          <Text style={{ color: theme.orange, fontSize: 13 }}>● {t('w.more.full')}</Text>
        </View>
      </Card>
      {!noSchedule ? (
        <Card>
          <H>{t('w.site.capacity')}</H>
          <Field value={capacity} onChangeText={setCap} keyboardType="number-pad" placeholder="∞" />
          <Muted>{t('w.site.capacityHint')}</Muted>
          <Btn
            label={t('w.site.save')}
            loading={saveCap.isPending}
            onPress={() => saveCap.mutate()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

// ── Joylashuv ────────────────────────────────────────────────────────────────
export function LocationScreen() {
  const { t } = useLanguage();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const regions = useQuery({ queryKey: ['w', 'regions'], queryFn: api.getRegions });
  if (me.isPending || regions.isPending) {
    return (
      <Screen title={t('w.more.location')}>
        {me.isError ? <ErrorBox error={me.error} onRetry={me.refetch} /> : <Loading />}
      </Screen>
    );
  }
  return <LocationForm w={me.data} regions={regions.data || []} />;
}

function LocationForm({ w, regions }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const regionId = regions.find((x) => x.name === w.region)?.id ?? null;
  const districts = useQuery({
    queryKey: ['w', 'districts', regionId],
    queryFn: () => api.getDistricts(regionId),
    enabled: !!regionId,
  });
  const [mode, setMode] = useState(w.work_area_mode === 'districts' ? 'districts' : 'radius');
  const [radius, setRadius] = useState(w.work_radius_km != null ? String(w.work_radius_km) : '');
  // WorkerMe.work_districts — tuman NOMLARI; ro'yxat yuklangach id ga aylantiramiz.
  const [picked, setPicked] = useState(null);
  const pickedSet =
    picked ||
    new Set(
      (districts.data || [])
        .filter((d) => (w.work_districts || []).includes(d.name))
        .map((d) => d.id)
    );
  const [point, setPoint] = useState({
    lat: num(w.latitude) || null,
    lng: num(w.longitude) || null,
  });

  const toggleDistrict = (id) =>
    setPicked(() => {
      const n = new Set(pickedSet);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = useMutation({
    mutationFn: () => {
      const body = { work_area_mode: mode };
      if (mode === 'radius' && radius !== '')
        body.work_radius_km = Math.min(60, Math.max(1, Math.round(Number(radius)) || 1));
      if (mode === 'districts') body.work_district_ids = [...pickedSet];
      if (point.lat != null && point.lng != null) {
        body.latitude = point.lat;
        body.longitude = point.lng;
      }
      return api.patchMe(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w'] });
      appAlert(t('w.more.saved'));
      router.back();
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  return (
    <Screen title={t('w.more.location')}>
      <Card>
        <H>{t('w.more.zone')}</H>
        <Segments
          value={mode}
          onChange={setMode}
          options={[
            { value: 'radius', label: t('w.more.byRadius') },
            { value: 'districts', label: t('w.more.byDistricts') },
          ]}
        />
        {mode === 'radius' ? (
          <Field
            label={t('w.more.radiusKm')}
            value={radius}
            onChangeText={setRadius}
            keyboardType="number-pad"
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(districts.data || []).map((d) => {
                const on = pickedSet.has(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => toggleDistrict(d.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: on ? theme.orange : theme.border,
                      backgroundColor: on ? theme.orange + '22' : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        color: on ? theme.orange : theme.text,
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!pickedSet.size ? <Muted>{t('w.more.noDistricts')}</Muted> : null}
          </>
        )}
      </Card>
      <Card>
        <H>{t('w.more.point')}</H>
        <LocationMapPicker
          lat={point.lat}
          lng={point.lng}
          onChange={(la, ln) => setPoint({ lat: Number(la), lng: Number(ln) })}
          height={200}
          errorTitle={t('common.errorTitle')}
        />
        <Muted>{t('w.more.pointHint')}</Muted>
      </Card>
      <Btn label={t('common.save')} loading={save.isPending} onPress={() => save.mutate()} />
    </Screen>
  );
}

// ── Sozlamalar ───────────────────────────────────────────────────────────────
function Row({ icon, label, value, onPress, danger, right }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
    >
      <Ionicons name={icon} size={22} color={danger ? theme.red : theme.orange} />
      <Text
        style={{ flex: 1, color: danger ? theme.red : theme.text, fontSize: 15, fontWeight: '600' }}
      >
        {label}
      </Text>
      {value ? <Muted>{value}</Muted> : null}
      {right ||
        (onPress && !danger ? (
          <Ionicons name="chevron-forward" size={18} color={theme.faint} />
        ) : null)}
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { signOut } = useAuth();
  const [showLang, setShowLang] = useState(false);
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const tg = useQuery({ queryKey: ['w', 'tg'], queryFn: api.getTelegramStatus, retry: false });
  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));

  // Til va tema serverda ham saqlanadi (sayt bilan bir xil bo'lishi uchun); xato ilovani to'xtatmaydi.
  const syncPrefs = (body) => api.setPreferences(body).catch(() => {});
  const pickLanguage = (code) => {
    setLanguage(code);
    syncPrefs({ language: code });
  };
  const flipTheme = () => {
    toggleTheme();
    syncPrefs({ theme: theme.isDark ? 'light' : 'dark' });
  };

  const patch = useMutation({
    mutationFn: (body) => api.patchMe(body),
    onSuccess: (data) => qc.setQueryData(['w', 'me'], data),
    onError,
  });
  const connect = useMutation({
    mutationFn: api.linkTelegram,
    onSuccess: (r) => Linking.openURL(r.url),
    onError,
  });
  const disconnect = useMutation({
    mutationFn: api.unlinkTelegram,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'tg'] }),
    onError,
  });
  const linked = !!tg.data?.linked;

  return (
    <Screen title={t('w.more.settings')} onRefresh={tg.refetch}>
      <Card style={{ paddingVertical: 6 }}>
        <Row
          icon="earth-outline"
          label={t('w.more.language')}
          value={LANGS.find((l) => l.code === language)?.name}
          onPress={() => setShowLang(true)}
        />
        <Row
          icon="moon-outline"
          label={t('w.more.theme')}
          right={
            <Switch
              value={!!theme.isDark}
              onValueChange={flipTheme}
              trackColor={{ true: theme.orange }}
            />
          }
        />
        <Row
          icon="notifications-outline"
          label={t('w.more.notifications')}
          onPress={() => router.push('/notifications')}
        />
        <Row
          icon="shield-checkmark-outline"
          label={t('w.more.account')}
          onPress={() => router.push('/account')}
        />
        <Row
          icon="lock-closed-outline"
          label={t('w.more.changePassword')}
          onPress={() => router.push('/change-password')}
        />
        <Row
          icon="help-circle-outline"
          label={t('w.more.help')}
          onPress={() => router.push('/help')}
        />
        <Row
          icon="bulb-outline"
          label={t('w.more.suggestions')}
          onPress={() => router.push(supportRoute('suggestion'))}
        />
      </Card>

      {tg.data?.enabled !== false ? (
        <Card>
          <H>{t('w.site.telegram')}</H>
          <Muted>{linked ? t('w.site.telegramOn') : t('w.site.telegramOff')}</Muted>
          <Btn
            kind={linked ? 'ghost' : 'primary'}
            icon="paper-plane-outline"
            label={linked ? t('w.site.disconnect') : t('w.site.connect')}
            loading={connect.isPending || disconnect.isPending}
            onPress={() => (linked ? disconnect.mutate() : connect.mutate())}
          />
        </Card>
      ) : null}

      {me.data ? (
        <Card>
          <H>{t('w.site.alerts')}</H>
          <Row
            icon="chatbubble-ellipses-outline"
            label={t('w.site.alertsText')}
            right={
              <Switch
                value={!!me.data.notify_new_orders_telegram}
                onValueChange={(v) => patch.mutate({ notify_new_orders_telegram: v })}
                trackColor={{ true: theme.orange }}
              />
            }
          />
          <Row
            icon="volume-high-outline"
            label={t('w.site.urgentOnly')}
            right={
              <Switch
                value={!!me.data.urgent_sound_only}
                onValueChange={(v) => patch.mutate({ urgent_sound_only: v })}
                trackColor={{ true: theme.orange }}
              />
            }
          />
          <Muted>{t('w.site.urgentOnlyText')}</Muted>
        </Card>
      ) : null}

      <Card style={{ paddingVertical: 6 }}>
        <Row icon="log-out-outline" label={t('w.more.logout')} danger onPress={signOut} />
      </Card>
      <TilBottomSheet
        visible={showLang}
        currentLang={language}
        onSelect={pickLanguage}
        onClose={() => setShowLang(false)}
      />
    </Screen>
  );
}
