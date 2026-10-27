/** Téléphone ou tablette tactile (pour le message « Tourne ton téléphone »). */
export function isPhone(): boolean {
  try {
    return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function isDevMode(): boolean {
  try {
    const q = new URLSearchParams(location.search);
    return q.get('dev') === '1' || isCaptureMode();
  } catch {
    return false;
  }
}

/** Mode capture (?capture=1) : mode développeur sans bouton de debug, pour filmer le jeu. */
export function isCaptureMode(): boolean {
  try {
    return new URLSearchParams(location.search).get('capture') === '1';
  } catch {
    return false;
  }
}
