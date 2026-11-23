// Ilovaga ochilgan havola: ilovaning o'z sxemasi (harna-worker://…) va sayt havolalari
// (https://harna.usta.uz/…) ilovaning ekranlariga aylantiriladi: usta sahifasi (`/mutaxassis/7`,
// `/usta/7`), e'lon (`/listings/5`), bajarilgan ish (`/ish/…`), maqola, hujjatlar va referal
// havolasi (`/r/KOD`). Boshqa hamma narsa yozilgan joyiga boradi.
const DOCS = { '/about': 'about', '/privacy': 'privacy', '/terms': 'terms' };

export function redirectSystemPath({ path }) {
  try {
    // Expo Go: `exp://host/--/yo'l`; sayt: `https://harna.usta.uz/yo'l`; sxema: `harna-worker://yo'l`.
    const dev = path.indexOf('/--/');
    const bare =
      dev >= 0
        ? path.slice(dev + 3)
        : /^https?:\/\//i.test(path)
          ? path.replace(/^https?:\/\/[^/]+/i, '')
          : path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    const [pathname, search = ''] = (bare.startsWith('/') ? bare : `/${bare}`).split('?');
    let m = /^\/(?:mutaxassis|usta|workers)\/(\d+)/.exec(pathname);
    if (m) return `/usta/${m[1]}`;
    m = /^\/listings?\/(\d+)/.exec(pathname);
    if (m) return `/listing/${m[1]}`;
    m = /^\/ish\/([^/]+)/.exec(pathname);
    if (m) return `/job/${m[1]}`;
    m = /^\/(?:maqolalar|articles?)\/([^/]+)/.exec(pathname);
    if (m) return `/article/${m[1]}`;
    m = /^\/r\/([^/]+)/.exec(pathname);
    if (m) return `/r/${m[1]}`;
    if (DOCS[pathname]) return `/document?key=${DOCS[pathname]}`;
    return search ? `${pathname}?${search}` : pathname;
  } catch {
    return path;
  }
}
