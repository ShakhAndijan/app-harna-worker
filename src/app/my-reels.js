import { useLocalSearchParams } from 'expo-router';
import MyReelsScreen from '../worker/screens/MyReelsScreen';
import useGoBack from '../navigation/useGoBack';

export default function MyReelsRoute() {
  const { id } = useLocalSearchParams();
  return <MyReelsScreen id={String(id ?? '')} onBack={useGoBack()} />;
}
