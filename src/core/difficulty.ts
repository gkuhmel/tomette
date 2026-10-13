import type { Config, ConfigKey } from '../config';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

type Tweak = Partial<Record<ConfigKey, (c: Config) => number>>;

/** Ajustements par rapport aux réglages de base (Normal = réglages tels quels). */
const TWEAKS: Record<Difficulty, Tweak> = {
  easy: {
    colors: (c) => Math.min(c.colors, 5),
    baseSecondsPerRow: (c) => c.baseSecondsPerRow * 1.35,
    speedFactor: (c) => 1 - (1 - c.speedFactor) * 0.7,
    minSecondsPerRow: (c) => c.minSecondsPerRow * 1.5,
    graceS: (c) => c.graceS + 1.5,
    crackedChance: (c) => c.crackedChance * 0.5,
    sealedChance: (c) => c.sealedChance * 0.5,
    jokerChance: (c) => c.jokerChance * 1.5,
  },
  normal: {},
  hard: {
    initialRows: (c) => c.initialRows + 1,
    baseSecondsPerRow: (c) => c.baseSecondsPerRow * 0.7,
    speedFactor: (c) => 1 - (1 - c.speedFactor) * 1.25,
    minSecondsPerRow: (c) => c.minSecondsPerRow * 0.8,
    graceS: (c) => c.graceS * 0.7,
    crackedChance: (c) => c.crackedChance * 1.5,
    sealedChance: (c) => c.sealedChance * 1.5,
    jokerChance: (c) => c.jokerChance * 0.5,
  },
};

/**
 * Configuration vue à travers une difficulté. C'est une vue « vivante » :
 * un réglage changé dans le panneau de debug s'applique toujours en direct.
 */
export function withDifficulty(cfg: Config, d: Difficulty): Config {
  const tweak = TWEAKS[d];
  if (!Object.keys(tweak).length) return cfg;
  return new Proxy(cfg, {
    get(target, key) {
      const f = tweak[key as ConfigKey];
      return f ? f(target) : target[key as ConfigKey];
    },
  });
}
