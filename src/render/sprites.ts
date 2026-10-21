import { Theme, THEMES } from './theme';
import { drawGlyph } from './glyphs';

/** night : couleurs effacées (malus « Nuit tombée » du duel), seul le pictogramme reste. */
export type Variant = 'normal' | 'dim' | 'flash' | 'night';

/** « Couleur » de sprite réservée à la tomette d'or. */
export const GOLD = 99;
/** « Couleur » de sprite réservée au joker. */
export const JOKER = 98;
/** « Couleur » de sprite réservée aux dalles de mortier. */
export const MORTAR = 97;

/** Trace un hexagone flat-top centré en (x, y). */
/** Hexagone flat-top aux coins arrondis. */
export function roundHexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, k: number): void {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return [x + r * Math.cos(a), y + r * Math.sin(a)];
  });
  ctx.beginPath();
  const mid = (i: number) => [(pts[i][0] + pts[(i + 1) % 6][0]) / 2, (pts[i][1] + pts[(i + 1) % 6][1]) / 2];
  const m0 = mid(5);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < 6; i++) {
    const m = mid(i);
    ctx.arcTo(pts[i][0], pts[i][1], m[0], m[1], k);
  }
  ctx.closePath();
}

export function hexPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + r * Math.cos(a);
    const py = y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}


/** Rosace à 6 pétales (glyphe de la tomette d'or). */
function drawRosette(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, petals: string, heart: string): void {
  ctx.fillStyle = petals;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.42, s * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = heart;
  ctx.fill();
}

/** Joker : 6 pastilles de toutes les couleurs autour d'une étoile. */
function drawJoker(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, colors: string[]): void {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5, R * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    const rr = i % 2 === 0 ? R * 0.3 : R * 0.13;
    const px = x + rr * Math.cos(a);
    const py = y + rr * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#6b5a4e';
  ctx.fill();
}

/** Mortier : mouchetures et petits cailloux, joint sombre sur le bord. */
function drawMortar(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, speck: string, edge: string, clip: () => void): void {
  ctx.save();
  clip();
  ctx.clip();
  // Positions fixes (pseudo-aléatoires) : toutes les dalles se ressemblent.
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = speck;
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * R * 0.85;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.025 + rnd() * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * R * 0.55;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, R * 0.13, R * 0.09, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  clip();
  ctx.lineWidth = Math.max(1, R * 0.06);
  ctx.strokeStyle = edge;
  ctx.stroke();
}

/** Fêlée : émail blanchi et craquelé (rayons blancs depuis un point d'impact, reliés par un anneau). */
function drawCracks(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, clip: () => void, light: boolean): void {
  ctx.save();
  clip();
  ctx.clip();
  ctx.fillStyle = light ? 'rgba(255, 255, 255, 0.38)' : 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, R * 2.4);
  const ox = x + R * 0.22;
  const oy = y - R * 0.18;
  const rays = [-2.6, -1.5, -0.4, 0.7, 1.9];
  const pts = rays.map((a) => {
    const p: [number, number][] = [[ox, oy]];
    for (let k = 1; k <= 3; k++) {
      const aa = a + (k % 2 ? 0.22 : -0.18);
      const d = (R * 1.1 * k) / 3;
      p.push([ox + Math.cos(aa) * d, oy + Math.sin(aa) * d]);
    }
    return p;
  });
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Ombre décalée d'un pixel, puis trait blanc : la craquelure se lit en léger relief.
  for (const [color, w, d] of [['rgba(30, 40, 70, 0.28)', 0.075, 1], ['rgba(255, 255, 255, 0.95)', 0.05, 0]] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, R * w);
    ctx.beginPath();
    for (const p of pts) p.forEach(([px, py], i) => (i ? ctx.lineTo(px + d, py + d) : ctx.moveTo(px + d, py + d)));
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.moveTo(pts[i][2][0] + d, pts[i][2][1] + d);
      ctx.lineTo(pts[i + 1][2][0] + d, pts[i + 1][2][1] + d);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Scellée : cerclage sombre riveté, posé à l'intérieur du bord. */
