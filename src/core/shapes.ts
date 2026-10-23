import { Cell, Dir, neighbor } from './hex';
import { Grid, Tile } from './grid';

/**
 * Formes de couleur qui ne contiennent jamais 3 tuiles en ligne (sinon l'alignement
 * les casserait avant qu'elles soient finies) :
 * - triangle : 3 tuiles voisines deux à deux ;
 * - losange : 2 triangles accolés (4 tuiles) ;
 * - arc : 4 voisines consécutives autour d'une tuile d'une autre couleur.
 */
export type ShapeKind = 'triangle' | 'losange' | 'arc';

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
  grid.forEach((_t, c, r) => {
    const here = { c, r };
    const ring = RING.map((d) => neighbor(c, r, d));
    if (kind === 'arc') {
      // Le centre doit exister et être d'une autre couleur.
      const center = grid.get(c, r)!;
      if (center.state !== 'idle') return;
      for (let i = 0; i < 6; i++) {
        const cells = [0, 1, 2, 3].map((k) => ring[(i + k) % 6]);
        const color = colorAt(cells[0]);
        if (color < 0 || color === center.color) continue;
        if (cells.every((x) => colorAt(x) === color)) push(cells, color);
      }
      return;
    }
    const color = colorAt(here);
    if (color < 0) return;
    for (let i = 0; i < 6; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % 6];
      if (colorAt(a) !== color || colorAt(b) !== color) continue;
      if (kind === 'triangle') {
        push([here, a, b], color);
        continue;
      }
      // Losange : le triangle (ici, a, b) et le triangle voisin de l'autre côté de (ici, b).
      const d = ring[(i + 2) % 6];
      if (colorAt(d) === color) push([here, a, b, d], color);
    }
  });
  return out;
}
