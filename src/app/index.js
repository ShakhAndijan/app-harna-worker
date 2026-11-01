import { Redirect } from 'expo-router';

// Ilova faqat ustalar uchun: mehmon to'g'ridan-to'g'ri kirish ekraniga o'tadi.
export default function Index() {
  return <Redirect href="/login" />;
}
