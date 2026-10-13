import type { Config } from '../config';

export type ModeId = 'endless' | 'timeAttack' | 'mosaic' | 'express';

export interface Mode {
  id: ModeId;
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
    timeLimitS: () => 0,
    startLevel: () => 1,
    record: 'score',
  },
  {
    id: 'timeAttack',
    timeLimitS: (cfg) => cfg.timeAttackS,
    startLevel: () => 1,
    record: 'score',
  },
  {
    id: 'mosaic',
    timeLimitS: (cfg) => cfg.mosaicS,
    startLevel: () => 1,
    record: 'rosaces',
  },
  {
    id: 'express',
    timeLimitS: () => 0,
    startLevel: (cfg) => Math.max(1, Math.round(cfg.expressLevel)),
    record: 'score',
  },
];

export function modeById(id: ModeId): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

