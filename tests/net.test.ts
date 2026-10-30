import { describe, expect, it } from 'vitest';
import type { ClearEvent } from '../src/core/game';
import { checkClientMsg, checkServerMsg, formatRoomCode, isRoomCode, LinkedDuel, packView, parseRoomCode, randomRoomCode } from '../src/core/net';
import { inviteCode } from '../src/ui/online';
import { emptyGame, settle } from './helpers';

const ev = (o: Partial<ClearEvent>): ClearEvent => ({ kind: 'clear', cells: [], chain: 1, size: 3, points: 0, rosaces: 0, gold: false, ...o });

describe('duel en ligne', () => {
  it('codes de salle', () => {
    for (let i = 0; i < 50; i++) expect(isRoomCode(randomRoomCode())).toBe(true);
    expect(randomRoomCode()).toHaveLength(8);
    expect(isRoomCode('ABCDEFGO')).toBe(false);
    expect(isRoomCode('ABCD')).toBe(false);
    expect(formatRoomCode('ABCDEFGH')).toBe('ABCD-EFGH');
    expect(parseRoomCode(' abcd-efgh ')).toBe('ABCDEFGH');
  });

  it('lien d\'invitation : code après « # »', () => {
    expect(inviteCode('#room=ABCD-EFGH')).toBe('ABCDEFGH');
    expect(inviteCode('#room=ABCDEFGH')).toBe('ABCDEFGH');
    expect(inviteCode('#room=ABCD')).toBe('');
    expect(inviteCode('')).toBe('');
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

describe('messages du duel en ligne vérifiés', () => {
  const stats = { score: 1200, sent: 3, chain: 2, rosaces: 0 };
  const view = { cols: 2, rows: 2, cells: '.3m.', rise: 0.5, alert: false, night: false };

  it('un vrai message passe, sans champ en trop', () => {
    expect(checkClientMsg({ t: 'state', view: { ...view, extra: 'x' }, stats, pending: 1 })).toEqual({ t: 'state', view, stats, pending: 1 });
    expect(checkClientMsg({ t: 'attack', a: [{ kind: 'slab', w: 4, h: 1 }, { kind: 'quake' }] })).toEqual({ t: 'attack', a: [{ kind: 'slab', w: 4, h: 1 }, { kind: 'quake' }] });
    expect(checkClientMsg({ t: 'hello', name: 'Zoé#1234' })).toEqual({ t: 'hello', name: 'Zoé#1234' });
  });

  it('grille démesurée ou incohérente : refusée', () => {
    expect(checkClientMsg({ t: 'state', view: { ...view, cols: 1e6, rows: 1e6 }, stats, pending: 0 })).toBeNull();
    expect(checkClientMsg({ t: 'state', view: { ...view, cells: '.3' }, stats, pending: 0 })).toBeNull();
    expect(checkClientMsg({ t: 'state', view: { ...view, cells: '<b>' + '.' }, stats, pending: 0 })).toBeNull();
    expect(checkClientMsg({ t: 'state', view, stats: { ...stats, score: 'beaucoup' }, pending: 0 })).toBeNull();
    expect(checkClientMsg({ t: 'state', stats, pending: 0 })).toBeNull();
  });

  it('attaques impossibles en vraie partie : refusées', () => {
    expect(checkClientMsg({ t: 'attack', a: [{ kind: 'night', seconds: 1e6 }] })).toBeNull();
    expect(checkClientMsg({ t: 'attack', a: [{ kind: 'slab', w: 1000, h: 50 }] })).toBeNull();
    expect(checkClientMsg({ t: 'attack', a: Array(100).fill({ kind: 'quake' }) })).toBeNull();
    expect(checkClientMsg({ t: 'attack', a: [{ kind: 'boom' }] })).toBeNull();
    expect(checkClientMsg({ t: 'attack', a: 'x' })).toBeNull();
  });

  it('un joueur ne peut pas se faire passer pour le serveur', () => {
    expect(checkClientMsg({ t: 'start', seed: 1, side: 0 })).toBeNull();
    expect(checkServerMsg({ t: 'start', seed: 1, side: 0 })).toEqual({ t: 'start', seed: 1, side: 0 });
    expect(checkServerMsg({ t: 'start', seed: -1, side: 7 })).toBeNull();
    expect(checkServerMsg('texte')).toBeNull();
  });

  it('la file d\'attaques reçues est bornée', () => {
    const d = new LinkedDuel(emptyGame());
    for (let i = 0; i < 100; i++) d.receive([{ kind: 'quake' }]);
    expect(d.pending.length).toBeLessThanOrEqual(24);
  });
});
