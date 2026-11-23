import { View } from 'react-native';
import useLivePresence from '../hooks/useLivePresence';

// Ustaning «onlayn» nuqtasi: yuklangan qiymat (`fallback`) o'rniga har 2 daqiqada yangilanadigan
// holat (GET /workers/presence) ko'rsatiladi.
export default function LiveOnlineDot({ id, fallback, style }) {
  const presence = useLivePresence(id);
  const online = presence ? presence.is_online : !!fallback;
  return online ? <View style={style} /> : null;
}
