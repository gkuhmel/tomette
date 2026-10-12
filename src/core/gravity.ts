import { Grid, Tile } from './grid';

export interface GravityParams {
  hoverMs: number;
  fallCellsPerSecond: number;
}

/** Une tuile en (c, r) est-elle soutenue ? (bas de grille, ou tuile stable dessous) */
export function isSupported(grid: Grid, c: number, r: number): boolean {
  if (r >= grid.rows - 1) return true;
  const below = grid.get(c, r + 1);
  return below !== null && below.state !== 'hovering' && below.state !== 'falling';
}

/**
 * Un pas de gravité. Parcours de bas en haut pour que les piles tombent ensemble.
 * Renvoie les tuiles qui viennent d'atterrir (redevenues idle).
 */
export function stepGravity(grid: Grid, p: GravityParams, dtMs: number): Tile[] {
  const landed: Tile[] = [];
  const step = (dtMs / 1000) * p.fallCellsPerSecond;

  for (let c = 0; c < grid.cols; c++) {
    for (let r = grid.rows - 1; r >= 0; r--) {
      const t = grid.get(c, r);
      if (!t) continue;

      if (t.state === 'idle') {
        if (isSupported(grid, c, r)) continue;
        const below = grid.get(c, r + 1);
        if (below && below.state === 'falling') {
          // Une pile qui tombe entraîne immédiatement ce qui est posé dessus.
          t.state = 'falling';
          t.fall = below.fall;
        } else {
          t.state = 'hovering';
          t.timer = below && below.state === 'hovering' ? below.timer : p.hoverMs;
        }
        continue;
      }

      if (t.state === 'hovering') {
        t.timer -= dtMs;
        if (t.timer <= 0) {
          t.state = 'falling';
          t.timer = 0;
          t.fall = 0;
        }
        continue;
      }

      if (t.state === 'falling') {
        t.fall += step;
        let row = r;
        while (t.fall >= 1 && row + 1 < grid.rows && grid.get(c, row + 1) === null) {
          grid.set(c, row, null);
          row++;
          grid.set(c, row, t);
          t.fall -= 1;
        }
        const below = row + 1 < grid.rows ? grid.get(c, row + 1) : null;
        if (row + 1 >= grid.rows || (below && below.state !== 'falling')) {
          if (below && below.state === 'hovering') {
            t.state = 'hovering';
            t.timer = below.timer;
          } else {
            t.state = 'idle';
            landed.push(t);
          }
          t.fall = 0;
        } else if (below) {
          // Bloquée par une tuile qui tombe : ne pas la chevaucher.
          t.fall = Math.min(t.fall, below.fall);
        }
      }
    }
  }
  return landed;
}
