import type { Attack } from '../core/duel';
import type { Game } from '../core/game';
import { cellCenter } from '../core/hex';
import { hexPath } from './sprites';
import type { Theme } from './theme';

/** Plateau miniature de l'adversaire (duel) : silhouette de la pile et dalles en approche. */
export function drawMini(canvas: HTMLCanvasElement, game: Game, theme: Theme, incoming: readonly Attack[]): void {
  const g = game.grid;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (!cssW || !cssH) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(cssW * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const top = 7;
  const R = Math.min(cssW / (1.5 * (g.cols - 1) + 2), (cssH - top) / ((g.rows + 0.5) * Math.sqrt(3)));
  const h = Math.sqrt(3) * R;
  const x0 = (cssW - R * (1.5 * (g.cols - 1) + 2)) / 2;
  const rise = game.riseOffset * h;
  // Fond et ligne de limite.
  ctx.fillStyle = theme.css['--surface'];
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x0, top, R * (1.5 * (g.cols - 1) + 2), (g.rows + 0.5) * h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = game.alert ? `rgb(${theme.alert})` : theme.css['--muted'];
  ctx.fillRect(x0, top - 1, R * (1.5 * (g.cols - 1) + 2), 1.5);
  g.forEach((t, c, r) => {
    const p = cellCenter(c, r, R);
    hexPath(ctx, x0 + p.x, top + p.y - rise + (t.state === 'falling' ? t.fall * h : 0), R * 0.92);
    ctx.fillStyle = t.kind === 'mortar' ? theme.mortar.base : game.nightLeft > 0 ? theme.mortar.speck : theme.tiles[t.color % theme.tiles.length];
    ctx.fill();
  });
  // Dalles en approche : petites barres grises au-dessus.
  let x = x0;
  for (const a of incoming.slice(0, 6)) {
    if (a.kind !== 'slab') {
      // Malus : petite pastille rouge.
      ctx.fillStyle = `rgb(${theme.alert})`;
      ctx.beginPath();
      ctx.arc(x + 2.5, 2.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      x += 7;
      continue;
    }
    const w = Math.max(4, (cssW - 2 * x0) * (a.w / g.cols) * 0.45);
    ctx.fillStyle = theme.mortar.base;
    ctx.fillRect(x, 0, w, 4 * a.h);
    ctx.strokeStyle = theme.mortar.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, w - 1, 4 * a.h - 1);
    x += w + 2;
  }
}
