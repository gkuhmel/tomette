/**
 * Récompenses du niveau joueur : nouveaux thèmes et jeux de pictogrammes.
 * Les 4 premiers thèmes et les pictogrammes classiques sont toujours disponibles.
 */
export type UnlockKind = 'theme' | 'glyphs';

export interface Unlock {
  level: number;
  kind: UnlockKind;
  /** Indice du thème (THEMES) ou du jeu de pictogrammes. */
  index: number;
}

export const UNLOCKS: Unlock[] = [
  { level: 2, kind: 'theme', index: 4 },
  { level: 3, kind: 'glyphs', index: 1 },
  { level: 4, kind: 'theme', index: 5 },
  { level: 5, kind: 'glyphs', index: 2 },
  { level: 6, kind: 'theme', index: 6 },
  { level: 7, kind: 'glyphs', index: 3 },
  { level: 8, kind: 'theme', index: 7 },
  { level: 9, kind: 'glyphs', index: 4 },
  { level: 11, kind: 'theme', index: 8 },
  { level: 13, kind: 'theme', index: 9 },
  { level: 15, kind: 'theme', index: 10 },
  { level: 17, kind: 'theme', index: 11 },
  // Le thème ultime : vraies tomettes et décor de Provence.
  { level: 20, kind: 'theme', index: 12 },
];

/** Niveau requis pour un thème ou un jeu de pictogrammes (1 = disponible dès le départ). */
export function requiredLevel(kind: UnlockKind, index: number): number {
  return UNLOCKS.find((u) => u.kind === kind && u.index === index)?.level ?? 1;
}

export function isUnlocked(kind: UnlockKind, index: number, level: number): boolean {
  return level >= requiredLevel(kind, index);
}

/** Récompenses obtenues en passant du niveau `from` au niveau `to`. */
export function unlocksBetween(from: number, to: number): Unlock[] {
  return UNLOCKS.filter((u) => u.level > from && u.level <= to);
}
