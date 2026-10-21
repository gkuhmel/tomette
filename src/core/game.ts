import type { Config } from '../config';
import { chainInProgress, markChainAbove, pointsFor, stopTimeFor } from './chain';
import { stepGravity } from './gravity';
import { findSlides } from './slide';
import { Grid, Tile } from './grid';
import { ALL_DIRS, Cell, directionTo, LATERAL_DIRS, neighbor } from './hex';
import { findMatches } from './match';
import { findRosaces, Rosace } from './rosace';
import { activatePreview, fillInitial, generatePreview, levelAt, secondsPerRow } from './rise';
import { Rng } from './rng';
import { Mode, modeById, ModeId } from './modes';

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

/** Petits signaux pour le son (échange, atterrissage, réparation). */
export type Signal = 'swap' | 'land' | 'repair' | 'slide' | 'mortar' | 'crumble';

/** Bilan de la partie, pour les statistiques et les succès. */
export interface GameStats {
  maxChain: number;
  maxCombo: number;
  tilesCleared: number;
  goldUsed: number;
  repairs: number;
  /** Alertes rattrapées par un alignement pendant la grâce. */
  alertSaves: number;
  maxLevel: number;
  /** Dalles de mortier transformées. */
  slabsBroken: number;
}

const clampInt = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(v)));

export class Game {
  readonly cfg: Config;
  readonly seed: number;
  readonly grid: Grid;
  readonly colors: number;
  preview: Tile[];

  /** Montée en cours, en fraction de case [0, 1). */
  riseOffset = 0;
  /** Temps qui fixe le niveau (s) ; démarre plus loin en mode Express. */
  time = 0;
  /** Temps écoulé depuis le début de la partie (s). */
  elapsed = 0;
  /** Rangées montées depuis le début. */
  rowsRisen = 0;
  /** Rosaces réalisées pendant la partie. */
  rosaceCount = 0;
  /** Partie finie parce que le temps du mode est écoulé (et non par la pile). */
  timeUp = false;
  readonly mode: Mode;
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
  /** Signaux sonores depuis la dernière lecture. */
  signals: Signal[] = [];
  readonly stats: GameStats = { maxChain: 1, maxCombo: 0, tilesCleared: 0, goldUsed: 0, repairs: 0, alertSaves: 0, maxLevel: 1, slabsBroken: 0 };
  /** Prochaine dalle de mortier dans (s). */
  mortarIn = 0;
  /** Dalles en attente de place en haut de la grille (largeurs). */
  private mortarQueue: { w: number; h: number }[] = [];
  private nextSlab = 1;

  private rng: Rng;

  constructor(cfg: Config, seed: number, options: { empty?: boolean; mode?: ModeId } = {}) {
    this.cfg = cfg;
    this.mode = modeById(options.mode ?? 'endless');
    this.time = (this.mode.startLevel(cfg) - 1) * cfg.levelDurationS;
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    const cols = clampInt(cfg.columns, 3, 15);
    const rows = clampInt(cfg.rows, 4, 30);
    this.colors = clampInt(cfg.colors, 3, 6);
    this.grid = new Grid(cols, rows);
    if (!options.empty) fillInitial(this.grid, this.rng, this.colors, clampInt(cfg.initialRows, 0, rows - 2));
    this.preview = generatePreview(this.grid, this.rng, this.colors, this.kindChances());
    this.mortarIn = this.nextMortarDelay();
  }

  /** Délai avant la prochaine dalle : l'intervalle moyen, à ±40 %. */
  private nextMortarDelay(): number {
    const every = this.cfg.mortarEveryS;
    return every > 0 ? every * (0.6 + 0.8 * this.rng.next()) : Infinity;
  }

  /** Met une dalle de mortier en file : elle tombe dès qu'il y a la place en haut. */
  dropMortar(w: number, h = 1): void {
    this.mortarQueue.push({ w: clampInt(w, 1, this.grid.cols), h: clampInt(h, 1, 4) });
  }

