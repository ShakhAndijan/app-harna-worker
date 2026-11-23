import { useLocalSearchParams, useRouter } from 'expo-router';
import PublicJobScreen from '../../screens/PublicJobScreen';
import useGoBack from '../../navigation/useGoBack';
import { ustaRoute } from '../../navigation/params';

// Havola orqali ochiladigan bajarilgan ish: harna-worker://job/<token> (saytda /ish/<token>).
export default function JobRoute() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  return (
    <PublicJobScreen
      token={String(Array.isArray(token) ? token[0] : token)}
      onBack={useGoBack()}
      onSelectUsta={(w) => router.push(ustaRoute({ id: w.id, name: w.full_name }))}
    />
  );
}
