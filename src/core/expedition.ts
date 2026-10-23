import type { Config } from '../config';
import { stageSpec, StageSpec } from './campaign';
import { Rng } from './rng';

/**
 * Expédition (roguelite) : 20 manches à ligne d'arrivée d'affilée, une seule vie.
 * Après chaque manche réussie, on choisit 1 carte parmi 3 : un bonus et sa
 * contrepartie, valables jusqu'à la fin de l'expédition (les effets s'empilent).
 */
export const RUN_STAGES = 20;

/** Effets cumulés des cartes choisies. */
export interface Mods {
  colors: number;
  /** Multiplicateur du temps par rangée (> 1 : pile plus lente). */
  rowTime: number;
  joker: number;
  cracked: number;
  sealed: number;
  grace: number;
  goal: number;
  shields: number;
  score: number;
  initialRows: number;
  mortarNarrow: boolean;
  mortarEvery: number;
  rosace4: boolean;
  /** Multiplicateur de la pause après une rosace (en plus de `pauses`). */
  rosacePause: number;
  orderBonus: number;
  pauses: number;
  shots: number;
  mistral: boolean;
  fireworks: boolean;
  rainbow: boolean;
}

export function emptyMods(): Mods {
  return {
    colors: 0, rowTime: 1, joker: 1, cracked: 1, sealed: 1, grace: 0, goal: 0, shields: 0, score: 1,
    initialRows: 0, mortarNarrow: false, mortarEvery: 1, rosace4: false, rosacePause: 1, orderBonus: 1, pauses: 1,
    shots: 0, mistral: false, fireworks: false, rainbow: false,
  };
}

export interface Card {
  /** Textes : card.<id>.name, card.<id>.plus, card.<id>.minus. */
  id: string;
  /** Pictogramme de la carte. */
  icon: string;
  /** Carte forte, prise une seule fois ; les autres sont de petits échanges qui se cumulent. */
  unique?: boolean;
  apply: (m: Mods) => void;
}

/**
 * Deux familles :
 * - les cartes cumulables, de petits échanges (un peu de ceci contre un peu de cela),
 *   qui peuvent revenir et s'empiler ;
 * - les cartes uniques, qui changent la partie, avec une contrepartie lourde.
 */
export const CARDS: Card[] = [
  // Cumulables.
  { id: 'slow', icon: '😴', apply: (m) => ((m.rowTime *= 1.1), (m.score *= 0.85)) },
  { id: 'points', icon: '💰', apply: (m) => ((m.score *= 1.25), (m.rowTime /= 1.1)) },
  { id: 'grace', icon: '⏳', apply: (m) => ((m.grace += 0.5), (m.goal += 1)) },
  { id: 'joker', icon: '🃏', apply: (m) => ((m.joker *= 1.5), (m.cracked *= 1.5)) },
  { id: 'pauses', icon: '☕', apply: (m) => ((m.pauses *= 1.2), (m.rowTime /= 1.1)) },
  { id: 'orders', icon: '🧺', apply: (m) => ((m.orderBonus *= 1.5), (m.grace -= 0.25)) },
  { id: 'pastis', icon: '🎲', apply: (m) => ((m.score *= 1.4), (m.goal += 1)) },
  // Uniques.
  { id: 'palette', icon: '🎨', unique: true, apply: (m) => ((m.colors -= 1), (m.rowTime /= 1.25), (m.score *= 0.8)) },
  { id: 'rosace', icon: '🌸', unique: true, apply: (m) => ((m.rosace4 = true), (m.rowTime /= 1.15), (m.rosacePause = 0)) },
  { id: 'shield', icon: '🛡️', unique: true, apply: (m) => ((m.shields += 1), (m.rowTime /= 1.15)) },
  { id: 'mortar', icon: '🧱', unique: true, apply: (m) => ((m.mortarNarrow = true), (m.mortarEvery *= 0.5)) },
  { id: 'carreau', icon: '🎯', unique: true, apply: (m) => ((m.shots += 1), (m.initialRows += 1)) },
  { id: 'mistral', icon: '🌬️', unique: true, apply: (m) => ((m.mistral = true), (m.pauses *= 0.5)) },
  { id: 'fireworks', icon: '🎆', unique: true, apply: (m) => ((m.fireworks = true), (m.score *= 0.8)) },
  { id: 'rainbow', icon: '🌈', unique: true, apply: (m) => ((m.rainbow = true), (m.joker = 0)) },
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id);

