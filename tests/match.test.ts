import { describe, expect, it } from 'vitest';
import { Dir } from '../src/core/hex';
import { findMatches } from '../src/core/match';
import { emptyGame, line } from './helpers';

const axes: [string, Dir][] = [
  ['vertical', 'down'],
  ['diagonale A', 'downRight'],
  ['diagonale B', 'upRight'],
];

describe('alignements (§8.2)', () => {
  for (const [name, dir] of axes) {
    for (const n of [3, 4, 5]) {
      for (const startCol of [0, 1]) {
        it(`${name} : série de ${n} (départ colonne ${startCol % 2 ? 'impaire' : 'paire'})`, () => {
          const game = emptyGame();
          const cells = line(startCol, dir === 'upRight' ? 8 : 2, dir, n);
          for (const { c, r } of cells) game.grid.place(c, r, 1);
          const m = findMatches(game.grid);
          expect(m).toHaveLength(n);
          expect(m).toEqual(expect.arrayContaining(cells));
        });
      }
    }
  }

  it('deux tuiles ne suffisent pas, et seules les tuiles idle comptent', () => {
    const game = emptyGame();
    for (const { c, r } of line(2, 2, 'downRight', 2)) game.grid.place(c, r, 1);
    expect(findMatches(game.grid)).toHaveLength(0);
    const t = game.grid.place(4, 3, 1); // prolonge la diagonale
    expect(findMatches(game.grid)).toHaveLength(3);
    t.state = 'falling';
    expect(findMatches(game.grid)).toHaveLength(0);
  });

  it('une rangée « horizontale » n\'est pas un alignement', () => {
    const game = emptyGame();
    for (let c = 0; c < 7; c++) game.grid.place(c, 11, 2);
    expect(findMatches(game.grid)).toHaveLength(0);
  });

  it('forme en L : un seul clear de 5', () => {
    const game = emptyGame();
    const g = game.grid;
    // Vertical (2,9)(2,10)(2,11) + diagonale A (2,9)→(3,9)→(4,10).
    const cells = [...line(2, 9, 'down', 3), ...line(2, 9, 'downRight', 3).slice(1)];
    // Supports pour que tout reste en place.
    g.place(3, 10, 3);
    g.place(3, 11, 4);
    g.place(4, 11, 3);
    for (const { c, r } of cells) g.place(c, r, 1);
    game.tick();
    expect(game.events).toHaveLength(1);
    expect(game.events[0].size).toBe(5);
    expect(game.events[0].chain).toBe(1);
    expect(game.score).toBe(5 * 10 + 30 * 2);
  });

  it('forme en Y : un seul clear de 7', () => {
    const game = emptyGame();
    const g = game.grid;
    // Centre (3,8) : vertical vers le bas + deux diagonales vers le haut.
    const cells = [
      ...line(3, 8, 'down', 3),
      ...line(3, 8, 'upLeft', 3).slice(1),
      ...line(3, 8, 'upRight', 3).slice(1),
    ];
    // Remplir le dessous pour que tout soit soutenu, avec des couleurs neutres alternées.
    const set = new Set(cells.map(({ c, r }) => `${c},${r}`));
    for (let c = 0; c < 7; c++) {
      for (let r = 11; r >= 0; r--) {
        if (set.has(`${c},${r}`)) g.place(c, r, 1);
        else if (cells.some((k) => k.c === c && k.r < r)) g.place(c, r, 2 + ((r + c) % 3));
      }
    }
    expect(findMatches(g)).toHaveLength(7);
    game.tick();
    expect(game.events).toHaveLength(1);
    expect(game.events[0].size).toBe(7);
  });
});
