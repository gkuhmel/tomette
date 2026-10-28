import { inBounds } from './hex';

export type TileState = 'idle' | 'swapping' | 'hovering' | 'falling' | 'clearing';

/**
 * normal ; cracked = tomette fêlée (ne s'aligne pas, réparée par un clear voisin) ;
 * sealed = tuile scellée (ne peut pas être échangée, libérée par un clear voisin) ;
 * joker = compte comme n'importe quelle couleur ;
 * mortar = morceau d'une dalle de mortier (ni échangée, ni alignée ; un clear
 * voisin transforme toute la dalle en tuiles normales).
 */
export type TileKind = 'normal' | 'cracked' | 'sealed' | 'joker' | 'mortar';

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
  /** Tomette d'or (née d'une rosace) : ne s'aligne pas, s'active par échange. */
  special: boolean;
  kind: TileKind;
  /** Dalle de mortier à laquelle appartient la tuile (0 = aucune). */
  slab: number;
  /** Cigale (née d'une farandole de 6) : quand elle disparaît, toute sa rangée disparaît avec elle. */
  cicada: boolean;
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
    return { id: this.nextId++, color, state: 'idle', timer: 0, fall: 0, chain: false, swapDc: 0, swapDr: 0, special: false, kind: 'normal', slab: 0, cicada: false };
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

  /** Une tuile occupe-t-elle la rangée du haut ? (`settled` : sans compter les tuiles en train de tomber) */
  topRowOccupied(settled = false): boolean {
    for (let c = 0; c < this.cols; c++) {
      const t = this.cells[c];
      if (t && !(settled && t.state === 'falling')) return true;
    }
    return false;
  }
}
