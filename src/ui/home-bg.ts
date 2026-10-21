import { config } from '../config';
import { hexPath, roundHexPath } from '../render/sprites';
import { themeFor } from '../render/theme';

/** Logo : la rosace de l'icône, en SVG (7 tomettes arrondies). */
export function logoSvg(size = 120): string {
  const r = 15;
  const gap = r * Math.sqrt(3) * 1.06;
  const hex = (cx: number, cy: number, rr: number) => {
    const k = rr * 0.2;
    const dc = rr - k / Math.sin(Math.PI / 3);
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const ox = cx + dc * Math.cos(a);
      const oy = cy + dc * Math.sin(a);
      const a0 = a - Math.PI / 6;
      const a1 = a + Math.PI / 6;
      const p0 = `${(ox + k * Math.cos(a0)).toFixed(2)} ${(oy + k * Math.sin(a0)).toFixed(2)}`;
      const p1 = `${(ox + k * Math.cos(a1)).toFixed(2)} ${(oy + k * Math.sin(a1)).toFixed(2)}`;
      d += `${i ? 'L' : 'M'}${p0} A${k.toFixed(2)} ${k.toFixed(2)} 0 0 1 ${p1} `;
    }
    return d + 'Z';
  };
  const colors = ['var(--t0)', 'var(--t5)', 'var(--t1)', 'var(--t4)', 'var(--t3)', 'var(--t2)'];
  let out = '';
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (Math.PI / 3) * k;
    out += `<path class="logo-tile" style="--i:${k}" d="${hex(50 + gap * Math.cos(a), 50 + gap * Math.sin(a), r)}" fill="${colors[k]}"/>`;
  }
  out += `<path d="${hex(50, 50, r)}" fill="#fff8e6"/>`;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    out += `<circle cx="${(50 + Math.cos(a) * r * 0.38).toFixed(2)}" cy="${(50 + Math.sin(a) * r * 0.38).toFixed(2)}" r="${(r * 0.21).toFixed(2)}" fill="#e2a92e"/>`;
  }
  out += `<circle cx="50" cy="50" r="${(r * 0.16).toFixed(2)}" fill="#ee7f72"/>`;
  return `<svg class="logo" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${out}</svg>`;
}

interface Falling {
  x: number;
  y: number;
  r: number;
  vy: number;
  rot: number;
  vr: number;
  color: number;
}

/** Fond animé de l'accueil : quelques tomettes qui tombent doucement. */
export class HomeBackground {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private items: Falling[] = [];
  private raf = 0;
  private last = 0;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'home-bg';
    parent.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  private spawn(w: number, h: number, anywhere: boolean): Falling {
    const r = 12 + Math.random() * 22;
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -r * 2,
      r,
      vy: 12 + Math.random() * 22,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: Math.floor(Math.random() * 6),
    };
  }

  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const step = (now: number) => {
      this.raf = requestAnimationFrame(step);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame(now: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const moving = config.animations !== 0;
    const want = Math.round((w * h) / 24000);
    while (this.items.length < want) this.items.push(this.spawn(w, h, true));
    const theme = themeFor(config.theme);
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (moving) {
        it.y += it.vy * dt;
        it.rot += it.vr * dt;
      }
      if (it.y - it.r > h) this.items[i] = this.spawn(w, h, false);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.fillStyle = theme.tiles[it.color];
      if (theme.style === 'flat') roundHexPath(ctx, 0, 0, it.r, it.r * 0.2);
      else hexPath(ctx, 0, 0, it.r);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
