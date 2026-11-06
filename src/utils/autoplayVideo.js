import { useEffect } from 'react';
import { useVideoPlayer } from 'expo-video';
import { devLog } from './log';

// Android ochiq (http://) manzillarni bloklaydi; bo'sh joy/kirill harflar bo'lsa manzil kodlanadi.
export const videoSource = (url) => {
  if (typeof url !== 'string' || !url) return null;
  const secure = url.replace(/^http:\/\//i, 'https://');
  try {
    return encodeURI(decodeURI(secure));
  } catch {
    return secure;
  }
};

/**
 * Ovozsiz, takrorlanadigan va o'zi boshlanadigan video. `active=false` bo'lsa to'xtatiladi (ko'rinmayotgan sahifa).
 * Video tayyor bo'lgach (`readyToPlay`) qayta `play()` chaqiriladi: ba'zi qurilmalarda birinchi chaqiruv yo'qoladi.
 */
export function useAutoplayVideo(uri, active = true, muted = true) {
  const player = useVideoPlayer(videoSource(uri), (p) => {
    p.loop = true;
    p.muted = true;
    if (active) p.play();
  });
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay' && active) player.play();
      if (status === 'error') devLog('[video] xato:', uri, error?.message);
    });
    return () => sub.remove();
  }, [player, active, uri]);
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);
  // Ovoz: bosilmaguncha ovozsiz; bosilsa ovoz chiqadi (faqat ko'rinib turgan sahifada).
  useEffect(() => {
    // expo-video player'i imperativ API: qiymat shu yerda to'g'ridan-to'g'ri o'zgartiriladi.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted || !active;
  }, [muted, active, player]);
  return player;
}
