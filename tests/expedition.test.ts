import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { CARDS, drawCards, emptyMods, modsFor, RUN_STAGES, runStage, stagePoints } from '../src/core/expedition';
import { Game } from '../src/core/game';
import { Rng } from '../src/core/rng';
import { emptyGame } from './helpers';

describe('expédition', () => {
  it('8 manches de plus en plus dures', () => {
    expect(RUN_STAGES).toBe(20);
    let prev = runStage(1, defaultConfig, emptyMods());
    for (let n = 2; n <= RUN_STAGES; n++) {
      const s = runStage(n, defaultConfig, emptyMods());
      expect(s.goal).toBeGreaterThanOrEqual(prev.goal);
      expect(s.spec.level).toBeGreaterThanOrEqual(prev.spec.level);
      prev = s;
    }
  });

  it('chaque carte a un bonus et une contrepartie qui changent les réglages', () => {
    const base = runStage(4, defaultConfig, emptyMods());
    for (const c of CARDS) {
      const s = runStage(4, defaultConfig, modsFor([c.id]));
      const changed = Object.keys(base.cfg).filter((k) => base.cfg[k as keyof typeof base.cfg] !== s.cfg[k as keyof typeof s.cfg]);
      const diff = changed.length + (s.goal !== base.goal ? 1 : 0) + (modsFor([c.id]).shields + modsFor([c.id]).shots + (modsFor([c.id]).score !== 1 ? 1 : 0));
      expect(diff, c.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('les effets s\'empilent et restent dans des bornes jouables', () => {
    const all = modsFor(CARDS.flatMap((c) => [c.id, c.id, c.id]));
    const s = runStage(8, defaultConfig, all);
    expect(s.cfg.colors).toBeGreaterThanOrEqual(3);
    expect(s.cfg.colors).toBeLessThanOrEqual(6);
    expect(s.cfg.graceS).toBeGreaterThanOrEqual(1);
    expect(s.cfg.initialRows).toBeLessThan(defaultConfig.rows - 2);
  });

  it('3 cartes distinctes, de préférence pas encore prises', () => {
    const rng = new Rng(5);
    const cards = drawCards(rng, ['palette', 'joker']);
    expect(new Set(cards).size).toBe(3);
    expect(cards).not.toContain('palette');
    expect(cards).not.toContain('joker');
    expect(drawCards(rng, CARDS.map((c) => c.id))).toHaveLength(3);
  });

  it('points de manche', () => {
    expect(stagePoints(3, 1000, modsFor(['points']), true)).toBe(1500 + 3000);
    expect(stagePoints(3, 1000, emptyMods(), false)).toBe(1000);
  });

  it('chaque carte a une icône', () => {
    for (const c of CARDS) expect(c.icon.length).toBeGreaterThan(0);
    expect(CARDS.length).toBe(15);
  });

  it('carreau : un tir fait disparaître une tuile, même scellée', () => {
    const g = emptyGame();
    const bottom = g.grid.rows - 1;
    g.grid.place(2, bottom, 1).kind = 'sealed';
    expect(g.shoot(2, bottom)).toBe(false);
    g.shots = 1;
    expect(g.shoot(2, bottom)).toBe(true);
    expect(g.shots).toBe(0);
    for (let i = 0; i < 60; i++) g.tick();
    expect(g.grid.get(2, bottom)).toBeNull();
  });

  it('mistral : le haut de chaque colonne s\'envole', () => {
    const g0 = emptyGame();
    const g = new Game({ ...g0.cfg, mistralEveryS: 1, baseSecondsPerRow: 1e9, minSecondsPerRow: 1e9 }, 1, { empty: true });
    const bottom = g.grid.rows - 1;
    g.grid.place(0, bottom, 0);
    g.grid.place(0, bottom - 1, 1);
    g.grid.place(3, bottom, 2);
    for (let i = 0; i < 60 * 1.2; i++) g.tick();
    for (let i = 0; i < 60; i++) g.tick();
    expect(g.grid.get(0, bottom)).not.toBeNull();
    expect(g.grid.get(0, bottom - 1)).toBeNull();
    expect(g.grid.get(3, bottom)).toBeNull();
  });

  it('bouclier : la grâce écoulée balaie le haut de la pile au lieu de perdre', () => {
    const g0 = emptyGame();
    const g = new Game({ ...g0.cfg, graceS: 0.1, baseSecondsPerRow: 1e9, minSecondsPerRow: 1e9 }, 1, { empty: true });
    g.shields = 1;
    for (let r = 0; r < g.grid.rows; r++) g.grid.place(0, r, r % 2);
    for (let i = 0; i < 30; i++) g.tick();
    expect(g.over).toBe(false);
    expect(g.shields).toBe(0);
    expect(g.notices).toContain('shieldUsed');
  });
});
