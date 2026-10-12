import type { Game } from '../core/game';
import { cellCenter } from '../core/hex';
import { Layout } from './layout';
import { Effects } from './effects';
import { GOLD, hexPath, roundHexPath, SpriteCache } from './sprites';
import { Theme, themeFor } from './theme';

interface Popup {
  text: string;
  sub: string;
  x: number;
  y: number;
  born: number;
}

const POPUP_MS = 1100;
/** Durée du fondu d'une nouvelle rangée d'aperçu, et du passage aperçu → jouable. */
const PREVIEW_FADE_MS = 450;
const ACTIVATE_FADE_MS = 250;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites = new SpriteCache();
  private boardBg: HTMLCanvasElement | null = null;
  private layout: Layout | null = null;
  private popups: Popup[] = [];
  readonly effects = new Effects();
  private theme: Theme = themeFor(0);
  private cols = 0;
  private rows = 0;
  private previewId = -1;
  private previewBorn = 0;
  private activatedIds = new Set<number>();
  private activatedAt = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  /** Change de thème (sprites et plateau redessinés). Renvoie true si le thème a changé. */
  setTheme(theme: Theme): boolean {
    if (theme === this.theme) return false;
    this.theme = theme;
    this.sprites.setTheme(theme);
    if (this.layout) this.boardBg = this.renderBoardBg(this.layout, this.cols, this.rows);
    return true;
  }

  resize(layout: Layout, cols: number, rows: number): void {
    this.layout = layout;
    this.cols = cols;
    this.rows = rows;
    this.canvas.width = Math.round(layout.cssW * layout.dpr);
    this.canvas.height = Math.round(layout.cssH * layout.dpr);
    this.sprites.setSize(layout.R, layout.dpr);
    this.boardBg = this.renderBoardBg(layout, cols, rows);
  }

  reset(): void {
    this.popups = [];
    this.effects.reset();
    this.previewId = -1;
    this.activatedIds.clear();
  }

  /** Repère l'arrivée d'une nouvelle rangée d'aperçu pour l'animer. */
  private trackPreview(game: Game, now: number): void {
    const first = game.preview[0];
    if (!first || first.id === this.previewId) return;
    // L'ancienne rangée d'aperçu vient de devenir jouable.
    this.activatedIds = new Set();
    if (this.previewId >= 0) {
      game.grid.forEach((t, _c, r) => {
        if (r === game.grid.rows - 1) this.activatedIds.add(t.id);
      });
      this.activatedAt = now;
      this.previewBorn = now;
    } else {
      this.previewBorn = now - PREVIEW_FADE_MS; // première rangée : pas de fondu
    }
    this.previewId = first.id;
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
        const th = this.theme;
        if (th.style === 'flat') roundHexPath(ctx, p.x, p.y, L.R * 0.91, L.R * 0.2);
        else hexPath(ctx, p.x, p.y, L.R * 0.94);
        ctx.fillStyle = (x + y) % 2 ? th.slotA : th.slotB;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = th.slotStroke;
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
      let x = 0;
      let y = 0;
      for (const { c, r } of e.cells) {
        const p = cellCenter(c, r, L.R);
        x += p.x;
        y += p.y;
      }
      x = x / e.cells.length + L.x0;
      y = y / e.cells.length + L.y0 - game.riseOffset * L.h;
      this.effects.onClear(x, y, e.chain, e.size, e.rosaces, e.gold, L.R, this.theme, now);
      if (e.chain < 2 && e.size < 4 && !e.rosaces && !e.gold) continue;
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

    const th = this.theme;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, L.cssW, L.cssH);
    this.effects.enabled = cfg.animations !== 0;
    this.effects.shakeEnabled = cfg.screenShake !== 0;
    this.effects.observe(game, L, th, now);
    const sh = this.effects.shakeOffset(now);
    ctx.setTransform(dpr, 0, 0, dpr, sh.x * dpr, sh.y * dpr);
    ctx.drawImage(this.boardBg, x0, y0, this.boardBg.width / dpr, this.boardBg.height / dpr);

    // Zone d'attention : haut des colonnes menacées teinté.
    const danger = game.danger;
    if (danger >= 1) {
      const cols = game.dangerColumns();
      const warnRows = Math.min(g.rows, Math.round(cfg.warnRows));
      const a = danger === 2 ? 0.22 : 0.1 + 0.06 * Math.sin(now * 0.004);
      ctx.fillStyle = `rgba(${danger === 2 ? th.alert : th.warn}, ${a})`;
      for (let c = 0; c < g.cols; c++) {
        if (!cols[c]) continue;
        for (let r = 0; r < warnRows; r++) {
          const p = cellCenter(c, r, R);
          hexPath(ctx, x0 + p.x, y0 + p.y, R * 0.94);
          ctx.fill();
        }
      }
    }

    const rise = game.riseOffset * h;
    const half = this.sprites.half;
    const size = half * 2;
    const shake = game.alert ? Math.min(3, R * 0.08) : 0;

    // Rangée d'aperçu (assombrie, non interactive), en fondu à son arrivée.
    this.trackPreview(game, now);
    const fadeIn = Math.min(1, (now - this.previewBorn) / PREVIEW_FADE_MS);
    ctx.globalAlpha = fadeIn * fadeIn * (3 - 2 * fadeIn);
    for (let c = 0; c < g.cols; c++) {
      const t = game.preview[c];
      if (!t) continue;
      const p = cellCenter(c, g.rows, R);
      ctx.drawImage(this.sprites.get(t.color, 'dim'), x0 + p.x - half, y0 + p.y - rise - half, size, size);
    }
    ctx.globalAlpha = 1;
    const activating = Math.max(0, 1 - (now - this.activatedAt) / ACTIVATE_FADE_MS);

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
          const sq = this.effects.squash(t.id, now);
          if (sq) {
            // Écrasé à l'atterrissage, posé sur sa base.
            const w = size * sq.sx;
            const hh = size * sq.sy;
            ctx.drawImage(this.sprites.get(color, 'normal'), x - w / 2, y + half - hh, w, hh);
          } else {
            ctx.drawImage(this.sprites.get(color, 'normal'), x - half, y - half, size, size);
          }
        }
        if (activating > 0 && this.activatedIds.has(t.id)) {
          // La rangée qui devient jouable s'éclaire progressivement.
          ctx.globalAlpha = activating;
          ctx.drawImage(this.sprites.get(color, 'dim'), x - half, y - half, size, size);
          ctx.globalAlpha = 1;
        }
        if (t.special) {
          // Halo qui pulse autour de la tomette d'or.
          hexPath(ctx, x, y, R * 0.98);
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(255, 220, 120, ${0.35 + 0.35 * Math.sin(now * 0.006 + t.id)})`;
          ctx.stroke();
        }
      }
    }

    if (held) {
      hexPath(ctx, held.x, held.y, R * 1.06);
      ctx.lineWidth = Math.max(2, R * 0.1);
      ctx.strokeStyle = th.held;
      ctx.stroke();
    }

    // Bord orange (attention) ou rouge (alerte) + jauge de grâce.
    if (danger === 1) {
      const pulse = 0.35 + 0.25 * Math.sin(now * 0.004);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(${th.warn}, ${pulse})`;
      ctx.strokeRect(x0 - 3, y0 - 3, L.boardW + 6, L.boardH + h + 6);
    } else if (danger === 2) {
      const pulse = 0.55 + 0.45 * Math.sin(now * 0.02);
      ctx.lineWidth = 4;
      ctx.strokeStyle = `rgba(${th.alert}, ${pulse})`;
      ctx.strokeRect(x0 - 3, y0 - 3, L.boardW + 6, L.boardH + h + 6);
      const k = cfg.graceS > 0 ? Math.max(0, Math.min(1, game.graceLeft / cfg.graceS)) : 0;
      const gy = y0 - 13;
      ctx.fillStyle = `rgba(${th.alert}, 0.18)`;
      ctx.fillRect(x0, gy, L.boardW, 6);
      ctx.fillStyle = `rgba(${k > 0.4 ? th.warn : th.alert}, 0.95)`;
      ctx.fillRect(x0 + (L.boardW * (1 - k)) / 2, gy, L.boardW * k, 6);
    }

    this.effects.draw(ctx, L, th, now, g.rows);
    this.drawPopups(now, cfg.animations !== 0);
  }

  private drawPopups(now: number, bounce: boolean): void {
    const ctx = this.ctx;
    const L = this.layout!;
    this.popups = this.popups.filter((p) => now - p.born < POPUP_MS);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const k = (now - p.born) / POPUP_MS;
      const y = p.y - k * L.R * 1.2;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      // Apparition avec rebond.
      const s = !bounce ? 1 : k < 0.1 ? 0.5 + 0.7 * (k / 0.1) : k < 0.2 ? 1.2 - 0.2 * ((k - 0.1) / 0.1) : 1;
      ctx.save();
      ctx.translate(p.x, y);
      ctx.scale(s, s);
      ctx.translate(-p.x, -y);
      const big = Math.round(L.R * 1.1);
      ctx.font = `800 ${big}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, L.R * 0.16);
      ctx.strokeStyle = this.theme.popupStroke;
      ctx.fillStyle = this.theme.popupFill;
      ctx.strokeText(p.text, p.x, y);
      ctx.fillText(p.text, p.x, y);
      ctx.font = `700 ${Math.round(L.R * 0.45)}px -apple-system, system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeText(p.sub, p.x, y + big * 0.7);
      ctx.fillStyle = this.theme.popupSub;
      ctx.fillText(p.sub, p.x, y + big * 0.7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