/** Effets cumulés d'une liste de cartes. */
export function modsFor(cards: readonly string[]): Mods {
  const m = emptyMods();
  for (const id of cards) cardById(id)?.apply(m);
  return m;
}

/** 3 cartes distinctes au hasard ; une carte unique déjà prise ne revient pas. */
export function drawCards(rng: Rng, taken: readonly string[], n = 3): string[] {
  const pool = CARDS.filter((c) => !(c.unique && taken.includes(c.id))).map((c) => c.id);
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(rng.int(pool.length), 1)[0]);
  return out;
}

/** Manche `n` (1 à 20) de l'expédition : reprend la difficulté des manches de campagne, de la 2e à la 30e. */
export function runStage(n: number, cfg: Config, mods: Mods): { spec: StageSpec; cfg: Config; goal: number } {
  const spec = stageSpec(Math.round(2 + ((n - 1) * 28) / (RUN_STAGES - 1)), cfg);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const mortarEvery = spec.mortarEveryS;
  const out: Config = {
    ...cfg,
    colors: clamp(spec.colors + mods.colors, 3, 6),
    initialRows: clamp(spec.initialRows + mods.initialRows, 1, cfg.rows - 3),
    baseSecondsPerRow: cfg.baseSecondsPerRow * mods.rowTime,
    minSecondsPerRow: cfg.minSecondsPerRow * mods.rowTime,
    crackedChance: Math.min(0.3, Math.max(spec.crackedChance, mods.cracked > 1 ? 0.03 : 0) * mods.cracked),
    sealedChance: Math.min(0.3, Math.max(spec.sealedChance, mods.sealed > 1 ? 0.02 : 0) * mods.sealed),
    jokerChance: Math.min(0.1, cfg.jokerChance * mods.joker),
    graceS: Math.max(1, cfg.graceS + mods.grace),
    mortarEveryS: mortarEvery * mods.mortarEvery,
    mortarFromLevel: 1,
    mortarMaxW: mods.mortarNarrow ? Math.max(1, cfg.mortarMaxW - 2) : cfg.mortarMaxW,
    mortarMinW: mods.mortarNarrow ? 1 : cfg.mortarMinW,
    rosaceMin: mods.rosace4 ? 4 : cfg.rosaceMin,
    orderBonus: cfg.orderBonus * mods.orderBonus,
    chainPauseBaseS: cfg.chainPauseBaseS * mods.pauses,
    chainPausePerLinkS: cfg.chainPausePerLinkS * mods.pauses,
    comboPausePerExtraTileS: cfg.comboPausePerExtraTileS * mods.pauses,
    rosacePauseS: cfg.rosacePauseS * mods.pauses * mods.rosacePause,
    orderPauseS: cfg.orderPauseS * mods.pauses,
    fireworks: mods.fireworks ? 1 : 0,
    mistralEveryS: mods.mistral ? 25 : 0,
    rosaceJokers: mods.rainbow ? 3 : 0,
  };
  return { spec, cfg: out, goal: spec.goal + mods.goal };
}

/** Points d'une manche réussie pour l'expédition : score de la manche (× bonus de cartes) + 1 000 × numéro de manche. */
export function stagePoints(stage: number, score: number, mods: Mods, won: boolean): number {
  return Math.round(score * mods.score) + (won ? 1000 * stage : 0);
}
