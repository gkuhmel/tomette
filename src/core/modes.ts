import type { Config } from '../config';

export type ModeId = 'endless' | 'timeAttack' | 'mosaic' | 'express' | 'campaign' | 'duel' | 'expedition';

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

/** Campagne : manches à ligne d'arrivée (réglages propres à chaque manche, voir campaign.ts). */
export const CAMPAIGN: Mode = {
  id: 'campaign',
  timeLimitS: () => 0,
  startLevel: () => 1,
  record: 'score',
};

/** Duel contre l'ordinateur (voir duel.ts). */
export const DUEL: Mode = {
  id: 'duel',
  timeLimitS: () => 0,
  startLevel: () => 1,
  record: 'score',
};

/** Expédition (roguelite, voir expedition.ts) : manches à ligne d'arrivée comme la campagne. */
export const EXPEDITION: Mode = { ...CAMPAIGN, id: 'expedition' };

export function modeById(id: ModeId): Mode {
  if (id === 'campaign') return CAMPAIGN;
  if (id === 'expedition') return EXPEDITION;
  if (id === 'duel') return DUEL;
  return MODES.find((m) => m.id === id) ?? MODES[0];
}

