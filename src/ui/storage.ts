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

const BEST_KEY = 'tomettes.best';

export function loadBest(): number {
  const v = Number(load(BEST_KEY));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function saveBest(score: number): void {
  save(BEST_KEY, String(Math.floor(score)));
}
