import type { Config } from '../config';
import { chainInProgress, markChainAbove, pointsFor, stopTimeFor } from './chain';
import { stepGravity } from './gravity';
import { Grid, Tile } from './grid';
import { Cell, directionTo, LATERAL_DIRS } from './hex';
import { findMatches } from './match';
import { findRosaces, Rosace } from './rosace';
import { activatePreview, fillInitial, generatePreview, levelAt, secondsPerRow } from './rise';
import { Rng } from './rng';

/** Pas de la logique (60 Hz). */
export const STEP_MS = 1000 / 60;

export interface ClearEvent {
  kind: 'clear';
  cells: Cell[];
  chain: number;
  size: number;
  points: number;
  /** Nombre de rosaces formées par ce clear. */
  rosaces: number;
  /** Clear déclenché par une tomette d'or. */
  gold: boolean;
}

export type GameEvent = ClearEvent;

const clampInt = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(v)));

export class Game {
  readonly cfg: Config;
  readonly seed: number;
  readonly grid: Grid;
  readonly colors: number;
  preview: Tile[];

  /** Montée en cours, en fraction de case [0, 1). */
  riseOffset = 0;
  /** Temps de jeu (s). */
  time = 0;
  score = 0;
  /** Rang de la chaîne en cours (1 = pas de chaîne). */
  chain = 1;
  /** Stop time restant (s). */
  stopTime = 0;
  alert = false;
  graceLeft = 0;
  over = false;
  /** Accélération manuelle maintenue. */
  manualRise = false;
  /** Évènements produits depuis la dernière lecture (pour le rendu). */
  events: GameEvent[] = [];

  private rng: Rng;

  constructor(cfg: Config, seed: number, options: { empty?: boolean } = {}) {
    this.cfg = cfg;
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    const cols = clampInt(cfg.columns, 3, 15);
    const rows = clampInt(cfg.rows, 4, 30);
    this.colors = clampInt(cfg.colors, 3, 6);
    this.grid = new Grid(cols, rows);
    if (!options.empty) fillInitial(this.grid, this.rng, this.colors, clampInt(cfg.initialRows, 0, rows - 2));
    this.preview = generatePreview(this.grid, this.rng, this.colors);
  }

  get level(): number {
    return levelAt(this.cfg, this.time);
  }

  get secondsPerRow(): number {
    return secondsPerRow(this.cfg, this.level);
  }

  get clearing(): boolean {
    return this.grid.some((t) => t.state === 'clearing');
  }

  jumpToLevel(level: number): void {
    this.time = Math.max(0, (Math.floor(level) - 1) * this.cfg.levelDurationS);
  }

  canSwap(c1: number, r1: number, c2: number, r2: number): boolean {
    if (this.over) return false;
    const g = this.grid;
    if (!g.inBounds(c1, r1) || !g.inBounds(c2, r2)) return false;
    const dir = directionTo(c1, r1, c2, r2);
    if (dir === null || !LATERAL_DIRS.includes(dir)) return false;
    const a = g.get(c1, r1);
    const b = g.get(c2, r2);
    if (!a && !b) return false;
    for (const t of [a, b]) {
      if (t && t.state !== 'idle' && t.state !== 'hovering') return false;
    }
    return true;
  }

  /** Échange (c1,r1) avec son voisin latéral (c2,r2). Renvoie false si interdit. */
  trySwap(c1: number, r1: number, c2: number, r2: number): boolean {
    if (!this.canSwap(c1, r1, c2, r2)) return false;
    const g = this.grid;
    const a = g.get(c1, r1);
    const b = g.get(c2, r2);
    // Tomette d'or échangée avec une tuile normale : toute la couleur disparaît.
    if (a && b && a.special !== b.special) {
      this.activateGold(a.special ? { c: c1, r: r1 } : { c: c2, r: r2 }, a.special ? b.color : a.color);
      return true;
    }
    g.set(c1, r1, b);
    g.set(c2, r2, a);
    const dur = this.cfg.swapDurationMs;
    if (a) Object.assign(a, { state: 'swapping', timer: dur, swapDc: c1 - c2, swapDr: r1 - r2 });
    if (b) Object.assign(b, { state: 'swapping', timer: dur, swapDc: c2 - c1, swapDr: r2 - r1 });
    return true;
  }

  /** Fait monter la pile d'une rangée immédiatement (debug / tests). */
  forceRise(): boolean {
    if (this.grid.topRowOccupied()) return false;
    activatePreview(this.grid, this.preview, this.rng, this.colors);
    this.preview = generatePreview(this.grid, this.rng, this.colors);
    this.riseOffset = 0;
    return true;
  }

