import { AXES, Cell, neighbor } from './hex';
import { Grid } from './grid';

/**
 * Détecte toutes les séries de ≥ 3 tuiles idle de même couleur sur les 3 axes.
 * Renvoie l'union des cases concernées (une case n'apparaît qu'une fois),
 * ce qui forme un seul « clear » (L, Y, croix compris).
 */
export function findMatches(grid: Grid): Cell[] {
  const hit = new Uint8Array(grid.cols * grid.rows);
  const colorAt = (c: number, r: number): number => {
    const t = grid.get(c, r);
    return t && t.state === 'idle' ? t.color : -1;
  };

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const color = colorAt(c, r);
      if (color < 0) continue;
      for (const [back, fwd] of AXES) {
        // Ne démarrer qu'en début de série.
        const p = neighbor(c, r, back);
        if (colorAt(p.c, p.r) === color) continue;
        const run: Cell[] = [{ c, r }];
        let n = neighbor(c, r, fwd);
        while (colorAt(n.c, n.r) === color) {
          run.push(n);
          n = neighbor(n.c, n.r, fwd);
        }
        if (run.length >= 3) for (const k of run) hit[k.r * grid.cols + k.c] = 1;
      }
    }
  }

  const out: Cell[] = [];
  for (let i = 0; i < hit.length; i++) if (hit[i]) out.push({ c: i % grid.cols, r: Math.floor(i / grid.cols) });
  return out;
}

/** Couleur d'une case pour la génération (-1 = vide / hors grille). */
export type ColorLookup = (c: number, r: number) => number;

/** Poser `color` en (c, r) créerait-il une série de ≥ 3 sur l'un des axes ? */
export function wouldMatch(lookup: ColorLookup, c: number, r: number, color: number): boolean {
  for (const [back, fwd] of AXES) {
    let count = 1;
    for (const dir of [back, fwd]) {
      let n = neighbor(c, r, dir);
      while (lookup(n.c, n.r) === color) {
        count++;
        n = neighbor(n.c, n.r, dir);
      }
    }
    if (count >= 3) return true;
  }
  return false;
}
