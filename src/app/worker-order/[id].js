import { useLocalSearchParams } from 'expo-router';
import WorkerOrderScreen from '../../screens/WorkerOrderScreen';

export default function WorkerOrderRoute() {
  const { id } = useLocalSearchParams();
  return <WorkerOrderScreen id={id} />;
}
