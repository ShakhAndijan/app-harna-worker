import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import {
  Screen,
  Card,
  H,
  Muted,
  Txt,
  Btn,
  Field,
  Chips,
  Pill,
  Loading,
  ErrorBox,
  money,
  num,
} from '../ui';

// Daraxtdagi barg yo'nalishlar (xizmat turlari) tekis ro'yxatga aylantiriladi.
function flatten(nodes, out = []) {
  for (const n of nodes || []) {
    if (n.children?.length) flatten(n.children, out);
    else out.push(n);
  }
  return out;
}

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [catId, setCatId] = useState(null);
  const [price, setPrice] = useState('');
  const [typeId, setTypeId] = useState(null);

  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const cats = useQuery({
    queryKey: ['w', 'categories'],
    queryFn: api.getCategories,
    enabled: adding,
  });
  const types = useQuery({
    queryKey: ['w', 'priceTypes'],
    queryFn: api.getPriceTypes,
    enabled: adding,
  });

  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const refresh = () => qc.invalidateQueries({ queryKey: ['w', 'me'] });

  const add = useMutation({
    mutationFn: () =>
      api.addMyCategory({
        category_id: catId,
        price: price.trim() ? price.replace(/\s/g, '') : undefined,
        price_type_id: typeId ?? undefined,
        is_primary: !me.data?.categories?.length,
        currency: 'UZS',
        is_negotiable: !price.trim(),
      }),
    onSuccess: () => {
      setAdding(false);
      setCatId(null);
      setPrice('');
      setTypeId(null);
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id) => api.removeMyCategory(id),
    onSuccess: refresh,
    onError,
  });

  if (me.isPending)
    return (
      <Screen title={t('w.profile.categories')}>
        <Loading />
      </Screen>
    );
  if (me.isError)
    return (
      <Screen title={t('w.profile.categories')}>
        <ErrorBox error={me.error} onRetry={me.refetch} />
      </Screen>
    );

  const mine = me.data.categories || [];
  const have = new Set(mine.map((c) => c.category.id));
  const options = flatten(cats.data).filter((c) => !have.has(c.id));

  return (
    <Screen title={t('w.profile.categories')}>
      {mine.map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <H style={{ flex: 1 }}>{c.category.name}</H>
            {c.is_primary ? <Pill label={t('w.cat.primary')} color={theme.green} /> : null}
          </View>
          <Txt>
            {num(c.price) > 0 ? money(c.price, t) : t('w.priceNegotiable')}
            {c.price_type ? ` · ${c.price_type.name}` : ''}
          </Txt>
          {c.experience_years != null ? (
            <Muted>{t('w.cat.experience', { n: c.experience_years })}</Muted>
          ) : null}
          <Btn
            kind="ghost"
            label={t('w.delete')}
            style={{ height: 38 }}
            onPress={() =>
              appConfirm({
                title: t('w.delete'),
                message: t('w.cat.deleteAsk'),
                confirmLabel: t('w.delete'),
                destructive: true,
                onConfirm: () => remove.mutate(c.id),
              })
            }
          />
        </Card>
      ))}

      {adding ? (
        <Card>
          <H>{t('w.cat.add')}</H>
          {cats.isPending ? (
            <Loading />
          ) : (
            <Chips
              value={catId}
              onChange={setCatId}
              options={options.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          <Field
            label={t('w.cat.price')}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          {types.data?.length ? (
            <Chips
              value={typeId}
              onChange={setTypeId}
              options={types.data.map((p) => ({ value: p.id, label: p.name }))}
            />
          ) : null}
          <Btn
            label={t('w.save')}
            disabled={!catId}
            loading={add.isPending}
            onPress={() => add.mutate()}
          />
          <Btn kind="ghost" label={t('w.cancel')} onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Btn icon="add" label={t('w.cat.add')} onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}
