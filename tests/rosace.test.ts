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

  it('5 voisines suffisent (rosaceMin = 5), y compris contre un bord', () => {
    const game = emptyGame({ rosaceMin: 5 });
    // (2,11), colonne paire en bas : 5 voisines dans la grille.
    game.grid.place(2, 11, B);
    for (const dir of ALL_DIRS) {
      const n = neighbor(2, 11, dir);
      if (game.grid.inBounds(n.c, n.r)) game.grid.place(n.c, n.r, A);
    }
    expect(findMatches(game.grid)).toHaveLength(0);
    expect(findRosaces(game.grid, 5)).toHaveLength(1);
    expect(findRosaces(game.grid, 6)).toHaveLength(0);
  });

  it('4 voisines ne suffisent pas, et la rosace est désactivable', () => {
    const game = emptyGame();
    game.grid.place(3, 11, B); // colonne impaire en bas : seulement 3 voisines
    for (const dir of ALL_DIRS) {
      const n = neighbor(3, 11, dir);
      if (game.grid.inBounds(n.c, n.r)) game.grid.place(n.c, n.r, A);
    }
    expect(findRosaces(game.grid, 5)).toHaveLength(0);

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

/** Remplissage sans aucun alignement possible entre tuiles de remplissage (couleurs 2 à 5). */
const fill = (game: ReturnType<typeof emptyGame>, c: number, r: number) => game.grid.place(c, r, ((c * 2 + r) % 4) + 2);

function play(game: ReturnType<typeof emptyGame>, moves: [number, number, number, number][]) {
  const sizes: number[] = [];
  for (const [c1, r1, c2, r2] of moves) {
    expect(game.trySwap(c1, r1, c2, r2)).toBe(true);
    for (let i = 0; i < 40; i++) game.tick();
    sizes.push(...game.events.map((e) => (e.rosaces ? -e.size : e.size)));
    game.events.length = 0;
  }
  return sizes;
}

describe('rosace réalisable en jeu', () => {
  it('rosace complète (6) en 3 échanges, sans alignement parasite', () => {
    const game = emptyGame({ rosaceMin: 6 });
    const g = game.grid;
    for (let c = 0; c < 7; c++) {
      if (c < 2 || c > 4) fill(game, c, 11);
      if (c !== 3) fill(game, c, 10);
    }
    [2, 3, 4].forEach((c) => g.place(c, 11, A)); // bas, bas-gauche, bas-droite
    g.place(3, 10, B); // centre
    g.place(1, 9, A);
    g.place(5, 9, A);
    fill(game, 2, 9);
    fill(game, 4, 9);
    g.place(2, 8, A);
    expect(findMatches(g)).toHaveLength(0);
    // haut-gauche et haut-droite par les coins, puis le haut en tombant d'au-dessus.
    const sizes = play(game, [[1, 9, 2, 10], [5, 9, 4, 10], [2, 8, 3, 8]]);
    expect(sizes).toEqual([-6]);
    expect(g.get(3, 10)!.special).toBe(true);
  });

  it('rosace de 5 contre le bas de la grille', () => {
    const game = emptyGame({ rosaceMin: 5 });
    const g = game.grid;
    for (let c = 0; c < 7; c++) fill(game, c, 11);
    for (const c of [0, 4, 5, 6]) fill(game, c, 10);
    // Centre (2,11) ; voisines (1,10) (1,11) (3,10) (3,11) déjà en A.
    g.place(2, 11, B);
    for (const [c, r] of [[1, 10], [1, 11], [3, 10], [3, 11]]) g.place(c, r, A);
    fill(game, 1, 9);
    g.place(1, 8, A);
    expect(findMatches(g)).toHaveLength(0);
    // La 5e tombe sur le centre : (1,8) → (2,9) → chute en (2,10).
    const sizes = play(game, [[1, 8, 2, 9]]);
    expect(sizes).toEqual([-5]);
    expect(g.get(2, 11)!.special).toBe(true);
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
