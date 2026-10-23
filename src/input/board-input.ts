import type { Game } from '../core/game';
import { isLateralNeighbor, pixelToCell } from '../core/hex';
import type { Layout } from '../render/layout';

/**
 * Geste « glisser-tenir » : le doigt prend une tuile, puis chaque entrée dans
 * l'hexagone d'un voisin latéral déclenche un échange ; la prise suit la tuile.
 */
export class BoardInput {
  /** Id de la tuile tenue. */
  heldId: number | null = null;
  private pointerId: number | null = null;
  private fx = 0;
  private fy = 0;
  /** Dernier appui (pour le double-tap de la carte Carreau). */
  private lastTap = { c: -1, r: -1, at: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private getGame: () => Game | null,
    private getLayout: () => Layout | null,
  ) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
  }

  release(): void {
    this.heldId = null;
    this.pointerId = null;
  }

  private local(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.fx = e.clientX - rect.left;
    this.fy = e.clientY - rect.top;
  }

  /** Case sous le doigt (coordonnées logiques), ou null. */
  private fingerCell(): { c: number; r: number } | null {
    const game = this.getGame();
    const L = this.getLayout();
    if (!game || !L) return null;
    const cell = pixelToCell(this.fx - L.x0, this.fy - L.y0 + game.riseOffset * L.h, L.R);
    return game.grid.inBounds(cell.c, cell.r) ? cell : null;
  }

  private onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.pointerId !== null) return;
    const game = this.getGame();
    if (!game || game.over) return;
    this.local(e);
    const cell = this.fingerCell();
    if (!cell) return;
    const t = game.grid.get(cell.c, cell.r);
    if (!t || t.state === 'clearing') return;
    // Double-tap sur la même case : tir (carte Carreau), s'il en reste.
    const now = performance.now();
    if (game.shots > 0 && this.lastTap.c === cell.c && this.lastTap.r === cell.r && now - this.lastTap.at < 320) {
      this.lastTap.at = 0;
      if (game.shoot(cell.c, cell.r)) {
        e.preventDefault();
        return;
      }
    }
    this.lastTap = { c: cell.c, r: cell.r, at: now };
    this.pointerId = e.pointerId;
    this.heldId = t.id;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignoré */
    }
    e.preventDefault();
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.local(e);
    // Tentative immédiate (réactivité), puis à chaque tick tant que le doigt reste là.
    this.update();
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  };

  /** Appelé à chaque tick logique. */
  update(): void {
    if (this.heldId === null) return;
    const game = this.getGame();
    if (!game) return;
    const pos = game.grid.find(this.heldId);
    if (!pos || pos.tile.state === 'clearing') {
      this.release();
      return;
    }
    const cell = this.fingerCell();
    if (!cell || (cell.c === pos.c && cell.r === pos.r)) return;
    if (isLateralNeighbor(pos.c, pos.r, cell.c, cell.r)) game.trySwap(pos.c, pos.r, cell.c, cell.r);
  }
}
