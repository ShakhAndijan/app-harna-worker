import { useRouter, useLocalSearchParams } from 'expo-router';
import NewOrderScreen from '../screens/NewOrderScreen';
import useGoBack from '../navigation/useGoBack';
import { decodeParam } from '../navigation/params';

// Yangi buyurtma formasi. `worker` berilsa (newOrderRoute) usta oldindan tanlangan bo'ladi,
// berilmasa buyurtma barcha mos ustalarga yo'naltiriladi.
export default function NewOrderRoute() {
  const router = useRouter();
  const goBack = useGoBack();
  const { worker } = useLocalSearchParams();

  return (
    <NewOrderScreen
      key={String(worker ?? '')}
      targetWorker={worker ? decodeParam(worker) : null}
      onBack={goBack}
      onOrderCreated={() => router.navigate('/home')}
    />
  );
}
