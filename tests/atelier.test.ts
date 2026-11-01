import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { ATELIER_STAGES, atelierStage, BonItem, earnsTip, itemFinished, itemTotal, makeBon } from '../src/core/atelier';
import { Game } from '../src/core/game';
import { neighbor } from '../src/core/hex';
import { Rng } from '../src/core/rng';
import { RING } from '../src/core/shapes';
import { cfg } from './helpers';

const A = 0, C = 2;

/** Jeu vide de l'atelier, sans montée, avec le bon donné. */
function atelierGame(bon: BonItem[]): Game {
  return new Game(cfg({ baseSecondsPerRow: 1e9, minSecondsPerRow: 1e9 }), 1, { empty: true, mode: 'atelier', bon });
}

/** Pose un triangle de couleur `color` en bas, sa dernière tuile comptant comme « déplacée ». */
function buildTriangle(game: Game, color: number): void {
  const bottom = game.grid.rows - 1;
  game.grid.place(3, bottom, color);
  game.grid.place(2, bottom, color);
  const near = (a: { c: number; r: number }, b: { c: number; r: number }) =>
    RING.some((d) => {
      const n = neighbor(a.c, a.r, d);
      return n.c === b.c && n.r === b.r;
    });
  const third = RING.map((d) => neighbor(3, bottom, d)).find((x) => x.r < bottom && near(x, { c: 2, r: bottom }))!;
  game.grid.place(third.c, third.r, color);
  (game as unknown as { fresh: Set<number> }).fresh.add(game.grid.get(third.c, third.r)!.id);
}

const line = (steps: BonItem['steps'], color = -1, count = 1): BonItem => ({ steps, color, count, done: 0 });

describe('Atelier', () => {
  it('bons de commande : de 2 lignes au début à 5 à la fin, sans doublon', () => {
    for (let stage = 1; stage <= ATELIER_STAGES; stage++) {
      for (let seed = 1; seed <= 20; seed++) {
        const bon = makeBon(stage, new Rng(seed * 31 + stage), 5);
        const n = bon.length;
        if (stage <= 3) expect(n).toBe(2);
        else if (stage <= 7) expect(n).toBe(3);
        else if (stage <= 11) expect([3, 4]).toContain(n);
        else if (stage <= 15) expect(n).toBe(4);
        else expect(n).toBe(5);
        const keys = bon.map((i) => `${i.steps.join('+')}:${i.color}`);
        expect(new Set(keys).size).toBe(n);
        for (const i of bon) {
          if (stage <= 3) expect(['triangle', 'combo5']).toContain(i.steps[0]);
          if (stage < 12) expect(itemTotal(i)).toBe(1);
          if (i.steps[0] === 'combo5' || i.steps[0] === 'rosace' || i.steps[0] === 'chain3') expect(i.color).toBe(-1);
          else expect(i.color).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('la pile accélère d\'une manche à l\'autre', () => {
    const first = atelierStage(1, defaultConfig).cfg;
    const last = atelierStage(ATELIER_STAGES, defaultConfig).cfg;
    expect(atelierStage(ATELIER_STAGES, defaultConfig).level).toBeGreaterThan(atelierStage(1, defaultConfig).level);
    expect(last.colors).toBeGreaterThanOrEqual(first.colors);
  });

  it('un triangle de la bonne couleur livre sa ligne ; tout livré = manche gagnée', () => {
    const game = atelierGame([line(['triangle'], A), line(['triangle'], C)]);
    buildTriangle(game, A);
    game.tick();
    expect(itemFinished(game.bon![0])).toBe(true);
    expect(itemFinished(game.bon![1])).toBe(false);
    expect(game.won).toBe(false);
    expect(game.notices).toContain('order');
    // La seconde ligne sautée (pourboire) : la manche est gagnée au pas suivant.
    expect(game.skipLine(1)).toBe(true);
    expect(game.skipLine(1)).toBe(false);
    game.tick();
    expect(game.won).toBe(true);
    expect(game.over).toBe(true);
  });

  it('mauvaise couleur : rien n\'est livré (et le triangle reste en place)', () => {
    const game = atelierGame([line(['triangle'], A)]);
    buildTriangle(game, C);
    game.tick();
    expect(game.bon![0].done).toBe(0);
    expect(game.events.some((e) => e.kind === 'clear')).toBe(false);
  });

  it('« 2 triangles » et « triangle puis arc » avancent étape par étape', () => {
    const twice = atelierGame([line(['triangle'], A, 2)]);
    buildTriangle(twice, A);
    twice.tick();
    expect(twice.bon![0].done).toBe(1);
    expect(twice.notices).toContain('orderStep');
    expect(twice.won).toBe(false);
    const seq = atelierGame([line(['triangle', 'arc'], A)]);
    buildTriangle(seq, A);
    seq.tick();
    expect(seq.bon![0].done).toBe(1);
    expect(itemFinished(seq.bon![0])).toBe(false);
  });

  it('pourboire : une manche livrée vite', () => {
    const bon = [line(['triangle'], A), line(['combo5'])];
    expect(earnsTip(40, bon)).toBe(true);
    expect(earnsTip(60, bon)).toBe(false);
  });
});
