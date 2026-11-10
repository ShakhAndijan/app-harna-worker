import NotifSettingsScreen from '../screens/NotifSettingsScreen';
import useGoBack from '../navigation/useGoBack';

export default function NotificationSettingsRoute() {
  return <NotifSettingsScreen onBack={useGoBack()} />;
}
