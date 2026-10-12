import { Cell, cellCenter, cellHeight } from '../core/hex';
import { SpriteCache, Variant } from '../render/sprites';
import { el } from './dom';
import { Screen } from './screens';

/** Petites scènes dessinées avec les vraies tuiles du jeu. */
interface SceneTile extends Cell {
  color: number;
  variant?: Variant;
  ring?: boolean;
}

interface Scene {
  cols: number;
  rows: number;
  tiles: SceneTile[];
  /** Flèches d'échange (ok) et échanges interdits (barrés). */
  arrows?: [Cell, Cell][];
  forbidden?: [Cell, Cell][];
  /** Flèche de chute d'une case vers une autre. */
  falls?: [Cell, Cell][];
  labels?: (Cell & { text: string })[];
  /** Rangée d'aperçu assombrie (index de rangée). */
  previewRow?: number;
  riseArrow?: boolean;
  /** Rayon des tuiles (px). */
  R?: number;
}

const DEFAULT_R = 20;
const CREAM = '#fff4d6';
const RED = '#ff6a55';

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - Math.cos(a) * 6, y2 - Math.sin(a) * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.5) * 10, y2 - Math.sin(a - 0.5) * 10);
  ctx.lineTo(x2 - Math.cos(a + 0.5) * 10, y2 - Math.sin(a + 0.5) * 10);
  ctx.closePath();
  ctx.fill();
}

function drawScene(scene: Scene, dpr: number): HTMLCanvasElement {
  const R = scene.R ?? DEFAULT_R;
  const sprites = spritesFor(R, dpr);
  const pad = 6;
  const extra = scene.riseArrow ? 28 : 0;
  const w = R * (1.5 * (scene.cols - 1) + 2) + pad * 2 + extra;
  const h = (scene.rows + 0.5) * cellHeight(R) + pad * 2;
  const canvas = el('canvas', { class: 'howto-fig' });
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const at = (c: number, r: number) => {
    const p = cellCenter(c, r, R);
    return { x: p.x + pad, y: p.y + pad };
  };
  const half = sprites.half;

  for (const t of scene.tiles) {
    const p = at(t.c, t.r);
    const variant: Variant = t.variant ?? (t.r === scene.previewRow ? 'dim' : 'normal');
    ctx.drawImage(sprites.get(t.color, variant), p.x - half, p.y - half, half * 2, half * 2);
  }
  for (const t of scene.tiles) {
    if (!t.ring) continue;
    const p = at(t.c, t.r);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      ctx.lineTo(p.x + R * 0.98 * Math.cos(a), p.y + R * 0.98 * Math.sin(a));
    }
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = CREAM;
    ctx.stroke();
  }
  const towards = (a: Cell, b: Cell, k: number) => {
    const p = at(a.c, a.r);
    const q = at(b.c, b.r);
    return { x1: p.x + (q.x - p.x) * 0.38, y1: p.y + (q.y - p.y) * 0.38, x2: p.x + (q.x - p.x) * k, y2: p.y + (q.y - p.y) * k };
  };
  for (const [a, b] of scene.arrows ?? []) {
    const s = towards(a, b, 0.85);
    arrow(ctx, s.x1, s.y1, s.x2, s.y2, CREAM);
  }
  for (const [a, b] of scene.forbidden ?? []) {
    const s = towards(a, b, 0.85);
    arrow(ctx, s.x1, s.y1, s.x2, s.y2, RED);
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx - 6, my - 6);
    ctx.lineTo(mx + 6, my + 6);
    ctx.moveTo(mx + 6, my - 6);
    ctx.lineTo(mx - 6, my + 6);
    ctx.stroke();
  }
  for (const [a, b] of scene.falls ?? []) {
    const p = at(a.c, a.r);
    const q = at(b.c, b.r);
    arrow(ctx, p.x + R * 0.95, p.y, q.x + R * 0.95, q.y, CREAM);
  }
  if (scene.riseArrow) {
    const x = w - pad - extra / 2;
    arrow(ctx, x, h - pad - 10, x, pad + 10, CREAM);
  }
  for (const l of scene.labels ?? []) {
    const p = at(l.c, l.r);
    ctx.font = '800 22px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2a1a14';
    ctx.fillStyle = '#ffe9a8';
    ctx.strokeText(l.text, p.x, p.y);
    ctx.fillText(l.text, p.x, p.y);
  }
  return canvas;
}

