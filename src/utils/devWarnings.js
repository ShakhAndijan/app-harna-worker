import { LogBox } from 'react-native';

// Faqat dev rejimida: expo-router ichki tab navigatsiyasi (ROUTE_NAMES_CHANGED) haqidagi
// ogohlantirish ilova ishlashiga ta'sir qilmaydi va production'da umuman chiqmaydi.
// Shu aniq xabarni yashiramiz, boshqa xatolar avvalgidek ko'rinadi.
const IGNORED = ['ROUTE_NAMES_CHANGED'];

if (__DEV__) {
  LogBox.ignoreLogs(IGNORED);

  const originalError = console.error;
  console.error = (...args) => {
    const text = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED.some((s) => text.includes(s))) return;
    originalError(...args);
  };
}

export {};
