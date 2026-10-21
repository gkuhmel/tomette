import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { STAGE_COUNT, stageConfig, stageOpen, stageSpec, starsFor } from '../src/core/campaign';
import { Game } from '../src/core/game';
import { emptyGame, settle } from './helpers';

describe('campagne', () => {
  it('des manches de plus en plus longues et rapides, avec des seuils d\'étoiles cohérents', () => {
    let prev = stageSpec(1, defaultConfig);
    for (let n = 2; n <= STAGE_COUNT; n++) {
      const s = stageSpec(n, defaultConfig);
      expect(s.goal).toBeGreaterThanOrEqual(prev.goal);
      expect(s.level).toBeGreaterThanOrEqual(prev.level);
      expect(s.star3).toBeLessThan(s.star2);
      prev = s;
    }
  });

  it('étoiles selon le temps', () => {
    const s = stageSpec(1, defaultConfig);
    expect(starsFor(s, s.star3)).toBe(3);
    expect(starsFor(s, s.star3 + 1)).toBe(2);
    expect(starsFor(s, s.star2 + 1)).toBe(1);
  });

  it('une manche s\'ouvre quand la précédente est réussie', () => {
    expect(stageOpen(1, [])).toBe(true);
    expect(stageOpen(2, [])).toBe(false);
    expect(stageOpen(2, [1])).toBe(true);
    expect(stageOpen(3, [3, 0])).toBe(false);
  });

  it('pas de ligne tant que la pile n\'est pas montée assez ; gagné quand plus rien n\'est au-dessus', () => {
    const game = emptyGame({ baseSecondsPerRow: 1e9 });
    const g = new Game(game.cfg, 1, { empty: true, goalRows: 2 });
    expect(g.tilesAboveLine()).toBeNull();
    g.grid.place(0, g.grid.rows - 1, 0);
    g.forceRise();
    g.tick();
    expect(g.won).toBe(false);
    g.forceRise();
    // La ligne est en bas de la grille : tout ce qui est posé est au-dessus.
    expect(g.lineRows).toBe(0);
    expect(g.tilesAboveLine()).toBeGreaterThan(0);
    g.tick();
    expect(g.won).toBe(false);
    // Vider la grille termine la manche.
    g.grid.cells.fill(null);
    g.tick();
    expect(g.won).toBe(true);
    expect(g.over).toBe(true);
  });

  it('la ligne qui remonte réduit la zone à vider', () => {
    const base = emptyGame().cfg;
    const g = new Game({ ...base, baseSecondsPerRow: 1e9, minSecondsPerRow: 1e9 }, 3, { empty: true, goalRows: 1 });
    // Une seule tuile, tout en bas ; deux rangées montent : la tuile passe sous la ligne.
    g.grid.place(2, g.grid.rows - 1, 0);
    g.forceRise();
    g.tick();
    expect(g.won).toBe(false);
    settle(g);
    expect(g.won).toBe(false);
  });

  it('les réglages d\'une manche s\'appliquent', () => {
    const spec = stageSpec(10, defaultConfig);
    const cfg = stageConfig(defaultConfig, spec);
    expect(cfg.colors).toBe(spec.colors);
    expect(cfg.mortarEveryS).toBe(spec.mortarEveryS);
  });
});
