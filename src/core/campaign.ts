import type { Config } from '../config';
import { secondsPerRow } from './rise';

/**
 * Campagne « ligne d'arrivée » : 30 manches de difficulté croissante.
 * Une ligne d'arrivée est cachée `goal` rangées sous la pile ; elle remonte
 * avec la pile. La manche est réussie dès qu'il ne reste plus aucune tuile
 * au-dessus de la ligne. Étoiles selon le temps mis.
 */
export const STAGE_COUNT = 30;

export interface StageSpec {
  stage: number;
  goal: number;
  level: number;
  colors: number;
  initialRows: number;
  crackedChance: number;
  sealedChance: number;
  mortarEveryS: number;
  /** Temps (s) pour 3 et 2 étoiles. */
  star3: number;
  star2: number;
}

export function stageSpec(stage: number, cfg: Config): StageSpec {
  const n = Math.max(1, Math.min(STAGE_COUNT, Math.round(stage)));
  const goal = 6 + Math.round(n * 0.9);
  const level = 1 + Math.floor((n - 1) / 3);
  // Temps de référence : la ligne remonte seule à la vitesse du niveau de départ.
  const par = (goal + cfg.rows / 2) * secondsPerRow(cfg, level);
  return {
    stage: n,
    goal,
    level,
    colors: n <= 4 ? 4 : n <= 12 ? 5 : 6,
    initialRows: 4 + (n % 3),
    crackedChance: n >= 5 ? 0.03 + 0.002 * n : 0,
    sealedChance: n >= 9 ? 0.02 + 0.001 * n : 0,
    mortarEveryS: n >= 7 ? Math.max(14, 40 - n) : 0,
    star3: Math.round(par * 0.55),
    star2: Math.round(par * 0.8),
  };
}

/** Réglages d'une manche, par-dessus les réglages de base. */
export function stageConfig(cfg: Config, spec: StageSpec): Config {
  return {
    ...cfg,
    colors: spec.colors,
    initialRows: spec.initialRows,
    crackedChance: spec.crackedChance,
    sealedChance: spec.sealedChance,
    mortarEveryS: spec.mortarEveryS,
    mortarFromLevel: 1,
  };
}

/** Étoiles d'une manche réussie en `timeS` secondes (1 à 3). */
export function starsFor(spec: StageSpec, timeS: number): 1 | 2 | 3 {
  return timeS <= spec.star3 ? 3 : timeS <= spec.star2 ? 2 : 1;
}

/** Une manche est jouable si la précédente a été réussie. */
export function stageOpen(stage: number, stars: readonly number[]): boolean {
  return stage <= 1 || (stars[stage - 2] ?? 0) > 0;
}
