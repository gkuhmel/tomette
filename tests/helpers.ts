import { Config, defaultConfig } from '../src/config';
import { Game } from '../src/core/game';
import { Dir, neighbor } from '../src/core/hex';

/** Configuration de test : 12 rangées et éboulement coupé (scénarios construits à la main). */
export function cfg(overrides: Partial<Config> = {}): Config {
  return { ...defaultConfig, rows: 12, slide: 0, ...overrides };
}

/** Jeu sur grille vide, sans montée (pour des scénarios construits à la main). */
export function emptyGame(overrides: Partial<Config> = {}): Game {
  return new Game(cfg({ baseSecondsPerRow: 1e9, minSecondsPerRow: 1e9, ...overrides }), 1, { empty: true });
}

/** Cases d'une ligne partant de (c, r) dans une direction. */
export function line(c: number, r: number, dir: Dir, n: number): { c: number; r: number }[] {
  const out = [{ c, r }];
  for (let i = 1; i < n; i++) out.push(neighbor(out[i - 1].c, out[i - 1].r, dir));
  return out;
}

export function runTicks(game: Game, n: number): void {
  for (let i = 0; i < n; i++) game.tick();
}

/** Tique jusqu'à ce que plus rien ne bouge (ou max ticks). */
export function settle(game: Game, max = 2000): void {
  for (let i = 0; i < max; i++) {
    game.tick();
    if (!game.grid.some((t) => t.state !== 'idle')) return;
  }
  throw new Error('la grille ne se stabilise pas');
}
