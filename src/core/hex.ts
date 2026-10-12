/**
 * Grille hexagonale flat-top, coordonnées décalées « odd-q » :
 * colonnes verticales, colonnes impaires décalées d'une demi-hauteur vers le bas.
 * (c, r) : c de gauche à droite, r de haut (0) en bas.
 */

export interface Cell {
  c: number;
  r: number;
}

export type Dir = 'up' | 'down' | 'upLeft' | 'downLeft' | 'upRight' | 'downRight';

export const ALL_DIRS: readonly Dir[] = ['up', 'down', 'upLeft', 'downLeft', 'upRight', 'downRight'];

/** Les 4 voisins avec lesquels un échange est autorisé. */
export const LATERAL_DIRS: readonly Dir[] = ['upLeft', 'downLeft', 'upRight', 'downRight'];

/** Les 3 axes d'alignement : [direction négative, direction positive]. */
export const AXES: readonly (readonly [Dir, Dir])[] = [
  ['up', 'down'], // vertical
  ['upLeft', 'downRight'], // diagonale A
  ['upRight', 'downLeft'], // diagonale B
];

const isOdd = (c: number): boolean => (c & 1) === 1;

/** Voisin dans une direction donnée (sans vérification des bords). */
export function neighbor(c: number, r: number, dir: Dir): Cell {
  const odd = isOdd(c);
  switch (dir) {
    case 'up':
      return { c, r: r - 1 };
    case 'down':
      return { c, r: r + 1 };
    case 'upLeft':
      return { c: c - 1, r: odd ? r : r - 1 };
    case 'downLeft':
      return { c: c - 1, r: odd ? r + 1 : r };
    case 'upRight':
      return { c: c + 1, r: odd ? r : r - 1 };
    case 'downRight':
      return { c: c + 1, r: odd ? r + 1 : r };
  }
}

export function inBounds(c: number, r: number, cols: number, rows: number): boolean {
  return c >= 0 && c < cols && r >= 0 && r < rows;
}

/** Voisins présents dans la grille, avec leur direction. */
export function neighbors(c: number, r: number, cols: number, rows: number): (Cell & { dir: Dir })[] {
  const out: (Cell & { dir: Dir })[] = [];
  for (const dir of ALL_DIRS) {
    const n = neighbor(c, r, dir);
    if (inBounds(n.c, n.r, cols, rows)) out.push({ ...n, dir });
  }
  return out;
}

/** Direction de (c1,r1) vers (c2,r2) si les cases sont adjacentes, sinon null. */
export function directionTo(c1: number, r1: number, c2: number, r2: number): Dir | null {
  for (const dir of ALL_DIRS) {
    const n = neighbor(c1, r1, dir);
    if (n.c === c2 && n.r === r2) return dir;
  }
  return null;
}

export function isLateralNeighbor(c1: number, r1: number, c2: number, r2: number): boolean {
  const d = directionTo(c1, r1, c2, r2);
  return d !== null && LATERAL_DIRS.includes(d);
}

// ---------------------------------------------------------------------------
// Géométrie (pixels), pour un rayon R. Origine : coin haut-gauche de la case (0,0).

export const SQRT3 = Math.sqrt(3);

export function cellHeight(R: number): number {
  return SQRT3 * R;
}

/** Centre de la case (c, r) en pixels. */
export function cellCenter(c: number, r: number, R: number): { x: number; y: number } {
  const h = SQRT3 * R;
  return { x: R + c * 1.5 * R, y: h / 2 + r * h + (isOdd(c) ? h / 2 : 0) };
}

/** Case contenant le point (x, y) — hit-test hexagonal exact. */
export function pixelToCell(x: number, y: number, R: number): Cell {
  // Passage en coordonnées axiales (origine au centre de (0,0)).
  const px = x - R;
  const py = y - (SQRT3 * R) / 2;
  const q = ((2 / 3) * px) / R;
  const ra = ((-1 / 3) * px + (SQRT3 / 3) * py) / R;
  // Arrondi cubique.
  const xs = q;
  const zs = ra;
  const ys = -xs - zs;
  let rx = Math.round(xs);
  const ry = Math.round(ys);
  let rz = Math.round(zs);
  const dx = Math.abs(rx - xs);
  const dy = Math.abs(ry - ys);
  const dz = Math.abs(rz - zs);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  // Axial → odd-q.
  const c = rx;
  const r = rz + (c - (c & 1)) / 2;
  return { c, r };
}
