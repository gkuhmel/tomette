import type { Game } from '../core/game';
import { cellCenter } from '../core/hex';
import type { Layout } from './layout';
import type { Theme } from './theme';

/** Éclat de céramique, pétale ou étincelle. */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  born: number;
  life: number;
  shape: 'shard' | 'petal';
  gravity: number;
}

/** Onde circulaire (rosace, tomette d'or). */
interface Ring {
  x: number;
  y: number;
  born: number;
  life: number;
  maxR: number;
  color: string;
}

interface Seen {
  state: string;
  x: number;
  y: number;
  color: number;
}

const MAX_PARTICLES = 260;
const LAND_MS = 160;
const BANNER_MS = 1300;
const OVER_MS = 900;

/**
 * Effets purement visuels : éclats aux disparitions, écrasement à l'atterrissage,
 * ondes, tremblement d'écran, bandeau de niveau, assombrissement de fin de partie.
 * Ne touche jamais à la logique du jeu.
 */
export class Effects {
  enabled = true;
  shakeEnabled = true;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private seen = new Map<number, Seen>();
  private landed = new Map<number, number>();
  private shakeUntil = 0;
  private shakeAmp = 0;
  private banner: { text: string; born: number } | null = null;
  private lastLevel = 0;
  private overAt = 0;
  private game: Game | null = null;

  reset(): void {
    this.particles = [];
    this.rings = [];
    this.seen.clear();
    this.landed.clear();
    this.banner = null;
    this.lastLevel = 0;
    this.overAt = 0;
    this.shakeUntil = 0;
  }

  /** Observe la grille : atterrissages, tuiles qui viennent de disparaître, niveau, fin. */
  observe(game: Game, L: Layout, theme: Theme, now: number): void {
    if (game !== this.game) {
      this.reset();
      this.game = game;
    }
    const g = game.grid;
    const rise = game.riseOffset * L.h;
    const next = new Map<number, Seen>();
    g.forEach((t, c, r) => {
      const p = cellCenter(c, r, L.R);
      const s = { state: t.state, x: L.x0 + p.x, y: L.y0 + p.y - rise, color: t.special ? -1 : t.color };
      const prev = this.seen.get(t.id);
      if (prev && prev.state === 'falling' && t.state !== 'falling') this.landed.set(t.id, now);
      next.set(t.id, s);
    });
    if (this.enabled) {
      for (const [id, s] of this.seen) {
        if (s.state === 'clearing' && !next.has(id)) this.burst(s.x, s.y, s.color, theme, L.R, now);
      }
    }
    this.seen = next;
    for (const [id, at] of this.landed) if (now - at > LAND_MS) this.landed.delete(id);

    const level = game.level;
    if (this.lastLevel && level > this.lastLevel && this.enabled) this.banner = { text: `Niveau ${level}`, born: now };
    this.lastLevel = level;
    if (game.over && !this.overAt) this.overAt = now;
  }

