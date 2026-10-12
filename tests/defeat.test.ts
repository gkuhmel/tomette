import { describe, expect, it } from 'vitest';
import { emptyGame } from './helpers';

function fullColumnGame() {
  const game = emptyGame({ baseSecondsPerRow: 1, minSecondsPerRow: 1, graceS: 2 });
  for (let r = 0; r < 12; r++) game.grid.place(0, r, r % 2);
  return game;
}

describe('alerte et défaite (§8.9)', () => {
  it('alerte puis game over après la grâce', () => {
    const game = fullColumnGame();
    game.tick();
    expect(game.alert).toBe(true);
    const off = game.riseOffset;
    for (let i = 0; i < 100; i++) game.tick(); // ~1,67 s
    expect(game.over).toBe(false);
    expect(game.riseOffset).toBe(off); // montée figée
    for (let i = 0; i < 25; i++) game.tick();
    expect(game.over).toBe(true);
  });

  it('un clear pendant la grâce annule l\'alerte', () => {
    const game = fullColumnGame();
    game.tick();
    expect(game.alert).toBe(true);
    for (let i = 0; i < 60; i++) game.tick();
    for (let r = 9; r <= 11; r++) game.grid.place(3, r, 2);
    game.tick();
    expect(game.alert).toBe(false);
    // La grâce initiale aurait expiré ~1 s plus tard ; le clear (0,6 s) puis une
    // nouvelle alerte (2 s) repoussent le game over.
    for (let i = 0; i < 120; i++) game.tick();
    expect(game.over).toBe(false);
    for (let i = 0; i < 60; i++) game.tick();
    expect(game.over).toBe(true);
  });
});
