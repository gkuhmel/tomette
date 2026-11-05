import type { Config } from '../config';
import { stageSpec } from './campaign';
import type { OrderKind } from './orders';
import { Rng } from './rng';

/**
 * L'Atelier : 20 manches d'affilée, une seule vie. Chaque
 * manche affiche un bon de commande (2 à 5 motifs, visibles en même temps, à livrer dans
 * l'ordre voulu) ; la manche est gagnée quand tout est livré. La pile accélère d'une manche
 * à l'autre (difficulté des manches de campagne, de la 2e à la 30e). Une manche livrée vite rapporte un pourboire, qui
 * permet de sauter une commande plus tard (2 au plus).
 */
export const ATELIER_STAGES = 20;

/** Pourboires gardés au plus. */
export const MAX_TIPS = 2;

/** Temps accordé par motif à livrer pour gagner un pourboire (s). */
export const TIP_SECONDS_PER_STEP = 25;

/** Une ligne du bon de commande. */
export interface BonItem {
  /** Motifs à livrer dans l'ordre : un seul, ou « triangle puis arc » de la même couleur. */
  steps: OrderKind[];
  /** Couleur demandée par les motifs de couleur (-1 : aucune). */
  color: number;
  /** Nombre de fois (2 : « 2 triangles rouges »). */
  count: number;
  /** Motifs déjà livrés. */
  done: number;
}

/** Motifs de couleur (triangle, arc, farandole) : la couleur fait partie de la commande. */
export const COLORED: readonly OrderKind[] = ['triangle', 'arc', 'farandole'];

export const itemTotal = (i: BonItem) => i.steps.length * i.count;
export const itemFinished = (i: BonItem) => i.done >= itemTotal(i);
/** Motif à livrer maintenant pour cette ligne. */
export const itemStep = (i: BonItem): OrderKind => i.steps[i.done % i.steps.length];

/** Ce que demande le bon d'une manche : nombre de lignes et motifs possibles. */
export function bonSpec(stage: number): { lines: [number, number]; kinds: OrderKind[]; doubles: boolean; sequences: boolean } {
  if (stage <= 3) return { lines: [2, 2], kinds: ['triangle', 'combo5'], doubles: false, sequences: false };
  if (stage <= 7) return { lines: [3, 3], kinds: ['triangle', 'combo5', 'arc'], doubles: false, sequences: false };
  if (stage <= 11) return { lines: [3, 4], kinds: ['triangle', 'combo5', 'arc', 'farandole', 'chain3'], doubles: false, sequences: false };
  if (stage <= 15) return { lines: [4, 4], kinds: ['triangle', 'combo5', 'arc', 'farandole', 'chain3', 'rosace'], doubles: true, sequences: false };
  return { lines: [5, 5], kinds: ['triangle', 'combo5', 'arc', 'farandole', 'chain3', 'rosace'], doubles: true, sequences: true };
}

/** Bon de commande de la manche `stage` (jamais deux fois la même ligne). */
export function makeBon(stage: number, rng: Rng, colors: number): BonItem[] {
  const spec = bonSpec(stage);
  const n = spec.lines[0] + rng.int(spec.lines[1] - spec.lines[0] + 1);
  const out: BonItem[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < n && tries < 200; tries++) {
    const kind = rng.pick(spec.kinds);
    const color = COLORED.includes(kind) ? rng.int(colors) : -1;
    let steps: OrderKind[] = [kind];
    let count = 1;
    // Fin de parcours : « triangle puis arc », même couleur (une ligne sur trois environ).
    if (spec.sequences && (kind === 'triangle' || kind === 'arc') && rng.next() < 0.35) steps = kind === 'triangle' ? ['triangle', 'arc'] : ['arc', 'triangle'];
    // « 2 triangles rouges » : seulement pour les formes qu'on construit une à une.
    else if (spec.doubles && (kind === 'triangle' || kind === 'arc') && rng.next() < 0.4) count = 2;
    const key = `${steps.join('+')}:${color}`;
    // Une seule ligne par motif sans couleur (un combo de 5 en remplirait deux d'un coup).
    const plain = color < 0 ? `${kind}` : key;
    if (seen.has(plain)) continue;
    seen.add(plain);
    out.push({ steps, color, count, done: 0 });
  }
  return out;
}

/**
 * Manche `n` (1 à 20) : reprend la difficulté des manches de campagne, de la 2e à la 30e
 * (couleurs, vitesse de départ, tuiles spéciales, dalles), sans ligne d'arrivée.
 */
export function atelierStage(n: number, cfg: Config): { level: number; cfg: Config } {
  const spec = stageSpec(Math.round(2 + ((n - 1) * 28) / (ATELIER_STAGES - 1)), cfg);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    level: spec.level,
    cfg: {
      ...cfg,
      colors: clamp(spec.colors, 3, 6),
      initialRows: clamp(spec.initialRows, 1, cfg.rows - 3),
      crackedChance: Math.min(0.3, spec.crackedChance),
      sealedChance: Math.min(0.3, spec.sealedChance),
      mortarEveryS: spec.mortarEveryS,
      mortarFromLevel: 1,
    },
  };
}

/** Manche livrée assez vite pour un pourboire ? */
export function earnsTip(elapsedS: number, bon: readonly BonItem[]): boolean {
  const steps = bon.reduce((s, i) => s + itemTotal(i), 0);
  return elapsedS <= steps * TIP_SECONDS_PER_STEP;
}

/** Points d'une manche pour l'atelier : score de la manche + 1 000 × numéro de manche si elle est livrée. */
export function atelierPoints(stage: number, score: number, won: boolean): number {
  return Math.round(score) + (won ? 1000 * stage : 0);
}
