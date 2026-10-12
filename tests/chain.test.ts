import { describe, expect, it } from 'vitest';
import { emptyGame } from './helpers';

const A = 0, B = 1, C = 2, D = 3;

describe('chaînes (§8.4)', () => {
  it('scénario ×2 puis ×3', () => {
    const game = emptyGame();
    const g = game.grid;
    // Colonne 0, de bas en haut : B B A A A B C C
    [B, B, A, A, A, B, C, C].forEach((color, i) => g.place(0, 11 - i, color));
    // Troisième C sur la diagonale A passant par (0,10) : (1,10) et (2,11).
    g.place(1, 11, D);
    g.place(1, 10, C);
    g.place(2, 11, C);

    const chains: number[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < 1000; i++) {
      game.tick();
      for (const e of game.events) {
        chains.push(e.chain);
        sizes.push(e.size);
      }
      game.events.length = 0;
    }
    expect(chains).toEqual([1, 2, 3]);
    expect(sizes).toEqual([3, 3, 3]);
    // 30 + 30×2 + 30×3
    expect(game.score).toBe(180);
    // Chaîne terminée : retour à 1, plus de drapeaux.
    expect(game.chain).toBe(1);
    expect(g.some((t) => t.chain)).toBe(false);
  });

  it('le drapeau chain est retiré à l\'atterrissage sans clear', () => {
    const game = emptyGame();
    const g = game.grid;
    [B, A, A, A, C].forEach((color, i) => g.place(0, 11 - i, color));
    const c = g.get(0, 7)!;
    let sawChain = false;
    for (let i = 0; i < 200; i++) {
      game.tick();
      if (c.chain) sawChain = true;
    }
    expect(sawChain).toBe(true);
    expect(g.get(0, 10)).toBe(c);
    expect(c.chain).toBe(false);
    expect(game.chain).toBe(1);
  });

  it('stop time : chaîne et combo, on garde la plus longue', () => {
    const game = emptyGame();
    const g = game.grid;
    // Combo de 5 (vertical) → 0,3 × 2 = 0,6 s.
    for (let r = 7; r <= 11; r++) g.place(0, r, A);
    game.tick();
    expect(game.stopTime).toBeCloseTo(0.6 - 1 / 60, 5);
  });
});
