import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { suggestCategories } from '../../../api/categories';

const MIN_CHARS = 5;
const SETTLE_MS = 900; // so'zlar to'xtagach bir marta so'raladi (server: daqiqada 20 ta)

// Tavsifga ko'ra yo'nalish taklifi (13.11, POST /categories/suggest): mijoz faqat tasdiqlaydi. Taklif
// yo'q bo'lsa (AI kalit yo'q, matn qisqa, ishonch past) hech narsa chizilmaydi.
export default function CategorySuggestion({ description, categories, selectedIds, onAdd }) {
  const { theme: t } = useTheme();
  const { t: tr } = useLanguage();
  const [suggested, setSuggested] = useState([]);
  const text = description.trim();

  useEffect(() => {
    if (text.length < MIN_CHARS) return undefined;
    let live = true;
    const timer = setTimeout(() => {
      suggestCategories(text.slice(0, 2000)).then(
        (ids) => live && setSuggested(ids),
        () => live && setSuggested([])
      );
    }, SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text]);

  if (text.length < MIN_CHARS) return null;
  const pick = categories.find((c) => suggested.includes(c.id) && !selectedIds.includes(c.id));
  if (!pick) return null;

  return (
    <TouchableOpacity
      onPress={() => onAdd(pick.id)}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[s.box, { backgroundColor: t.orange + '14', borderColor: t.orange + '66' }]}
    >
      <MaterialCommunityIcons name="auto-fix" size={18} color={t.orange} />
      <Text style={[s.txt, { color: t.text }]} numberOfLines={2}>
        {tr('newOrder.categorySuggest')}: <Text style={s.name}>{pick.name}</Text>
      </Text>
      <Text style={[s.add, { color: t.orange }]}>+ {tr('newOrder.categorySuggestAdd')}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  txt: { flex: 1, fontSize: 13.5 },
  name: { fontWeight: '800' },
  add: { fontSize: 13, fontWeight: '800' },
});
