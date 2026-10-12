import { SQRT3 } from '../core/hex';

export interface Layout {
  /** Rayon d'un hexagone (px CSS). */
  R: number;
  /** Hauteur d'une case (px CSS). */
  h: number;
  /** Origine de la grille (coin haut-gauche de la case (0,0)) dans le canvas. */
  x0: number;
  y0: number;
  boardW: number;
  /** Hauteur de la zone jouable (sans la rangée d'aperçu). */
  boardH: number;
  cssW: number;
  cssH: number;
  dpr: number;
}

const PAD = 6;

/** R est le plus grand possible : 7 colonnes sur toute la largeur, en tenant aussi dans la hauteur. */
export function computeLayout(cssW: number, cssH: number, cols: number, rows: number, dpr: number): Layout {
  const rW = (cssW - 2 * PAD) / (1.5 * (cols - 1) + 2);
  // rows + demi-case des colonnes impaires + rangée d'aperçu.
  const rH = (cssH - 2 * PAD) / ((rows + 1.5) * SQRT3);
  const R = Math.max(4, Math.min(rW, rH));
  const h = SQRT3 * R;
  const boardW = R * (1.5 * (cols - 1) + 2);
  return {
    R,
    h,
    x0: (cssW - boardW) / 2,
    y0: PAD,
    boardW,
    boardH: (rows + 0.5) * h,
    cssW,
    cssH,
    dpr,
  };
}