  /** Pose la première dalle en attente si les rangées du haut sont libres sur sa largeur. */
  private spawnMortar(): void {
    const job = this.mortarQueue[0];
    if (!job) return;
    const g = this.grid;
    const starts: number[] = [];
    for (let c0 = 0; c0 + job.w <= g.cols; c0++) {
      let free = true;
      for (let c = c0; c < c0 + job.w && free; c++) for (let r = 0; r < job.h + 1 && free; r++) free = g.get(c, r) === null;
      if (free) starts.push(c0);
    }
    if (!starts.length) return;
    this.mortarQueue.shift();
    const c0 = starts[this.rng.int(starts.length)];
    const slab = this.nextSlab++;
    for (let r = 0; r < job.h; r++) {
      for (let c = c0; c < c0 + job.w; c++) {
        const t = g.place(c, r, 0);
        Object.assign(t, { kind: 'mortar', slab, state: 'falling', fall: 0 });
      }
    }
    this.signals.push('mortar');
  }

  /** Un clear touche une dalle : toute la dalle devient des tuiles normales, qui peuvent prolonger la chaîne. */
  private crumble(slab: number): void {
    let any = false;
    this.grid.forEach((t) => {
      if (t.kind !== 'mortar' || t.slab !== slab) return;
      any = true;
      Object.assign(t, {
        kind: 'normal',
        slab: 0,
        color: this.rng.int(this.colors),
        state: 'hovering',
        timer: Math.max(this.cfg.hoverMs, this.cfg.clearDurationMs * 0.6),
        chain: true,
      });
    });
    if (any) {
      this.stats.slabsBroken++;
      this.signals.push('crumble');
    }
  }

  private kindChances() {
    const k = (v: number) => Math.max(0, Math.min(1, v || 0));
    return { cracked: k(this.cfg.crackedChance), sealed: k(this.cfg.sealedChance), joker: k(this.cfg.jokerChance) };
  }

  get level(): number {
    return levelAt(this.cfg, this.time);
  }

  get secondsPerRow(): number {
    return secondsPerRow(this.cfg, this.level);
  }

  /** Colonnes dont une tuile posée entre dans la zone d'attention (rangées du haut). */
  dangerColumns(): boolean[] {
    const out = new Array<boolean>(this.grid.cols).fill(false);
    const rows = Math.min(this.grid.rows, Math.max(0, Math.round(this.cfg.warnRows)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const t = this.grid.get(c, r);
        if (t && t.state !== 'falling' && t.state !== 'hovering') out[c] = true;
      }
    }
    return out;
  }

  /** 0 = calme, 1 = attention (pile proche du haut), 2 = alerte (délai de grâce). */
  get danger(): 0 | 1 | 2 {
    if (this.alert) return 2;
    return this.dangerColumns().some(Boolean) ? 1 : 0;
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
      if (t && (t.kind === 'sealed' || t.kind === 'mortar')) return false;
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
    if (a && b && a.special !== b.special && (a.special ? b : a).kind !== 'joker') {
      this.activateGold(a.special ? { c: c1, r: r1 } : { c: c2, r: r2 }, a.special ? b.color : a.color);
      return true;
    }
    g.set(c1, r1, b);
    g.set(c2, r2, a);
    this.signals.push('swap');
    const dur = this.cfg.swapDurationMs;
    if (a) Object.assign(a, { state: 'swapping', timer: dur, swapDc: c1 - c2, swapDr: r1 - r2 });
    if (b) Object.assign(b, { state: 'swapping', timer: dur, swapDc: c2 - c1, swapDr: r2 - r1 });
    return true;
  }

  /** Temps restant pour les modes chronométrés (s), null sinon. */
  get timeLeft(): number | null {
    const limit = this.mode.timeLimitS(this.cfg);
    return limit > 0 ? Math.max(0, limit - this.elapsed) : null;
  }

  /** Valeur comparée au record du mode. */
  get recordValue(): number {
    return this.mode.record === 'rosaces' ? this.rosaceCount : this.score;
  }

  /** Fait monter la pile d'une rangée immédiatement (debug / tests). */
  forceRise(): boolean {
    if (this.grid.topRowOccupied()) return false;
    activatePreview(this.grid, this.preview, this.rng, this.colors);
    this.preview = generatePreview(this.grid, this.rng, this.colors, this.kindChances());
    this.riseOffset = 0;
    this.rowsRisen++;
    return true;
  }

