import { useRouter } from 'expo-router';
import LandingScreen from '../screens/LandingScreen';

export default function LandingRoute() {
  const router = useRouter();
  return <LandingScreen onLogin={() => router.push('/login')} />;
}
