import { describe, expect, it } from 'vitest';
import type { ClearEvent } from '../src/core/game';
import { isRoomCode, LinkedDuel, packView, randomRoomCode } from '../src/core/net';
import { emptyGame, settle } from './helpers';

const ev = (o: Partial<ClearEvent>): ClearEvent => ({ kind: 'clear', cells: [], chain: 1, size: 3, points: 0, rosaces: 0, gold: false, ...o });

describe('duel en ligne', () => {
  it('codes de salle', () => {
    for (let i = 0; i < 50; i++) expect(isRoomCode(randomRoomCode())).toBe(true);
    expect(isRoomCode('ABCO')).toBe(false);
    expect(isRoomCode('ABC')).toBe(false);
  });

  it('aperçu compact de la grille', () => {
    const g = emptyGame();
    g.grid.place(0, g.grid.rows - 1, 3);
    const v = packView(g);
    expect(v.cells).toHaveLength(g.grid.cols * g.grid.rows);
    expect(v.cells[(g.grid.rows - 1) * g.grid.cols]).toBe('3');
    expect(v.cells[0]).toBe('.');
  });

  it('attaques envoyées, reçues après délai, contre-attaque et bouclier', () => {
    const g = emptyGame();
    const d = new LinkedDuel(g);
    g.events.push(ev({ size: 5 }));
    expect(d.step(0.1)).toEqual([{ kind: 'slab', w: 4, h: 1 }]);
    // Une dalle arrive ; une attaque locale l'annule.
    d.receive([{ kind: 'slab', w: 8, h: 1 }]);
    g.events.push(ev({ chain: 2 }));
    expect(d.step(0.1)).toEqual([]);
    expect(d.pending).toHaveLength(0);
    // Une dalle reçue tombe après le délai.
    d.receive([{ kind: 'slab', w: 3, h: 1 }]);
    for (let i = 0; i < 20; i++) d.step(0.1);
    g.tick();
    settle(g);
    expect(g.grid.some((t) => t.kind === 'mortar')).toBe(true);
  });
});

describe('pseudos', () => {
  it('nettoyage : lettres, chiffres, espaces, tirets et « # » ; 20 caractères au plus', async () => {
    const { cleanName } = await import('../src/core/net');
    expect(cleanName('  Cigale#2741 ')).toBe('Cigale#2741');
    expect(cleanName('<b>Pétanque</b>')).toBe('bPétanqueb');
    expect(cleanName('a'.repeat(40))).toHaveLength(20);
    expect(cleanName('🤖 Robot#0000')).toBe('Robot#0000');
  });
});
