import { inBounds } from './hex';

export type TileState = 'idle' | 'swapping' | 'hovering' | 'falling' | 'clearing';

export interface Tile {
  id: number;
  color: number;
  state: TileState;
  /** Temps restant dans l'état courant (ms) : swapping, hovering, clearing. */
  timer: number;
  /** Fraction de case parcourue vers la case du dessous (falling). */
  fall: number;
  /** La tuile tombe à cause d'un clear : peut prolonger une chaîne. */
  chain: boolean;
  /** Décalage (en cases) d'où vient la tuile pendant un échange, pour l'animation. */
  swapDc: number;
  swapDr: number;
}

export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly cells: (Tile | null)[];
  private nextId = 1;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array<Tile | null>(cols * rows).fill(null);
  }

  inBounds(c: number, r: number): boolean {
    return inBounds(c, r, this.cols, this.rows);
  }

  get(c: number, r: number): Tile | null {
    if (!this.inBounds(c, r)) return null;
    return this.cells[r * this.cols + c];
  }

  set(c: number, r: number, t: Tile | null): void {
    if (!this.inBounds(c, r)) throw new Error(`hors grille : (${c}, ${r})`);
    this.cells[r * this.cols + c] = t;
  }

  makeTile(color: number): Tile {
    return { id: this.nextId++, color, state: 'idle', timer: 0, fall: 0, chain: false, swapDc: 0, swapDr: 0 };
  }

  /** Crée et pose une tuile idle. */
  place(c: number, r: number, color: number): Tile {
    const t = this.makeTile(color);
    this.set(c, r, t);
    return t;
  }

  find(id: number): { c: number; r: number; tile: Tile } | null {
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      if (t && t.id === id) return { c: i % this.cols, r: Math.floor(i / this.cols), tile: t };
    }
    return null;
  }

  forEach(fn: (t: Tile, c: number, r: number) => void): void {
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      if (t) fn(t, i % this.cols, Math.floor(i / this.cols));
    }
  }

  some(fn: (t: Tile, c: number, r: number) => boolean): boolean {
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      if (t && fn(t, i % this.cols, Math.floor(i / this.cols))) return true;
    }
    return false;
  }

  /** Une tuile occupe-t-elle la rangée du haut ? */
  topRowOccupied(): boolean {
    for (let c = 0; c < this.cols; c++) if (this.cells[c]) return true;
    return false;
  }
}
