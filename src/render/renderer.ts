import type { Game } from '../core/game';
import { cellCenter } from '../core/hex';
import { Layout } from './layout';
import { GOLD, hexPath, SpriteCache } from './sprites';

interface Popup {
  text: string;
  sub: string;
  x: number;
  y: number;
  born: number;
}

const POPUP_MS = 1100;
const BG = '#2a1a14';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites = new SpriteCache();
  private boardBg: HTMLCanvasElement | null = null;
  private layout: Layout | null = null;
  private popups: Popup[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(layout: Layout, cols: number, rows: number): void {
    this.layout = layout;
    this.canvas.width = Math.round(layout.cssW * layout.dpr);
    this.canvas.height = Math.round(layout.cssH * layout.dpr);
    this.sprites.setSize(layout.R, layout.dpr);
    this.boardBg = this.renderBoardBg(layout, cols, rows);
  }

  reset(): void {
    this.popups = [];
  }

  private renderBoardBg(L: Layout, cols: number, rows: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.ceil(L.boardW * L.dpr) + 2;
    c.height = Math.ceil(L.boardH * L.dpr) + 2;
    const ctx = c.getContext('2d')!;
    ctx.scale(L.dpr, L.dpr);
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const p = cellCenter(x, y, L.R);
        hexPath(ctx, p.x, p.y, L.R * 0.94);
        ctx.fillStyle = (x + y) % 2 ? '#3a251c' : '#36221a';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#4a3024';
        ctx.stroke();
      }
    }
    return c;
  }

  /** Convertit les évènements de clear en textes flottants. */
  consumeEvents(game: Game, now: number): void {
    const L = this.layout;
    if (!L) {
      game.events.length = 0;
      return;
    }
    for (const e of game.events) {
      if (e.chain < 2 && e.size < 4 && !e.rosaces && !e.gold) continue;
      let x = 0;
      let y = 0;
      for (const { c, r } of e.cells) {
        const p = cellCenter(c, r, L.R);
        x += p.x;
        y += p.y;
      }
      x = x / e.cells.length + L.x0;
      y = y / e.cells.length + L.y0 - game.riseOffset * L.h;
      this.popups.push({
        text: e.rosaces ? 'Rosace !' : e.gold ? 'Or !' : e.chain >= 2 ? `×${e.chain}` : `${e.size}`,
        sub: e.rosaces
          ? e.chain >= 2 ? `chaîne ×${e.chain}` : `+${e.points}`
          : e.gold ? `${e.size - 1} tuiles`
          : e.chain >= 2 && e.size >= 4 ? `combo ${e.size}` : e.chain >= 2 ? 'chaîne' : 'combo',
        x,
        y,
        born: now,
      });
    }
    game.events.length = 0;
  }

  draw(game: Game, heldId: number | null, now: number): void {
    const L = this.layout;
    if (!L || !this.boardBg) return;
    const ctx = this.ctx;
    const { R, h, x0, y0, dpr } = L;
    const cfg = game.cfg;
    const g = game.grid;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, L.cssW, L.cssH);
    ctx.drawImage(this.boardBg, x0, y0, this.boardBg.width / dpr, this.boardBg.height / dpr);

    const rise = game.riseOffset * h;
    const half = this.sprites.half;
    const size = half * 2;
    const shake = game.alert ? Math.min(3, R * 0.08) : 0;

    // Rangée d'aperçu (assombrie, non interactive).
    for (let c = 0; c < g.cols; c++) {
      const t = game.preview[c];
      if (!t) continue;
      const p = cellCenter(c, g.rows, R);
      ctx.drawImage(this.sprites.get(t.color, 'dim'), x0 + p.x - half, y0 + p.y - rise - half, size, size);
    }

    let held: { x: number; y: number } | null = null;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const t = g.get(c, r);
        if (!t) continue;
        const color = t.special ? GOLD : t.color;
        const p = cellCenter(c, r, R);
        let x = x0 + p.x;
        let y = y0 + p.y - rise;
        if (t.state === 'swapping' && cfg.swapDurationMs > 0) {
          const k = Math.max(0, t.timer / cfg.swapDurationMs);
          const from = cellCenter(c + t.swapDc, r + t.swapDr, R);
          x += (from.x - p.x) * k;
          y += (from.y - p.y) * k;
        } else if (t.state === 'falling') {
          y += t.fall * h;
        }
        if (shake) {
          x += Math.sin(now * 0.07 + t.id * 1.7) * shake;
          y += Math.cos(now * 0.09 + t.id * 2.3) * shake * 0.5;
        }

        if (t.state === 'clearing') {
          const k = 1 - t.timer / Math.max(1, cfg.clearDurationMs);
          if (k < 0.65) {
            const flash = Math.floor(now / 70) % 2 === 0;
            ctx.drawImage(this.sprites.get(color, flash ? 'flash' : 'normal'), x - half, y - half, size, size);
          } else {
            const s = Math.max(0, 1 - (k - 0.65) / 0.35);
            const sz = size * s;
            ctx.drawImage(this.sprites.get(color, 'flash'), x - sz / 2, y - sz / 2, sz, sz);
          }
          continue;
        }

        if (t.id === heldId) {
          held = { x, y };
          const sz = size * 1.1;
          ctx.drawImage(this.sprites.get(color, 'normal'), x - sz / 2, y - sz / 2, sz, sz);
        } else {
          ctx.drawImage(this.sprites.get(color, 'normal'), x - half, y - half, size, size);
        }
        if (t.special) {
          // Halo qui pulse autour de la tomette d'or.
          hexPath(ctx, x, y, R * 0.98);
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(255, 236, 170, ${0.35 + 0.35 * Math.sin(now * 0.006 + t.id)})`;
          ctx.stroke();
        }
      }
    }

    if (held) {
      hexPath(ctx, held.x, held.y, R * 1.06);
      ctx.lineWidth = Math.max(2, R * 0.1);
      ctx.strokeStyle = 'rgba(255, 244, 214, 0.95)';
      ctx.stroke();
    }

    // Bord rouge en alerte.
    if (game.alert) {
      const pulse = 0.55 + 0.45 * Math.sin(now * 0.02);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(230, 40, 30, ${pulse})`;
      ctx.strokeRect(x0 - 3, y0 - 3, L.boardW + 6, L.boardH + h + 6);
    }

    this.drawPopups(now);
  }

  private drawPopups(now: number): void {
    const ctx = this.ctx;
    const L = this.layout!;
    this.popups = this.popups.filter((p) => now - p.born < POPUP_MS);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const k = (now - p.born) / POPUP_MS;
      const y = p.y - k * L.R * 1.2;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const big = Math.round(L.R * 1.1);
      ctx.font = `800 ${big}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, L.R * 0.16);
      ctx.strokeStyle = '#2a1a14';
      ctx.fillStyle = '#ffe9a8';
      ctx.strokeText(p.text, p.x, y);
      ctx.fillText(p.text, p.x, y);
      ctx.font = `700 ${Math.round(L.R * 0.45)}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeText(p.sub, p.x, y + big * 0.7);
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(p.sub, p.x, y + big * 0.7);
    }
    ctx.globalAlpha = 1;
  }
}