const spriteCaches = new Map<number, SpriteCache>();
function spritesFor(R: number, dpr: number): SpriteCache {
  let s = spriteCaches.get(R);
  if (!s) {
    s = new SpriteCache();
    s.setSize(R, dpr);
    spriteCaches.set(R, s);
  }
  return s;
}

// --- Scènes ----------------------------------------------------------------

const RED_ = 0, BLUE = 1, YELLOW = 2, GREEN = 3, PURPLE = 4, TEAL = 5;

const swapScene: Scene = {
  R: 34,
  cols: 3,
  rows: 3,
  tiles: [
    { c: 1, r: 1, color: YELLOW, ring: true },
    { c: 1, r: 0, color: BLUE },
    { c: 1, r: 2, color: GREEN },
    { c: 0, r: 1, color: RED_ },
    { c: 0, r: 2, color: TEAL },
    { c: 2, r: 1, color: PURPLE },
    { c: 2, r: 2, color: BLUE },
  ],
  arrows: [
    [{ c: 1, r: 1 }, { c: 0, r: 1 }],
    [{ c: 1, r: 1 }, { c: 0, r: 2 }],
    [{ c: 1, r: 1 }, { c: 2, r: 1 }],
    [{ c: 1, r: 1 }, { c: 2, r: 2 }],
  ],
  forbidden: [
    [{ c: 1, r: 1 }, { c: 1, r: 0 }],
    [{ c: 1, r: 1 }, { c: 1, r: 2 }],
  ],
};

const filler = (cells: [number, number, number][]): SceneTile[] => cells.map(([c, r, color]) => ({ c, r, color }));

const verticalScene: Scene = {
  R: 16,
  cols: 3,
  rows: 3,
  tiles: [
    ...[0, 1, 2].map((r) => ({ c: 1, r, color: RED_, ring: true })),
    ...filler([[0, 1, BLUE], [0, 2, GREEN], [2, 1, TEAL], [2, 2, PURPLE]]),
  ],
};

const diagAScene: Scene = {
  R: 16,
  cols: 3,
  rows: 3,
  tiles: [
    { c: 0, r: 0, color: BLUE, ring: true },
    { c: 1, r: 0, color: BLUE, ring: true },
    { c: 2, r: 1, color: BLUE, ring: true },
    ...filler([[0, 1, YELLOW], [0, 2, RED_], [1, 1, GREEN], [1, 2, PURPLE], [2, 2, TEAL]]),
  ],
};

const diagBScene: Scene = {
  R: 16,
  cols: 3,
  rows: 3,
  tiles: [
    { c: 0, r: 2, color: GREEN, ring: true },
    { c: 1, r: 1, color: GREEN, ring: true },
    { c: 2, r: 1, color: GREEN, ring: true },
    ...filler([[1, 2, YELLOW], [2, 2, RED_]]),
  ],
};

const swapToMatchBefore: Scene = {
  R: 25,
  cols: 3,
  rows: 3,
  tiles: [
    { c: 0, r: 1, color: PURPLE },
    { c: 0, r: 2, color: PURPLE },
    { c: 1, r: 0, color: PURPLE, ring: true },
    ...filler([[0, 0, YELLOW], [1, 1, TEAL], [1, 2, RED_], [2, 1, BLUE], [2, 2, GREEN]]),
  ],
  arrows: [[{ c: 1, r: 0 }, { c: 0, r: 0 }]],
};

const swapToMatchAfter: Scene = {
  R: 25,
  cols: 3,
  rows: 3,
  tiles: [
    ...[0, 1, 2].map((r) => ({ c: 0, r, color: PURPLE, ring: true })),
    ...filler([[1, 0, YELLOW], [1, 1, TEAL], [1, 2, RED_], [2, 1, BLUE], [2, 2, GREEN]]),
  ],
};

const comboScene: Scene = {
  cols: 3,
  rows: 3,
  tiles: [
    ...[[0, 0], [0, 1], [0, 2], [1, 0], [2, 1]].map(([c, r]) => ({ c, r, color: TEAL, ring: true })),
    ...filler([[1, 1, RED_], [1, 2, YELLOW], [2, 2, BLUE]]),
  ],
  labels: [{ c: 1, r: 1, text: '5' }],
};

