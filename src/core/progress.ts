import type { GameStats } from './game';
import type { ModeId } from './modes';

/** Statistiques cumulées sur toutes les parties. */
export interface Totals {
  games: number;
  timeS: number;
  tiles: number;
  rosaces: number;
  gold: number;
  repairs: number;
  alertSaves: number;
  bestChain: number;
  bestCombo: number;
  bestLevel: number;
  bestRosaces: number;
  gamesByMode: Partial<Record<ModeId, number>>;
}

/** Ce qu'on sait d'une partie (en cours ou finie). */
export interface Snapshot {
  mode: ModeId;
  score: number;
  elapsed: number;
  rosaces: number;
  stats: GameStats;
}

export function emptyTotals(): Totals {
  return {
    games: 0, timeS: 0, tiles: 0, rosaces: 0, gold: 0, repairs: 0, alertSaves: 0,
    bestChain: 1, bestCombo: 0, bestLevel: 1, bestRosaces: 0, gamesByMode: {},
  };
}

/** Totaux en comptant la partie `g` (finie : `finished` incrémente le nombre de parties). */
export function withGame(t: Totals, g: Snapshot, finished: boolean): Totals {
  const s = g.stats;
  return {
    games: t.games + (finished ? 1 : 0),
    timeS: t.timeS + g.elapsed,
    tiles: t.tiles + s.tilesCleared,
    rosaces: t.rosaces + g.rosaces,
    gold: t.gold + s.goldUsed,
    repairs: t.repairs + s.repairs,
    alertSaves: t.alertSaves + s.alertSaves,
    bestChain: Math.max(t.bestChain, s.maxChain),
    bestCombo: Math.max(t.bestCombo, s.maxCombo),
    bestLevel: Math.max(t.bestLevel, s.maxLevel),
    bestRosaces: Math.max(t.bestRosaces, g.rosaces),
    gamesByMode: finished ? { ...t.gamesByMode, [g.mode]: (t.gamesByMode[g.mode] ?? 0) + 1 } : t.gamesByMode,
  };
}

export interface Achievement {
  /** Nom et description : clés ach.<id>.name / ach.<id>.desc. */
  id: string;
  /** `t` inclut déjà la partie `g` (en cours ou finie). */
  check: (t: Totals, g: Snapshot | null) => boolean;
}

const inMode = (g: Snapshot | null, mode: ModeId) => g !== null && g.mode === mode;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', check: (t) => t.games >= 1 },
  { id: 'chain2', check: (t) => t.bestChain >= 2 },
  { id: 'chain3', check: (t) => t.bestChain >= 3 },
  { id: 'chain4', check: (t) => t.bestChain >= 4 },
  { id: 'chain5', check: (t) => t.bestChain >= 5 },
  { id: 'combo5', check: (t) => t.bestCombo >= 5 },
  { id: 'combo7', check: (t) => t.bestCombo >= 7 },
  { id: 'rosace1', check: (t) => t.rosaces >= 1 },
  { id: 'rosace5', check: (t) => t.bestRosaces >= 5 },
  { id: 'rosace25', check: (t) => t.rosaces >= 25 },
  { id: 'gold', check: (t) => t.gold >= 1 },
  { id: 'repair10', check: (t) => t.repairs >= 10 },
  { id: 'save', check: (t) => t.alertSaves >= 1 },
  { id: 'score5k', check: (_t, g) => !!g && g.score >= 5000 },
  { id: 'score20k', check: (_t, g) => !!g && g.score >= 20000 },
  { id: 'score50k', check: (_t, g) => !!g && g.score >= 50000 },
  { id: 'level10', check: (t) => t.bestLevel >= 10 },
  { id: 'survive5', check: (_t, g) => inMode(g, 'endless') && g!.elapsed >= 300 },
  { id: 'express3', check: (_t, g) => inMode(g, 'express') && g!.elapsed >= 180 },
  { id: 'chrono3k', check: (_t, g) => inMode(g, 'timeAttack') && g!.score >= 3000 },
  { id: 'games25', check: (t) => t.games >= 25 },
  { id: 'games100', check: (t) => t.games >= 100 },
];

/** Succès nouvellement obtenus. */
export function newlyUnlocked(t: Totals, g: Snapshot | null, unlocked: ReadonlySet<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(t, g));
}
