import { describe, expect, it } from 'vitest';
import { LATERAL_DIRS, neighbor } from '../src/core/hex';
import { emptyGame } from './helpers';

/** Colonne pleine de couleurs alternées, pour que tout soit soutenu sans alignement. */
function setup() {
  const game = emptyGame();
  const g = game.grid;
  for (let c = 0; c < g.cols; c++) for (let r = 4; r < g.rows; r++) g.place(c, r, (c * 2 + r) % 4);
  return game;
}

describe('échange (§7.1)', () => {
  it('autorisé avec les 4 voisins latéraux', () => {
    for (const c of [2, 3]) {
      for (const dir of LATERAL_DIRS) {
        const game = setup();
        const n = neighbor(c, 7, dir);
        const a = game.grid.get(c, 7)!;
        const b = game.grid.get(n.c, n.r)!;
        expect(game.trySwap(c, 7, n.c, n.r)).toBe(true);
        expect(game.grid.get(n.c, n.r)).toBe(a);
        expect(game.grid.get(c, 7)).toBe(b);
        expect(a.state).toBe('swapping');
      }
    }
  });

  it('refusé en vertical et entre cases non adjacentes', () => {
    const game = setup();
    expect(game.trySwap(2, 7, 2, 6)).toBe(false);
    expect(game.trySwap(2, 7, 2, 8)).toBe(false);
    expect(game.trySwap(2, 7, 4, 7)).toBe(false);
  });

  it('refusé avec une tuile falling ou clearing', () => {
    for (const state of ['falling', 'clearing'] as const) {
      const game = setup();
      game.grid.get(3, 7)!.state = state;
      expect(game.trySwap(2, 7, 3, 7)).toBe(false);
      expect(game.trySwap(3, 7, 2, 7)).toBe(false);
    }
  });

  it('autorisé avec une case vide, puis la tuile tombe', () => {
    const game = setup();
    const g = game.grid;
    // (3,3) est vide ; (2,4) est son voisin bas-gauche (colonne impaire : (c-1, r+1)).
    const t = g.get(2, 4)!;
    expect(game.trySwap(2, 4, 3, 3)).toBe(true);
    expect(g.get(3, 3)).toBe(t);
    expect(g.get(2, 4)).toBeNull();
    // Elle est soutenue par (3,4) : reste en place.
    for (let i = 0; i < 30; i++) game.tick();
    expect(g.get(3, 3)).toBe(t);
  });

  it('autorisé pendant que d\'autres tuiles tombent ailleurs', () => {
    const game = setup();
    const g = game.grid;
    g.place(0, 0, 5).state = 'falling';
    expect(game.trySwap(4, 8, 5, 8)).toBe(true);
  });
});
