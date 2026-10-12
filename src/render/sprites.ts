/** Couleurs des tomettes émaillées et glyphes associés (accessibilité). */
export const TILE_COLORS = ['#c4402c', '#2d68b0', '#dfb032', '#3a8a4a', '#7a4aa0', '#249c9c'];
const GLYPH_COLOR = 'rgba(255, 248, 232, 0.92)';

export type Variant = 'normal' | 'dim' | 'flash';

/** « Couleur » de sprite réservée à la tomette d'or. */
export const GOLD = 99;

/** Trace un hexagone flat-top centré en (x, y). */
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

function drawGlyph(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, s: number): void {
  ctx.fillStyle = GLYPH_COLOR;
  ctx.strokeStyle = GLYPH_COLOR;
  ctx.lineWidth = s * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (kind % 6) {
    case 0: // pastille
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 1: // losange
      ctx.moveTo(x, y - s * 0.75);
      ctx.lineTo(x + s * 0.55, y);
      ctx.lineTo(x, y + s * 0.75);
      ctx.lineTo(x - s * 0.55, y);
      ctx.closePath();
      ctx.fill();
      break;
    case 2: // triangle
      ctx.moveTo(x, y - s * 0.7);
      ctx.lineTo(x + s * 0.68, y + s * 0.5);
      ctx.lineTo(x - s * 0.68, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 3: // croix
      ctx.moveTo(x - s * 0.6, y);
      ctx.lineTo(x + s * 0.6, y);
      ctx.moveTo(x, y - s * 0.6);
      ctx.lineTo(x, y + s * 0.6);
      ctx.stroke();
      break;
    case 4: // anneau
      ctx.lineWidth = s * 0.22;
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 5: // étoile
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.PI / 5) * i;
        const rr = i % 2 === 0 ? s * 0.75 : s * 0.32;
        const px = x + rr * Math.cos(a);
        const py = y + rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/** Rosace à 6 pétales (glyphe de la tomette d'or). */
function drawRosette(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#d0951a';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5, s * 0.42, s * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, s * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#b5543a';
  ctx.fill();
}

/** Cache de sprites pré-rendus (une image par couleur et variante), reconstruit au redimensionnement. */
export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();
  private R = 0;
  private dpr = 1;
  /** Demi-taille du sprite en px CSS. */
  half = 0;

  setSize(R: number, dpr: number): void {
    if (R === this.R && dpr === this.dpr) return;
    this.R = R;
    this.dpr = dpr;
    this.half = R + 2;
    this.cache.clear();
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
    const gold = color === GOLD;
    const base = gold ? '#efe2bf' : TILE_COLORS[color % TILE_COLORS.length];

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
    ctx.strokeStyle = gold ? '#c08a1e' : shade(base, -0.45);
    ctx.stroke();
    hexPath(ctx, cx, cy, r * 0.84);
    ctx.lineWidth = Math.max(1, R * 0.04);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.stroke();

    if (gold) drawRosette(ctx, cx, cy, R * 0.62);
    else drawGlyph(ctx, color, cx, cy, R * 0.42);

    if (variant === 'dim') {
      hexPath(ctx, cx, cy, r + 1);
      ctx.fillStyle = 'rgba(20, 10, 5, 0.6)';
      ctx.fill();
    } else if (variant === 'flash') {
      hexPath(ctx, cx, cy, r + 1);
      ctx.fillStyle = 'rgba(255, 252, 240, 0.7)';
      ctx.fill();
    }
    return canvas;
  }
}
