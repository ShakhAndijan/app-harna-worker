import { useRouter } from 'expo-router';
import ListingReelsScreen from '../../screens/ListingReelsScreen';

// Pastki menyudagi "E'lonlar" tabi (mijoz ilovasidagidek): barcha e'lonlar — o'zimizniki ham, raqiblarniki ham —
// to'liq ekranli Reels ko'rinishida. Qidiruv va filtrlar tepadagi qidiruv tugmasi orqali alohida ro'yxat ekranida.
// O'z e'lonlarini boshqarish — profil sahifasida.
export default function AdsTab() {
  const router = useRouter();
  return <ListingReelsScreen tab onSearch={() => router.push('/listings')} />;
}
