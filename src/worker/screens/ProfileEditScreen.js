import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Btn, Field, Chips, Muted, Loading, ErrorBox } from '../ui';

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

function ProfileForm({ w, regions }) {
  const router = useRouter();
  const { t } = useLanguage();
  const qc = useQueryClient();
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
        body.work_radius_km = Number(f.work_radius_km);
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
      <Card>
        <Field
          label={t('w.edit.firstName')}
          value={f.first_name}
          onChangeText={set('first_name')}
        />
        <Field label={t('w.edit.lastName')} value={f.last_name} onChangeText={set('last_name')} />
        <Field label={t('w.edit.nickname')} value={f.nickname} onChangeText={set('nickname')} />
        <Field
          label={t('w.edit.bio')}
          value={f.bio}
          onChangeText={set('bio')}
          multiline
          maxLength={1000}
        />
        <Field
          label={t('w.edit.experience')}
          value={f.experience_years}
          onChangeText={set('experience_years')}
          keyboardType="numeric"
        />
        <Field
          label={t('w.edit.radius')}
          value={f.work_radius_km}
          onChangeText={set('work_radius_km')}
          keyboardType="numeric"
        />
      </Card>
      <Card>
        <Muted>{t('w.edit.region')}</Muted>
        <Chips
          value={regionId}
          onChange={(v) => {
            setRegionId(v);
            setPickedDistrict(null);
          }}
          options={regions.map((r) => ({ value: r.id, label: r.name }))}
        />
        {regionId ? (
          <>
            <Muted>{t('w.edit.district')}</Muted>
            {districts.isPending ? (
              <Loading />
            ) : (
              <Chips
                value={districtId}
                onChange={setPickedDistrict}
                options={(districts.data || []).map((d) => ({ value: d.id, label: d.name }))}
              />
            )}
          </>
        ) : null}
      </Card>
      <Btn
        label={t('w.save')}
        loading={save.isPending}
        disabled={!f.first_name.trim() || !f.last_name.trim()}
        onPress={() => save.mutate()}
      />
    </Screen>
  );
}
