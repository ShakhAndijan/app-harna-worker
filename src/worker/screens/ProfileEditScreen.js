import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../../components/Avatar';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Btn, Field, Muted, Txt, Loading, ErrorBox } from '../ui';

export default function ProfileEditScreen() {
  const { t } = useLanguage();
  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const regions = useQuery({ queryKey: ['w', 'regions'], queryFn: api.getRegions });
  if (me.isPending || regions.isPending) {
    return (
      <Screen title={t('w.profile.edit')}>
        {me.isError ? <ErrorBox error={me.error} onRetry={me.refetch} /> : <Loading />}
      </Screen>
    );
  }
  return <ProfileForm w={me.data} regions={regions.data || []} />;
}

function Section({ icon, title, hint, children }) {
  const { theme } = useTheme();
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: theme.orange + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={theme.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '800', fontSize: 16 }}>{title}</Txt>
          {hint ? <Muted>{hint}</Muted> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

// Bir qatorli raqam tanlagich: chapda ikonka + nom, o'ngda − raqam birlik +.
function Stepper({ icon, label, unit, value, onChange, min, max }) {
  const { theme } = useTheme();
  const n = value === '' || value == null ? null : Number(value);
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const change = (d) => onChange(String(clamp((n ?? min) + d)));
  const btn = (name, d, disabled) => (
    <TouchableOpacity
      onPress={() => change(d)}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.orange + '22',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={name} size={17} color={theme.orange} />
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={20} color={theme.orange} />
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '600' }}
      >
        {label}
      </Text>
      {btn('remove', -1, n != null && n <= min)}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, minWidth: 64 }}>
        <TextInput
          value={value}
          onChangeText={(v) => {
            const d = v.replace(/[^0-9]/g, '');
            onChange(d === '' ? '' : String(Math.min(max, Number(d))));
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="0"
          placeholderTextColor={theme.faint}
          style={{
            color: theme.text,
            fontSize: 20,
            fontWeight: '900',
            minWidth: 26,
            textAlign: 'right',
            padding: 0,
          }}
        />
        <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{unit}</Text>
      </View>
      {btn('add', 1, n != null && n >= max)}
    </View>
  );
}

// Tanlash maydoni: tepada kichik nom, pastda qiymat; bosilganda ro'yxatli oyna ochiladi.
function SelectField({ label, value, placeholder, disabled, onPress }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={{
        flex: 1,
        gap: 2,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: theme.isDark ? '#ffffff0D' : '#0000000A',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '800',
            color: value ? theme.text : theme.faint,
          }}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.orange} />
      </View>
    </TouchableOpacity>
  );
}

