import type { ModeId } from './modes';
import type { Snapshot } from './progress';
import { Rng } from './rng';

/**
 * Missions et expérience (XP).
 *
 * - 3 missions du jour (une facile, une moyenne, une difficile), tirées à
 *   partir de la date : les mêmes pour tout le monde le même jour.
 * - 1 mission au long cours, cumulée sur toutes les parties ; une fois
 *   réussie, la suivante de la liste prend sa place (de plus en plus grandes).
 * - Chaque partie et chaque mission réussie rapportent de l'XP, qui fait
 *   monter le niveau du joueur.
 */

/** Grandeur mesurée sur une partie. */
export type Metric = 'score' | 'rosaces' | 'chain' | 'combo' | 'tiles' | 'slabs' | 'gold' | 'repairs' | 'level' | 'minutes' | 'games';

export interface MissionTemplate {
  /** Texte : clé mis.<id> (paramètre {n}). */
  id: string;
  metric: Metric;
  /** game : à réussir en une seule partie ; sum : cumulé sur la journée. */
  scope: 'game' | 'sum';
  /** Seules les parties de ce mode comptent. */
  mode?: ModeId;
  /** Objectif selon le palier : facile, moyen, difficile. */
  targets: [number, number, number];
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'scoreEndless', metric: 'score', scope: 'game', mode: 'endless', targets: [3000, 6000, 12000] },
  { id: 'scoreTime', metric: 'score', scope: 'game', mode: 'timeAttack', targets: [2000, 4000, 7000] },
  { id: 'rosacesGame', metric: 'rosaces', scope: 'game', targets: [1, 2, 3] },
  { id: 'rosacesMosaic', metric: 'rosaces', scope: 'game', mode: 'mosaic', targets: [2, 4, 6] },
  { id: 'chain', metric: 'chain', scope: 'game', targets: [2, 3, 4] },
  { id: 'combo', metric: 'combo', scope: 'game', targets: [4, 5, 6] },
  { id: 'tilesGame', metric: 'tiles', scope: 'game', targets: [60, 120, 200] },
  { id: 'slabs', metric: 'slabs', scope: 'game', targets: [1, 2, 4] },
  { id: 'gold', metric: 'gold', scope: 'game', targets: [1, 1, 2] },
  { id: 'repairs', metric: 'repairs', scope: 'game', targets: [2, 4, 6] },
  { id: 'level', metric: 'level', scope: 'game', targets: [3, 5, 7] },
  { id: 'levelExpress', metric: 'level', scope: 'game', mode: 'express', targets: [9, 10, 12] },
  { id: 'minutes', metric: 'minutes', scope: 'game', mode: 'endless', targets: [2, 4, 6] },
  { id: 'gamesDay', metric: 'games', scope: 'sum', targets: [2, 3, 5] },
  { id: 'tilesDay', metric: 'tiles', scope: 'sum', targets: [300, 600, 1000] },
  { id: 'rosacesDay', metric: 'rosaces', scope: 'sum', targets: [2, 4, 6] },
];

/** XP d'une mission du jour selon son palier, et d'une mission au long cours. */
export const DAILY_XP: [number, number, number] = [100, 175, 250];
export const LONG_XP = 500;

/** Missions au long cours, dans l'ordre ; la liste recommence avec des objectifs doublés, triplés… */
export const LONG_MISSIONS: { id: string; metric: Metric; target: number }[] = [
  { id: 'tiles', metric: 'tiles', target: 500 },
  { id: 'rosaces', metric: 'rosaces', target: 10 },
  { id: 'games', metric: 'games', target: 25 },
  { id: 'slabs', metric: 'slabs', target: 10 },
  { id: 'gold', metric: 'gold', target: 5 },
  { id: 'tiles', metric: 'tiles', target: 2000 },
  { id: 'rosaces', metric: 'rosaces', target: 30 },
  { id: 'repairs', metric: 'repairs', target: 50 },
];

export interface DailyMission {
  id: string;
  tier: 0 | 1 | 2;
  target: number;
  progress: number;
  done: boolean;
}

export interface MissionState {
  /** Jour des missions en cours (AAAA-MM-JJ, heure locale). */
  day: string;
  daily: DailyMission[];
  /** Rang de la mission au long cours (toutes listes confondues) et son avancée. */
  longIndex: number;
  longProgress: number;
  xp: number;
}