  tick(dtMs: number = STEP_MS): void {
    if (this.over) return;
    const cfg = this.cfg;
    const g = this.grid;
    const dtS = dtMs / 1000;
    this.time += dtS;
    this.elapsed += dtS;
    const limit = this.mode.timeLimitS(cfg);
    if (limit > 0 && this.elapsed >= limit) {
      this.elapsed = limit;
      this.timeUp = true;
      this.over = true;
      return;
    }

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
    if (stepGravity(g, cfg, dtMs).length > 0) this.signals.push('land');
    if (cfg.slide) this.stepSlides();
    if (this.level > this.stats.maxLevel) this.stats.maxLevel = this.level;

    // Dalles de mortier : une de temps en temps à partir du niveau prévu.
    if (cfg.mortarEveryS > 0 && this.level >= cfg.mortarFromLevel) {
      this.mortarIn -= dtS;
      if (this.mortarIn <= 0) {
        const lo = clampInt(cfg.mortarMinW, 1, g.cols);
        const hi = clampInt(cfg.mortarMaxW, lo, g.cols);
        this.dropMortar(lo + this.rng.int(hi - lo + 1));
        this.mortarIn = this.nextMortarDelay();
      }
    }
    this.spawnMortar();

    // 3. Alignements.
    const matched = findMatches(g);
    const rosaces = cfg.rosace ? findRosaces(g, cfg.rosaceMin) : [];
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
  /** Éboulement : le sommet d'une pile nettement plus haute glisse vers la colonne voisine. */
  private stepSlides(): void {
    const g = this.grid;
    const moves = findSlides(g, this.cfg.slideMinDrop);
    if (!moves.length) return;
    // Une tuile qui glisse pendant une cascade peut prolonger la chaîne.
    const cascading = this.chain > 1 || this.clearing || g.some((t) => t.chain);
    for (const { tile, from, to } of moves) {
      if (g.get(to.c, to.r) !== null) continue;
      g.set(from.c, from.r, null);
      g.set(to.c, to.r, tile);
      Object.assign(tile, {
        state: 'swapping',
        timer: Math.max(1, this.cfg.slideMs),
        swapDc: from.c - to.c,
        swapDr: from.r - to.r,
        chain: tile.chain || cascading,
      });
    }
    this.signals.push('slide');
  }

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
    // Un clear répare les tomettes fêlées, libère les tuiles scellées et fait tomber en tuiles les dalles voisines.
    const slabs = new Set<number>();
    for (const { c, r } of cells) {
      for (const dir of ALL_DIRS) {
        const n = neighbor(c, r, dir);
        const t = g.get(n.c, n.r);
        if (!t || t.state === 'clearing') continue;
        if (t.kind === 'cracked' || t.kind === 'sealed') {
          t.kind = 'normal';
          this.stats.repairs++;
          this.signals.push('repair');
        } else if (t.kind === 'mortar' && t.state !== 'falling') slabs.add(t.slab);
      }
    }
    for (const s of slabs) this.crumble(s);
    this.rosaceCount += rosaces.length;

    const size = cells.length;
    const points = pointsFor(cfg, this.chain, size) + rosaces.length * cfg.rosaceBonus * this.chain;
    this.score += points;
    const pause = Math.max(stopTimeFor(cfg, this.chain, size), rosaces.length ? cfg.rosacePauseS : 0);
    this.stopTime = Math.max(this.stopTime, pause);
    const st = this.stats;
    st.maxChain = Math.max(st.maxChain, this.chain);
    st.maxCombo = Math.max(st.maxCombo, size);
    st.tilesCleared += size;
    if (gold) st.goldUsed++;
    if (this.alert) st.alertSaves++;
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
      if (t.special || t.kind === 'joker' || t.kind === 'mortar' || t.color !== color) return;
      if (t.state === 'idle' || t.state === 'hovering') cells.push({ c, r });
    });
    this.startClear(cells, [], true);
  }

  private updateRise(dtS: number): void {
    const g = this.grid;
    if (this.alert) {
      if (!g.topRowOccupied(true)) {
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

    if (g.topRowOccupied(true)) {
      this.alert = true;
      this.graceLeft = this.cfg.graceS;
      return;
    }
    // Une dalle qui tombe encore de la rangée du haut : on attend qu'elle soit descendue.
    if (g.topRowOccupied()) return;

    const spr = this.manualRise ? this.cfg.manualRiseSecondsPerRow : this.secondsPerRow;
    this.riseOffset += dtS / Math.max(0.01, spr);
    if (this.riseOffset >= 1) {
      const rest = this.riseOffset - 1;
      this.forceRise();
      this.riseOffset = Math.min(rest, 0.999);
    }
  }
}
