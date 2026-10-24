import { Cell, Dir, neighbor } from './hex';
import { Grid, Tile } from './grid';

/**
 * Formes de couleur qui ne contiennent jamais 3 tuiles en ligne (sinon l'alignement
 * les casserait avant qu'elles soient finies) :
 * - triangle : 3 tuiles voisines deux à deux ;
 * - arc : 4 voisines consécutives autour d'une case vide ou d'une tuile d'une autre couleur.
 */
export type ShapeKind = 'triangle' | 'arc';

export interface Shape {
  kind: ShapeKind;
  color: number;
  cells: Cell[];
}

/** Voisins dans l'ordre du tour (sens horaire, en partant du haut). */
export const RING: readonly Dir[] = ['up', 'upRight', 'downRight', 'down', 'downLeft', 'upLeft'];

/** Couleur « de forme » d'une tuile (-1 : ne compte pas). */
function shapeColor(t: Tile | null): number {
  if (!t || t.state !== 'idle' || t.special || t.kind !== 'normal') return -1;
  return t.color;
}

const key = (grid: Grid, c: Cell) => c.r * grid.cols + c.c;

/**
 * Formes présentes dans la grille. `fresh` : identifiants des tuiles qui viennent
 * de bouger ; une forme n'est retenue que si elle en contient au moins une
 * (une nouvelle rangée qui monte ne déclenche rien toute seule).
 */
export function findShapes(grid: Grid, kind: ShapeKind, fresh: ReadonlySet<number> | null): Shape[] {
  const out: Shape[] = [];
  const seen = new Set<string>();
  const colorAt = (c: Cell) => (grid.inBounds(c.c, c.r) ? shapeColor(grid.get(c.c, c.r)) : -1);
  const push = (cells: Cell[], color: number) => {
    if (fresh && !cells.some((c) => fresh.has(grid.get(c.c, c.r)!.id))) return;
    const id = cells.map((c) => key(grid, c)).sort((a, b) => a - b).join(',');
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ kind, color, cells });
  };
  // Arc : autour de n'importe quelle case, même vide (une « coupe » en haut de la pile).
  if (kind === 'arc') {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const center = grid.get(c, r);
        if (center && center.state !== 'idle') continue;
        const ring = RING.map((d) => neighbor(c, r, d));
        for (let i = 0; i < 6; i++) {
          const cells = [0, 1, 2, 3].map((k) => ring[(i + k) % 6]);
          const color = colorAt(cells[0]);
          if (color < 0 || (center && color === center.color)) continue;
          if (cells.every((x) => colorAt(x) === color)) push(cells, color);
        }
      }
    }
    return out;
  }
  grid.forEach((_t, c, r) => {
    const here = { c, r };
    const ring = RING.map((d) => neighbor(c, r, d));
    const color = colorAt(here);
    if (color < 0) return;
    for (let i = 0; i < 6; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % 6];
      if (colorAt(a) !== color || colorAt(b) !== color) continue;
      push([here, a, b], color);
    }
  });
  return out;
}
