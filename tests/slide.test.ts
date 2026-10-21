import { describe, expect, it } from 'vitest';
import { findMatches } from '../src/core/match';
import { findSlides } from '../src/core/slide';
import { emptyGame, settle } from './helpers';

/** Colonne de hauteur h (couleurs alternées, aucun alignement). */
function column(game: ReturnType<typeof emptyGame>, c: number, h: number, offset = 0) {
  for (let i = 0; i < h; i++) game.grid.place(c, 11 - i, (i + offset) % 2 === 0 ? 2 + (c % 2) : 4 + (c % 2));
}

describe('éboulement', () => {
  it('une pile plus haute de 2 glisse vers la colonne voisine', () => {
    const game = emptyGame({ slide: 1, slideMinDrop: 2 });
    column(game, 0, 5);
    column(game, 1, 2, 1);
    const top = game.grid.get(0, 7)!;
    expect(findMatches(game.grid)).toHaveLength(0);
    settle(game);
    // Le sommet de la colonne 0 a quitté sa pile (et peut continuer de dévaler).
    expect(game.grid.find(top.id)!.c).toBeGreaterThan(0);
  });

  it('un écart trop faible ne glisse pas', () => {
    const game = emptyGame({ slide: 1, slideMinDrop: 2 });
    column(game, 2, 3);
    column(game, 1, 2, 1);
    column(game, 3, 2, 1);
    expect(findSlides(game.grid, 2)).toHaveLength(0);
  });

  it('la colonne s\'aplanit jusqu\'à ne plus avoir d\'écart', () => {
    const game = emptyGame({ slide: 1, slideMinDrop: 2 });
    column(game, 0, 8);
    settle(game);
    expect(findSlides(game.grid, 2)).toHaveLength(0);
    let h0 = 0;
    for (let r = 0; r < 12; r++) if (game.grid.get(0, r)) h0++;
    expect(h0).toBeLessThan(8);
  });

  it('désactivé : rien ne bouge ; une tuile scellée ne glisse jamais', () => {
    const off = emptyGame({ slide: 0 });
    column(off, 0, 5);
    const top = off.grid.get(0, 7)!;
    settle(off);
    expect(off.grid.find(top.id)!.c).toBe(0);

    const game = emptyGame({ slide: 1, slideMinDrop: 2 });
    column(game, 0, 5);
    game.grid.get(0, 7)!.kind = 'sealed';
    expect(findSlides(game.grid, 2)).toHaveLength(0);
  });

  it('préfère le côté le plus bas', () => {
    const game = emptyGame({ slide: 1 });
    column(game, 3, 6);
    column(game, 2, 3, 1);
    column(game, 4, 1, 1);
    const m = findSlides(game.grid, 2).filter((k) => k.from.c === 3);
    expect(m).toHaveLength(1);
    expect(m[0].to.c).toBe(4);
  });
});
