import { describe, expect, it } from 'vitest';
import { findMatches } from '../src/core/match';
import { emptyGame } from './helpers';

const A = 0, B = 1, C = 2;

describe('joker', () => {
  it('complète une série au milieu ou au bout', () => {
    const game = emptyGame();
    const g = game.grid;
    g.place(0, 9, A);
    g.place(0, 10, A).kind = 'joker';
    g.place(0, 11, A);
    expect(findMatches(g)).toHaveLength(3);
    // Joker en bout : B B J
    g.place(2, 9, B);
    g.place(2, 10, B);
    g.place(2, 11, C).kind = 'joker';
    expect(findMatches(g)).toHaveLength(6);
  });

  it('A J B : pas de série ; trois jokers seuls non plus', () => {
    const game = emptyGame();
    const g = game.grid;
    g.place(0, 9, A);
    g.place(0, 10, C).kind = 'joker';
    g.place(0, 11, B);
    expect(findMatches(g)).toHaveLength(0);
    for (const r of [9, 10, 11]) g.place(3, r, A).kind = 'joker';
    expect(findMatches(g)).toHaveLength(0);
  });
});

describe('tomette fêlée', () => {
  it('ne s\'aligne pas, puis est réparée par un clear voisin', () => {
    const game = emptyGame();
    const g = game.grid;
    // Colonne 0 : A A(fêlée) A → rien.
    g.place(0, 9, A);
    const cracked = g.place(0, 10, A);
    cracked.kind = 'cracked';
    g.place(0, 11, A);
    expect(findMatches(g)).toHaveLength(0);
    // Un alignement B en colonne 1, voisin de (0,10).
    for (const r of [9, 10, 11]) g.place(1, r, B);
    game.tick();
    expect(cracked.kind).toBe('normal');
    // Réparée, elle forme maintenant sa propre série.
    game.tick();
    expect(cracked.state).toBe('clearing');
  });
});

describe('tuile scellée', () => {
  it('ne peut pas être échangée, puis est libérée par un clear voisin', () => {
    const game = emptyGame();
    const g = game.grid;
    const sealed = g.place(2, 11, C);
    sealed.kind = 'sealed';
    g.place(3, 11, B);
    expect(game.trySwap(2, 11, 3, 11)).toBe(false);
    expect(game.trySwap(3, 11, 2, 11)).toBe(false);
    // Alignement A en colonne 1, voisin de (2,11).
    for (const r of [9, 10, 11]) g.place(1, r, A);
    game.tick();
    expect(sealed.kind).toBe('normal');
    expect(game.trySwap(2, 11, 3, 11)).toBe(true);
  });

  it('peut quand même s\'aligner', () => {
    const game = emptyGame();
    const g = game.grid;
    for (const r of [9, 10, 11]) g.place(0, r, A);
    g.get(0, 10)!.kind = 'sealed';
    expect(findMatches(g)).toHaveLength(3);
  });
});
