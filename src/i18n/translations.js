// Ilova tarjimalari. Har bir til o'z faylida: uz.js, ru.js, en.js.
// t('bottomNav.home') kabi nuqta bilan ajratilgan yo'l orqali o'qiladi.
//
// Kirill (`cr`) alohida fayl emas: `uz` lug'ati lotindan kirillga o'girilib (translit.js) hosil qilinadi,
// `crOverrides.js` dagi qo'lda tuzatilgan matnlar ustidan qo'yiladi. Faqat birinchi kerak bo'lganda yasaladi.

import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';
import { translitDeep } from './translit';
import { crOverrides } from './crOverrides';
import { workerTexts } from './workerTexts';
import { workerMoreTexts } from './workerMoreTexts';
import { workerSiteTexts } from './workerSiteTexts';

// Usta ilovasi matnlari `w` kalitida (workerTexts.js): t('w.home.hello').
const uzAll = {
  ...uz,
  w: { ...workerTexts.uz, more: workerMoreTexts.uz, site: workerSiteTexts.uz },
};
export const translations = {
  uz: uzAll,
  ru: { ...ru, w: { ...workerTexts.ru, more: workerMoreTexts.ru, site: workerSiteTexts.ru } },
  en: { ...en, w: { ...workerTexts.en, more: workerMoreTexts.en, site: workerSiteTexts.en } },
};

let cr = null;
Object.defineProperty(translations, 'cr', {
  enumerable: true,
  get() {
    cr ??= mergeDeep(translitDeep(uzAll), crOverrides);
    return cr;
  },
});

// `override` dagi qiymatlar `base` ustidan chuqur qo'yiladi (massivlar to'liq almashadi).
function mergeDeep(base, override) {
  const out = { ...base };
  for (const k of Object.keys(override ?? {})) {
    const v = override[k];
    out[k] =
      v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object'
        ? mergeDeep(out[k], v)
        : v;
  }
  return out;
}
