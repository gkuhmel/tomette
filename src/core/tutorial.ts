import type { Config } from '../config';
import { ClearEvent, Game } from './game';
import type { Cell } from './hex';

/** Une étape du tutoriel : grille préparée, geste conseillé et condition de réussite. */
export interface TutorialStep {
  /** Textes : clés tuto.<id>.title / tuto.<id>.text. */
  id: 'swap' | 'diagonal' | 'combo' | 'chain' | 'rise' | 'cracked' | 'rosace' | 'gold' | 'losange';
  build: (cfg: Config) => Game;
  /** Tuile à déplacer et case de destination conseillées. */
  hint?: { from: Cell; to: Cell };
  /** Indique la touche / le bouton Monter. */
  hintRise?: boolean;
  done: (game: Game, events: ClearEvent[]) => boolean;
}

const A = 0;
const B = 1;
const X = 2;

/** Configuration du tutoriel : pas de montée automatique ni de tuiles spéciales. */
export function tutorialConfig(cfg: Config): Config {
  return {
    ...cfg,
    columns: 8,
    rows: 11,
    baseSecondsPerRow: 1e9,
    minSecondsPerRow: 1e9,
    crackedChance: 0,
    sealedChance: 0,
    jokerChance: 0,
    warnRows: 0,
    slide: 0,
    mortarEveryS: 0,
    rosace: 1,
    rosaceMin: 5,
    losange: 1,
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
      const g = base(cfg, [9, 10]);
      put(g, 3, 9, A);
      put(g, 3, 10, A);
      g.grid.place(2, 8, A);
      return g;
    },
    hint: { from: { c: 2, r: 8 }, to: { c: 3, r: 8 } },
    done: (_g, ev) => ev.length > 0,
  },
  {
    id: 'diagonal',
    build: (cfg) => {
      const g = base(cfg, [9, 10]);
      put(g, 0, 9, B);
      put(g, 2, 9, B);
      put(g, 2, 10, B);
      return g;
    },
    hint: { from: { c: 2, r: 9 }, to: { c: 1, r: 9 } },
    done: (_g, ev) => ev.length > 0,
  },
  {
    id: 'combo',
    build: (cfg) => {
      // La tuile glissée complète deux lignes à la fois : 5 tuiles d'un coup.
      const g = base(cfg, [9, 10]);
      put(g, 3, 9, A);
      put(g, 3, 10, A);
      put(g, 4, 9, A);
      put(g, 5, 9, A);
      g.grid.place(2, 8, A);
      return g;
    },
    hint: { from: { c: 2, r: 8 }, to: { c: 3, r: 8 } },
    done: (_g, ev) => ev.some((e) => e.size >= 4),
  },
  {
    id: 'chain',
    build: (cfg) => {
      const g = base(cfg, [9, 10]);
      put(g, 3, 10, B);
      put(g, 3, 9, B);
      put(g, 4, 9, A);
      g.grid.place(3, 8, A);
      g.grid.place(3, 7, B);
      fill(g, 2, 8);
      g.grid.place(1, 8, A);
      return g;
    },
    hint: { from: { c: 1, r: 8 }, to: { c: 2, r: 8 } },
    done: (_g, ev) => ev.some((e) => e.chain >= 2),
  },
  {
    id: 'rise',
    build: (cfg) => base(cfg, [8, 9, 10]),
    hintRise: true,
    done: (g) => g.rowsRisen >= 1,
  },
  {
    id: 'cracked',
    build: (cfg) => {
      // Un alignement juste à côté répare la tomette fêlée.
      const g = base(cfg, [9, 10]);
      put(g, 3, 9, A);
      put(g, 3, 10, A);
      g.grid.get(4, 9)!.kind = 'cracked';
      g.grid.place(2, 8, A);
      return g;
    },
    hint: { from: { c: 2, r: 8 }, to: { c: 3, r: 8 } },
    done: (g) => g.stats.repairs >= 1,
  },
  {
    id: 'rosace',
    build: (cfg) => {
      // 4 tuiles autour de (3, 8) ; la 5e arrive par un échange : rosace, le centre devient une tomette d'or.
      const g = base(cfg, [9, 10]);
      g.grid.place(3, 8, B);
      for (const [c, r] of [[4, 8], [4, 9], [3, 9], [2, 9]]) put(g, c, r, A);
      g.grid.place(2, 8, X);
      g.grid.place(2, 7, A);
      return g;
    },
    hint: { from: { c: 2, r: 7 }, to: { c: 3, r: 7 } },
    done: (g) => g.rosaceCount >= 1,
  },
  {
    id: 'gold',
    build: (cfg) => {
      // Une tomette d'or : l'échanger avec une voisine efface toute la couleur de cette voisine.
      const g = base(cfg, [9, 10]);
      g.grid.get(3, 9)!.special = true;
      return g;
    },
    hint: { from: { c: 3, r: 9 }, to: { c: 4, r: 9 } },
    done: (g) => g.stats.goldUsed >= 1,
  },
  {
    id: 'losange',
    build: (cfg) => {
      // Deux triangles accolés de même couleur : le losange disparaît et une voisine devient joker.
      const g = base(cfg, [9, 10]);
      put(g, 4, 9, A);
      g.grid.place(3, 8, A);
      g.grid.place(4, 8, A);
      g.grid.place(5, 8, X);
      g.grid.place(6, 8, A);
      return g;
    },
    hint: { from: { c: 6, r: 8 }, to: { c: 5, r: 8 } },
    done: (_g, ev) => ev.some((e) => e.shape === 'losange'),
  },
];
