import type { Config } from '../config';
import type { ClearEvent, Game } from './game';
import { Rng } from './rng';

/**
 * Duel : chaque grosse action envoie des dalles de mortier ou un malus chez l'adversaire.
 * - combo de 4 tuiles ou plus : une dalle de (taille − 1) tuiles de large ;
 *   à partir de 6 tuiles, en plus, « Fêlures » : 4 tuiles fêlées ;
 * - chaque maillon de chaîne à partir de ×2 : une dalle d'une rangée, pleine largeur ;
 *   les maillons ×4 et ×6 déclenchent en plus un « Séisme » (couleurs du haut mélangées) ;
 * - rosace : « Nuit tombée » (6 s sans couleurs chez l'adversaire) et un bouclier pour soi ;
 * - tomette d'or : « Gel » (5 tuiles scellées).
 * Contre-attaque : une dalle envoyée alors que des dalles arrivent vers soi en annule une d'abord.
 * Bouclier : absorbe la prochaine dalle reçue.
 * Dalles et malus arrivent après un court délai, affiché au-dessus de la grille visée.
 */
export type Attack =
  | { kind: 'slab'; w: number; h: number }
  | { kind: 'night'; seconds: number }
  | { kind: 'freeze'; n: number }
  | { kind: 'crack'; n: number }
  | { kind: 'quake' };

export const ATTACK_DELAY_S = 1.5;

export function attacksFor(e: ClearEvent, cols: number): Attack[] {
  if (e.rosaces > 0) return [{ kind: 'night', seconds: 6 }];
  if (e.gold) return [{ kind: 'freeze', n: 5 }];
  const out: Attack[] = [];
  // Farandole : une dalle sur toute la largeur ; de 6 tuiles et plus, des fêlures en prime.
  if (e.farandole) {
    out.push({ kind: 'slab', w: cols, h: 1 });
    if (e.farandole >= 6) out.push({ kind: 'crack', n: 4 });
  } else if (e.size >= 4) out.push({ kind: 'slab', w: Math.min(cols, e.size - 1), h: 1 });
  if (e.size >= 6 && !e.farandole) out.push({ kind: 'crack', n: 4 });
  if (e.chain >= 2) out.push({ kind: 'slab', w: cols, h: 1 });
  if (e.chain === 4 || e.chain === 6) out.push({ kind: 'quake' });
  return out;
}

/** Réglages d'une partie de duel : pas de dalles « du ciel » (seulement celles de l'adversaire), et une pile qui accélère plus vite. */
export function duelConfig(cfg: Config): Config {
  return { ...cfg, mortarEveryS: 0, levelDurationS: 15, minSecondsPerRow: Math.min(cfg.minSecondsPerRow, 0.9) };
}

type Pending = Attack & { in: number };

/** Deux parties qui s'envoient dalles et malus. Côté 0 = joueur, côté 1 = ordinateur. */
export class Duel {
  readonly pending: [Pending[], Pending[]] = [[], []];
  /** Dalles et malus envoyés par chaque côté (statistique de fin). */
  readonly sent = [0, 0];
  /** Bouclier de chaque côté (gagné par une rosace). */
  readonly shield = [false, false];
  /** Évènements déjà comptés dans chaque partie (le rendu les vide une fois par image). */
  private read = [0, 0];
  private rng: Rng;

  /** `power` : puissance des attaques de chaque côté (1 = normale ; voir AiProfile.power). */
  constructor(
    readonly games: [Game, Game],
    readonly power: [number, number] = [1, 1],
    seed = 1,
  ) {
    this.rng = new Rng(seed ^ 0xd0e1);
  }

  /** Attaques réellement envoyées par un côté, selon sa puissance. */
  private scaled(side: 0 | 1, list: Attack[]): Attack[] {
    const p = this.power[side];
    const out: Attack[] = [];
    for (const a of list) {
      if (a.kind === 'slab' && p < 1 && this.rng.next() > p) continue;
      out.push(a);
      if (a.kind === 'slab' && p > 1 && this.rng.next() < p - 1) out.push({ ...a });
    }
    return out;
  }

  /** À appeler après chaque pas de logique, avant que le rendu ne vide les évènements. */
  step(dtS: number): void {
    for (const side of [0, 1] as const) {
      const from = this.games[side];
      const to = 1 - side;
      const fresh = from.events.slice(this.read[side]);
      this.read[side] = from.events.length;
      for (const e of fresh) {
        if (e.kind !== 'clear') continue;
        if (e.rosaces > 0 && !this.shield[side]) {
          this.shield[side] = true;
          from.notices.push('shield');
        }
        for (const a of this.scaled(side, attacksFor(e, this.games[to].grid.cols))) {
          // Contre-attaque : une dalle envoyée annule d'abord une dalle qui arrive.
          const mine = this.pending[side];
          const incoming = a.kind === 'slab' ? mine.findIndex((p) => p.kind === 'slab') : -1;
          if (incoming >= 0) {
            mine.splice(incoming, 1);
            from.notices.push('counter');
            continue;
          }
          this.pending[to].push({ ...a, in: ATTACK_DELAY_S });
          this.sent[side]++;
        }
      }
    }
    for (const side of [0, 1] as const) {
      const list = this.pending[side];
      for (const p of list) p.in -= dtS;
      while (list.length && list[0].in <= 0) this.deliver(side, list.shift()!);
    }
  }

  private deliver(side: 0 | 1, a: Attack): void {
    const g = this.games[side];
    switch (a.kind) {
      case 'slab':
        if (this.shield[side]) {
          this.shield[side] = false;
          g.notices.push('blocked');
        } else g.dropMortar(a.w, a.h);
        break;
      case 'night':
        g.night(a.seconds);
        break;
      case 'freeze':
        g.freezeTiles(a.n);
        break;
      case 'crack':
        g.crackTiles(a.n);
        break;
      case 'quake':
        g.quake();
        break;
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
