import { ENDPOINTS } from '../constants/config';
import { request } from '../utils/request';

// `sub_category_only=false` (backend default): daraxt — asosiy yo'nalishlar, ularning ichida `children`.
// `true` bo'lsa faqat quyi yo'nalishlar (parent_id bilan) tekis ro'yxatda qaytadi, asosiylari yo'q.
export async function getCategories() {
  return (await request(`${ENDPOINTS.CATEGORIES}?sub_category_only=false`)) ?? [];
}

/**
 * POST /categories/suggest — buyurtma tavsifiga ko'ra ehtimoliy yo'nalish (AI). Mehmon ham so'raydi;
 * AI kaliti yo'q, matn qisqa yoki model ishonchsiz bo'lsa `category_ids` bo'sh.
 */
export async function suggestCategories(text) {
  const out = await request(ENDPOINTS.CATEGORIES_SUGGEST, {
    method: 'POST',
    body: { text },
    timeout: 8000,
    fallbackMessage: 'Taklif olinmadi',
  });
  return Array.isArray(out?.category_ids) ? out.category_ids : [];
}