const chainBefore: Scene = {
  cols: 3,
  rows: 6,
  tiles: [
    { c: 1, r: 0, color: RED_ },
    { c: 1, r: 1, color: GREEN },
    ...[2, 3, 4].map((r) => ({ c: 1, r, color: YELLOW, ring: true })),
    ...filler([[1, 5, BLUE], [0, 4, GREEN], [0, 5, BLUE], [2, 5, GREEN], [2, 4, PURPLE]]),
  ],
  falls: [[{ c: 1, r: 1 }, { c: 1, r: 4 }]],
};

const chainAfter: Scene = {
  cols: 3,
  rows: 6,
  tiles: [
    { c: 1, r: 3, color: RED_ },
    { c: 0, r: 4, color: GREEN, ring: true },
    { c: 1, r: 4, color: GREEN, ring: true },
    { c: 2, r: 5, color: GREEN, ring: true },
    ...filler([[1, 5, BLUE], [0, 5, BLUE], [2, 4, PURPLE]]),
  ],
  labels: [{ c: 1, r: 2, text: '×2' }],
};

const riseScene: Scene = {
  cols: 5,
  rows: 4,
  previewRow: 3,
  riseArrow: true,
  tiles: filler([
    [0, 1, RED_], [1, 1, BLUE], [2, 1, GREEN], [3, 1, YELLOW], [4, 1, TEAL],
    [0, 2, PURPLE], [1, 2, YELLOW], [2, 2, RED_], [3, 2, BLUE], [4, 2, GREEN],
    [0, 3, TEAL], [1, 3, RED_], [2, 3, BLUE], [3, 3, PURPLE], [4, 3, YELLOW],
    [1, 0, GREEN], [3, 0, RED_],
  ]),
};

// --- Écran -----------------------------------------------------------------

export function howToScreen(onPlay: () => void, onBack: () => void): Screen {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const fig = (...scenes: (Scene | string)[]) =>
    el(
      'div',
      { class: 'howto-figs' },
      scenes.map((s) => (typeof s === 'string' ? el('span', { class: 'howto-arrow' }, [s]) : drawScene(s, dpr))),
    );
  const section = (title: string, figure: HTMLElement, ...text: string[]) =>
    el('section', {}, [el('h3', {}, [title]), figure, ...text.map((t) => el('p', {}, [t]))]);

  const play = el('button', { type: 'button', class: 'btn primary' }, ['Jouer']);
  const back = el('button', { type: 'button', class: 'btn' }, ['Retour']);
  play.addEventListener('click', onPlay);
  back.addEventListener('click', onBack);

  const screen = new Screen('screen-howto', [
    el('div', { class: 'howto' }, [
      el('h2', {}, ['Comment jouer']),
      section(
        '1. Échanger',
        fig(swapScene),
        'Pose le doigt (ou clique) sur une tuile et glisse vers une voisine en biais : elles s\'échangent.',
        'Seulement les 4 voisines en diagonale — jamais vers le haut ou le bas. Tu peux enchaîner plusieurs échanges sans lever le doigt.',
      ),
      section(
        '2. Aligner',
        fig(verticalScene, diagAScene, diagBScene),
        '3 tuiles ou plus de la même couleur alignées disparaissent : à la verticale ou sur l\'une des deux diagonales.',
      ),
      section('', fig(swapToMatchBefore, '→', swapToMatchAfter), 'Un échange bien placé suffit à compléter une ligne.'),
      section(
        '3. Combos',
        fig(comboScene),
        'Plus de 3 tuiles d\'un coup (même en L ou en Y) : bonus de points, et la pile s\'arrête un instant.',
      ),
      section(
        '4. Chaînes',
        fig(chainBefore, '→', chainAfter),
        'Quand des tuiles tombent dans le vide laissé par un alignement et en forment un nouveau, c\'est une chaîne : ×2, ×3… Les points sont multipliés et la pile fait une pause plus longue.',
      ),
      section(
        '5. La pile monte',
        fig(riseScene),
        'Une nouvelle rangée (assombrie) arrive par le bas, de plus en plus vite.',
        'Maintiens « Monter » (ou la touche Espace) pour accélérer.',
        'Si une tuile touche le haut, le cadre devient rouge : tu as 2 secondes pour faire un alignement, sinon c\'est perdu.',
      ),
      el('div', { class: 'howto-buttons' }, [back, play]),
    ]),
  ]);
  return screen;
}
