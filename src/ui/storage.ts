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

/** Clé du record d'un mode et d'une difficulté (Classique / Normal garde la clé historique). */
function bestKey(mode: string, difficulty: string): string {
  const base = mode === 'endless' ? 'tomettes.best' : `tomettes.best.${mode}`;
  return difficulty === 'normal' ? base : `${base}.${difficulty}`;
}

export function loadBest(mode = 'endless', difficulty = 'normal'): number {
  const v = Number(load(bestKey(mode, difficulty)));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function saveBest(score: number, mode = 'endless', difficulty = 'normal'): void {
  save(bestKey(mode, difficulty), String(Math.floor(score)));
}

const DIFFICULTY_KEY = 'tomettes.difficulty';

export function loadDifficulty(): 'easy' | 'normal' | 'hard' | 'extreme' {
  const v = load(DIFFICULTY_KEY);
  return v === 'easy' || v === 'hard' || v === 'extreme' ? v : 'normal';
}

export function saveDifficulty(d: string): void {
  save(DIFFICULTY_KEY, d);
}

/** Efface records, statistiques, succès et tutoriel (garde réglages, langue, difficulté). */
export function resetProgress(): void {
  try {
    const keep = new Set(['tomettes.config', 'tomettes.lang', DIFFICULTY_KEY]);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('tomettes.') && !keep.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignoré */
  }
}
