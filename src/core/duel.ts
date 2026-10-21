import type { Config } from '../config';
import type { ClearEvent, Game } from './game';

/**
 * Duel : chaque grosse action envoie des dalles de mortier chez l'adversaire.
 * - combo de 4 tuiles ou plus : une dalle de (taille − 1) tuiles de large ;
 * - chaque maillon de chaîne à partir de ×2 : une dalle d'une rangée, pleine largeur ;
 * - rosace : deux rangées pleine largeur ; tomette d'or : une rangée.
 * Les dalles arrivent après un court délai, affiché au-dessus de la grille visée.
 */
export interface Attack {
  w: number;
  h: number;
}

export const ATTACK_DELAY_S = 1.5;

export function attacksFor(e: ClearEvent, cols: number): Attack[] {
  if (e.rosaces > 0) return Array.from({ length: e.rosaces }, () => ({ w: cols, h: 2 }));
  if (e.gold) return [{ w: cols, h: 1 }];
  const out: Attack[] = [];
  if (e.size >= 4) out.push({ w: Math.min(cols, e.size - 1), h: 1 });
  if (e.chain >= 2) out.push({ w: cols, h: 1 });
  return out;
}

/** Réglages d'une partie de duel : pas de dalles « du ciel » (seulement celles de l'adversaire), et une pile qui accélère plus vite. */
export function duelConfig(cfg: Config): Config {
  return { ...cfg, mortarEveryS: 0, levelDurationS: 15, minSecondsPerRow: Math.min(cfg.minSecondsPerRow, 0.9) };
}

interface Pending extends Attack {
  in: number;
}

/** Deux parties qui s'envoient des dalles. Côté 0 = joueur, côté 1 = ordinateur. */
export class Duel {
  readonly pending: [Pending[], Pending[]] = [[], []];
  /** Dalles envoyées par chaque côté (statistique de fin). */
  readonly sent = [0, 0];
  /** Évènements déjà comptés dans chaque partie (le rendu les vide une fois par image). */
  private read = [0, 0];

  constructor(readonly games: [Game, Game]) {}

  /** À appeler après chaque pas de logique, avant que le rendu ne vide les évènements. */
  step(dtS: number): void {
    for (const side of [0, 1] as const) {
      const from = this.games[side];
      const to = 1 - side;
      const fresh = from.events.slice(this.read[side]);
      this.read[side] = from.events.length;
      for (const e of fresh) {
        if (e.kind !== 'clear') continue;
        for (const a of attacksFor(e, this.games[to].grid.cols)) {
          this.pending[to].push({ ...a, in: ATTACK_DELAY_S });
          this.sent[side]++;
        }
      }
    }
    for (const side of [0, 1] as const) {
      const list = this.pending[side];
      for (const p of list) p.in -= dtS;
      while (list.length && list[0].in <= 0) {
        const p = list.shift()!;
        this.games[side].dropMortar(p.w, p.h);
      }
    }
  }

  /** Les évènements d'une partie ont été vidés : on repart de zéro. */
  eventsCleared(side: 0 | 1): void {
    this.read[side] = 0;
  }

  /** Résultat : 0 = le joueur gagne, 1 = l'ordinateur gagne, 'draw', ou null si en cours. */
  get winner(): 0 | 1 | 'draw' | null {
    const [a, b] = this.games;
    if (a.over && b.over) return 'draw';
    if (b.over) return 0;
    if (a.over) return 1;
    return null;
  }
}
