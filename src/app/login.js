import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';

// Muvaffaqiyatli kirishdan keyin bosh sahifaga o'tishni AuthRedirect (_layout.js) bajaradi.
export default function LoginRoute() {
  const { signIn } = useAuth();
  return <LoginScreen onLoginSuccess={signIn} />;
}
