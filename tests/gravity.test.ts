import { describe, expect, it } from 'vitest';
import { emptyGame, settle } from './helpers';

describe('gravité (§8.1)', () => {
  it('une tuile tombe jusqu\'au support', () => {
    const game = emptyGame();
    const g = game.grid;
    g.place(3, 11, 0);
    const t = g.place(3, 2, 1);
    game.tick();
    expect(t.state).toBe('hovering');
    settle(game);
    expect(g.get(3, 10)).toBe(t);
    expect(g.get(3, 2)).toBeNull();
  });

  it('respecte le délai de hover', () => {
    const game = emptyGame({ hoverMs: 120 });
    const t = game.grid.place(0, 0, 1);
    game.tick();
    expect(t.state).toBe('hovering');
    for (let i = 0; i < 6; i++) game.tick(); // 100 ms
    expect(t.state).toBe('hovering');
    for (let i = 0; i < 2; i++) game.tick();
    expect(t.state).toBe('falling');
  });

  it('une colonne entière se tasse, dans l\'ordre', () => {
    const game = emptyGame();
    const g = game.grid;
    const a = g.place(5, 1, 0);
    const b = g.place(5, 4, 1);
    const c = g.place(5, 5, 2);
    const d = g.place(5, 9, 3);
    settle(game);
    expect(g.get(5, 8)).toBe(a);
    expect(g.get(5, 9)).toBe(b);
    expect(g.get(5, 10)).toBe(c);
    expect(g.get(5, 11)).toBe(d);
    for (let r = 0; r < 8; r++) expect(g.get(5, r)).toBeNull();
  });

  it('les tuiles au-dessus d\'un clear attendent sa fin', () => {
    const game = emptyGame({ clearDurationMs: 600 });
    const g = game.grid;
    for (let r = 9; r <= 11; r++) g.place(0, r, 1);
    const top = g.place(0, 8, 2);
    game.tick();
    expect(g.get(0, 9)!.state).toBe('clearing');
    for (let i = 0; i < 30; i++) game.tick(); // 500 ms
    expect(g.get(0, 8)).toBe(top);
    expect(top.state).toBe('idle');
    settle(game);
    expect(g.get(0, 11)).toBe(top);
  });
});
