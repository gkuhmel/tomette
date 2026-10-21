import { describe, expect, it } from 'vitest';
import { Ai, AI_PROFILES, listMoves } from '../src/core/ai';
import { attacksFor, Duel } from '../src/core/duel';
import type { ClearEvent } from '../src/core/game';
import { Game } from '../src/core/game';
import { cfg, emptyGame, settle } from './helpers';

const ev = (o: Partial<ClearEvent>): ClearEvent => ({ kind: 'clear', cells: [], chain: 1, size: 3, points: 0, rosaces: 0, gold: false, ...o });
const A = 0, B = 1, C = 2;

describe('duel : attaques', () => {
  it('un alignement simple n\'envoie rien ; combos, chaînes, rosaces et or envoient des dalles', () => {
    expect(attacksFor(ev({}), 8)).toEqual([]);
    expect(attacksFor(ev({ size: 4 }), 8)).toEqual([{ w: 3, h: 1 }]);
    expect(attacksFor(ev({ size: 12 }), 8)).toEqual([{ w: 8, h: 1 }]);
    expect(attacksFor(ev({ chain: 2 }), 8)).toEqual([{ w: 8, h: 1 }]);
    expect(attacksFor(ev({ chain: 3, size: 5 }), 8)).toEqual([{ w: 4, h: 1 }, { w: 8, h: 1 }]);
    expect(attacksFor(ev({ rosaces: 1 }), 8)).toEqual([{ w: 8, h: 2 }]);
    expect(attacksFor(ev({ gold: true, size: 9 }), 8)).toEqual([{ w: 8, h: 1 }]);
  });

  it('les dalles arrivent chez l\'adversaire après le délai', () => {
    const a = emptyGame();
    const b = emptyGame();
    const duel = new Duel([a, b]);
    a.events.push(ev({ size: 5 }));
    duel.step(0.1);
    a.events.length = 0;
    expect(duel.pending[1]).toHaveLength(1);
    for (let i = 0; i < 20; i++) duel.step(0.1);
    expect(duel.pending[1]).toHaveLength(0);
    b.tick();
    settle(b);
    expect(b.grid.some((t) => t.kind === 'mortar')).toBe(true);
    expect(a.grid.some((t) => t.kind === 'mortar')).toBe(false);
  });

  it('vainqueur : celui dont l\'adversaire a perdu', () => {
    const a = emptyGame();
    const b = emptyGame();
    const duel = new Duel([a, b]);
    expect(duel.winner).toBeNull();
    b.over = true;
    expect(duel.winner).toBe(0);
    a.over = true;
    expect(duel.winner).toBe('draw');
  });
});

describe('duel : ordinateur', () => {
  it('voit l\'échange qui aligne trois tuiles et le joue', () => {
    const game = emptyGame();
    const g = game.grid;
    const bottom = g.rows - 1;
    // Colonne 2 : A A en bas ; A posé en (1, bottom - 2), voisin en biais de (2, bottom - 2).
    g.place(2, bottom, A);
    g.place(2, bottom - 1, A);
    g.place(2, bottom - 2, B);
    g.place(1, bottom, C);
    g.place(1, bottom - 1, B);
    g.place(1, bottom - 2, A);
    const moves = listMoves(game);
    const best = moves.reduce((m, x) => (x.gain > m.gain ? x : m));
    expect(best.gain).toBeGreaterThanOrEqual(3);
    const ai = new Ai(game, { ...AI_PROFILES.hard, blunder: 0 }, 1);
    const m = ai.choose()!;
    expect(m.gain).toBe(best.gain);
    game.trySwap(m.from.c, m.from.r, m.to.c, m.to.r);
    settle(game);
    expect(game.stats.tilesCleared).toBeGreaterThanOrEqual(3);
  });

  it('joue tout seul une partie sans erreur et marque des points', () => {
    const game = new Game(cfg({ baseSecondsPerRow: 3 }), 11);
    const ai = new Ai(game, AI_PROFILES.hard, 7);
    for (let i = 0; i < 60 * 60 && !game.over; i++) {
      ai.update(1000 / 60);
      game.tick();
    }
    expect(game.score).toBeGreaterThan(0);
  });
});