function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, ring: (r: number) => void, band: string, rivet: string): void {
  ring(R * 0.8);
  ctx.lineWidth = R * 0.17;
  ctx.strokeStyle = band;
  ctx.stroke();
  ring(R * 0.8);
  ctx.lineWidth = Math.max(1, R * 0.04);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.stroke();
  ctx.fillStyle = rivet;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * R * 0.76, y + Math.sin(a) * R * 0.76, R * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Cache de sprites pré-rendus (une image par couleur et variante), reconstruit au redimensionnement. */
export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private R = 0;
  private dpr = 1;
  private theme: Theme = THEMES[0];
  /** Demi-taille du sprite en px CSS. */
  half = 0;

  /** Jeu de pictogrammes des tuiles (0 = classique). */
  glyphs = 0;

  setTheme(theme: Theme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.cache.clear();
  }

  setGlyphs(set: number): void {
    if (set === this.glyphs) return;
    this.glyphs = set;
    this.cache.clear();
  }

  setSize(R: number, dpr: number): void {
    if (R === this.R && dpr === this.dpr) return;
    this.R = R;
    this.dpr = dpr;
    this.half = R * 1.08 + 2;
    this.cache.clear();
  }

  /** Calque posé sur une tuile fêlée ou scellée. */
  overlay(kind: 'cracked' | 'sealed'): HTMLCanvasElement {
    const key = `overlay:${kind}`;
    let c = this.cache.get(key);
    if (!c) {
      const size = Math.ceil(this.half * 2 * this.dpr);
      c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.scale(this.dpr, this.dpr);
      const R = this.R;
      const cx = this.half;
      const cy = this.half;
      const th = this.theme;
      const flat = th.style === 'flat';
      const shape = (r: number) => (flat ? roundHexPath(ctx, cx, cy, r, R * 0.2) : hexPath(ctx, cx, cy, r));
      const light = th.bg.startsWith('#f');
      if (kind === 'cracked') drawCracks(ctx, cx, cy, R, () => shape(R * 0.94 * (flat ? 0.97 : 1)), light);
      else drawSeal(ctx, cx, cy, R, (r) => (flat ? roundHexPath(ctx, cx, cy, r, R * 0.16) : hexPath(ctx, cx, cy, r)), light ? 'rgba(29, 42, 68, 0.78)' : 'rgba(255, 244, 228, 0.85)', light ? '#ffffff' : th.bg);
      this.cache.set(key, c);
    }
    return c;
  }

  get(color: number, variant: Variant): HTMLCanvasElement {
    const key = `${color}:${variant}`;
    let c = this.cache.get(key);
    if (!c) {
      c = this.render(color, variant);
      this.cache.set(key, c);
    }
    return c;
  }

  private render(color: number, variant: Variant): HTMLCanvasElement {
    const size = Math.ceil(this.half * 2 * this.dpr);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    const R = this.R;
    const cx = this.half;
    const cy = this.half;
    const r = R * 0.94;
    const th = this.theme;
    const gold = color === GOLD;
    const joker = color === JOKER;
    const mortar = color === MORTAR;
    const night = variant === 'night' && !mortar && !gold;
    const base = night ? th.mortar.speck : mortar ? th.mortar.base : gold || joker ? th.gold.base : th.tiles[color % th.tiles.length];
    const flat = th.style === 'flat';
    const path = (rr: number) => (flat ? roundHexPath(ctx, cx, cy, rr, R * 0.2) : hexPath(ctx, cx, cy, rr));

    if (flat) {
      // Aplat arrondi, ombre douce et léger reflet en haut.
      path(r * 0.97);
      ctx.save();
      ctx.shadowColor = 'rgba(40, 30, 20, 0.22)';
      ctx.shadowBlur = R * 0.12 * this.dpr;
      ctx.shadowOffsetY = R * 0.06 * this.dpr;
      ctx.fillStyle = base;
      ctx.fill();
      ctx.restore();
      if (gold) {
        ctx.lineWidth = Math.max(1.5, R * 0.08);
        ctx.strokeStyle = th.gold.border;
        ctx.stroke();
      }
      ctx.save();
      path(r * 0.97);
      ctx.clip();
      const hl = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      hl.addColorStop(0, 'rgba(255,255,255,0.28)');
      hl.addColorStop(0.5, 'rgba(255,255,255,0.04)');
      hl.addColorStop(1, 'rgba(0,0,0,0.06)');
      ctx.fillStyle = hl;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } else {
      // Émail : dégradé radial clair au centre.
      const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
      grad.addColorStop(0, shade(base, 0.28));
      grad.addColorStop(0.7, base);
      grad.addColorStop(1, shade(base, -0.25));
      hexPath(ctx, cx, cy, r);
      ctx.fillStyle = grad;
      ctx.fill();
      // Liseré.
      ctx.lineWidth = Math.max(1, R * 0.08);
      ctx.strokeStyle = gold ? th.gold.border : shade(base, -0.45);
      ctx.stroke();
      hexPath(ctx, cx, cy, r * 0.84);
      ctx.lineWidth = Math.max(1, R * 0.04);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.stroke();
    }

    if (mortar) drawMortar(ctx, cx, cy, R, th.mortar.speck, th.mortar.edge, () => path(r * 0.97));
    else if (gold) drawRosette(ctx, cx, cy, R * 0.62, th.gold.petals, th.gold.heart);
    else if (joker) drawJoker(ctx, cx, cy, R, th.tiles);
    else drawGlyph(ctx, this.glyphs, color, cx, cy, R * 0.42, th.glyph);

    if (variant === 'dim' || variant === 'flash') {
      path(r + 1);
      ctx.fillStyle = variant === 'dim' ? th.dimOverlay : th.flashOverlay;
      ctx.fill();
    }
    return canvas;
  }
}
