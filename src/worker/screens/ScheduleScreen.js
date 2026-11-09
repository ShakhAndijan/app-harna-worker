import { useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Btn, Loading, ErrorBox } from '../ui';

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const trimTime = (s) => (s ? String(s).slice(0, 5) : '');

// Haftalik ish jadvali: kun yoqiladi, ish vaqti boshlanish/tugash soati bilan beriladi.
// Jadvalda yo'q kunlar — dam olish kunlari.
export default function ScheduleScreen() {
  const { t } = useLanguage();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  if (me.isPending) {
    return (
      <Screen title={t('w.profile.schedule')}>
        {me.isError ? <ErrorBox error={me.error} onRetry={me.refetch} /> : <Loading />}
      </Screen>
    );
  }
  return <ScheduleForm schedule={me.data.schedule} />;
}

function ScheduleForm({ schedule }) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [days, setDays] = useState(() => {
    const next = {};
    for (const d of DAYS) next[d] = { on: false, start: '09:00', end: '18:00' };
    // `id` — hafta kuni raqami (0..6).
    for (const w of schedule?.working_days || []) {
      if (next[w.id]) {
        next[w.id] = {
          on: true,
          start: trimTime(w.work_start) || '09:00',
          end: trimTime(w.work_end) || '18:00',
        };
      }
    }
    return next;
  });
  const [capacity, setCapacity] = useState(
    schedule?.daily_capacity ? String(schedule.daily_capacity) : ''
  );

  const save = useMutation({
    mutationFn: () => {
      const working_days = DAYS.filter((d) => days[d].on).map((d) => ({
        day: d,
        start: days[d].start,
        end: days[d].end,
      }));
      return api.saveSchedule({
        working_days,
        ...(capacity ? { daily_capacity: Number(capacity) } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['w'] });
      router.back();
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  const invalid = DAYS.some(
    (d) => days[d].on && (!HHMM.test(days[d].start) || !HHMM.test(days[d].end))
  );
  const set = (d, patch) => setDays((p) => ({ ...p, [d]: { ...p[d], ...patch } }));

  const onDays = DAYS.filter((d) => days[d].on);
  const mins = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3));
  const weekMin = onDays.reduce((sum, d) => {
    const { start, end } = days[d];
    if (!HHMM.test(start) || !HHMM.test(end)) return sum;
    return sum + Math.max(0, mins(end) - mins(start));
  }, 0);
  const weekHours = Math.round((weekMin / 60) * 10) / 10;
  const cap = Number(capacity) || 0;
  const fmtTime = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
  };
  const timeBox = (d, key) => {
    const v = days[d][key];
    const bad = !HHMM.test(v);
    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 46,
          paddingHorizontal: 12,
          borderRadius: 14,
          backgroundColor: theme.bg,
          borderWidth: 1,
          borderColor: bad ? theme.red : theme.border,
        }}
      >
        <Ionicons
          name={key === 'start' ? 'sunny-outline' : 'moon-outline'}
          size={18}
          color={theme.orange}
        />
        <TextInput
          value={v}
          onChangeText={(x) => set(d, { [key]: fmtTime(x) })}
          keyboardType="number-pad"
          maxLength={5}
          placeholder={key === 'start' ? '09:00' : '18:00'}
          placeholderTextColor={theme.faint}
          style={{ flex: 1, color: theme.text, fontSize: 17, fontWeight: '800', padding: 0 }}
        />
      </View>
    );
  };

  return (
    <Screen title={t('w.profile.schedule')}>
      <LinearGradient
        colors={[theme.orange, theme.orange + '99']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 26, padding: 18, gap: 14 }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>{onDays.length}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' }}>
              {t('w.schedule.workDays')}
            </Text>
          </View>
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <View style={{ flex: 1, paddingLeft: 6 }}>
            <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900' }}>{weekHours}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' }}>
              {t('w.schedule.hours')}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => set(d, { on: !days[d].on })}
              activeOpacity={0.8}
              accessibilityRole="button"
              style={{
                flex: 1,
                height: 40,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: days[d].on ? '#fff' : 'rgba(255,255,255,0.22)',
              }}
            >
              <Text
                style={{
                  color: days[d].on ? theme.orange : '#fff',
                  fontSize: 12.5,
                  fontWeight: '900',
                }}
              >
                {t(`w.schedule.day.${d}`).slice(0, 2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {DAYS.map((d) => {
        const on = days[d].on;
        return (
          <View
            key={d}
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: on ? theme.orange + '88' : theme.border,
              backgroundColor: theme.card,
              padding: 12,
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
                  backgroundColor: on ? theme.orange : theme.orange + '1A',
                }}
              >
                <Ionicons
                  name={on ? 'briefcase' : 'cafe-outline'}
                  size={21}
                  color={on ? '#fff' : theme.orange}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>
                  {t(`w.schedule.day.${d}`)}
                </Text>
                <Text
                  style={{
                    color: on ? theme.orange : theme.muted,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {on ? `${days[d].start} – ${days[d].end}` : t('w.schedule.dayOff')}
                </Text>
              </View>
              <Switch
                value={on}
                onValueChange={(v) => set(d, { on: v })}
                trackColor={{ true: theme.orange }}
              />
            </View>
            {on ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {timeBox(d, 'start')}
                <Ionicons name="arrow-forward" size={16} color={theme.faint} />
                {timeBox(d, 'end')}
              </View>
            ) : null}
          </View>
        );
      })}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
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
          <Ionicons name="layers-outline" size={22} color={theme.orange} />
        </View>
        <Text style={{ flex: 1, color: theme.text, fontSize: 14.5, fontWeight: '800' }}>
          {t('w.schedule.capacity')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setCapacity(String(Math.max(0, cap - 1)))}
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
              minWidth: 30,
              textAlign: 'center',
              color: theme.text,
              fontSize: 18,
              fontWeight: '900',
            }}
          >
            {cap || '—'}
          </Text>
          <TouchableOpacity
            onPress={() => setCapacity(String(cap + 1))}
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

      <Btn
        icon="checkmark-circle"
        label={t('w.save')}
        loading={save.isPending}
        disabled={invalid}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}
