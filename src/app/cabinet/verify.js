import VerifyIdentityScreen from '../../screens/VerifyIdentityScreen';
import useGoBack from '../../navigation/useGoBack';

// MyID javobi shu manzilga qaytadi: `harnaworker://cabinet/verify?session_id&status&auth_code`.
// Ekran parametrlarni o'zi o'qiydi va tekshiruvni davom ettiradi.
export default function CabinetVerifyRoute() {
  return <VerifyIdentityScreen onBack={useGoBack()} />;
}