  /** Effets déclenchés par un clear (appelé par le renderer à la lecture des évènements). */
  onClear(x: number, y: number, chain: number, size: number, rosaces: number, gold: boolean, R: number, theme: Theme, now: number): void {
    if (!this.enabled) return;
    if (rosaces) {
      this.rings.push({ x, y, born: now, life: 650, maxR: R * 4, color: theme.gold.petals });
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        const v = R * (4 + Math.random() * 2);
        this.add({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - R * 2, rot: a, vr: (Math.random() - 0.5) * 8,
          size: R * 0.35, color: i % 2 ? theme.gold.petals : theme.gold.base, born: now, life: 900, shape: 'petal', gravity: R * 6,
        });
      }
      this.shake(R * 0.12, 260, now);
    }
    if (gold) {
      this.rings.push({ x, y, born: now, life: 500, maxR: R * 6, color: theme.gold.border });
      this.shake(R * 0.1, 220, now);
    }
    if (chain >= 3) this.shake(R * Math.min(0.2, 0.05 * chain), 250, now);
    else if (size >= 6) this.shake(R * 0.06, 180, now);
  }

  private shake(amp: number, ms: number, now: number): void {
    if (!this.shakeEnabled) return;
    this.shakeAmp = Math.max(amp, now < this.shakeUntil ? this.shakeAmp : 0);
    this.shakeUntil = Math.max(this.shakeUntil, now + ms);
  }

  shakeOffset(now: number): { x: number; y: number } {
    if (!this.shakeEnabled || now >= this.shakeUntil) return { x: 0, y: 0 };
    return { x: Math.sin(now * 0.09) * this.shakeAmp, y: Math.cos(now * 0.11) * this.shakeAmp * 0.6 };
  }

  /** Écrasement à l'atterrissage : facteurs d'échelle (sx, sy). */
  squash(id: number, now: number): { sx: number; sy: number } | null {
    if (!this.enabled) return null;
    const at = this.landed.get(id);
    if (at === undefined) return null;
    const k = (now - at) / LAND_MS;
    if (k >= 1) return null;
    const a = Math.sin(Math.PI * k) * 0.14;
    return { sx: 1 + a, sy: 1 - a };
  }

  private burst(x: number, y: number, color: number, theme: Theme, R: number, now: number): void {
    const fill = color < 0 ? theme.gold.base : theme.tiles[color % theme.tiles.length];
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = R * (2 + Math.random() * 3);
      this.add({
        x: x + Math.cos(a) * R * 0.3, y: y + Math.sin(a) * R * 0.3,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - R * 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        size: R * (0.18 + Math.random() * 0.2), color: fill, born: now, life: 550 + Math.random() * 250, shape: 'shard', gravity: R * 14,
      });
    }
  }

  private add(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push(p);
  }

  /** Dessine particules, ondes, bandeau et fondu de fin. */
  draw(ctx: CanvasRenderingContext2D, L: Layout, theme: Theme, now: number, rows: number): void {
    this.particles = this.particles.filter((p) => now - p.born < p.life);
    for (const p of this.particles) {
      const t = (now - p.born) / 1000;
      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t + 0.5 * p.gravity * t * t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - (now - p.born) / p.life);
      ctx.translate(x, y);
      ctx.rotate(p.rot + p.vr * t);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.shape === 'petal') {
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      } else {
        ctx.moveTo(-p.size, -p.size * 0.6);
        ctx.lineTo(p.size, -p.size * 0.2);
        ctx.lineTo(-p.size * 0.2, p.size * 0.8);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }

    this.rings = this.rings.filter((r) => now - r.born < r.life);
    for (const r of this.rings) {
      const k = (now - r.born) / r.life;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = Math.max(2, L.R * 0.25 * (1 - k));
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.maxR * (1 - Math.pow(1 - k, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (this.banner) {
      const k = (now - this.banner.born) / BANNER_MS;
      if (k >= 1) this.banner = null;
      else {
        const appear = Math.min(1, k / 0.15);
        const fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        const cx = L.x0 + L.boardW / 2;
        const cy = L.y0 + L.boardH * 0.35;
        const scale = 0.8 + 0.2 * (1 - Math.pow(1 - appear, 3)) + (appear < 1 ? 0 : 0);
        ctx.save();
        ctx.globalAlpha = fade * appear;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        const w = L.boardW * 0.8;
        const hh = L.R * 1.6;
        ctx.fillStyle = theme.css['--terracotta'];
        roundRect(ctx, -w / 2, -hh / 2, w, hh, hh / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${Math.round(L.R * 0.85)}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.banner.text, 0, 2);
        ctx.restore();
      }
    }

    if (this.overAt) {
      // Assombrissement de haut en bas.
      const k = Math.min(1, (now - this.overAt) / OVER_MS);
      const covered = k * (rows + 1.5);
      ctx.fillStyle = theme.dimOverlay;
      for (let r = 0; r < rows + 1.5; r++) {
        const a = Math.max(0, Math.min(1, covered - r));
        if (a <= 0) break;
        ctx.globalAlpha = a;
        ctx.fillRect(L.x0 - 4, L.y0 + r * L.h, L.boardW + 8, L.h + 1);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const GAME_OVER_FADE_MS = OVER_MS;
