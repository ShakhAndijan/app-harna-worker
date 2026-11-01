// Ilova tarjimalari. Har bir til o'z faylida: uz.js, ru.js, en.js.
// t('bottomNav.home') kabi nuqta bilan ajratilgan yo'l orqali o'qiladi.
// Usta ilovasi matnlari `w` kalitida (workerTexts.js): t('w.home.hello').

import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';
import { workerTexts } from './workerTexts';

export const translations = {
  uz: { ...uz, w: workerTexts.uz },
  ru: { ...ru, w: workerTexts.ru },
  en: { ...en, w: workerTexts.en },
};
