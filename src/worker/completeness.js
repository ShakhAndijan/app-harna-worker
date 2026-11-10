import { num } from './ui';

// Profil to'ldirilganligi: saytdagi 9 ta band.
export function completenessItems(me) {
  const cats = me?.categories || [];
  return [
    ['portfolio', (me?.portfolio?.length || 0) > 0],
    ['photo', !!me?.profile_photo],
    ['bio', !!me?.bio],
    ['cats', cats.length > 0],
    ['prices', cats.length > 0 && cats.some((c) => num(c.price) > 0 || c.is_negotiable)],
    ['schedule', !!me?.schedule && (Array.isArray(me.schedule) ? me.schedule.length > 0 : true)],
    ['map', me?.latitude != null && me?.longitude != null],
    ['phone', !!me?.is_phone_verified],
    ['identity', !!me?.is_identity_verified],
  ];
}
