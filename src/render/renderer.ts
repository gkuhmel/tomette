import type { Game } from '../core/game';
import { cellCenter, neighbor } from '../core/hex';
import { Layout } from './layout';
import { Key, t } from '../i18n';
import { Effects, roundRect } from './effects';
import { GOLD, hexPath, JOKER, MORTAR, SpriteCache, Variant } from './sprites';
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
  /** Indication du tutoriel : tuile à déplacer et destination. */
  hint: { from: { c: number; r: number }; to: { c: number; r: number } } | null = null;
  private theme: Theme = themeFor(0);
  private cols = 0;
  private rows = 0;
  private previewId = -1;
  private previewBorn = 0;
  private activatedIds = new Set<number>();
  private activatedAt = 0;
  /** Morceaux de mortier vus à l'image précédente, et instant où une dalle s'est transformée. */
  private mortarIds = new Set<number>();
  private crumbledAt = new Map<number, number>();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Change de thème (sprites et plateau redessinés). Renvoie true si le thème a changé. */
  setTheme(theme: Theme): boolean {
    if (theme === this.theme) return false;
    this.theme = theme;
    this.sprites.setTheme(theme);
    if (this.layout) this.boardBg = this.renderBoardBg(this.layout, this.cols, this.rows);
    return true;
  }

  /** Change de jeu de pictogrammes. Renvoie true s'il a changé. */
  setGlyphs(set: number): boolean {
    if (set === this.sprites.glyphs) return false;
    this.sprites.setGlyphs(set);
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

  /** Fond du plateau : un voile clair qui calme le sol de la page, et la ligne de limite de hauteur en haut. */
  private renderBoardBg(L: Layout, _cols: number, _rows: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.ceil(L.boardW * L.dpr) + 2;
    c.height = Math.ceil(L.boardH * L.dpr) + 2;
    const ctx = c.getContext('2d')!;
    ctx.scale(L.dpr, L.dpr);
    ctx.fillStyle = this.theme.css['--surface'];
    ctx.globalAlpha = 0.45;
    roundRect(ctx, 0, 0, L.boardW, L.boardH, Math.min(18, L.R * 0.6));
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this.theme.css['--muted'];
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(2, 1);
    ctx.lineTo(L.boardW - 2, 1);
    ctx.stroke();
    return c;
  }

  /** Convertit les évènements de clear en textes flottants. */
  consumeEvents(game: Game, now: number): void {
    const L = this.layout;
    if (!L) {
      game.events.length = 0;
      game.notices.length = 0;
      return;
    }
    for (const e of game.events) {
      if (e.kind !== 'clear') continue;
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
      if (e.chain < 2 && e.size < 4 && !e.rosaces && !e.gold && e.shape !== 'losange') continue;
      this.popups.push({
        text: e.rosaces ? t('pop.rosace') : e.gold ? t('pop.gold') : e.shape === 'losange' ? t('pop.losange') : e.chain >= 2 ? `×${e.chain}` : `${e.size}`,
        sub: e.rosaces
          ? e.chain >= 2 ? t('pop.chainN', { n: e.chain }) : `+${e.points}`
          : e.gold ? t('pop.goldTiles', { n: e.size - 1 })
          : e.chain >= 2 && e.size >= 4 ? t('pop.comboN', { n: e.size }) : e.chain >= 2 ? t('pop.chain') : t('pop.combo'),
        x,
        y,
        born: now,
      });
    }
    game.events.length = 0;
    // Annonces de duel : au milieu du plateau.
    for (const n of game.notices) {
      this.popups.push({ text: t(`pop.${n}` as Key), sub: '', x: L.x0 + L.boardW / 2, y: L.y0 + L.boardH * 0.4, born: now });
    }
    game.notices.length = 0;
  }

  draw(game: Game, heldId: number | null, now: number): void {
    const L = this.layout;
    if (!L || !this.boardBg) return;
    const ctx = this.ctx;
    const { R, h, x0, y0, dpr } = L;
    const cfg = game.cfg;
    const g = game.grid;

    const th = this.theme;
    // Canvas transparent : le fond de page (dégradé et sol en tomettes) reste visible autour du plateau.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      // Bande dégradée sous la ligne de limite, au-dessus des colonnes menacées.
      const rgb = danger === 2 ? th.alert : th.warn;
      const grad = ctx.createLinearGradient(0, y0, 0, y0 + warnRows * h);
      grad.addColorStop(0, `rgba(${rgb}, ${a * 2.2})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = grad;
      for (let c = 0; c < g.cols; c++) {
        if (!cols[c]) continue;
        const p = cellCenter(c, 0, R);
        ctx.fillRect(x0 + p.x - R * 0.78, y0, R * 1.56, warnRows * h);
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
      const px = x0 + p.x - half;
      const py = y0 + p.y - rise - half;
      ctx.drawImage(this.sprites.get(t.kind === 'joker' ? JOKER : t.color, 'dim'), px, py, size, size);
      if (t.kind === 'cracked' || t.kind === 'sealed') {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * 0.55;
        ctx.drawImage(this.sprites.overlay(t.kind), px, py, size, size);
        ctx.globalAlpha = a;
      }
    }
    ctx.globalAlpha = 1;
    const activating = Math.max(0, 1 - (now - this.activatedAt) / ACTIVATE_FADE_MS);

    // Morceaux de mortier vus à cette image ; ceux qui ont disparu de la liste viennent de se transformer.
    const seen = new Set<number>();
    g.forEach((t) => {
      if (t.kind === 'mortar') seen.add(t.id);
      else if (this.mortarIds.has(t.id)) this.crumbledAt.set(t.id, now);
    });
    this.mortarIds = seen;
    for (const [id, at] of this.crumbledAt) if (now - at > 450) this.crumbledAt.delete(id);

    // Nuit tombée (duel) : les tuiles posées perdent leur couleur.
    const lit: Variant = game.nightLeft > 0 ? 'night' : 'normal';
    let held: { x: number; y: number } | null = null;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const t = g.get(c, r);
        if (!t) continue;
        const color = t.special ? GOLD : t.kind === 'joker' ? JOKER : t.kind === 'mortar' ? MORTAR : t.color;
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
            ctx.drawImage(this.sprites.get(color, flash ? 'flash' : lit), x - half, y - half, size, size);
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
          ctx.drawImage(this.sprites.get(color, lit), x - sz / 2, y - sz / 2, sz, sz);
        } else {
          const sq = this.effects.squash(t.id, now);
          if (sq) {
            // Écrasé à l'atterrissage, posé sur sa base.
            const w = size * sq.sx;
            const hh = size * sq.sy;
            ctx.drawImage(this.sprites.get(color, lit), x - w / 2, y + half - hh, w, hh);
          } else {
            ctx.drawImage(this.sprites.get(color, lit), x - half, y - half, size, size);
          }
        }
        const crumbled = this.crumbledAt.get(t.id);
        if (crumbled !== undefined) {
          // Dalle transformée : la tuile neuve sort d'un éclat blanc.
          ctx.globalAlpha = Math.max(0, 1 - (now - crumbled) / 450);
          ctx.drawImage(this.sprites.get(color, 'flash'), x - half, y - half, size, size);
          ctx.globalAlpha = 1;
        }
        if (t.kind === 'cracked' || t.kind === 'sealed') {
          const sz = t.id === heldId ? size * 1.1 : size;
          ctx.drawImage(this.sprites.overlay(t.kind), x - sz / 2, y - sz / 2, sz, sz);
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

    // Campagne : ligne d'arrivée droite en damier, et tuiles encore au-dessus (à vider) entourées.
    if (game.goalRows > 0 && game.lineRows >= 0) {
      const k = game.lineRows;
      const top = g.rows - k;
      const pulse = 0.75 + 0.25 * Math.sin(now * 0.006);
      ctx.lineWidth = Math.max(2.5, R * 0.16);
      ctx.strokeStyle = `rgba(235, 110, 20, ${pulse})`;
      g.forEach((t, c, r) => {
        if (r >= top || t.state === 'clearing') return;
        const p = cellCenter(c, r, R);
        hexPath(ctx, x0 + p.x, y0 + p.y - rise + (t.state === 'falling' ? t.fall * h : 0), R * 0.9);
        ctx.stroke();
      });
      const y = y0 + top * h - rise + h * 0.25;
      if (y < y0 + L.boardH + h) {
        const band = Math.max(8, R * 0.34);
        const sq = band / 2;
        const left = x0 - R * 0.15;
        const right = x0 + L.boardW + R * 0.15;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, left, y - band / 2, right - left, band, 3);
        ctx.fill();
        ctx.restore();
        ctx.save();
        roundRect(ctx, left, y - band / 2, right - left, band, 3);
        ctx.clip();
        ctx.fillStyle = '#1d2a44';
        for (let i = 0; left + i * sq < right; i++) {
          ctx.fillRect(left + i * sq, y - band / 2 + (i % 2) * sq, sq, sq);
        }
        ctx.restore();
        // Étiquette au centre.
        const label = t('camp.finish');
        ctx.font = `900 ${Math.round(Math.max(11, R * 0.42))}px Nunito, system-ui, sans-serif`;
        const w = ctx.measureText(label).width + R * 0.8;
        const lh = Math.max(18, R * 0.7);
        const cx = x0 + L.boardW / 2;
        ctx.fillStyle = th.css['--primary'] ?? '#1d2a44';
        roundRect(ctx, cx - w / 2, y - lh / 2, w, lh, lh / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, y + 1);
      }
    }

    // Dalles de mortier : un joint relie les morceaux voisins d'une même dalle, pour qu'elle se lise d'un bloc.
    const centerOf = (c: number, r: number) => {
      const t = g.get(c, r)!;
      const p = cellCenter(c, r, R);
      return { x: x0 + p.x, y: y0 + p.y - rise + (t.state === 'falling' ? t.fall * h : 0) };
    };
    ctx.lineCap = 'round';
    for (const [color, width] of [[th.mortar.edge, 0.62], [th.mortar.base, 0.46]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = R * width;
      ctx.beginPath();
      g.forEach((t, c, r) => {
        if (t.kind !== 'mortar') return;
        for (const dir of ['down', 'downRight', 'upRight'] as const) {
          const n = neighbor(c, r, dir);
          const u = g.get(n.c, n.r);
          if (!u || u.kind !== 'mortar' || u.slab !== t.slab) continue;
          const a = centerOf(c, r);
          const b = centerOf(n.c, n.r);
          // Le joint s'arrête avant les centres : on voit deux pièces scellées l'une à l'autre.
          ctx.moveTo(a.x + (b.x - a.x) * 0.28, a.y + (b.y - a.y) * 0.28);
          ctx.lineTo(a.x + (b.x - a.x) * 0.72, a.y + (b.y - a.y) * 0.72);
        }
      });
      ctx.stroke();
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
      const gy = y0 - 10;
      ctx.fillStyle = `rgba(${th.alert}, 0.18)`;
      ctx.fillRect(x0, gy, L.boardW, 6);
      ctx.fillStyle = `rgba(${k > 0.4 ? th.warn : th.alert}, 0.95)`;
      ctx.fillRect(x0 + (L.boardW * (1 - k)) / 2, gy, L.boardW * k, 6);
    }

    if (this.hint) this.drawHint(now, rise);
    this.effects.draw(ctx, L, th, now, g.rows);
    this.drawPopups(now, cfg.animations !== 0);
  }

  private drawHint(now: number, rise: number): void {
    const L = this.layout!;
    const ctx = this.ctx;
    const { from, to } = this.hint!;
    const a = cellCenter(from.c, from.r, L.R);
    const b = cellCenter(to.c, to.r, L.R);
    const ax = L.x0 + a.x;
    const ay = L.y0 + a.y - rise;
    const bx = L.x0 + b.x;
    const by = L.y0 + b.y - rise;
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
    ctx.save();
    ctx.strokeStyle = this.theme.held;
    ctx.lineWidth = 3 + pulse * 2;
    hexPath(ctx, ax, ay, L.R * (1.02 + pulse * 0.08));
    ctx.stroke();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    hexPath(ctx, bx, by, L.R * 0.95);
    ctx.stroke();
    ctx.setLineDash([]);
    // Flèche qui glisse de la tuile vers la destination.
    const k = (now % 1200) / 1200;
    const t = Math.min(1, k * 1.4);
    const cx = ax + (bx - ax) * t;
    const cy = ay + (by - ay) * t;
    ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    ctx.fillStyle = this.theme.held;
    ctx.beginPath();
    ctx.arc(cx, cy, L.R * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
