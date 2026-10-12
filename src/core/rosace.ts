import { ALL_DIRS, Cell, neighbor } from './hex';
import { Grid } from './grid';

export interface Rosace {
  center: Cell;
  ring: Cell[];
  color: number;
}

/**
 * Rosace : au moins `min` des 6 voisines d'une tuile sont des tuiles idle d'une
 * même couleur, et la tuile centrale (idle) est d'une autre couleur (ou une
 * tomette d'or). Avec min = 5, une case manquante (vide, autre couleur ou hors
 * grille) est tolérée : la rosace est possible contre un bord.
 */
export function findRosaces(grid: Grid, min = 6): Rosace[] {
  const need = Math.min(6, Math.max(4, Math.round(min)));
  const out: Rosace[] = [];
  grid.forEach((center, c, r) => {
    if (center.state !== 'idle') return;
    const byColor = new Map<number, Cell[]>();
    for (const dir of ALL_DIRS) {
      const n = neighbor(c, r, dir);
      const t = grid.get(n.c, n.r);
      if (!t || t.state !== 'idle' || t.special) continue;
      const list = byColor.get(t.color) ?? [];
      list.push(n);
      byColor.set(t.color, list);
    }
    for (const [color, ring] of byColor) {
      if (ring.length < need) continue;
      if (!center.special && center.color === color) continue;
      out.push({ center: { c, r }, ring, color });
    }
  });
  return out;
}
