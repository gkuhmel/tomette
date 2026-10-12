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
    return new URLSearchParams(location.search).get('dev') === '1';
  } catch {
    return false;
  }
}
