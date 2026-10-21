import type { Config, ConfigKey } from '../config';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'extreme'];

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
    mortarEveryS: (c) => c.mortarEveryS * 1.6,
    mortarMaxW: (c) => Math.max(c.mortarMinW, c.mortarMaxW - 1),
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
    mortarEveryS: (c) => c.mortarEveryS * 0.7,
    mortarFromLevel: (c) => Math.max(1, c.mortarFromLevel - 1),
  },
  // Pour les très forts : vite dès le départ, beaucoup de tuiles spéciales et de mortier,
  // mais une grâce et une vitesse maximale qui restent jouables.
  extreme: {
    initialRows: (c) => c.initialRows + 1,
    baseSecondsPerRow: (c) => c.baseSecondsPerRow * 0.55,
    speedFactor: (c) => 1 - (1 - c.speedFactor) * 1.4,
    minSecondsPerRow: (c) => Math.max(0.9, c.minSecondsPerRow * 0.7),
    graceS: (c) => Math.max(1.5, c.graceS * 0.6),
    crackedChance: (c) => c.crackedChance * 2,
    sealedChance: (c) => c.sealedChance * 2,
    jokerChance: (c) => c.jokerChance * 0.3,
    mortarEveryS: (c) => c.mortarEveryS * 0.5,
    mortarFromLevel: () => 1,
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
