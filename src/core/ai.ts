import type { Game } from './game';
import { AXES, Cell, neighbor } from './hex';
import { Rng } from './rng';

/**
 * Adversaire du duel. Il regarde tous les échanges possibles, estime ce que
 * chacun aligne (tuile qui retombe comprise) et joue le meilleur, avec un
 * temps de réflexion et des erreurs selon son niveau.
 */
export type AiSkill = 'easy' | 'normal' | 'hard' | 'extreme';

export interface AiProfile {
  /** Temps entre deux coups (ms). */
  thinkMs: number;
  /** Probabilité de jouer un coup au hasard plutôt que le meilleur. */
  blunder: number;
  /** Fait monter la pile quand elle est basse. */
  raises: boolean;
}

export const AI_PROFILES: Record<AiSkill, AiProfile> = {
  easy: { thinkMs: 1700, blunder: 0.5, raises: false },
  normal: { thinkMs: 950, blunder: 0.2, raises: false },
  hard: { thinkMs: 350, blunder: 0.03, raises: false },
  extreme: { thinkMs: 220, blunder: 0.01, raises: false },
};

export interface Move {
  from: Cell;
  to: Cell;
  /** Tuiles alignées par ce coup (0 = aucun alignement immédiat). */
  gain: number;
}

/** Couleur « alignable » d'une case (-1 sinon) dans une grille où (a) et (b) seraient échangées. */
function lookup(game: Game, swap: [Cell, Cell] | null) {
  const g = game.grid;
  return (c: number, r: number): number => {
    let cc = c;
    let rr = r;
    if (swap) {
      const [a, b] = swap;
      if (c === a.c && r === a.r) ({ c: cc, r: rr } = b);
      else if (c === b.c && r === b.r) ({ c: cc, r: rr } = a);
    }
    const t = g.get(cc, rr);
    if (!t || t.state !== 'idle' || t.special || t.kind === 'cracked' || t.kind === 'mortar' || t.kind === 'joker') return -1;
    return t.color;
  };
}

/** Taille de l'alignement que formerait la couleur `color` posée en (c, r). */
function lineGain(colorAt: (c: number, r: number) => number, c: number, r: number, color: number): number {
  let total = 0;
  for (const [back, fwd] of AXES) {
    let n = 1;
    for (const dir of [back, fwd]) {
      let p = neighbor(c, r, dir);
      while (colorAt(p.c, p.r) === color) {
        n++;
        p = neighbor(p.c, p.r, dir);
      }
    }
    if (n >= 3) total += n;
  }
  return total;
}

/** Tous les échanges permis, avec leur gain estimé. */
export function listMoves(game: Game): Move[] {
  const g = game.grid;
  const out: Move[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      for (const dir of ['upRight', 'downRight'] as const) {
        const n = neighbor(c, r, dir);
        if (!g.inBounds(n.c, n.r) || !game.canSwap(c, r, n.c, n.r)) continue;
        out.push({ from: { c, r }, to: n, gain: moveGain(game, { c, r }, n) });
      }
    }
  }
  return out;
}

function moveGain(game: Game, a: Cell, b: Cell): number {
  const g = game.grid;
  const colorAt = lookup(game, [a, b]);
  let gain = 0;
  for (const [src, dst] of [[a, b], [b, a]] as const) {
    const t = g.get(src.c, src.r);
    if (!t || t.state !== 'idle') continue;
    const color = colorAt(dst.c, dst.r);
    if (color < 0) continue;
    // Posée sur du vide, la tuile retombe : on l'évalue là où elle atterrit.
    let land = dst;
    while (land.r + 1 < g.rows && g.get(land.c, land.r + 1) === null) land = { c: land.c, r: land.r + 1 };
    if (land !== dst) {
      const fallAt = (c: number, r: number) => (c === dst.c && r === dst.r ? -1 : c === land.c && r === land.r ? color : colorAt(c, r));
      gain += lineGain(fallAt, land.c, land.r, color);
    } else gain += lineGain(colorAt, dst.c, dst.r, color);
  }
  return gain;
}

/** Hauteur de la pile la plus haute (en rangées). */
export function stackHeight(game: Game): number {
  const g = game.grid;
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (g.get(c, r)) return g.rows - r;
  return 0;
}

/** Joueur artificiel : à appeler à chaque pas de logique. */
export class Ai {
  private wait: number;
  private rng: Rng;

  constructor(
    readonly game: Game,
    readonly profile: AiProfile,
    seed: number,
  ) {
    this.rng = new Rng(seed ^ 0x5eed);
    this.wait = profile.thinkMs;
  }

  /** Coup choisi (sans le jouer). */
  choose(): Move | null {
    const moves = listMoves(this.game);
    if (!moves.length) return null;
    const best = moves.reduce((m, x) => (x.gain > m.gain ? x : m), moves[0]);
    if (best.gain > 0 && this.rng.next() >= this.profile.blunder) {
      // À gain égal, on préfère le bas de la grille (les chutes peuvent enchaîner).
      const top = moves.filter((m) => m.gain === best.gain);
      return top.reduce((m, x) => (x.from.r > m.from.r ? x : m), top[0]);
    }
    // Sinon : un échange qui déplace une tuile du haut vers du vide (étale la pile), ou au hasard.
    const flatten = moves.filter((m) => this.game.grid.get(m.to.c, m.to.r) === null || this.game.grid.get(m.from.c, m.from.r) === null);
    const pool = flatten.length ? flatten : moves;
    return pool[this.rng.int(pool.length)];
  }

  update(dtMs: number): void {
    const game = this.game;
    if (game.over) return;
    game.manualRise = this.profile.raises && stackHeight(game) < game.grid.rows * 0.4 && !game.clearing;
    this.wait -= dtMs;
    if (this.wait > 0) return;
    this.wait = this.profile.thinkMs * (0.75 + 0.5 * this.rng.next());
    const m = this.choose();
    if (m) game.trySwap(m.from.c, m.from.r, m.to.c, m.to.r);
  }
}
