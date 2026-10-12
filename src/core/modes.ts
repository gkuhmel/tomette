import type { Config } from '../config';

export type ModeId = 'endless' | 'timeAttack' | 'mosaic' | 'express';

export interface Mode {
  id: ModeId;
  name: string;
  /** Sous-titre affiché sur le bouton du menu. */
  tagline: (cfg: Config) => string;
  /** Durée de la partie (s), 0 = illimitée. */
  timeLimitS: (cfg: Config) => number;
  /** Niveau de départ. */
  startLevel: (cfg: Config) => number;
  /** Ce que compte le record de ce mode. */
  record: 'score' | 'rosaces';
}

export const MODES: Mode[] = [
  {
    id: 'endless',
    name: 'Classique',
    tagline: () => 'Sans fin, ça accélère',
    timeLimitS: () => 0,
    startLevel: () => 1,
    record: 'score',
  },
  {
    id: 'timeAttack',
    name: 'Contre-la-montre',
    tagline: (cfg) => `${formatDuration(cfg.timeAttackS)} pour le meilleur score`,
    timeLimitS: (cfg) => cfg.timeAttackS,
    startLevel: () => 1,
    record: 'score',
  },
  {
    id: 'mosaic',
    name: 'Mosaïque',
    tagline: (cfg) => `Un max de rosaces en ${formatDuration(cfg.mosaicS)}`,
    timeLimitS: (cfg) => cfg.mosaicS,
    startLevel: () => 1,
    record: 'rosaces',
  },
  {
    id: 'express',
    name: 'Express',
    tagline: (cfg) => `Départ au niveau ${Math.round(cfg.expressLevel)}`,
    timeLimitS: () => 0,
    startLevel: (cfg) => Math.max(1, Math.round(cfg.expressLevel)),
    record: 'score',
  },
];

export function modeById(id: ModeId): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  if (!m) return `${r} s`;
  return r ? `${m} min ${r} s` : `${m} min`;
}