export function emptyMissionState(): MissionState {
  return { day: '', daily: [], longIndex: 0, longProgress: 0, xp: 0 };
}

function hashDay(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Les 3 missions d'un jour : modèles distincts, un par palier. */
export function dailyMissions(day: string): DailyMission[] {
  const rng = new Rng(hashDay(day));
  const pool = [...MISSION_TEMPLATES];
  const out: DailyMission[] = [];
  for (const tier of [0, 1, 2] as const) {
    const tpl = pool.splice(rng.int(pool.length), 1)[0];
    out.push({ id: tpl.id, tier, target: tpl.targets[tier], progress: 0, done: false });
  }
  return out;
}

export function templateById(id: string): MissionTemplate | undefined {
  return MISSION_TEMPLATES.find((m) => m.id === id);
}

/** Mission au long cours de rang `index` : la liste se répète avec des objectifs multipliés. */
export function longMission(index: number): { id: string; metric: Metric; target: number } {
  const n = LONG_MISSIONS.length;
  const base = LONG_MISSIONS[index % n];
  return { ...base, target: base.target * (Math.floor(index / n) + 1) };
}

/** Valeur d'une grandeur sur une partie finie. */
export function metricOf(metric: Metric, g: Snapshot): number {
  const s = g.stats;
  switch (metric) {
    case 'score': return g.score;
    case 'rosaces': return g.rosaces;
    case 'chain': return s.maxChain;
    case 'combo': return s.maxCombo;
    case 'tiles': return s.tilesCleared;
    case 'slabs': return s.slabsBroken;
    case 'gold': return s.goldUsed;
    case 'repairs': return s.repairs;
    case 'level': return s.maxLevel;
    case 'minutes': return Math.floor(g.elapsed / 60);
    case 'games': return 1;
  }
}

/** Missions du jour à jour : nouvelles si la date a changé. */
export function forDay(state: MissionState, day: string): MissionState {
  if (state.day === day && state.daily.length) return state;
  return { ...state, day, daily: dailyMissions(day) };
}

/** XP de base d'une partie : un peu pour avoir joué, plus selon le score (plafonné). */
export function gameXp(g: Snapshot): number {
  return Math.min(200, 10 + Math.floor(g.score / 150));
}

export interface GameResult {
  state: MissionState;
  /** Missions du jour réussies par cette partie. */
  daily: DailyMission[];
  /** Mission au long cours réussie par cette partie (son rang), ou null. */
  long: number | null;
  /** XP gagnée : partie, missions. */
  xpGame: number;
  xpMissions: number;
}

/** Compte une partie finie le jour `day`. */
export function applyGame(prev: MissionState, g: Snapshot, day: string): GameResult {
  const state = forDay(prev, day);
  const done: DailyMission[] = [];
  const daily = state.daily.map((m) => {
    if (m.done) return m;
    const tpl = templateById(m.id);
    if (!tpl || (tpl.mode && tpl.mode !== g.mode)) return m;
    const v = metricOf(tpl.metric, g);
    const progress = tpl.scope === 'game' ? Math.max(m.progress, v) : m.progress + v;
    const next = { ...m, progress: Math.min(progress, m.target), done: progress >= m.target };
    if (next.done) done.push(next);
    return next;
  });

  let { longIndex, longProgress } = state;
  let long: number | null = null;
  const lm = longMission(longIndex);
  longProgress += metricOf(lm.metric, g);
  if (longProgress >= lm.target) {
    long = longIndex;
    longIndex++;
    longProgress = 0;
  }

  const xpGame = gameXp(g);
  const xpMissions = done.reduce((n, m) => n + DAILY_XP[m.tier], 0) + (long !== null ? LONG_XP : 0);
  return {
    state: { day, daily, longIndex, longProgress, xp: state.xp + xpGame + xpMissions },
    daily: done,
    long,
    xpGame,
    xpMissions,
  };
}

/** XP pour passer du niveau `level` au suivant. */
export function xpForNext(level: number): number {
  return 200 + 100 * (level - 1);
}

/** Niveau du joueur pour une XP totale, avec l'avancée vers le niveau suivant. */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= xpForNext(level)) {
    rest -= xpForNext(level);
    level++;
  }
  return { level, into: rest, need: xpForNext(level) };
}
