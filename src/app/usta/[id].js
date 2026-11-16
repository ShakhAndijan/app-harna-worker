import { useLocalSearchParams } from 'expo-router';
import { PublicProfileScreen } from '../../worker/screens/ProfileScreen';
import useGoBack from '../../navigation/useGoBack';

// Boshqa ustaning profili (e'lonlardan ochiladi): o'z profil tabidagidek ko'rinadi.
export default function UstaRoute() {
  const { id } = useLocalSearchParams();
  const workerId = Number(Array.isArray(id) ? id[0] : id);
  return (
    <PublicProfileScreen
      workerId={Number.isFinite(workerId) ? workerId : null}
      onBack={useGoBack()}
    />
  );
}
