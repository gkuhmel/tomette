import { Cell, Dir, neighbor } from './hex';
import { Grid, Tile } from './grid';

/**
 * Formes de couleur qui ne contiennent jamais 3 tuiles en ligne (sinon l'alignement
 * les casserait avant qu'elles soient finies) :
 * - triangle : 3 tuiles voisines deux à deux ;
 * - arc : 4 voisines consécutives autour d'une case vide ou d'une tuile d'une autre couleur.
 */
export type ShapeKind = 'triangle' | 'arc';

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
  // Arc : autour de n'importe quelle case, même vide (une « coupe » en haut de la pile).
  if (kind === 'arc') {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const center = grid.get(c, r);
        if (center && center.state !== 'idle') continue;
        const ring = RING.map((d) => neighbor(c, r, d));
        for (let i = 0; i < 6; i++) {
          const cells = [0, 1, 2, 3].map((k) => ring[(i + k) % 6]);
          const color = colorAt(cells[0]);
          if (color < 0 || (center && color === center.color)) continue;
          if (cells.every((x) => colorAt(x) === color)) push(cells, color);
        }
      }
    }
    return out;
  }
  grid.forEach((_t, c, r) => {
    const here = { c, r };
    const ring = RING.map((d) => neighbor(c, r, d));
    const color = colorAt(here);
    if (color < 0) return;
    for (let i = 0; i < 6; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % 6];
      if (colorAt(a) !== color || colorAt(b) !== color) continue;
      push([here, a, b], color);
    }
  });
  return out;
}

/** Farandole : 5 tuiles ou plus d'une même couleur qui se suivent en file. */
export interface Farandole {
  color: number;
  /** Cases dans l'ordre de la file, d'un bout à l'autre. */
  cells: Cell[];
}

/**
 * Farandoles présentes dans la grille : un groupe de tuiles d'une même couleur, reliées
 * l'une à l'autre en file, sans embranchement ni boucle (chaque tuile touche au plus
 * deux tuiles du groupe), d'au moins `min` tuiles. Comme pour les autres formes, le
 * groupe doit contenir une tuile qui vient de bouger (`moved`).
 */
export function findFarandoles(grid: Grid, moved: ReadonlySet<number>, min = 5): Farandole[] {
  const out: Farandole[] = [];
  const colorAt = (c: number, r: number) => (grid.inBounds(c, r) ? shapeColor(grid.get(c, r)) : -1);
  // Un joker posé compte pour n'importe quelle couleur, comme dans un alignement.
  const isJoker = (c: number, r: number) => {
    const t = grid.inBounds(c, r) ? grid.get(c, r) : null;
    return !!t && t.kind === 'joker' && t.state === 'idle' && !t.special;
  };
  const colors = new Set<number>();
  grid.forEach((_t, c, r) => {
    const k = colorAt(c, r);
    if (k >= 0) colors.add(k);
  });
  for (const color of colors) {
    const fits = (c: number, r: number) => colorAt(c, r) === color || isJoker(c, r);
    const seen = new Set<number>();
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        // Chaque groupe part d'une vraie tuile de la couleur (pas d'un joker seul).
        if (colorAt(c, r) !== color || seen.has(key(grid, { c, r }))) continue;
        const group: Cell[] = [];
        const stack: Cell[] = [{ c, r }];
        seen.add(key(grid, { c, r }));
        while (stack.length) {
          const cur = stack.pop()!;
          group.push(cur);
          for (const d of RING) {
            const n = neighbor(cur.c, cur.r, d);
            if (!fits(n.c, n.r) || seen.has(key(grid, n))) continue;
            seen.add(key(grid, n));
            stack.push(n);
          }
        }
        if (group.length < min) continue;
        if (!group.some((x) => moved.has(grid.get(x.c, x.r)!.id))) continue;
        // En file : arbre (n - 1 liaisons) où chaque tuile a au plus 2 voisines du groupe.
        const inGroup = new Set(group.map((x) => key(grid, x)));
        const degree = (x: Cell) => RING.filter((d) => inGroup.has(key(grid, neighbor(x.c, x.r, d)))).length;
        const degrees = group.map(degree);
        const links = degrees.reduce((a, b) => a + b, 0) / 2;
        if (links !== group.length - 1 || degrees.some((d) => d > 2)) continue;
        // Ordre de la file, depuis un bout.
        const start = group[degrees.indexOf(1)];
        const cells: Cell[] = [start];
        const used = new Set([key(grid, start)]);
        for (let cur = start; cells.length < group.length; ) {
          const next = RING.map((d) => neighbor(cur.c, cur.r, d)).find((n) => inGroup.has(key(grid, n)) && !used.has(key(grid, n)))!;
          used.add(key(grid, next));
          cells.push(next);
          cur = next;
        }
        out.push({ color, cells });
      }
    }
  }
  return out;
}
