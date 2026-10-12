import { describe, expect, it } from 'vitest';
import { ALL_DIRS, neighbor } from '../src/core/hex';
import { findMatches } from '../src/core/match';
import { findRosaces } from '../src/core/rosace';
import { emptyGame } from './helpers';

const A = 0, B = 1, C = 2;

/** Rosace de couleur A autour de (3,10), centre de couleur B. */
function rosaceGame(overrides = {}) {
  const game = emptyGame(overrides);
  const g = game.grid;
  const center = g.place(3, 10, B);
  for (const dir of ALL_DIRS) {
    const n = neighbor(3, 10, dir);
    g.place(n.c, n.r, A);
  }
  return { game, center };
}

describe('rosace', () => {
  it('détectée, sans alignement classique', () => {
    const { game } = rosaceGame();
    expect(findMatches(game.grid)).toHaveLength(0);
    const ros = findRosaces(game.grid);
    expect(ros).toHaveLength(1);
    expect(ros[0].center).toEqual({ c: 3, r: 10 });
    expect(ros[0].color).toBe(A);
  });

  it('l\'anneau disparaît, le centre devient une tomette d\'or', () => {
    const { game, center } = rosaceGame();
    game.tick();
    expect(game.events).toHaveLength(1);
    expect(game.events[0].rosaces).toBe(1);
    expect(game.events[0].size).toBe(6);
    expect(center.special).toBe(true);
    expect(center.state).toBe('idle');
    for (const dir of ALL_DIRS) {
      const n = neighbor(3, 10, dir);
      expect(game.grid.get(n.c, n.r)!.state).toBe('clearing');
    }
    // 6 × 10 + combo 30 × 3 + bonus 500.
    expect(game.score).toBe(60 + 90 + 500);
    expect(game.stopTime).toBeCloseTo(3 - 1 / 60, 5);
  });

  it('centre de même couleur : pas de rosace', () => {
    const game = emptyGame();
    game.grid.place(3, 10, A);
    for (const dir of ALL_DIRS) {
      const n = neighbor(3, 10, dir);
      game.grid.place(n.c, n.r, A);
    }
    expect(findRosaces(game.grid)).toHaveLength(0);
  });

  it('impossible au bord, et désactivable', () => {
    const game = emptyGame();
    // Centre en bas de grille : pas de voisine du dessous.
    game.grid.place(3, 11, B);
    for (const dir of ALL_DIRS) {
      const n = neighbor(3, 11, dir);
      if (game.grid.inBounds(n.c, n.r)) game.grid.place(n.c, n.r, A);
    }
    expect(findRosaces(game.grid)).toHaveLength(0);

    const { game: off, center } = rosaceGame({ rosace: 0 });
    off.tick();
    expect(off.events).toHaveLength(0);
    expect(center.special).toBe(false);
  });

  it('la tomette d\'or ne s\'aligne pas', () => {
    const game = emptyGame();
    for (let r = 9; r <= 11; r++) game.grid.place(0, r, A);
    game.grid.get(0, 10)!.special = true;
    expect(findMatches(game.grid)).toHaveLength(0);
  });
});

describe('tomette d\'or', () => {
  it('échangée avec une tuile : toute sa couleur disparaît', () => {
    const game = emptyGame();
    const g = game.grid;
    const gold = g.place(2, 11, C);
    gold.special = true;
    g.place(3, 11, A); // voisine bas-droite de (2,11)
    g.place(0, 11, A);
    g.place(6, 11, A);
    g.place(5, 11, B);
    expect(game.trySwap(2, 11, 3, 11)).toBe(true);
    // Pas d'échange : la tomette d'or et toutes les A disparaissent.
    expect(g.get(2, 11)).toBe(gold);
    expect(gold.state).toBe('clearing');
    for (const c of [0, 3, 6]) expect(g.get(c, 11)!.state).toBe('clearing');
    expect(g.get(5, 11)!.state).toBe('idle');
    expect(game.events[0].gold).toBe(true);
    expect(game.events[0].size).toBe(4);
  });

  it('avec une case vide : simple déplacement', () => {
    const game = emptyGame();
    const gold = game.grid.place(2, 11, C);
    gold.special = true;
    expect(game.trySwap(2, 11, 3, 11)).toBe(true);
    expect(game.grid.get(3, 11)).toBe(gold);
    expect(gold.state).toBe('swapping');
  });
});
