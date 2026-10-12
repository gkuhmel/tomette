import { Grid } from './grid';

/** Marque comme « chain » toutes les tuiles au-dessus de (c, r) dans sa colonne. */
export function markChainAbove(grid: Grid, c: number, r: number): void {
  for (let y = r - 1; y >= 0; y--) {
    const t = grid.get(c, y);
    if (t && t.state !== 'clearing') t.chain = true;
  }
}

/** Une chaîne est en cours tant qu'une tuile chain est en l'air ou en train de disparaître. */
export function chainInProgress(grid: Grid): boolean {
  return grid.some(
    (t) => t.chain && (t.state === 'hovering' || t.state === 'falling' || t.state === 'clearing'),
  );
}

export interface PauseParams {
  chainPauseBaseS: number;
  chainPausePerLinkS: number;
  comboPausePerExtraTileS: number;
}

/** Durée de stop time (s) déclenchée par un clear de `size` tuiles au rang de chaîne `chain`. */
export function stopTimeFor(p: PauseParams, chain: number, size: number): number {
  const chainPause = chain >= 2 ? p.chainPauseBaseS + p.chainPausePerLinkS * (chain - 1) : 0;
  const comboPause = size >= 4 ? p.comboPausePerExtraTileS * (size - 3) : 0;
  return Math.max(chainPause, comboPause);
}

export interface ScoreParams {
  pointsPerTile: number;
  comboBonusPerExtraTile: number;
}

export function pointsFor(p: ScoreParams, chain: number, size: number): number {
  const base = p.pointsPerTile * size + (size >= 4 ? p.comboBonusPerExtraTile * (size - 3) : 0);
  return base * chain;
}