// Pastdan chiqadigan tanlash oynasi: qidiruv (uzun ro'yxatda) va tanlanganini belgilash.
function PickerSheet({ visible, title, options, value, onPick, onClose }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const list = q.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : options;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={() => setQ('')}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          maxHeight: '75%',
          backgroundColor: theme.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 10,
          paddingBottom: 24,
        }}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.border,
            marginBottom: 12,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
          <Txt style={{ flex: 1, fontWeight: '800', fontSize: 18 }}>{title}</Txt>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Ionicons name="close" size={24} color={theme.muted} />
          </TouchableOpacity>
        </View>
        {options.length > 8 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginHorizontal: 16,
              marginTop: 12,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: theme.inputBg,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name="search" size={18} color={theme.faint} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t('common.search')}
              placeholderTextColor={theme.faint}
              style={{ flex: 1, paddingVertical: 10, color: theme.text, fontSize: 15 }}
            />
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={{ padding: 12, gap: 4 }}
          keyboardShouldPersistTaps="handled"
        >
          {list.map((o) => {
            const on = o.value === value;
            return (
              <TouchableOpacity
                key={String(o.value)}
                onPress={() => {
                  onPick(o.value);
                  onClose();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: on ? theme.orange + '1A' : 'transparent',
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15.5,
                    fontWeight: on ? '800' : '600',
                    color: on ? theme.orange : theme.text,
                  }}
                >
                  {o.label}
                </Text>
                {on ? <Ionicons name="checkmark-circle" size={20} color={theme.orange} /> : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ProfileForm({ w, regions }) {
  const router = useRouter();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { theme } = useTheme();
  const avatar = useMutation({
    mutationFn: async () => {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (res.canceled) return null;
      return api.uploadAvatar(res.assets[0].uri);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['w', 'me'] }),
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });
  const [f, setF] = useState({
    first_name: w.first_name || '',
    last_name: w.last_name || '',
    nickname: w.nickname || '',
    bio: w.bio || '',
    experience_years: w.experience_years != null ? String(w.experience_years) : '',
    work_radius_km: w.work_radius_km != null ? String(w.work_radius_km) : '',
  });
  // Joriy viloyat nomi bo'yicha ID topiladi (GET nom qaytaradi, PATCH esa ID kutadi).
  const [regionId, setRegionId] = useState(regions.find((x) => x.name === w.region)?.id ?? null);
  const [pickedDistrict, setPickedDistrict] = useState(null);
  const [picker, setPicker] = useState(null); // 'region' | 'district' | null
  const districts = useQuery({
    queryKey: ['w', 'districts', regionId],
    queryFn: () => api.getDistricts(regionId),
    enabled: !!regionId,
  });
  const districtId =
    pickedDistrict ?? districts.data?.find((x) => x.name === w.district)?.id ?? null;

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim(),
        nickname: f.nickname.trim() || null,
        bio: f.bio.trim() || null,
      };
      if (f.experience_years !== '') body.experience_years = Number(f.experience_years);
      if (f.work_radius_km !== '') {
        body.work_area_mode = 'radius';
        body.work_radius_km = Math.min(60, Math.max(1, Math.round(Number(f.work_radius_km)) || 1));
      }
      if (regionId) body.region_id = regionId;
      if (districtId) body.district_id = districtId;
      return api.patchMe(body);
    },
    onSuccess: (data) => {
      qc.setQueryData(['w', 'me'], data);
      router.back();
    },
    onError: (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed')),
  });

  return (
    <Screen title={t('w.profile.edit')}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 6 }}>
        <TouchableOpacity
          onPress={() => avatar.mutate()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('w.edit.changePhoto')}
        >
          <View
            style={{
              padding: 4,
              borderRadius: 104 * 0.32 + 6,
              borderWidth: 2,
              borderColor: theme.orange,
              opacity: avatar.isPending ? 0.5 : 1,
            }}
          >
            <Avatar size={104} letter={(w.first_name || 'U')[0]} uri={w.profile_photo} />
          </View>
          <View
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: theme.orange,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: theme.bg,
            }}
          >
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={{ color: theme.orange, fontSize: 14, fontWeight: '700' }}>
          {t('w.edit.changePhoto')}
        </Text>
      </View>

      <Section icon="person-outline" title={t('w.edit.secPersonal')}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field
            style={{ flex: 1 }}
            label={t('w.edit.firstName')}
            value={f.first_name}
            onChangeText={set('first_name')}
          />
          <Field
            style={{ flex: 1 }}
            label={t('w.edit.lastName')}
            value={f.last_name}
            onChangeText={set('last_name')}
          />
        </View>
        <Field label={t('w.edit.nickname')} value={f.nickname} onChangeText={set('nickname')} />
      </Section>

      <Section
        icon="chatbubble-ellipses-outline"
        title={t('w.edit.secAbout')}
        hint={t('w.edit.bioHint')}
      >
        <Field value={f.bio} onChangeText={set('bio')} multiline maxLength={1000} />
        <Muted style={{ textAlign: 'right', fontSize: 11 }}>{f.bio.length}/1000</Muted>
      </Section>

      <Card style={{ gap: 12, paddingVertical: 14 }}>
        <Stepper
          icon="ribbon-outline"
          label={t('w.edit.experience')}
          unit={t('w.profile.year')}
          value={f.experience_years}
          onChange={set('experience_years')}
          min={0}
          max={60}
        />
        <Stepper
          icon="navigate-outline"
          label={t('w.edit.radius')}
          unit={t('w.profile.km')}
          value={f.work_radius_km}
          onChange={set('work_radius_km')}
          min={1}
          max={60}
        />
      </Card>

      <Card style={{ gap: 10, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="location" size={18} color={theme.orange} />
          <Txt style={{ fontWeight: '800', fontSize: 15 }}>{t('w.edit.secPlace')}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SelectField
            label={t('w.edit.region')}
            value={regions.find((r) => r.id === regionId)?.name}
            placeholder={t('w.edit.select')}
            onPress={() => setPicker('region')}
          />
          <SelectField
            label={t('w.edit.district')}
            value={(districts.data || []).find((d) => d.id === districtId)?.name}
            placeholder={t('w.edit.select')}
            disabled={!regionId}
            onPress={() => setPicker('district')}
          />
        </View>
      </Card>
      <PickerSheet
        visible={picker === 'region'}
        title={t('w.edit.region')}
        options={regions.map((r) => ({ value: r.id, label: r.name }))}
        value={regionId}
        onPick={(v) => {
          if (v !== regionId) {
            setRegionId(v);
            setPickedDistrict(null);
          }
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'district'}
        title={t('w.edit.district')}
        options={(districts.data || []).map((d) => ({ value: d.id, label: d.name }))}
        value={districtId}
        onPick={setPickedDistrict}
        onClose={() => setPicker(null)}
      />

      <Btn
        label={t('w.save')}
        loading={save.isPending}
        disabled={!f.first_name.trim() || !f.last_name.trim()}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}
