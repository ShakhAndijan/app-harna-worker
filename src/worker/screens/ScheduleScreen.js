import { useState } from 'react';
import { View, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, H, Txt, Muted, Btn, Field, Loading, ErrorBox } from '../ui';

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

  return (
    <Screen title={t('w.profile.schedule')}>
      <Muted>{t('w.schedule.hint')}</Muted>
      {DAYS.map((d) => (
        <Card key={d} style={{ gap: 8 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <H>{t(`w.schedule.day.${d}`)}</H>
            <Switch
              value={days[d].on}
              onValueChange={(v) => set(d, { on: v })}
              trackColor={{ true: theme.orange }}
            />
          </View>
          {days[d].on ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Field
                style={{ flex: 1 }}
                label={t('w.schedule.from')}
                value={days[d].start}
                onChangeText={(v) => set(d, { start: v })}
                placeholder="09:00"
              />
              <Field
                style={{ flex: 1 }}
                label={t('w.schedule.to')}
                value={days[d].end}
                onChangeText={(v) => set(d, { end: v })}
                placeholder="18:00"
              />
            </View>
          ) : (
            <Txt style={{ color: theme.faint }}>{t('w.schedule.dayOff')}</Txt>
          )}
        </Card>
      ))}
      <Field
        label={t('w.schedule.capacity')}
        value={capacity}
        onChangeText={setCapacity}
        keyboardType="numeric"
      />
      <Btn
        label={t('w.save')}
        loading={save.isPending}
        disabled={invalid}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}
