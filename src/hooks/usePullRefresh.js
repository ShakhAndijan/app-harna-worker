import { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { queryClient } from '../queries/client';
import { useTheme } from '../context/ThemeContext';

/**
 * Ekranni pastga tortib yangilash. Ekranda ochiq turgan barcha so'rovlar (TanStack Query) qayta
 * yuklanadi; so'rovga o'tmagan ma'lumotlar uchun `extra` berilishi mumkin.
 * Foydalanish: `const { refreshControl } = usePullRefresh();` → `<ScrollView refreshControl={refreshControl}>`
 * (FlatList uchun ham xuddi shunday prop).
 */
export default function usePullRefresh(extra) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        queryClient.refetchQueries({ type: 'active' }),
        extra ? extra() : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [extra]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.orange}
        colors={[theme.orange]}
      />
    ),
    [refreshing, onRefresh, theme.orange]
  );

  return { refreshing, onRefresh, refreshControl };
}
