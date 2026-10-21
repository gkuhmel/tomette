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
      expect(count).toBe(g.cols * 4);
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

describe('modes', () => {
  it('Contre-la-montre : fin au bout du temps, sans défaite', () => {
    const game = new Game(cfg({ timeAttackS: 2 }), 3, { mode: 'timeAttack' });
    for (let i = 0; i < 119; i++) game.tick();
    expect(game.over).toBe(false);
    expect(game.timeLeft).toBeGreaterThan(0);
    for (let i = 0; i < 2; i++) game.tick();
    expect(game.over).toBe(true);
    expect(game.timeUp).toBe(true);
    expect(game.timeLeft).toBe(0);
  });

  it('Express : départ au niveau choisi, temps écoulé à 0', () => {
    const game = new Game(cfg({ expressLevel: 8 }), 3, { mode: 'express' });
    expect(game.level).toBe(8);
    expect(game.elapsed).toBe(0);
    expect(game.timeLeft).toBeNull();
  });

  it('Mosaïque : le record compte les rosaces', () => {
    const game = new Game(cfg(), 3, { mode: 'mosaic', empty: true });
    expect(game.mode.record).toBe('rosaces');
    expect(game.recordValue).toBe(0);
  });
});

describe('difficulté', () => {
  it('Détente plus lente avec moins de couleurs, Expert plus rapide', async () => {
    const { withDifficulty } = await import('../src/core/difficulty');
    const base = cfg();
    const easy = withDifficulty(base, 'easy');
    const hard = withDifficulty(base, 'hard');
    expect(withDifficulty(base, 'normal')).toBe(base);
    expect(easy.colors).toBe(5);
    expect(easy.baseSecondsPerRow).toBeGreaterThan(base.baseSecondsPerRow);
    expect(hard.baseSecondsPerRow).toBeLessThan(base.baseSecondsPerRow);
    expect(hard.graceS).toBeLessThan(base.graceS);
    // Vue vivante : un changement de la base se répercute.
    base.baseSecondsPerRow = 20;
    expect(easy.baseSecondsPerRow).toBeCloseTo(27);
    expect(new Game(easy, 1).colors).toBe(5);
  });

  it('Extrême : plus rapide qu\'Expert dès le départ, mais une vitesse maximale et une grâce qui restent jouables', async () => {
    const { withDifficulty } = await import('../src/core/difficulty');
    const base = cfg();
    const hard = withDifficulty(base, 'hard');
    const extreme = withDifficulty(base, 'extreme');
    expect(extreme.baseSecondsPerRow).toBeLessThan(hard.baseSecondsPerRow);
    expect(extreme.mortarEveryS).toBeLessThan(hard.mortarEveryS);
    expect(extreme.minSecondsPerRow).toBeGreaterThanOrEqual(0.9);
    expect(extreme.graceS).toBeGreaterThanOrEqual(1.5);
  });
});
