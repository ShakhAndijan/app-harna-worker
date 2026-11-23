import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AppLoader from '../components/AppLoader';
import SectionError from './zakazchi-main/components/SectionError';
import { getIdentityStatus } from '../api/account';
import { useWorkerMe } from '../queries/workerHome';
import { SITE_URL } from '../constants/config';
import { formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import { ApiError } from '../utils/request';
import useBottomInset from '../hooks/useBottomInset';
import verifyTexts from '../i18n/verifyTexts';
import { useMyIdView } from '../utils/myidPending';
import {
  PASSPORT_PATTERN,
  PINFL_PATTERN,
  failureKey,
  finishMyId,
  isVerifiedNow,
  leaveMyId,
  myIdReturnFromParams,
  myIdReturnFromUrl,
  normalisePassport,
  normalisePinfl,
  reasonKey,
  receiveMyIdReturn,
  restartMyId,
  startMyId,
} from '../utils/myid';
import { toISODate } from './new-order/utils';
import { isoToDate } from './requests/utils';

const REVOKED_KEYS = {
  myid_required: 'revokedMyidRequired',
  operator_revoked: 'revokedOperator',
  test_identity: 'revokedTest',
};

// Shaxsni tasdiqlash (saytdagi "Profilingizni tasdiqlang"): faqat MyID orqali. Foydalanuvchi tug'ilgan sana
// va JSHSHIR yoki pasport kiritadi, nima tekshirilishini o'qib rozilik beradi; MyID sahifasi yuzni tekshiradi;
// ilovaga qaytgach «Tasdiqlashni yakunlash» natijani hisobga yozadi — ism va tug'ilgan sana MyID'dagiga
// almashadi va qulflanadi. Tekshiruvning o'zi (ochish, javob, yakuniy tugma) — `utils/myid.js`.
export default function VerifyIdentityScreen({ onBack }) {
  const bottomInset = useBottomInset();
  const { theme: t } = useTheme();
  const { language, t: tr } = useLanguage();
  const tx = useMemo(() => verifyTexts(language), [language]);
  const status = useQuery({ queryKey: ['identity', 'status'], queryFn: getIdentityStatus });
  const me = useWorkerMe();
  const view = useMyIdView();
  const [form, setForm] = useState({ birth: null, doc: 'pinfl', number: '', agreed: false });
  const [problems, setProblems] = useState({});
  const [renewing, setRenewing] = useState(false);
  const [iosPicker, setIosPicker] = useState(false);

  // Tug'ilgan sana: profilda bo'lsa shundan boshlanadi (MyID reestr bilan solishtiradi, foydalanuvchi tuzatadi).
  const profileBirth = me.data?.birth_date ?? null;
  const birth = form.birth ?? profileBirth;

  // MyID javobi: ekranni ochgan link (route parametrlari) va ekran ochiq paytda kelgan link.
  const back = myIdReturnFromParams(useLocalSearchParams());
  const backSession = back?.session_id ?? null;
  const backStatus = back?.status ?? null;
  const backCode = back?.auth_code ?? null;
  useEffect(() => {
    if (backSession) {
      receiveMyIdReturn({ session_id: backSession, status: backStatus, auth_code: backCode });
    }
  }, [backSession, backStatus, backCode]);
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) =>
      receiveMyIdReturn(myIdReturnFromUrl(url))
    );
    return () => sub.remove();
  }, []);
  useEffect(() => () => leaveMyId(), []);

  const days = useMemo(() => {
    const today = new Date();
    return {
      max: today,
      min: new Date(1900, 0, 1, 12),
      open: new Date(today.getFullYear() - 30, today.getMonth(), today.getDate()),
    };
  }, []);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setProblems({});
  };

  const pickBirth = () => {
    const value = birth ? isoToDate(birth) : days.open;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate: days.min,
        maximumDate: days.max,
        onValueChange: (_e, picked) => set({ birth: toISODate(picked) }),
      });
    } else {
      setIosPicker((v) => !v);
    }
  };

  const data = status.data;
  const verified = isVerifiedNow(data);
  const subState = verified
    ? 'approved'
    : data?.submission_status === 'approved'
      ? 'not_submitted'
      : (data?.submission_status ?? 'not_submitted');
  const lapsed = subState === 'not_submitted' && data?.expired === true;
  const revoked =
    subState === 'not_submitted' && !lapsed && data?.revoked_reason ? data.revoked_reason : null;
  const offered = data?.myid_available === true;
  const canStart = data?.can_start ?? offered;
  const mode = data?.app_open_mode ?? 'auth_session';
  const years = data?.validity_years ?? 1;
  const busy = view.kind !== 'idle' && view.kind !== 'unfinished';
  const wantsForm = !verified || renewing;
  const isMyId = data?.method === 'myid';
  const renewsMyId = verified && isMyId;

  const tone = verified
    ? t.green
    : lapsed || revoked || subState === 'rejected'
      ? t.red
      : subState === 'pending'
        ? t.gold
        : t.muted;
  const icon = verified
    ? 'check-circle-outline'
    : lapsed || revoked || subState === 'rejected'
      ? 'alert-circle-outline'
      : subState === 'pending'
        ? 'clock-outline'
        : 'shield-account-outline';

  const validity = (d) => {
    if (!d || d.method !== 'myid') return null;
    if (d.valid_until) return tx('validUntil', { date: formatDate(`${d.valid_until}T12:00:00`) });
    return (d.validity_years ?? 1) === 0 ? tx('validForever') : null;
  };

  const statusTitle = verified
    ? isMyId
      ? tx('approvedTitle')
      : data?.method === 'operator'
        ? tx('approvedOperator')
        : tx('approved')
    : lapsed
      ? tx('expiredTitle')
      : tx(subState);
  const statusLine = verified
    ? validity(data)
    : lapsed
      ? tx('expiredBody')
      : revoked
        ? tx(REVOKED_KEYS[revoked] ?? 'revokedOperator')
        : subState === 'rejected'
          ? tx(reasonKey(data?.rejected_reason))
          : subState === 'pending' && view.kind === 'idle'
            ? tx('pendingHint')
            : null;

  const pinfl = form.doc === 'pinfl';

  const start = async () => {
    const number = pinfl ? normalisePinfl(form.number) : normalisePassport(form.number);
    const found = {};
    if (!birth) found.birth = tx('birthDateRequired');
    if (!(pinfl ? PINFL_PATTERN : PASSPORT_PATTERN).test(number)) {
      found.number = tx(pinfl ? 'pinflInvalid' : 'passportInvalid');
    }
    if (!form.agreed) found.consent = tx('consentRequired');
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    try {
      await startMyId(
        { birth_date: birth, ...(pinfl ? { pinfl: number } : { pass_data: number }) },
        mode
      );
    } catch (e) {
      setProblems({ start: getErrorMessage(e, tr, 'account.verify.sendFailed') });
    }
  };

  const pressProblem = (error) => {
    if (error == null) return null;
    if (
      error instanceof ApiError &&
      (error.code === 'verification_provider_error' || error.code === 'verification_in_progress')
    ) {
      return tx('providerError');
    }
    return error instanceof ApiError && error.message ? error.message : tx('providerFailed');
  };

  const identityRows = (identity) =>
    [
      [tx('firstName'), identity.first_name],
      [tx('lastName'), identity.last_name],
      [tx('middleName'), identity.middle_name],
      [
        tx('birthDateLabel'),
        identity.birth_date ? formatDate(`${identity.birth_date}T12:00:00`) : null,
      ],
    ]
      .filter(([, v]) => Boolean(v))
      .map(([label, v]) => (
        <View key={label} style={s.idRow}>
          <Text style={[s.idLabel, { color: t.muted }]}>{label}</Text>
          <Text style={[s.idValue, { color: t.text }]}>{v}</Text>
        </View>
      ));

  const flowCard = () => {
    switch (view.kind) {
      case 'opening':
      case 'waiting':
        return (
          <Card center>
            <ActivityIndicator color={t.orange} />
            <Text style={[s.note, { color: t.muted }]}>{tx('opening')}</Text>
          </Card>
        );
      case 'unfinished':
        return (
          <Card>
            <Text style={[s.cardTitle, { color: t.text }]}>{tx('notFinished')}</Text>
            <Text style={[s.note, { color: t.muted }]}>{tx('pendingHint')}</Text>
          </Card>
        );
      case 'final':
        return (
          <Card>
            <Text style={[s.cardTitle, { color: t.text }]}>{tx('finishTitle')}</Text>
            <Text style={[s.note, { color: t.muted }]}>{tx('finishBody')}</Text>
            <Err text={pressProblem(view.error)} />
            {/* Foydalanuvchining o'z bosishi: MyID shartlari shu tugmani talab qiladi, uni hech narsa o'rniga bosmaydi. */}
            <Primary
              title={view.error ? tx('retryFinish') : tx('finish')}
              onPress={() => finishMyId(data)}
            />
            {view.error ? <Primary ghost title={tx('restart')} onPress={restartMyId} /> : null}
          </Card>
        );
      case 'finishing':
        return (
          <Card center>
            <ActivityIndicator color={t.orange} />
            <Text style={[s.cardTitle, { color: t.text }]}>{tx('finishing')}</Text>
            {view.slow ? (
              <Text style={[s.note, { color: t.muted, textAlign: 'center' }]}>
                {tx('finishingSlow')}
              </Text>
            ) : null}
          </Card>
        );
      case 'done': {
        const line = validity(view.status ?? data);
        return (
          <Card>
            <View style={s.inline}>
              <MaterialCommunityIcons name="check-decagram" size={22} color={t.green} />
              <Text style={[s.cardTitle, { color: t.green, flex: 1 }]}>{tx('successTitle')}</Text>
            </View>
            {view.identity ? identityRows(view.identity) : null}
            {line ? <Text style={{ color: t.text }}>{line}</Text> : null}
            <Text style={[s.note, { color: t.muted }]}>{tx('successNames')}</Text>
          </Card>
        );
      }
      case 'failed':
        return (
          <Card>
            <Text style={[s.cardTitle, { color: t.red }]}>{tx('failedTitle')}</Text>
            <Text style={{ color: t.text }}>{tx(failureKey(view.status))}</Text>
            <Primary title={tx('restart')} onPress={restartMyId} />
          </Card>
        );
      case 'refused':
        return (
          <Card>
            <Text style={[s.cardTitle, { color: t.red }]}>{tx('failedTitle')}</Text>
            <Text style={{ color: t.text }}>
              {view.error != null ? pressProblem(view.error) : tx(reasonKey(view.reason))}
            </Text>
            <Primary title={tx('restart')} onPress={restartMyId} />
          </Card>
        );
      default:
        return null;
    }
  };

  const privacy = [
    tx('privacyNote'),
    tx('privacyPublic'),
    tx('privacyValidity', {
      validity: years === 0 ? tx('validityForever') : tx('validityYears', { count: years }),
    }),
  ].join(' ');

  const startTitle = renewsMyId
    ? tx('refresh')
    : subState === 'pending'
      ? tx('autoRestart')
      : tx('autoStart');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <View style={s.header}>
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: t.card, borderColor: t.border }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: t.text }]} numberOfLines={1}>
          {tx('title')}
        </Text>
      </View>

      {status.isPending ? (
        <View style={s.center}>
          <AppLoader size={160} />
        </View>
      ) : status.isError ? (
        <SectionError style={{ marginHorizontal: 20, marginTop: 24 }} onRetry={status.refetch} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32 + bottomInset,
            gap: 14,
          }}
        >
          <Text style={[s.lead, { color: t.muted }]}>{tx('subtitle')}</Text>

          <View style={[s.status, { borderColor: tone + '66', backgroundColor: tone + '14' }]}>
            <MaterialCommunityIcons name={icon} size={22} color={tone} />
            <View style={{ flex: 1 }}>
              <Text style={[s.statusTitle, { color: t.text }]}>{statusTitle}</Text>
              {statusLine ? (
                <Text style={[s.statusText, { color: t.muted }]}>{statusLine}</Text>
              ) : null}
            </View>
          </View>

          {flowCard()}

          {/* Tasdiqlangan va MyID yoqilgan: MyID'dan qayta o'qish — foydalanuvchi tanlovi. */}
          {verified && offered && canStart && !renewing && !busy ? (
            <Card>
              <Need
                name="refresh"
                title={tx('refresh')}
                hint={tx(renewsMyId ? 'refreshHint' : 'autoBody')}
              />
              <Primary ghost title={tx('refresh')} onPress={() => setRenewing(true)} />
            </Card>
          ) : null}

          {wantsForm && !busy && !offered && !verified ? (
            <Card>
              <Need name="clock-outline" title={tx('soonTitle')} hint={tx('soonBody')} />
            </Card>
          ) : null}

          {wantsForm && !busy && offered && canStart && mode === 'website' ? (
            <Card>
              <Need name="web" title={tx('websiteTitle')} hint={tx('autoBody')} />
              <Primary
                title={tx('openSite')}
                onPress={() =>
                  Linking.openURL(`${SITE_URL}/cabinet/settings/verify`).catch(() => undefined)
                }
              />
            </Card>
          ) : null}

          {wantsForm && !busy && offered && canStart && mode !== 'website' ? (
            <>
              <Card>
                <Text style={[s.cardTitle, { color: t.text }]}>{tx('needTitle')}</Text>
                <Need
                  name="card-account-details-outline"
                  title={tx('needId')}
                  hint={tx('needIdHint')}
                />
                <Need name="camera-outline" title={tx('needCamera')} hint={tx('needCameraHint')} />
              </Card>

              <Card>
                <Need name="flash" title={tx('autoTitle')} hint={tx('autoBody')} />
                <Text style={[s.cardTitle, { color: t.text }]}>{tx('formTitle')}</Text>

                <Text style={[s.label, { color: t.muted }]}>{tx('birthDateLabel')}</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={pickBirth}
                  style={[s.field, { backgroundColor: t.inputBg, borderColor: t.border }]}
                >
                  <MaterialCommunityIcons name="calendar-month-outline" size={20} color={t.muted} />
                  <Text style={[s.fieldText, { color: birth ? t.text : t.faint }]}>
                    {birth ? formatDate(`${birth}T12:00:00`) : tx('pickDate')}
                  </Text>
                </TouchableOpacity>
                {Platform.OS === 'ios' && iosPicker ? (
                  <DateTimePicker
                    value={birth ? isoToDate(birth) : days.open}
                    mode="date"
                    display="spinner"
                    minimumDate={days.min}
                    maximumDate={days.max}
                    onValueChange={(_e, picked) => set({ birth: toISODate(picked) })}
                  />
                ) : null}
                <Err text={problems.birth} />

                <View style={s.seg}>
                  {['pinfl', 'passport'].map((k) => {
                    const on = form.doc === k;
                    return (
                      <TouchableOpacity
                        key={k}
                        activeOpacity={0.85}
                        onPress={() => set({ doc: k, number: '' })}
                        style={[
                          s.segItem,
                          { borderColor: on ? t.orange : t.border },
                          on && { backgroundColor: t.orange + '1f' },
                        ]}
                      >
                        <Text style={[s.segText, { color: on ? t.orange : t.text }]}>
                          {tx(k === 'pinfl' ? 'docPinfl' : 'docPassport')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[s.label, { color: t.muted }]}>
                  {tx(pinfl ? 'pinflLabel' : 'passportLabel')}
                </Text>
                <TextInput
                  key={form.doc}
                  value={form.number}
                  // Pasport harflari lotin: kirill o'xshash harf darrov lotin juftiga almashadi.
                  onChangeText={(text) =>
                    set({
                      number: pinfl ? text.replace(/[^\d\s]/g, '') : normalisePassport(text),
                    })
                  }
                  keyboardType={pinfl ? 'number-pad' : 'default'}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="off"
                  maxLength={pinfl ? 20 : 12}
                  placeholder={pinfl ? '' : 'AA1234567'}
                  placeholderTextColor={t.faint}
                  style={[
                    s.input,
                    { backgroundColor: t.inputBg, borderColor: t.border, color: t.text },
                  ]}
                />
                <Text style={[s.note, { color: t.muted }]}>
                  {tx(pinfl ? 'pinflHint' : 'passportHint')}
                </Text>
                <Err text={problems.number} />

                <View style={s.inlineTop}>
                  <MaterialCommunityIcons name="lock-outline" size={15} color={t.muted} />
                  <Text style={[s.note, { color: t.muted }]}>{privacy}</Text>
                </View>

                <TouchableOpacity
                  style={s.consent}
                  activeOpacity={0.8}
                  onPress={() => set({ agreed: !form.agreed })}
                >
                  <MaterialCommunityIcons
                    name={form.agreed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={form.agreed ? t.orange : problems.consent ? t.red : t.muted}
                  />
                  <Text style={[s.consentText, { color: t.text }]}>{tx('consent')}</Text>
                </TouchableOpacity>
                <Err text={problems.consent} />
                <Err text={problems.start} />

                <Primary title={startTitle} onPress={start} />
                {renewing ? (
                  <Primary ghost title={tx('cancel')} onPress={() => setRenewing(false)} />
                ) : null}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Card({ children, center }) {
  const { theme: t } = useTheme();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: t.card, borderColor: t.border },
        center && { alignItems: 'center' },
      ]}
    >
      {children}
    </View>
  );
}

function Primary({ title, onPress, ghost }) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity
      style={[
        s.primary,
        ghost
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.border }
          : { backgroundColor: t.orange },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Text style={[s.primaryText, ghost && { color: t.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Err({ text }) {
  const { theme: t } = useTheme();
  return text ? <Text style={[s.err, { color: t.red }]}>{text}</Text> : null;
}

function Need({ name, title, hint }) {
  const { theme: t } = useTheme();
  return (
    <View style={s.need}>
      <View style={[s.needIcon, { backgroundColor: t.rowIconBg }]}>
        <MaterialCommunityIcons name={name} size={20} color={t.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.needTitle, { color: t.text }]}>{title}</Text>
        <Text style={[s.note, { color: t.muted }]}>{hint}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontWeight: '700', fontSize: 20 },
  lead: { fontSize: 13, lineHeight: 19 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  statusTitle: { fontSize: 14.5, fontWeight: '800' },
  statusText: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  cardTitle: { fontWeight: '800', fontSize: 15.5 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  need: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  needIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needTitle: { fontSize: 14, fontWeight: '700' },
  note: { flex: 1, fontSize: 12, lineHeight: 17 },
  label: { fontSize: 12.5, fontWeight: '700' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  fieldText: { fontSize: 15, fontWeight: '600' },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  seg: { flexDirection: 'row', gap: 10 },
  segItem: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: { fontSize: 13.5, fontWeight: '700' },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  err: { fontSize: 12.5, fontWeight: '600' },
  primary: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  idLabel: { fontSize: 13 },
  idValue: { fontSize: 13.5, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
