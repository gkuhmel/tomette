import { describe, expect, it } from 'vitest';
import { attacksFor } from '../src/core/duel';
import type { ClearEvent } from '../src/core/game';
import { findMatches } from '../src/core/match';
import { findFarandoles } from '../src/core/shapes';
import { emptyGame, settle } from './helpers';

const A = 0;
/** Remplissage du bas qui ne forme aucun alignement (couleurs 2 à 5). */
function base() {
  const game = emptyGame({ rows: 11 });
  const g = game.grid;
  for (const r of [9, 10]) for (let c = 0; c < g.cols; c++) g.place(c, r, ((c * 2 + r) % 4) + 2);
  return game;
}
function put(game: ReturnType<typeof emptyGame>, c: number, r: number, color: number) {
  game.grid.set(c, r, null);
  return game.grid.place(c, r, color);
}
/** Zigzag sur le bas : (0,10) (1,9) (2,10) (3,9) (4,10). */
const ZIGZAG: [number, number][] = [[0, 10], [1, 9], [2, 10], [3, 9], [4, 10]];

describe('farandole : détection', () => {
  it('5 tuiles en file, avec une tuile qui vient de bouger', () => {
    const game = base();
    const ids = ZIGZAG.map(([c, r]) => put(game, c, r, A).id);
    expect(findMatches(game.grid)).toHaveLength(0);
    const f = findFarandoles(game.grid, new Set([ids[4]]));
    expect(f).toHaveLength(1);
    expect(f[0].cells).toHaveLength(5);
    expect(f[0].color).toBe(A);
    // Aucune tuile déplacée : rien.
    expect(findFarandoles(game.grid, new Set())).toHaveLength(0);
  });

  it('pas de farandole avec un embranchement ou une boucle', () => {
    const branch = base();
    const ids = ZIGZAG.map(([c, r]) => put(branch, c, r, A).id);
    branch.grid.place(1, 8, A); // une 3e voisine pour (1, 9)
    expect(findFarandoles(branch.grid, new Set(ids))).toHaveLength(0);
    const loop = base();
    const ids2 = ZIGZAG.map(([c, r]) => put(loop, c, r, A).id);
    put(loop, 0, 9, A); // triangle (0,9) (0,10) (1,9)
    expect(findFarandoles(loop.grid, new Set(ids2))).toHaveLength(0);
  });
});

describe('farandole : en jeu', () => {
  it('5 tuiles : la file disparaît et une voisine devient joker', () => {
    const game = base();
    ZIGZAG.slice(0, 4).forEach(([c, r]) => put(game, c, r, A));
    put(game, 5, 9, A);
    expect(game.trySwap(5, 9, 4, 10)).toBe(true);
    for (let i = 0; i < 30; i++) game.tick();
    const ev = game.events.find((e) => e.farandole);
    expect(ev?.farandole).toBe(5);
    expect(game.grid.some((t) => t.kind === 'joker')).toBe(true);
    settle(game);
  });

  it('6 tuiles : une cigale ; quand elle disparaît, sa rangée part avec elle', () => {
    const game = base();
    ZIGZAG.forEach(([c, r]) => put(game, c, r, A));
    put(game, 6, 10, A);
    expect(game.trySwap(6, 10, 5, 9)).toBe(true);
    for (let i = 0; i < 30; i++) game.tick();
    expect(game.events.find((e) => e.farandole)?.farandole).toBe(6);
    expect(game.grid.some((t) => t.cicada)).toBe(true);
    expect(game.notices).toContain('cicada');
  });

  it('une cigale alignée efface toute sa rangée', () => {
    const game = base();
    const g = game.grid;
    const cic = put(game, 3, 10, A);
    cic.cicada = true;
    put(game, 3, 9, A);
    g.place(3, 8, A);
    game.tick();
    const ev = game.events.find((e) => e.cicadas);
    expect(ev).toBeDefined();
    expect(ev!.size).toBe(3 + g.cols - 1);
    expect(game.notices).toContain('cicadaSing');
    settle(game);
    for (let c = 0; c < g.cols; c++) expect(g.get(c, 10) === null || g.get(c, 10)!.id !== cic.id).toBe(true);
  });

  it('commande « farandole » de la bonne couleur', () => {
    const game = base();
    (game as unknown as { order: unknown }).order = { kind: 'farandole', color: A };
    ZIGZAG.slice(0, 4).forEach(([c, r]) => put(game, c, r, A));
    put(game, 5, 9, A);
    game.trySwap(5, 9, 4, 10);
    for (let i = 0; i < 30; i++) game.tick();
    expect(game.ordersDone).toBe(1);
  });
});

describe('farandole : duel', () => {
  const ev = (farandole: number): ClearEvent => ({ kind: 'clear', cells: [], chain: 1, size: farandole, points: 0, rosaces: 0, gold: false, shape: 'farandole', farandole });
  it('5 : une dalle sur toute la largeur ; 6 : des fêlures en plus', () => {
    expect(attacksFor(ev(5), 8)).toEqual([{ kind: 'slab', w: 8, h: 1 }]);
    expect(attacksFor(ev(6), 8)).toEqual([{ kind: 'slab', w: 8, h: 1 }, { kind: 'crack', n: 4 }]);
  });
});
