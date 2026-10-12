/** Accès localStorage protégés (navigation privée, stockage bloqué…). */
export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignoré */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignoré */
  }
}

/** Clé du record d'un mode (le mode Classique garde la clé historique). */
const bestKey = (mode: string) => (mode === 'endless' ? 'tomettes.best' : `tomettes.best.${mode}`);

export function loadBest(mode = 'endless'): number {
  const v = Number(load(bestKey(mode)));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function saveBest(score: number, mode = 'endless'): void {
  save(bestKey(mode), String(Math.floor(score)));
}
