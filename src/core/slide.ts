import { Grid, Tile } from './grid';
import { neighbor } from './hex';

/**
 * Éboulement : la tuile du sommet d'une pile glisse en biais vers une colonne
 * voisine nettement plus basse, comme du sable. Compense le fait que les
 * colonnes du bord, qui ont moins de lignes possibles, montent plus vite.
 *
 * Une tuile glisse si :
 *  - elle est posée (idle), sans tuile au-dessus, ni scellée ;
 *  - la case en biais vers le bas (bas-gauche ou bas-droite) est vide, ainsi
 *    que les `minDrop - 1` cases en dessous dans cette colonne.
 * Si les deux côtés conviennent : le côté où la chute est la plus grande,
 * puis le côté du centre.
 */
export interface SlideMove {
  tile: Tile;
  from: { c: number; r: number };
  to: { c: number; r: number };
}

/** Nombre de cases vides à partir de (c, r) vers le bas dans la colonne c. */
function emptyRun(grid: Grid, c: number, r: number): number {
  let n = 0;
  while (grid.inBounds(c, r + n) && grid.get(c, r + n) === null) n++;
  return n;
}

export function findSlides(grid: Grid, minDrop: number): SlideMove[] {
  const need = Math.max(1, Math.round(minDrop));
  const moves: SlideMove[] = [];
  const mid = (grid.cols - 1) / 2;
  for (let c = 0; c < grid.cols; c++) {
    // Sommet de la colonne.
    let r = 0;
    while (r < grid.rows && grid.get(c, r) === null) r++;
    if (r >= grid.rows) continue;
    const t = grid.get(c, r)!;
    if (t.state !== 'idle' || t.kind === 'sealed') continue;
    let best: { c: number; r: number; drop: number } | null = null;
    for (const dir of ['downLeft', 'downRight'] as const) {
      const n = neighbor(c, r, dir);
      if (!grid.inBounds(n.c, n.r)) continue;
      const drop = emptyRun(grid, n.c, n.r);
      if (drop < need) continue;
      const better =
        !best || drop > best.drop || (drop === best.drop && Math.abs(n.c - mid) < Math.abs(best.c - mid));
      if (better) best = { c: n.c, r: n.r, drop };
    }
    if (best) moves.push({ tile: t, from: { c, r }, to: { c: best.c, r: best.r } });
  }
  return moves;
}
