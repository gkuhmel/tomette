import { Grid, Tile } from './grid';
import { ColorLookup, wouldMatch } from './match';
import { Rng } from './rng';

export interface SpeedParams {
  baseSecondsPerRow: number;
  speedFactor: number;
  minSecondsPerRow: number;
  levelDurationS: number;
}

export function levelAt(p: SpeedParams, timeS: number): number {
  return 1 + Math.floor(timeS / Math.max(1e-6, p.levelDurationS));
}

export function secondsPerRow(p: SpeedParams, level: number): number {
  return Math.max(p.minSecondsPerRow, p.baseSecondsPerRow * Math.pow(p.speedFactor, level - 1));
}

/** Choisit une couleur qui ne crée aucun alignement en (c, r) (au hasard si impossible). */
function pickColor(rng: Rng, colors: number, lookup: ColorLookup, c: number, r: number): number {
  const allowed: number[] = [];
  for (let k = 0; k < colors; k++) if (!wouldMatch(lookup, c, r, k)) allowed.push(k);
  return allowed.length > 0 ? rng.pick(allowed) : rng.int(colors);
}

const gridLookup =
  (grid: Grid): ColorLookup =>
  (c, r) => {
    const t = grid.get(c, r);
    return t ? t.color : -1;
  };

/** Remplit `rowsToFill` rangées par le bas, sans aucun alignement. */
export function fillInitial(grid: Grid, rng: Rng, colors: number, rowsToFill: number): void {
  const lookup = gridLookup(grid);
  const top = Math.max(0, grid.rows - rowsToFill);
  for (let r = grid.rows - 1; r >= top; r--) {
    for (let c = 0; c < grid.cols; c++) {
      grid.place(c, r, pickColor(rng, colors, lookup, c, r));
    }
  }
}

/**
 * Lecture de la grille « comme si » elle était déjà montée d'une rangée,
 * la rangée d'aperçu occupant la dernière rangée.
 */
function shiftedLookup(grid: Grid, preview: readonly (Tile | null)[]): ColorLookup {
  return (c, r) => {
    if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return -1;
    if (r === grid.rows - 1) {
      const t = preview[c];
      return t ? t.color : -1;
    }
    const t = grid.get(c, r + 1);
    return t ? t.color : -1;
  };
}

/** Génère une rangée d'aperçu qui ne crée pas d'alignement avec la grille actuelle. */
export function generatePreview(grid: Grid, rng: Rng, colors: number): Tile[] {
  const preview: (Tile | null)[] = new Array(grid.cols).fill(null);
  const lookup = shiftedLookup(grid, preview);
  for (let c = 0; c < grid.cols; c++) {
    preview[c] = grid.makeTile(pickColor(rng, colors, lookup, c, grid.rows - 1));
  }
  return preview as Tile[];
}

/**
 * Active la rangée d'aperçu : tout monte d'une rangée, l'aperçu devient la dernière rangée.
 * La rangée du haut doit être vide. Les tuiles d'aperçu qui créeraient un alignement
 * (la grille a pu changer depuis leur génération) sont retirées au sort.
 */
export function activatePreview(grid: Grid, preview: Tile[], rng: Rng, colors: number): void {
  for (let r = 0; r < grid.rows - 1; r++) {
    for (let c = 0; c < grid.cols; c++) grid.set(c, r, grid.get(c, r + 1));
  }
  const last = grid.rows - 1;
  for (let c = 0; c < grid.cols; c++) grid.set(c, last, null);
  const lookup = gridLookup(grid);
  for (let c = 0; c < grid.cols; c++) {
    const t = preview[c];
    if (wouldMatch(lookup, c, last, t.color)) t.color = pickColor(rng, colors, lookup, c, last);
    grid.set(c, last, t);
  }
}
