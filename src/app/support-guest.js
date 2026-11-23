import GuestSupportScreen from '../screens/GuestSupportScreen';
import useGoBack from '../navigation/useGoBack';

// Kirmagan odam uchun yordam shakli (Turnstile bilan): kirish ekranidan ochiladi.
export default function SupportGuestRoute() {
  return <GuestSupportScreen onBack={useGoBack()} />;
}
