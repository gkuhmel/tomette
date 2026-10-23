import { describe, expect, it } from 'vitest';
import { neighbor } from '../src/core/hex';
import { findMatches } from '../src/core/match';
import { findShapes, RING } from '../src/core/shapes';
import { emptyGame, settle } from './helpers';

const A = 0, B = 1, C = 2;

/** Pose (c, r) et ses voisins RING[i] pour les indices donnés, tous de couleur `color`. */
function star(game: ReturnType<typeof emptyGame>, c: number, r: number, color: number, ring: number[], centerColor = color) {
  game.grid.place(c, r, centerColor);
  for (const i of ring) {
    const n = neighbor(c, r, RING[i]);
    game.grid.place(n.c, n.r, color);
  }
}

describe('formes', () => {
  it('losange : 4 tuiles, sans alignement de 3', () => {
    const game = emptyGame();
    star(game, 3, 6, A, [0, 1, 2]);
    expect(findMatches(game.grid)).toHaveLength(0);
    const l = findShapes(game.grid, 'losange', null);
    expect(l).toHaveLength(1);
    expect(l[0].cells).toHaveLength(4);
    expect(findShapes(game.grid, 'triangle', null).length).toBeGreaterThanOrEqual(2);
  });

  it('arc : 4 voisines consécutives d\'une autre couleur que le centre', () => {
    const game = emptyGame();
    star(game, 3, 6, A, [0, 1, 2, 3], B);
    expect(findMatches(game.grid)).toHaveLength(0);
    const arcs = findShapes(game.grid, 'arc', null);
    expect(arcs.some((s) => s.color === A && s.cells.length === 4)).toBe(true);
    // Même couleur au centre : pas d'arc (et c'est un alignement).
    const g2 = emptyGame();
    star(g2, 3, 6, A, [0, 1, 2, 3], A);
    expect(findShapes(g2.grid, 'arc', null).some((s) => s.color === A)).toBe(false);
  });

  it('une forme doit contenir une tuile qui vient de bouger', () => {
    const game = emptyGame();
    star(game, 3, 6, A, [0, 1, 2]);
    expect(findShapes(game.grid, 'losange', new Set())).toHaveLength(0);
    const id = game.grid.get(3, 6)!.id;
    expect(findShapes(game.grid, 'losange', new Set([id]))).toHaveLength(1);
  });
});

describe('losange en jeu', () => {
  it('construit par un échange : disparaît avec bonus, la voisine la plus haute devient joker', () => {
    const game = emptyGame();
    const g = game.grid;
    const bottom = g.rows - 1;
    // Colonne pleine de remplissage sans alignement, puis un losange qu'un échange complète.
    for (let c = 0; c < g.cols; c++) for (let r = bottom - 3; r <= bottom; r++) g.place(c, r, 2 + ((c * 2 + r) % 4));
    // Losange autour de (3, bottom-1) : voisins 3, 4 (bas, bas-gauche) et le centre ; le 4e arrive par échange.
    const ctr = { c: 3, r: bottom - 1 };
    const cells = [ctr, neighbor(ctr.c, ctr.r, RING[3]), neighbor(ctr.c, ctr.r, RING[4]), neighbor(ctr.c, ctr.r, RING[5])];
    for (const x of cells.slice(0, 3)) {
      g.set(x.c, x.r, null);
      g.place(x.c, x.r, A);
    }
    // La 4e case reçoit une tuile A par échange latéral depuis sa voisine.
    const last = cells[3];
    g.set(last.c, last.r, null);
    g.place(last.c, last.r, B);
    const from = neighbor(last.c, last.r, 'upLeft');
    g.set(from.c, from.r, null);
    g.place(from.c, from.r, A);
    expect(findMatches(g)).toHaveLength(0);
    expect(game.trySwap(from.c, from.r, last.c, last.r)).toBe(true);
    for (let i = 0; i < 12; i++) game.tick();
    const ev = game.events.find((e) => e.shape === 'losange');
    expect(ev).toBeDefined();
    expect(game.grid.some((t) => t.kind === 'joker')).toBe(true);
    settle(game);
  });
});

describe('commandes', () => {
  it('une commande « combo de 5 » se réalise et en amène une autre', () => {
    const game = emptyGame();
    (game as { order: unknown }).order = { kind: 'combo5', color: -1 };
    const bottom = game.grid.rows - 1;
    for (const r of [bottom, bottom - 1, bottom - 2, bottom - 3, bottom - 4]) game.grid.place(0, r, C);
    const before = game.score;
    game.tick();
    expect(game.ordersDone).toBe(1);
    expect(game.score).toBeGreaterThan(before + 300);
    expect(game.order).not.toBeNull();
    expect(game.order!.kind).not.toBe('combo5');
    expect(game.notices).toContain('order');
  });

  it('pas de commandes sans l\'option', () => {
    expect(emptyGame().order).toBeNull();
  });
});
