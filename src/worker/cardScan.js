import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

// Karta raqamini kamera bilan o'qish: rasm olinadi, matn telefonning o'zida taniladi (ML Kit),
// hech narsa serverga yuborilmaydi. Faqat raqam qaytariladi — amal qilish muddati va CVV o'qilmaydi.

// Luhn tekshiruvi: noto'g'ri o'qilgan raqamni rad etadi.
const luhn = (digits) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

/** Matndan karta raqamini ajratadi (16 raqam, Luhn). Topilmasa null. */
export function parseCardNumber(text) {
  const flat = String(text || '').replace(/[Oo]/g, '0');
  // «8600 1234 5678 9012» ko'rinishi (guruhlar qatorga bo'linib ketgan bo'lishi ham mumkin)
  const groups = [...flat.matchAll(/(\d{4})[\s\-.]*(\d{4})[\s\-.]*(\d{4})[\s\-.]*(\d{4})/g)];
  const cands = groups.map((m) => m.slice(1).join(''));
  // Probelsiz butun 16 raqam. Barcha raqamlarni qo'shib sirpanuvchi oyna bilan qidirilmaydi:
  // u yonidagi amal qilish muddati bilan aralashib, noto'g'ri raqam beradi.
  for (const m of flat.matchAll(/(?<!\d)\d{16}(?!\d)/g)) cands.push(m[0]);
  const known = (c) => c.startsWith('8600') || c.startsWith('9860');
  return cands.find((c) => known(c) && luhn(c)) ?? cands.find((c) => luhn(c)) ?? null;
}

/**
 * Kamerani ochib kartani suratga oladi. Natija:
 *  { number } — topildi, { error: 'denied' | 'notfound' } — ruxsat yo'q yoki raqam topilmadi,
 *  null — foydalanuvchi bekor qildi.
 */
export async function scanCard() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { error: 'denied' };
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (res.canceled || !res.assets?.length) return null;
  try {
    const out = await TextRecognition.recognize(res.assets[0].uri);
    const number = parseCardNumber(out?.text);
    return number ? { number } : { error: 'notfound' };
  } catch {
    return { error: 'notfound' };
  }
}
