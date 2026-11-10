import { useLocalSearchParams } from 'expo-router';
import ListingsScreen from '../screens/ListingsScreen';
import useGoBack from '../navigation/useGoBack';

export default function ListingsRoute() {
  const { workerId, workerName } = useLocalSearchParams();
  return (
    <ListingsScreen
      onBack={useGoBack()}
      workerId={workerId ? Number(workerId) : null}
      workerName={workerName ? String(workerName) : ''}
    />
  );
}
