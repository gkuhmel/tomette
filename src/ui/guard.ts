/** Le jeu ne se lance que sur iPhone (ou iPad) tactile, dans Safari. */
export function isIosSafari(nav: Navigator = navigator): boolean {
  const ua = nav.userAgent;
  const touch = (nav.maxTouchPoints ?? 0) > 1;
  // iPadOS se présente comme « Macintosh » mais reste tactile.
  const apple = /iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && touch);
  const otherBrowser = /CriOS|FxiOS|EdgiOS/.test(ua);
  return touch && apple && !otherBrowser;
}

export function isDevMode(): boolean {
  try {
    return new URLSearchParams(location.search).get('dev') === '1';
  } catch {
    return false;
  }
}
