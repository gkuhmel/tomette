import type { Config } from '../config';
import { ClearEvent, Game } from './game';
import type { Cell } from './hex';

/** Une étape du tutoriel : grille préparée, geste conseillé et condition de réussite. */
export interface TutorialStep {
  /** Textes : clés tuto.<id>.title / tuto.<id>.text. */
  id: 'swap' | 'diagonal' | 'chain' | 'rise';
  build: (cfg: Config) => Game;
  /** Tuile à déplacer et case de destination conseillées. */
  hint?: { from: Cell; to: Cell };
  /** Indique la touche / le bouton Monter. */
  hintRise?: boolean;
  done: (game: Game, events: ClearEvent[]) => boolean;
}

const A = 0;
const B = 1;

/** Configuration du tutoriel : pas de montée automatique ni de tuiles spéciales. */
export function tutorialConfig(cfg: Config): Config {
  return {
    ...cfg,
    columns: 8,
    rows: 12,
    baseSecondsPerRow: 1e9,
    minSecondsPerRow: 1e9,
    crackedChance: 0,
    sealedChance: 0,
    jokerChance: 0,
    warnRows: 0,
  };
}

/** Remplissage qui ne peut former aucun alignement (couleurs 2 à 5). */
function fill(g: Game, c: number, r: number): void {
  g.grid.place(c, r, ((c * 2 + r) % 4) + 2);
}

function base(cfg: Config, rows: number[]): Game {
  const game = new Game(tutorialConfig(cfg), 1, { empty: true });
  for (const r of rows) for (let c = 0; c < game.grid.cols; c++) fill(game, c, r);
  return game;
}

/** Place `color` en (c, r), en remplaçant ce qui s'y trouve. */
function put(g: Game, c: number, r: number, color: number): void {
  g.grid.set(c, r, null);
  g.grid.place(c, r, color);
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'swap',
    build: (cfg) => {
      const g = base(cfg, [10, 11]);
      put(g, 3, 10, A);
      put(g, 3, 11, A);
      g.grid.place(2, 9, A);
      return g;
    },
    hint: { from: { c: 2, r: 9 }, to: { c: 3, r: 9 } },
    done: (_g, ev) => ev.length > 0,
  },
  {
    id: 'diagonal',
    build: (cfg) => {
      const g = base(cfg, [10, 11]);
      put(g, 0, 10, B);
      put(g, 2, 10, B);
      put(g, 2, 11, B);
      return g;
    },
    hint: { from: { c: 2, r: 10 }, to: { c: 1, r: 10 } },
    done: (_g, ev) => ev.length > 0,
  },
  {
    id: 'chain',
    build: (cfg) => {
      const g = base(cfg, [10, 11]);
      put(g, 3, 11, B);
      put(g, 3, 10, B);
      put(g, 4, 10, A);
      g.grid.place(3, 9, A);
      g.grid.place(3, 8, B);
      fill(g, 2, 9);
      g.grid.place(1, 9, A);
      return g;
    },
    hint: { from: { c: 1, r: 9 }, to: { c: 2, r: 9 } },
    done: (_g, ev) => ev.some((e) => e.chain >= 2),
  },
  {
    id: 'rise',
    build: (cfg) => base(cfg, [9, 10, 11]),
    hintRise: true,
    done: (g) => g.rowsRisen >= 1,
  },
];
