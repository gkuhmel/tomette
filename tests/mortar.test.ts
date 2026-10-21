import { describe, expect, it } from 'vitest';
import { findMatches } from '../src/core/match';
import { emptyGame, runTicks, settle } from './helpers';

const A = 0;

describe('dalles de mortier', () => {
  it('une dalle tombe d\'un bloc jusqu\'en bas, ne s\'aligne pas et ne s\'échange pas', () => {
    const game = emptyGame();
    const g = game.grid;
    game.dropMortar(g.cols);
    game.tick();
    settle(game);
    const bottom = g.rows - 1;
    const slab = g.get(0, bottom)!.slab;
    expect(slab).toBeGreaterThan(0);
    for (let c = 0; c < g.cols; c++) {
      const t = g.get(c, bottom)!;
      expect(t.kind).toBe('mortar');
      expect(t.slab).toBe(slab);
    }
    expect(findMatches(g)).toHaveLength(0);
    expect(game.canSwap(0, bottom, 1, bottom)).toBe(false);
  });

  it('un alignement voisin transforme toute la dalle en tuiles normales', () => {
    const game = emptyGame();
    const g = game.grid;
    game.dropMortar(g.cols);
    game.tick();
    settle(game);
    const bottom = g.rows - 1;
    // Série verticale posée sur la dalle, en colonne 3 : elle ne touche qu'un morceau.
    for (const r of [bottom - 1, bottom - 2, bottom - 3]) g.place(3, r, A);
    game.tick();
    expect(game.stats.slabsBroken).toBe(1);
    for (let c = 0; c < g.cols; c++) expect(g.get(c, bottom)!.kind).toBe('normal');
    settle(game);
    expect(g.some((t) => t.kind === 'mortar')).toBe(false);
  });

  it('une dalle qui tombe encore de la rangée du haut ne déclenche pas d\'alerte', () => {
    const game = emptyGame();
    game.dropMortar(3);
    game.tick();
    expect(game.grid.topRowOccupied()).toBe(true);
    expect(game.alert).toBe(false);
    settle(game);
    expect(game.alert).toBe(false);
  });

  it('arrive avec le temps à partir du niveau prévu ; 0 = jamais', () => {
    const on = emptyGame({ mortarEveryS: 5, mortarFromLevel: 1 });
    runTicks(on, 60 * 12);
    expect(on.grid.some((t) => t.kind === 'mortar')).toBe(true);
    const later = emptyGame({ mortarEveryS: 5, mortarFromLevel: 3 });
    runTicks(later, 60 * 12);
    expect(later.grid.some((t) => t.kind === 'mortar')).toBe(false);
    const off = emptyGame({ mortarEveryS: 0, mortarFromLevel: 1 });
    runTicks(off, 60 * 12);
    expect(off.grid.some((t) => t.kind === 'mortar')).toBe(false);
  });
});
