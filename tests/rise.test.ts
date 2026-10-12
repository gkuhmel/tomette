import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { Game } from '../src/core/game';
import { findMatches } from '../src/core/match';
import { findRosaces } from '../src/core/rosace';
import { levelAt, secondsPerRow } from '../src/core/rise';
import { cfg, emptyGame } from './helpers';

describe('génération (§8.6)', () => {
  it('grille initiale et rangées d\'aperçu sans alignement ni rosace, sur 1 000 graines', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const game = new Game(cfg(), seed);
      const g = game.grid;
      expect(findMatches(g)).toHaveLength(0);
      expect(findRosaces(g, 5)).toHaveLength(0);
      // 4 rangées remplies par le bas.
      let count = 0;
      g.forEach(() => count++);
      expect(count).toBe(7 * 4);
      expect(g.get(0, 7)).toBeNull();
      // Activer 5 rangées d'aperçu.
      for (let i = 0; i < 5; i++) {
        expect(game.forceRise()).toBe(true);
        expect(findMatches(g)).toHaveLength(0);
        expect(findRosaces(g, 5)).toHaveLength(0);
      }
    }
  });

  it('déterministe pour une graine donnée', () => {
    const colors = (game: Game) => game.grid.cells.map((t) => (t ? t.color : -1));
    expect(colors(new Game(cfg(), 42))).toEqual(colors(new Game(cfg(), 42)));
    expect(colors(new Game(cfg(), 42))).not.toEqual(colors(new Game(cfg(), 43)));
  });
});

describe('courbe de vitesse (§8.7)', () => {
  const table: [number, number, number][] = [
    [1, 0, 16],
    [3, 60, 12.4],
    [5, 120, 9.6],
    [7, 180, 7.4],
    [9, 240, 5.8],
    [11, 300, 4.5],
    [13, 360, 3.5],
    [17, 480, 2.1],
    [21, 600, 1.5],
    [30, 870, 1.5],
  ];
  for (const [level, t, spr] of table) {
    it(`niveau ${level} à ${t} s : ${spr} s/rangée`, () => {
      expect(levelAt(defaultConfig, t)).toBe(level);
      expect(secondsPerRow(defaultConfig, level)).toBeCloseTo(spr, 1);
    });
  }
});

describe('montée de la pile (§8.5)', () => {
  it('monte d\'une rangée après secondsPerRow', () => {
    const game = new Game(cfg(), 7);
    const bottom = game.preview.map((t) => t.id);
    for (let i = 0; i < 60 * 16 + 1; i++) game.tick();
    expect(game.grid.get(0, 11)!.id).toBe(bottom[0]);
    expect(game.grid.get(0, 7)).not.toBeNull();
    expect(game.grid.get(0, 6)).toBeNull();
  });

  it('suspendue pendant un clear et le stop time', () => {
    const game = emptyGame({ baseSecondsPerRow: 1, minSecondsPerRow: 1 });
    for (let r = 9; r <= 11; r++) game.grid.place(0, r, 0);
    game.tick();
    expect(game.clearing).toBe(true);
    const off = game.riseOffset;
    for (let i = 0; i < 30; i++) game.tick();
    expect(game.riseOffset).toBe(off);
    game.stopTime = 0.5;
    for (let i = 0; i < 20; i++) game.tick();
    expect(game.riseOffset).toBe(off);
  });

  it('accélération manuelle et annulation du stop time', () => {
    const game = emptyGame();
    game.stopTime = 5;
    game.manualRise = true;
    for (let i = 0; i < 16; i++) game.tick(); // ~0,27 s à 0,25 s/rangée
    expect(game.stopTime).toBe(0);
    expect(game.grid.get(0, 11)).not.toBeNull();
  });
});
