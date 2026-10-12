import { ALL_DIRS, Cell, neighbor } from './hex';
import { Grid } from './grid';

export interface Rosace {
  center: Cell;
  ring: Cell[];
  color: number;
}

/**
 * Rosace : les 6 voisines d'une tuile sont des tuiles idle de même couleur,
 * et la tuile centrale (idle) est d'une autre couleur (ou une tomette d'or).
 * Impossible au bord de la grille.
 */
export function findRosaces(grid: Grid): Rosace[] {
  const out: Rosace[] = [];
  grid.forEach((center, c, r) => {
    if (center.state !== 'idle') return;
    const ring: Cell[] = [];
    let color = -1;
    for (const dir of ALL_DIRS) {
      const n = neighbor(c, r, dir);
      const t = grid.get(n.c, n.r);
      if (!t || t.state !== 'idle' || t.special) return;
      if (color < 0) color = t.color;
      else if (t.color !== color) return;
      ring.push(n);
    }
    if (!center.special && center.color === color) return;
    out.push({ center: { c, r }, ring, color });
  });
  return out;
}
