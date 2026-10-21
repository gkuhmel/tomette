import { describe, expect, it } from 'vitest';
import { Ai, AI_PROFILES, listMoves } from '../src/core/ai';
import { attacksFor, Duel } from '../src/core/duel';
import type { ClearEvent } from '../src/core/game';
import { Game } from '../src/core/game';
import { cfg, emptyGame, settle } from './helpers';

const ev = (o: Partial<ClearEvent>): ClearEvent => ({ kind: 'clear', cells: [], chain: 1, size: 3, points: 0, rosaces: 0, gold: false, ...o });
const A = 0, B = 1, C = 2;

describe('duel : attaques', () => {
  it('un alignement simple n\'envoie rien ; combos, chaînes, rosaces et or envoient dalles et malus', () => {
    const slab = (w: number) => ({ kind: 'slab', w, h: 1 });
    expect(attacksFor(ev({}), 8)).toEqual([]);
    expect(attacksFor(ev({ size: 4 }), 8)).toEqual([slab(3)]);
    expect(attacksFor(ev({ size: 6 }), 8)).toEqual([slab(5), { kind: 'crack', n: 4 }]);
    expect(attacksFor(ev({ size: 12 }), 8)).toEqual([slab(8), { kind: 'crack', n: 4 }]);
    expect(attacksFor(ev({ chain: 2 }), 8)).toEqual([slab(8)]);
    expect(attacksFor(ev({ chain: 4 }), 8)).toEqual([slab(8), { kind: 'quake' }]);
    expect(attacksFor(ev({ rosaces: 1 }), 8)).toEqual([{ kind: 'night', seconds: 6 }]);
    expect(attacksFor(ev({ gold: true, size: 9 }), 8)).toEqual([{ kind: 'freeze', n: 5 }]);
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

  it('contre-attaque : une dalle envoyée annule d\'abord une dalle qui arrive', () => {
    const a = emptyGame();
    const b = emptyGame();
    const duel = new Duel([a, b]);
    b.events.push(ev({ size: 4 }));
    duel.step(0.1);
    expect(duel.pending[0]).toHaveLength(1);
    a.events.push(ev({ size: 5 }));
    duel.step(0.1);
    expect(duel.pending[0]).toHaveLength(0);
    expect(duel.pending[1]).toHaveLength(0);
    expect(a.notices).toContain('counter');
  });

  it('une rosace donne un bouclier qui absorbe la prochaine dalle, et plonge l\'adversaire dans la nuit', () => {
    const a = emptyGame();
    const b = emptyGame();
    const duel = new Duel([a, b]);
    a.events.push(ev({ rosaces: 1 }));
    duel.step(0.1);
    expect(duel.shield[0]).toBe(true);
    for (let i = 0; i < 20; i++) duel.step(0.1);
    expect(b.nightLeft).toBeGreaterThan(0);
    a.events.length = 0;
    duel.eventsCleared(0);
    b.events.push(ev({ size: 4 }));
    for (let i = 0; i < 20; i++) duel.step(0.1);
    expect(duel.shield[0]).toBe(false);
    expect(a.notices).toContain('blocked');
    a.tick();
    settle(a);
    expect(a.grid.some((t) => t.kind === 'mortar')).toBe(false);
  });

  it('gel, fêlures et séisme modifient la grille visée', () => {
    const g = new Game(cfg(), 5);
    expect(g.freezeTiles(5)).toBe(5);
    expect(g.grid.cells.filter((t) => t?.kind === 'sealed').length).toBeGreaterThanOrEqual(5);
    expect(g.crackTiles(4)).toBe(4);
    const before = g.grid.cells.map((t) => t?.color);
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) {
      g.quake();
      changed = g.grid.cells.some((t, k) => t && t.color !== before[k]);
    }
    expect(changed).toBe(true);
  });

  it('la puissance d\'un côté retire ou ajoute des dalles', () => {
    const count = (power: number) => {
      const a = emptyGame();
      const b = emptyGame();
      const duel = new Duel([a, b], [power, 1], 3);
      for (let i = 0; i < 200; i++) {
        a.events.push(ev({ size: 4 }));
        duel.step(0);
      }
      return duel.pending[1].length;
    };
    expect(count(1)).toBe(200);
    expect(count(0.5)).toBeLessThan(150);
    expect(count(1.5)).toBeGreaterThan(250);
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