  tick(dtMs: number = STEP_MS): void {
    if (this.over) return;
    const cfg = this.cfg;
    const g = this.grid;
    const dtS = dtMs / 1000;
    this.time += dtS;

    // 1. Fin des échanges et des clears.
    const removed: Cell[] = [];
    g.forEach((t, c, r) => {
      if (t.state === 'swapping') {
        t.timer -= dtMs;
        if (t.timer <= 0) Object.assign(t, { state: 'idle', timer: 0, swapDc: 0, swapDr: 0 });
      } else if (t.state === 'clearing') {
        t.timer -= dtMs;
        if (t.timer <= 0) removed.push({ c, r });
      }
    });
    for (const { c, r } of removed) g.set(c, r, null);
    for (const { c, r } of removed) markChainAbove(g, c, r);

    // 2. Gravité.
    stepGravity(g, cfg, dtMs);

    // 3. Alignements.
    const matched = findMatches(g);
    const rosaces = cfg.rosace ? findRosaces(g) : [];
    if (matched.length > 0 || rosaces.length > 0) this.startClear(matched, rosaces);

    // 4. Une tuile posée qui ne participe pas à un clear perd son drapeau chain.
    g.forEach((t) => {
      if (t.state === 'idle') t.chain = false;
    });

    // 5. Fin de chaîne.
    if (this.chain > 1 && !chainInProgress(g)) this.chain = 1;

    // 6. Stop time.
    if (this.manualRise) this.stopTime = 0;
    this.stopTime = Math.max(0, this.stopTime - dtS);

    // 7. Montée, alerte, défaite.
    this.updateRise(dtS);
  }

  /** Lance la disparition des alignements et des anneaux de rosace ; les centres deviennent des tomettes d'or. */
  private startClear(matched: Cell[], rosaces: Rosace[] = [], gold = false): void {
    const cfg = this.cfg;
    const g = this.grid;
    const key = ({ c, r }: Cell) => r * g.cols + c;
    const centers = new Set(rosaces.map((k) => key(k.center)));
    const seen = new Set<number>();
    const cells: Cell[] = [];
    for (const cell of [...matched, ...rosaces.flatMap((k) => k.ring)]) {
      const k = key(cell);
      if (seen.has(k) || centers.has(k)) continue;
      seen.add(k);
      cells.push(cell);
    }
    const tiles = cells.map(({ c, r }) => g.get(c, r)!);
    if (tiles.some((t) => t.chain)) this.chain++;
    for (const t of tiles) {
      t.state = 'clearing';
      t.timer = cfg.clearDurationMs;
    }
    for (const k of rosaces) g.get(k.center.c, k.center.r)!.special = true;

    const size = cells.length;
    const points = pointsFor(cfg, this.chain, size) + rosaces.length * cfg.rosaceBonus * this.chain;
    this.score += points;
    const pause = Math.max(stopTimeFor(cfg, this.chain, size), rosaces.length ? cfg.rosacePauseS : 0);
    this.stopTime = Math.max(this.stopTime, pause);
    // Un clear pendant la grâce annule l'alerte.
    this.alert = false;
    this.graceLeft = 0;
    const where = rosaces.length ? rosaces.map((k) => k.center) : gold ? [cells[0]] : cells;
    this.events.push({ kind: 'clear', cells: where, chain: this.chain, size, points, rosaces: rosaces.length, gold });
  }

  /** La tomette d'or en `at` et toutes les tuiles posées de la couleur `color` disparaissent. */
  private activateGold(at: Cell, color: number): void {
    const cells: Cell[] = [at];
    this.grid.forEach((t, c, r) => {
      if (t.special || t.color !== color) return;
      if (t.state === 'idle' || t.state === 'hovering') cells.push({ c, r });
    });
    this.startClear(cells, [], true);
  }

  private updateRise(dtS: number): void {
    const g = this.grid;
    if (this.alert) {
      if (!g.topRowOccupied()) {
        this.alert = false;
        return;
      }
      this.graceLeft -= dtS;
      if (this.graceLeft <= 0) {
        this.graceLeft = 0;
        this.over = true;
      }
      return;
    }

    if (this.clearing || this.stopTime > 0) return;

    if (g.topRowOccupied()) {
      this.alert = true;
      this.graceLeft = this.cfg.graceS;
      return;
    }

    const spr = this.manualRise ? this.cfg.manualRiseSecondsPerRow : this.secondsPerRow;
    this.riseOffset += dtS / Math.max(0.01, spr);
    if (this.riseOffset >= 1) {
      const rest = this.riseOffset - 1;
      this.forceRise();
      this.riseOffset = Math.min(rest, 0.999);
    }
  }
}
