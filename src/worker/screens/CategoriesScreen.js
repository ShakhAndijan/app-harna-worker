import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  LayoutAnimation,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { appAlert, appConfirm } from '../../components/AppAlert';
import { getErrorMessage } from '../../utils/errors';
import * as api from '../api';
import { Screen, Card, Txt, Btn, Loading, ErrorBox, money, num } from '../ui';

// Daraxtdagi barg yo'nalishlar tekis ro'yxatga aylanadi (guruh nomi bilan).
function flatten(nodes, group = '', out = []) {
  for (const n of nodes || []) {
    if (n.children?.length) flatten(n.children, n.name, out);
    else out.push({ ...n, group });
  }
  return out;
}

const clean = (v) => v.replace(/\s/g, '');

// Narx turi (segment), narx maydoni va "kelishiladi" kaliti — qo'shish va tahrirlash uchun umumiy.
function PriceForm({ types, typeId, setTypeId, price, setPrice, nego, setNego, minPrice, setMin }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const box = { backgroundColor: theme.isDark ? '#ffffff0D' : '#0000000A' };
  return (
    <View style={{ gap: 10 }}>
      {types?.length ? (
        <View style={[{ flexDirection: 'row', padding: 3, borderRadius: 14, gap: 3 }, box]}>
          {types.map((p) => {
            const on = p.id === typeId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setTypeId(p.id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 42,
                  paddingHorizontal: 4,
                  paddingVertical: 6,
                  borderRadius: 11,
                  backgroundColor: on ? theme.orange : 'transparent',
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 12,
                    lineHeight: 15,
                    fontWeight: '800',
                    textAlign: 'center',
                    color: on ? '#fff' : theme.text,
                  }}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.inputBg,
              opacity: nego ? 0.5 : 1,
            },
          ]}
        >
          <TextInput
            value={nego ? minPrice : price}
            onChangeText={nego ? setMin : setPrice}
            placeholder={nego ? t('w.cat.minPrice') : t('w.cat.price')}
            placeholderTextColor={theme.faint}
            keyboardType="numeric"
            style={{
              flex: 1,
              paddingVertical: 11,
              color: theme.text,
              fontSize: 16,
              fontWeight: '800',
            }}
          />
          <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>
            {t('common.currencySom')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setNego(!nego)}
          activeOpacity={0.8}
          accessibilityRole="switch"
          accessibilityState={{ checked: nego }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: nego ? theme.orange : theme.border,
            backgroundColor: nego ? theme.orange + '1A' : 'transparent',
          }}
        >
          <Ionicons
            name={nego ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={nego ? theme.orange : theme.faint}
          />
          <Text
            style={{ fontSize: 12.5, fontWeight: '800', color: nego ? theme.orange : theme.text }}
          >
            {t('w.cat.negotiable')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IconBtn({ name, color, onPress, disabled, label }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.isDark ? '#ffffff0F' : '#0000000A',
        opacity: disabled ? 0.9 : 1,
      }}
    >
      <Ionicons name={name} size={18} color={color} />
    </TouchableOpacity>
  );
}

// Egallangan yo'nalishlar olib tashlangan daraxt: bo'sh qolgan guruhlar ham yashiriladi.
function prune(nodes, have) {
  const out = [];
  for (const n of nodes || []) {
    if (n.children?.length) {
      const kids = prune(n.children, have);
      if (kids.length) out.push({ ...n, children: kids });
    } else if (!have.has(n.id)) out.push(n);
  }
  return out;
}

const countLeaves = (n) =>
  n.children?.length ? n.children.reduce((a, c) => a + countLeaves(c), 0) : 1;

// Yo'nalish qo'shish oynasi — 2 bosqich: 1) yo'nalishni tanlash, 2) narx. Saqlash tugmasi pastda qotib turadi.
function CategoryPicker({ visible, tree, picked, onPick, onClose, form, saving, onSave }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [path, setPath] = useState([]);
  const k = q.trim().toLowerCase();
  const flat = k
    ? flatten(tree).filter((o) => `${o.name} ${o.group}`.toLowerCase().includes(k))
    : null;
  const cur = path.length ? path[path.length - 1] : null;
  const items = cur ? cur.children : tree;
  const soft = theme.isDark ? '#ffffff0D' : '#0000000A';
  const step2 = !!picked;

  const smooth = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const pickLeaf = (o) => {
    smooth();
    onPick(o);
  };
  const go = (n) => {
    smooth();
    setPath((pp) => [...pp, n]);
  };
  const back = () => {
    smooth();
    if (step2) onPick(null);
    else setPath((pp) => pp.slice(0, -1));
  };
  const canBack = step2 || (!!cur && !flat);

  const emoji = (o, size) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: o.color ? o.color + '2A' : theme.orange + '1F',
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{o.icon || '🛠️'}</Text>
    </View>
  );

  const row = (o, last, sub) => (
    <TouchableOpacity
      key={o.id}
      onPress={() => (o.children?.length ? go(o) : pickLeaf(o))}
      activeOpacity={0.7}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      }}
    >
      {emoji(o, 36)}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{o.name}</Text>
        {sub ? <Text style={{ color: theme.muted, fontSize: 12 }}>{sub}</Text> : null}
      </View>
      <Ionicons
        name={o.children?.length ? 'chevron-forward' : 'add-circle-outline'}
        size={o.children?.length ? 18 : 22}
        color={o.children?.length ? theme.faint : theme.orange}
      />
    </TouchableOpacity>
  );

  let body;
  if (step2) {
    body = (
      <View style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 12,
            borderRadius: 20,
            backgroundColor: theme.orange + '12',
            borderWidth: 1,
            borderColor: theme.orange + '55',
          }}
        >
          {emoji(picked, 56)}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '900' }}>
              {picked.name}
            </Text>
            {picked.group ? (
              <Text style={{ color: theme.muted, fontSize: 12.5 }}>{picked.group}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={back}
            hitSlop={8}
            accessibilityRole="button"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.orange + '22',
            }}
          >
            <Ionicons name="swap-horizontal" size={20} color={theme.orange} />
          </TouchableOpacity>
        </View>
        <PriceForm {...form} />
      </View>
    );
  } else if (flat) {
    body = (
      <View style={{ borderRadius: 18, backgroundColor: soft }}>
        {flat.map((o, i) => row(o, i === flat.length - 1, o.group))}
      </View>
    );
  } else if (cur) {
    body = (
      <View style={{ borderRadius: 18, backgroundColor: soft }}>
        {items.map((o, i) => row(o, i === items.length - 1, null))}
      </View>
    );
  } else {
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((n) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => (n.children?.length ? go(n) : pickLeaf(n))}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={{
              width: '48%',
              flexGrow: 1,
              gap: 10,
              padding: 14,
              borderRadius: 20,
              backgroundColor: soft,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {emoji(n, 46)}
              {n.children?.length ? (
                <View
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 12,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.orange + '22',
                  }}
                >
                  <Text style={{ color: theme.orange, fontSize: 12, fontWeight: '900' }}>
                    {countLeaves(n)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }} numberOfLines={2}>
              {n.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const title = step2 ? t('w.cat.add') : cur && !flat ? cur.name : t('w.cat.add');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => (canBack ? back() : onClose())}
      onDismiss={() => {
        setQ('');
        setPath([]);
      }}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          height: '86%',
          backgroundColor: theme.bg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 10,
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
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}
        >
          {canBack ? (
            <TouchableOpacity
              onPress={back}
              hitSlop={8}
              accessibilityRole="button"
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: soft,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : null}
          <Txt style={{ flex: 1, fontWeight: '900', fontSize: 19 }} numberOfLines={1}>
            {title}
          </Txt>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Ionicons name="close-circle" size={28} color={theme.faint} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginHorizontal: 16, marginTop: 12 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.orange }} />
          <View
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: step2 ? theme.orange : theme.border,
            }}
          />
        </View>

        {!step2 ? (
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
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>

        {step2 ? (
          <View
            style={{
              padding: 16,
              paddingBottom: 28,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.bg,
            }}
          >
            <Btn icon="checkmark-circle" label={t('w.save')} loading={saving} onPress={onSave} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(null);
  const [aPrice, setAPrice] = useState('');
  const [aType, setAType] = useState(null);
  const [aNego, setANego] = useState(false);
  const [aMin, setAMin] = useState('');

  const me = useQuery({ queryKey: ['w', 'me'], queryFn: api.getMe });
  const cats = useQuery({ queryKey: ['w', 'categories'], queryFn: api.getCategories });
  const types = useQuery({ queryKey: ['w', 'priceTypes'], queryFn: api.getPriceTypes });

  const [openGroups, setOpenGroups] = useState({});
  const [editId, setEditId] = useState(null);
  const [ePrice, setEPrice] = useState('');
  const [eMin, setEMin] = useState('');
  const [eType, setEType] = useState(null);
  const [eNego, setENego] = useState(false);

  const onError = (e) => appAlert(t('common.errorTitle'), getErrorMessage(e, t, 'w.actionFailed'));
  const refresh = () => qc.invalidateQueries({ queryKey: ['w', 'me'] });
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  const resetAdd = () => {
    setAdding(false);
    setPicked(null);
    setAPrice('');
    setAType(null);
    setANego(false);
    setAMin('');
  };

  const add = useMutation({
    mutationFn: () =>
      api.addMyCategory({
        category_id: picked.id,
        price: !aNego && aPrice.trim() ? clean(aPrice) : undefined,
        min_price: aNego && aMin.trim() ? clean(aMin) : undefined,
        price_type_id: aType ?? undefined,
        is_primary: !me.data?.categories?.length,
        currency: 'UZS',
        is_negotiable: aNego || !aPrice.trim(),
      }),
    onSuccess: () => {
      animate();
      resetAdd();
      refresh();
    },
    onError,
  });

  const startEdit = (c) => {
    animate();
    setEditId(c.category.id);
    setEPrice(num(c.price) > 0 ? String(Math.round(num(c.price))) : '');
    setEMin(num(c.min_price) > 0 ? String(Math.round(num(c.min_price))) : '');
    setEType(c.price_type?.id ?? c.price_type_id ?? null);
    setENego(!!c.is_negotiable);
  };
  const save = useMutation({
    mutationFn: () =>
      api.updateMyCategory(editId, {
        price_type_id: eType ?? undefined,
        price: eNego || !ePrice.trim() ? null : clean(ePrice),
        min_price: eNego && eMin.trim() ? clean(eMin) : null,
        is_negotiable: eNego,
      }),
    onSuccess: () => {
      animate();
      setEditId(null);
      refresh();
    },
    onError,
  });
  // Asosiy qilish: tanlanganni belgilab, boshqalardan olib tashlaymiz.
  const makePrimary = useMutation({
    mutationFn: async (id) => {
      await api.updateMyCategory(id, { is_primary: true });
      const others = (me.data?.categories || []).filter(
        (x) => x.is_primary && x.category.id !== id
      );
      for (const o of others) await api.updateMyCategory(o.category.id, { is_primary: false });
    },
    onSuccess: refresh,
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

  const mine = [...(me.data.categories || [])].sort(
    (a, b) => Number(!!b.is_primary) - Number(!!a.is_primary)
  );
  const info = new Map();
  const walk = (nodes, group) => {
    for (const n of nodes || []) {
      info.set(n.id, { icon: n.icon, color: n.color, group });
      if (n.children?.length) walk(n.children, n.name);
    }
  };
  walk(cats.data, '');
  const rootOf = new Map();
  for (const r of cats.data || []) {
    const stack = [r];
    while (stack.length) {
      const n = stack.pop();
      rootOf.set(n.id, r);
      for (const k of n.children || []) stack.push(k);
    }
  }
  const groupMap = new Map();
  for (const c of mine) {
    const r = rootOf.get(c.category.id);
    const key = r ? r.id : 'x' + c.category.id;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        name: r ? r.name : c.category.name,
        icon: r?.icon,
        color: r?.color,
        items: [],
      });
    }
    groupMap.get(key).items.push(c);
  }
  const groups = [...groupMap.values()].sort(
    (a, b) => Number(b.items.some((x) => x.is_primary)) - Number(a.items.some((x) => x.is_primary))
  );
  const have = new Set(mine.map((c) => c.category.id));
  const tree = prune(cats.data, have);

  return (
    <Screen
      title={t('w.profile.categories')}
      right={
        <TouchableOpacity
          onPress={() => {
            setAdding(true);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('w.cat.add')}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.orange,
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      }
    >
      {groups.map((g) => {
        const isOpen = !!openGroups[g.key];
        const hasPrimary = g.items.some((x) => x.is_primary);
        return (
          <Card
            key={g.key}
            style={{
              padding: 12,
              gap: 10,
              borderRadius: 20,
              borderWidth: hasPrimary ? 1.5 : 1,
              borderColor: hasPrimary ? theme.orange : theme.border,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                animate();
                setOpenGroups((o) => ({ ...o, [g.key]: !o[g.key] }));
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: g.color ? g.color + '2A' : theme.orange + '1F',
                }}
              >
                <Text style={{ fontSize: 23 }}>{g.icon || '🛠️'}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    numberOfLines={1}
                    style={{ flexShrink: 1, color: theme.text, fontSize: 16, fontWeight: '800' }}
                  >
                    {g.name}
                  </Text>
                  {hasPrimary ? <Ionicons name="star" size={14} color="#F5B301" /> : null}
                </View>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12.5 }}>
                  {g.items.map((x) => x.category.name).join(', ')}
                </Text>
              </View>
              <View
                style={{
                  minWidth: 26,
                  height: 26,
                  borderRadius: 13,
                  paddingHorizontal: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.orange + '22',
                }}
              >
                <Text style={{ color: theme.orange, fontSize: 12.5, fontWeight: '900' }}>
                  {g.items.length}
                </Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.orange}
              />
            </TouchableOpacity>

            {isOpen
              ? g.items.map((c) => {
                  const meta = info.get(c.category.id);
                  const editing = editId === c.category.id;
                  const priced = num(c.price) > 0;
                  const typeId = c.price_type?.id ?? c.price_type_id ?? null;
                  const typeName =
                    c.price_type?.name ||
                    (typeof c.price_type === 'string' ? c.price_type : null) ||
                    (types.data || []).find((x) => x.id === typeId)?.name ||
                    '';
                  return (
                    <View
                      key={c.id}
                      style={{
                        padding: 10,
                        gap: 10,
                        borderRadius: 18,
                        borderWidth: editing ? 1.5 : 1,
                        borderColor: editing ? theme.orange : theme.border,
                        backgroundColor: theme.isDark ? '#ffffff0A' : '#00000006',
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          animate();
                          if (editing) setEditId(null);
                          else startEdit(c);
                        }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: meta?.color
                              ? meta.color + '2A'
                              : g.color
                                ? g.color + '2A'
                                : theme.orange + '1F',
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>{meta?.icon || g.icon || '🛠️'}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
                            {c.is_primary ? '⭐ ' : ''}
                            {c.category.name}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              columnGap: 8,
                              rowGap: 2,
                            }}
                          >
                            {priced ? (
                              <Text
                                style={{ color: theme.orange, fontSize: 15, fontWeight: '900' }}
                              >
                                {money(c.price, t)}
                              </Text>
                            ) : (
                              <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '800' }}>
                                {t('w.priceNegotiable')}
                              </Text>
                            )}
                            {typeName ? (
                              <Text style={{ color: theme.muted, fontSize: 12.5 }}>{typeName}</Text>
                            ) : null}
                          </View>
                        </View>
                        <Ionicons
                          name={editing ? 'chevron-up' : 'create-outline'}
                          size={18}
                          color={editing ? theme.orange : theme.faint}
                        />
                      </TouchableOpacity>

                      {editing ? (
                        <>
                          <PriceForm
                            types={types.data}
                            typeId={eType}
                            setTypeId={setEType}
                            price={ePrice}
                            setPrice={setEPrice}
                            nego={eNego}
                            setNego={setENego}
                            minPrice={eMin}
                            setMin={setEMin}
                          />
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <IconBtn
                              name={c.is_primary ? 'star' : 'star-outline'}
                              color="#F5B301"
                              label={t('w.cat.makePrimary')}
                              disabled={c.is_primary || makePrimary.isPending}
                              onPress={() => makePrimary.mutate(c.category.id)}
                            />
                            <IconBtn
                              name="trash-outline"
                              color={theme.red}
                              label={t('w.delete')}
                              onPress={() =>
                                appConfirm({
                                  title: t('w.delete'),
                                  message: t('w.cat.deleteAsk'),
                                  confirmLabel: t('w.delete'),
                                  destructive: true,
                                  onConfirm: () => remove.mutate(c.category.id),
                                })
                              }
                            />
                            <Btn
                              style={{ flex: 1, height: 40 }}
                              label={t('w.save')}
                              loading={save.isPending}
                              onPress={() => save.mutate()}
                            />
                          </View>
                        </>
                      ) : null}
                    </View>
                  );
                })
              : null}
          </Card>
        );
      })}

      <CategoryPicker
        visible={adding}
        tree={tree}
        picked={picked}
        onPick={setPicked}
        onClose={() => {
          animate();
          resetAdd();
        }}
        saving={add.isPending}
        onSave={() => add.mutate()}
        form={{
          types: types.data,
          typeId: aType,
          setTypeId: setAType,
          price: aPrice,
          setPrice: setAPrice,
          nego: aNego,
          setNego: setANego,
          minPrice: aMin,
          setMin: setAMin,
        }}
      />
    </Screen>
  );
}
