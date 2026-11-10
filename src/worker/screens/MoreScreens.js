import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Linking,
  LayoutAnimation,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import LocationMapPicker, { reverseGeocodeAddress } from '../../components/LocationMapPicker';
import TilBottomSheet, { LANGS } from '../../components/TilBottomSheet';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Muted, Btn, Loading, ErrorBox, num } from '../ui';

const pad = (n) => String(n).padStart(2, '0');

// ── Kalendar ─────────────────────────────────────────────────────────────────
// days[]: { day, status: 'off' | 'full' | 'open', weekly_off, booked, ... }
const dayMap = (data) => {
  const out = new Map();
  for (const it of data?.days || []) out.set(String(it.day).slice(0, 10), it);
  return out;
};

export function CalendarScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
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

  const MONTHS = {
    uz: [
      'Yanvar',
      'Fevral',
      'Mart',
      'Aprel',
      'May',
      'Iyun',
      'Iyul',
      'Avgust',
      'Sentyabr',
      'Oktyabr',
      'Noyabr',
      'Dekabr',
    ],
    ru: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };
  const monthName = (MONTHS[language] || MONTHS.uz)[cursor.m];
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  let nOff = 0;
  let nFull = 0;
  let nWork = 0;
  for (let d = 1; d <= count; d++) {
    const info = days.get(`${month}-${pad(d)}`);
    if (info?.status === 'off') nOff++;
    else if (info?.status === 'full') nFull++;
    else if (!info?.weekly_off) nWork++;
  }
  const capNum = Number(capacity) || 0;
  const navBtn = (icon, onPress) => (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={8}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.text} />
    </TouchableOpacity>
  );
  const stat = (color, n, label) => (
    <View
      key={label}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 2,
        paddingVertical: 12,
        borderRadius: 18,
        backgroundColor: color + '1F',
      }}
    >
      <Text style={{ color, fontSize: 22, fontWeight: '900' }}>{n}</Text>
      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );

  return (
    <Screen title={t('w.more.calendar')} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <View
        style={{
          borderRadius: 26,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          padding: 14,
          gap: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {navBtn('chevron-back', () => shift(-1))}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{monthName}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>{cursor.y}</Text>
          </View>
          {navBtn('chevron-forward', () => shift(1))}
        </View>

        {noSchedule ? (
          <>
            <Muted>{t('w.site.needSchedule')}</Muted>
            <Btn label={t('w.more.scheduleBtn')} onPress={() => router.push('/schedule')} />
          </>
        ) : q.isError ? (
          <ErrorBox error={q.error} onRetry={q.refetch} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stat(theme.green, nWork, t('w.more.working'))}
            {stat(theme.red, nOff, t('w.more.off'))}
            {stat(theme.orange, nFull, t('w.more.full'))}
          </View>
        )}

        <View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Text
                key={i}
                style={{
                  width: '14.28%',
                  textAlign: 'center',
                  color: i >= 5 ? theme.orange : theme.faint,
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {t(`w.schedule.day.${i}`).slice(0, 2)}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={{ width: '14.28%', height: 48 }} />;
              const iso = `${month}-${pad(day)}`;
              const info = days.get(iso);
              const isOff = info?.status === 'off';
              const isFull = info?.status === 'full';
              const weekly = !!info?.weekly_off;
              const isToday = iso === todayIso;
              const filled = isOff || isFull;
              return (
                <TouchableOpacity
                  key={iso}
                  disabled={toggle.isPending || weekly}
                  onPress={() => toggle.mutate({ day: iso, off: !isOff })}
                  activeOpacity={0.7}
                  style={{
                    width: '14.28%',
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isOff
                        ? theme.red
                        : isFull
                          ? theme.orange
                          : weekly
                            ? 'transparent'
                            : theme.green + '1A',
                      borderWidth: isToday ? 2 : 0,
                      borderColor: isToday ? (filled ? '#fff' : theme.orange) : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: filled ? '#fff' : weekly ? theme.faint : theme.text,
                        fontSize: 15,
                        fontWeight: filled || isToday ? '900' : '700',
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
          {[
            [theme.green, t('w.more.working')],
            [theme.red, t('w.more.off')],
            [theme.orange, t('w.more.full')],
          ].map(([c, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
              <Text style={{ color: theme.muted, fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Muted style={{ textAlign: 'center' }}>{t('w.more.calendarHint')}</Muted>

      {!noSchedule ? (
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            padding: 14,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
              <Ionicons name="layers-outline" size={22} color={theme.orange} />
            </View>
            <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '800' }}>
              {t('w.site.capacity')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setCap(capNum <= 1 ? '' : String(capNum - 1))}
                accessibilityRole="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.bg,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text
                style={{
                  minWidth: 32,
                  textAlign: 'center',
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: '900',
                }}
              >
                {capNum || '∞'}
              </Text>
              <TouchableOpacity
                onPress={() => setCap(String(Math.min(50, capNum + 1)))}
                accessibilityRole="button"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange,
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <Muted>{t('w.site.capacityHint')}</Muted>
          <Btn
            icon="checkmark-circle"
            label={t('w.site.save')}
            loading={saveCap.isPending}
            onPress={() => saveCap.mutate()}
          />
        </View>
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
  const [distOpen, setDistOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const insets = useSafeAreaInsets();
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
  // Tanlangan nuqtaning manzil nomi (koordinata o'rniga ko'rsatiladi).
  const [addr, setAddr] = useState(null);
  useEffect(() => {
    if (point.lat == null || point.lng == null) return;
    let cancelled = false;
    reverseGeocodeAddress(point.lat, point.lng).then((r) => {
      if (!cancelled) setAddr(r?.addressLine || '');
    });
    return () => {
      cancelled = true;
    };
  }, [point.lat, point.lng]);

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

  const km = Math.min(60, Math.max(0, Math.round(Number(radius)) || 0));
  const modes = [
    ['radius', 'radio-button-on-outline', t('w.more.byRadius')],
    ['districts', 'map-outline', t('w.more.byDistricts')],
  ];
  const stepBtn = (icon, onPress, filled) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? theme.orange : theme.bg,
        borderWidth: filled ? 0 : 1,
        borderColor: theme.border,
      }}
    >
      <Ionicons name={icon} size={20} color={filled ? '#fff' : theme.text} />
    </TouchableOpacity>
  );
  const box = {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 14,
    gap: 14,
  };

  return (
    <Screen title={t('w.more.location')}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {modes.map(([key, icon, label]) => {
          const on = mode === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setMode(key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={{
                flex: 1,
                gap: 10,
                padding: 14,
                borderRadius: 22,
                borderWidth: on ? 1.5 : 1,
                borderColor: on ? theme.orange : theme.border,
                backgroundColor: on ? theme.orange + '14' : theme.card,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? theme.orange : theme.orange + '1F',
                }}
              >
                <Ionicons name={icon} size={22} color={on ? '#fff' : theme.orange} />
              </View>
              <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mode === 'radius' ? (
        <View style={{ ...box, gap: 10, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ flex: 1, color: theme.text, fontSize: 14.5, fontWeight: '800' }}>
              {t('w.more.radiusKm')}
            </Text>
            {stepBtn('remove', () => setRadius(String(Math.max(1, km - 1))))}
            <Text
              style={{
                minWidth: 64,
                textAlign: 'center',
                color: theme.orange,
                fontSize: 20,
                fontWeight: '900',
              }}
            >
              {km || '—'} km
            </Text>
            {stepBtn('add', () => setRadius(String(Math.min(60, km + 1))), true)}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[5, 10, 20, 30, 50].map((n) => {
              const on = km === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRadius(String(n))}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? theme.orange : theme.bg,
                    borderWidth: 1,
                    borderColor: on ? theme.orange : theme.border,
                  }}
                >
                  <Text
                    style={{ color: on ? '#fff' : theme.text, fontSize: 13, fontWeight: '800' }}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={{ ...box, gap: 10, padding: 12 }}>
          <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '800' }}>
            {t('w.more.byDistricts')}
          </Text>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: distOpen || pickedSet.size ? theme.orange : theme.border,
              backgroundColor: theme.bg,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setDistOpen((v) => !v);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                minHeight: 50,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {pickedSet.size ? (
                  (districts.data || [])
                    .filter((d) => pickedSet.has(d.id))
                    .map((d) => (
                      <View
                        key={d.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingLeft: 10,
                          paddingRight: 6,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: theme.orange + '26',
                        }}
                      >
                        <Text style={{ color: theme.orange, fontSize: 12.5, fontWeight: '800' }}>
                          {d.name}
                        </Text>
                        <TouchableOpacity onPress={() => toggleDistrict(d.id)} hitSlop={8}>
                          <Ionicons name="close-circle" size={16} color={theme.orange} />
                        </TouchableOpacity>
                      </View>
                    ))
                ) : (
                  <Text style={{ color: theme.muted, fontSize: 14.5 }}>
                    {t('w.more.noDistricts')}
                  </Text>
                )}
              </View>
              <Ionicons
                name={distOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.muted}
              />
            </TouchableOpacity>
            {distOpen ? (
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: 240, borderTopWidth: 1, borderTopColor: theme.border }}
              >
                {(districts.data || []).map((d) => {
                  const on = pickedSet.has(d.id);
                  return (
                    <TouchableOpacity
                      key={d.id}
                      onPress={() => toggleDistrict(d.id)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 14,
                        height: 46,
                      }}
                    >
                      <Ionicons
                        name={on ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={on ? theme.orange : theme.faint}
                      />
                      <Text
                        style={{
                          flex: 1,
                          color: theme.text,
                          fontSize: 14.5,
                          fontWeight: on ? '800' : '600',
                        }}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setMapOpen(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: point.lat != null && point.lng != null ? theme.orange : theme.border,
          backgroundColor: theme.card,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              point.lat != null && point.lng != null ? theme.orange : theme.orange + '1F',
          }}
        >
          <Ionicons
            name="location"
            size={24}
            color={point.lat != null && point.lng != null ? '#fff' : theme.orange}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
            {t('w.more.point')}
          </Text>
          <Text
            style={{
              color: point.lat != null && point.lng != null ? theme.orange : theme.muted,
              fontSize: 13,
              fontWeight: '700',
            }}
            numberOfLines={1}
          >
            {point.lat != null && point.lng != null
              ? addr === ''
                ? t('w.more.pointSet')
                : addr || t('w.more.pointLoading')
              : t('w.more.pointNone')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.faint} />
      </TouchableOpacity>

      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <LocationMapPicker
            lat={point.lat}
            lng={point.lng}
            onChange={(la, ln) => setPoint({ lat: Number(la), lng: Number(ln) })}
            fill
            dark={theme.isDark}
            pinLabel={addr || ''}
            controlsTop={insets.top + 8}
            showExpand={false}
            borderRadius={0}
            controlsBottom={insets.bottom + 84}
            autoLocate={point.lat == null}
            locateRound
            locateBg={theme.card}
            locateColor={theme.text}
            showTapHint
            tapHint={t('newOrder.mapTapHint')}
            locatingLabel={t('newOrder.mapLocating')}
            permissionTitle={t('newOrder.locationPermissionTitle')}
            permissionMessage={t('newOrder.locationPermissionMsg')}
            errorTitle={t('common.errorTitle')}
            errorMessage={t('newOrder.locationError')}
          />
          <TouchableOpacity
            onPress={() => setMapOpen(false)}
            activeOpacity={0.85}
            accessibilityRole="button"
            style={{
              position: 'absolute',
              top: insets.top + 10,
              left: 16,
              width: 44,
              height: 44,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              elevation: 6,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: insets.bottom + 16,
            }}
          >
            <Btn
              icon="checkmark-circle"
              label={t('w.more.pointDone')}
              onPress={() => setMapOpen(false)}
            />
          </View>
        </View>
      </Modal>

      <Btn
        icon="checkmark-circle"
        label={t('common.save')}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}

// ── Sozlamalar (akkaunt ham shu yerda) ───────────────────────────────────────
// Rangli ikonli qator: chap tomonda yumshoq fonli ikonka, o'ngda qiymat / tugma / chevron.
function Row({ icon, label, sub, value, onPress, danger, right, color, last }) {
  const { theme } = useTheme();
  const tone = danger ? theme.red : color || theme.orange;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone + '22',
        }}
      >
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: danger ? theme.red : theme.text, fontSize: 14.5, fontWeight: '700' }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>{value}</Text>
      ) : null}
      {right ||
        (onPress && !danger ? (
          <Ionicons name="chevron-forward" size={17} color={theme.faint} />
        ) : null)}
    </TouchableOpacity>
  );
}

// Sarlavha va ostida karta: qatorlar chiziq bilan ajratiladi.
function Group({ title, children, danger }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 }}>
          <View
            style={{
              width: 4,
              height: 14,
              borderRadius: 2,
              backgroundColor: danger ? theme.red : theme.orange,
            }}
          />
          <Text
            style={{
              color: theme.muted,
              fontSize: 12.5,
              fontWeight: '900',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: danger ? theme.red + '55' : theme.border,
        }}
      >
        {children}
      </View>
    </View>
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
  const preview = useQuery({ queryKey: ['w', 'delPreview'], queryFn: api.getDeletionPreview });
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
  const del = useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => signOut(),
    onError,
  });
  const linked = !!tg.data?.linked;
  const blockers = preview.data?.blockers || [];
  const sw = (value, onValueChange) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: theme.orange }}
      style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
    />
  );

  return (
    <Screen title={t('w.more.settings')} onRefresh={tg.refetch}>
      {/* Umumiy */}
      <Group>
        <Row
          icon="earth"
          color="#3f7fd4"
          label={t('w.more.language')}
          value={LANGS.find((l) => l.code === language)?.name}
          onPress={() => setShowLang(true)}
        />
        <Row
          icon="moon"
          color="#7c5cff"
          label={t('w.more.theme')}
          right={sw(!!theme.isDark, flipTheme)}
        />
        <Row
          icon="help-buoy"
          color="#2fa37a"
          label={t('w.more.help')}
          onPress={() => router.push('/help')}
          last
        />
      </Group>

      {/* Bildirishnomalar */}
      <Group title={t('w.site.alerts')}>
        <Row
          icon="notifications"
          label={t('w.more.notifications')}
          onPress={() => router.push('/notifications')}
        />
        {me.data ? (
          <>
            <Row
              icon="chatbubble-ellipses"
              color="#2aabee"
              label={t('w.site.alertsText')}
              right={sw(!!me.data.notify_new_orders_telegram, (v) =>
                patch.mutate({ notify_new_orders_telegram: v })
              )}
            />
            <Row
              icon="volume-high"
              color={theme.gold}
              label={t('w.site.urgentOnly')}
              sub={t('w.site.urgentOnlyText')}
              right={sw(!!me.data.urgent_sound_only, (v) => patch.mutate({ urgent_sound_only: v }))}
              last
            />
          </>
        ) : null}
      </Group>

      {/* Akkaunt */}
      <Group title={t('w.extra.account')}>
        {tg.data?.enabled !== false ? (
          <Row
            icon="paper-plane"
            color="#2aabee"
            label={t('w.site.telegram')}
            sub={linked ? t('w.site.telegramOn') : t('w.site.telegramOff')}
            onPress={() => (linked ? disconnect.mutate() : connect.mutate())}
            right={
              <View
                style={{
                  paddingHorizontal: 11,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: linked ? theme.card2 : theme.orange,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '800',
                    color: linked ? theme.muted : '#fff',
                  }}
                >
                  {connect.isPending || disconnect.isPending
                    ? '…'
                    : linked
                      ? t('w.site.disconnect')
                      : t('w.site.connect')}
                </Text>
              </View>
            }
          />
        ) : null}
        <Row
          icon="lock-closed"
          color="#e87a45"
          label={t('w.more.changePassword')}
          onPress={() => router.push('/change-password')}
        />
        <Row icon="log-out" color={theme.muted} label={t('w.more.logout')} onPress={signOut} last />
      </Group>

      {/* Xavfli hudud */}
      <Group title={t('w.extra.deleteAccount')} danger>
        <Row
          icon="trash"
          danger
          label={t('w.extra.deleteAccount')}
          sub={blockers.length ? undefined : t('w.extra.deleteHint')}
          onPress={
            preview.isPending || blockers.length > 0
              ? undefined
              : () =>
                  appConfirm({
                    title: t('w.extra.deleteAccount'),
                    message: t('w.extra.deleteConfirm'),
                    confirmLabel: t('w.delete'),
                    destructive: true,
                    onConfirm: () => del.mutate(),
                  })
          }
          right={del.isPending ? <Muted>…</Muted> : null}
          last={!blockers.length}
        />
        {blockers.map((b, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <Ionicons name="alert-circle" size={16} color={theme.red} />
            <Text style={{ flex: 1, color: theme.red, fontSize: 12.5, fontWeight: '600' }}>
              {String(b.message || b.code || b)}
            </Text>
          </View>
        ))}
      </Group>

      <TilBottomSheet
        visible={showLang}
        currentLang={language}
        onSelect={pickLanguage}
        onClose={() => setShowLang(false)}
      />
    </Screen>
  );
}
