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
import { nextOrder, Order } from './orders';
import { Farandole, findFarandoles, findShapes, Shape } from './shapes';

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
  /** Forme particulière : motif d'une commande, ou farandole. */
  shape?: 'order' | 'farandole';
  /** Farandole : nombre de tuiles de la file. */
  farandole?: number;
  /** Cigales qui ont chanté (rangées entières effacées). */
  cicadas?: number;
}

export type GameEvent = ClearEvent;

/** Effet de duel à annoncer à l'écran (malus reçu, bouclier, contre-attaque). */
export type Notice = 'night' | 'freeze' | 'crack' | 'quake' | 'shield' | 'blocked' | 'counter' | 'order' | 'orderGold' | 'shieldUsed' | 'mistral' | 'fireworks' | 'rainbow' | 'shot' | 'cicada' | 'cicadaSing';

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
  /** Campagne : rangées à faire monter avant que la ligne d'arrivée n'entre dans la grille (0 = pas de ligne). */
  readonly goalRows: number;
  /** Manche de campagne réussie. */
  won = false;
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
  /** Annonces de duel depuis la dernière lecture (vidées par le rendu). */
  notices: Notice[] = [];
  /** Signaux sonores depuis la dernière lecture. */
  signals: Signal[] = [];
  readonly stats: GameStats = { maxChain: 1, maxCombo: 0, tilesCleared: 0, goldUsed: 0, repairs: 0, alertSaves: 0, maxLevel: 1, slabsBroken: 0 };
  /** Tirs restants (carte Carreau) : un double-tap fait disparaître une tuile. */
  shots = 0;
  /** Prochain coup de mistral dans (s). */
  mistralIn = 0;
  /** Boucliers (Expédition) : chacun évite une fois de perdre en balayant le haut de la pile. */
  shields = 0;
  /** Commande de motif en cours (null : pas de commandes dans ce mode). */
  order: Order | null = null;
  /** Commandes réalisées pendant la partie. */
  ordersDone = 0;
  /** Tuiles qui viennent de bouger (échange, chute, glissement) pendant ce pas : les formes doivent en contenir une. */
  private fresh = new Set<number>();
  /** Tuiles déplacées par le jeu du joueur (fin d'échange, atterrissage) : une farandole doit en contenir une. */
  private moved = new Set<number>();
  /** Duel : « nuit tombée » restante (s) ; les tuiles perdent leurs couleurs à l'affichage. */
  nightLeft = 0;
  /** Prochaine dalle de mortier dans (s). */
  mortarIn = 0;
  /** Dalles en attente de place en haut de la grille (largeurs). */
  private mortarQueue: { w: number; h: number }[] = [];
  private nextSlab = 1;

  private rng: Rng;

  constructor(
    cfg: Config,
    seed: number,
    options: { empty?: boolean; mode?: ModeId; startLevel?: number; goalRows?: number; orders?: boolean } = {},
  ) {
    this.cfg = cfg;
    this.mode = modeById(options.mode ?? 'endless');
    this.time = ((options.startLevel ?? this.mode.startLevel(cfg)) - 1) * cfg.levelDurationS;
    this.goalRows = Math.max(0, Math.round(options.goalRows ?? 0));
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    const cols = clampInt(cfg.columns, 3, 15);
    const rows = clampInt(cfg.rows, 4, 30);
    this.colors = clampInt(cfg.colors, 3, 6);
    this.grid = new Grid(cols, rows);
    if (!options.empty) fillInitial(this.grid, this.rng, this.colors, clampInt(cfg.initialRows, 0, rows - 2));
    this.preview = generatePreview(this.grid, this.rng, this.colors, this.kindChances());
    this.mortarIn = this.nextMortarDelay();
    if (options.orders) this.order = nextOrder(this.rng, this.colors, null);
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

  /** Carte Carreau : fait disparaître la tuile visée (même scellée ou de mortier), sans points. */
  shoot(c: number, r: number): boolean {
    const t = this.grid.get(c, r);
    if (this.shots <= 0 || this.over || !t || t.state === 'clearing' || t.special) return false;
    this.shots--;
    Object.assign(t, { state: 'clearing', timer: this.cfg.clearDurationMs, kind: t.kind === 'mortar' ? 'normal' : t.kind, slab: 0 });
    this.notices.push('shot');
    return true;
  }

  /** Tuiles posées et ordinaires (ni spéciales, ni mortier), tirées au hasard. */
  private randomPlainTiles(n: number): Tile[] {
    const pool: Tile[] = [];
    this.grid.forEach((t) => {
      if (t.state === 'idle' && t.kind === 'normal' && !t.special) pool.push(t);
    });
    const out: Tile[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(this.rng.int(pool.length), 1)[0]);
    return out;
  }

  /** Duel, malus « Gel » : `n` tuiles au hasard deviennent scellées. */
  freezeTiles(n: number): number {
    const list = this.randomPlainTiles(n);
    for (const t of list) t.kind = 'sealed';
    this.notices.push('freeze');
    return list.length;
  }

  /** Duel, malus « Fêlures » : `n` tuiles au hasard deviennent fêlées. */
  crackTiles(n: number): number {
    const list = this.randomPlainTiles(n);
    for (const t of list) t.kind = 'cracked';
    this.notices.push('crack');
    return list.length;
  }

  /** Duel, malus « Séisme » : les couleurs des deux rangées du haut de la pile sont mélangées. */
  quake(): void {
    const g = this.grid;
    let top = 0;
    while (top < g.rows && !g.some((_t, _c, r) => r === top)) top++;
    g.forEach((t, _c, r) => {
      if ((r === top || r === top + 1) && t.state === 'idle' && t.kind !== 'mortar' && !t.special) t.color = this.rng.int(this.colors);
    });
    this.notices.push('quake');
  }

  /** Duel, malus « Nuit tombée ». */
  night(seconds: number): void {
    this.nightLeft = Math.max(this.nightLeft, seconds);
    this.notices.push('night');
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
    // La rangée qui entre en jeu compte comme « déplacée » : une forme commandée qu'elle complète compte.
    for (const t of this.preview) this.fresh.add(t.id);
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
    this.nightLeft = Math.max(0, this.nightLeft - dtS);
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
        if (t.timer <= 0) {
          Object.assign(t, { state: 'idle', timer: 0, swapDc: 0, swapDr: 0 });
          this.fresh.add(t.id);
          this.moved.add(t.id);
        }
      } else if (t.state === 'clearing') {
        t.timer -= dtMs;
        if (t.timer <= 0) removed.push({ c, r });
      }
    });
    for (const { c, r } of removed) g.set(c, r, null);
    for (const { c, r } of removed) markChainAbove(g, c, r);

    // 2. Gravité.
    const landed = stepGravity(g, cfg, dtMs);
    if (landed.length > 0) this.signals.push('land');
    for (const t of landed) {
      this.fresh.add(t.id);
      this.moved.add(t.id);
    }
    if (cfg.slide) this.stepSlides();
    if (this.level > this.stats.maxLevel) this.stats.maxLevel = this.level;

    // Mistral : la tuile du haut de chaque colonne s'envole.
    if (cfg.mistralEveryS > 0) {
      if (this.mistralIn <= 0) this.mistralIn = cfg.mistralEveryS;
      this.mistralIn -= dtS;
      if (this.mistralIn <= 0) {
        this.mistralIn = cfg.mistralEveryS;
        let any = false;
        for (let c = 0; c < g.cols; c++) {
          for (let r = 0; r < g.rows; r++) {
            const t = g.get(c, r);
            if (!t) continue;
            if (t.state === 'idle' && !t.special) {
              Object.assign(t, { state: 'clearing', timer: cfg.clearDurationMs });
              any = true;
            }
            break;
          }
        }
        if (any) this.notices.push('mistral');
      }
    }

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
    // Formes construites par le joueur : triangle ou arc, s'ils sont commandés.
    if (this.fresh.size) {
      const o = this.order;
      if (o && (o.kind === 'triangle' || o.kind === 'arc')) {
        const s = findShapes(g, o.kind, this.fresh).find((x) => x.color === o.color);
        if (s) this.clearShape(s);
      }
      this.fresh.clear();
    }
    // Farandoles : 5 tuiles ou plus en file, formées par le joueur.
    if (this.moved.size) {
      if (cfg.farandole) for (const f of findFarandoles(g, this.moved)) this.clearFarandole(f);
      this.moved.clear();
    }

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

    // 8. Campagne : plus aucune tuile au-dessus de la ligne d'arrivée = manche réussie.
    if (!this.over && this.goalRows > 0 && this.tilesAboveLine() === 0) {
      this.won = true;
      this.over = true;
    }
  }

  /** Hauteur de la ligne d'arrivée au-dessus du bas de la grille, en rangées (négative : pas encore entrée). */
  get lineRows(): number {
    return this.rowsRisen - this.goalRows;
  }

  /** Tuiles au-dessus de la ligne d'arrivée (null tant que la ligne n'est pas entrée dans la grille). */
  tilesAboveLine(): number | null {
    const k = this.lineRows;
    if (this.goalRows <= 0 || k < 0) return null;
    let n = 0;
    const top = this.grid.rows - k;
    this.grid.forEach((_t, _c, r) => {
      if (r < top) n++;
    });
    return n;
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

  /** Fait disparaître une forme (si aucune de ses tuiles n'est déjà en train de disparaître). */
  private clearShape(s: Shape): void {
    const g = this.grid;
    if (s.cells.some(({ c, r }) => g.get(c, r)?.state !== 'idle')) return;
    this.startClear(s.cells, [], false, 'order');
  }

  /**
   * Farandole : la file disparaît (points et pause) et la voisine la plus haute devient
   * un joker (5 tuiles) ou une cigale (6 et plus).
   */
  private clearFarandole(f: Farandole): void {
    const g = this.grid;
    if (f.cells.some(({ c, r }) => g.get(c, r)?.state !== 'idle')) return;
    const inFile = new Set(f.cells.map(({ c, r }) => r * g.cols + c));
    let best: Tile | null = null;
    let bestR = Infinity;
    for (const { c, r } of f.cells) {
      for (const dir of ALL_DIRS) {
        const n = neighbor(c, r, dir);
        const t = g.get(n.c, n.r);
        if (!t || inFile.has(n.r * g.cols + n.c) || t.state !== 'idle' || t.kind !== 'normal' || t.special || t.cicada) continue;
        if (n.r < bestR) {
          best = t;
          bestR = n.r;
        }
      }
    }
    this.startClear(f.cells, [], false, 'farandole', f.color);
    if (!best) return;
    if (f.cells.length >= 6) {
      best.cicada = true;
      this.notices.push('cicada');
    } else best.kind = 'joker';
  }

  /** Commande réalisée : bonus, pause, une tomette d'or toutes les 3 commandes, puis une nouvelle commande. */
  private completeOrder(): void {
    const o = this.order;
    if (!o) return;
    this.ordersDone++;
    this.score += this.cfg.orderBonus;
    this.stopTime = Math.max(this.stopTime, this.cfg.orderPauseS);
    this.notices.push('order');
    if (this.ordersDone % 3 === 0) {
      const pool: Tile[] = [];
      this.grid.forEach((t) => {
        if (t.state === 'idle' && t.kind === 'normal' && !t.special) pool.push(t);
      });
      if (pool.length) {
        pool[this.rng.int(pool.length)].special = true;
        this.notices.push('orderGold');
      }
    }
    this.order = nextOrder(this.rng, this.colors, o.kind);
  }

  private startClear(matched: Cell[], rosaces: Rosace[] = [], gold = false, shape?: 'order' | 'farandole', shapeColor = -1): void {
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
    // Feu d'artifice (carte d'Expédition) : une chaîne ×3 ou plus emporte aussi les tuiles autour.
    if (cfg.fireworks && this.chain >= 3 && !gold) {
      const extra: Cell[] = [];
      for (const { c, r } of cells) {
        for (const dir of ALL_DIRS) {
          const n = neighbor(c, r, dir);
          const t = g.get(n.c, n.r);
          if (!t || t.state !== 'idle' || t.special || t.kind === 'mortar' || seen.has(key(n))) continue;
          seen.add(key(n));
          extra.push(n);
        }
      }
      if (extra.length) {
        cells.push(...extra);
        tiles.push(...extra.map(({ c, r }) => g.get(c, r)!));
        this.notices.push('fireworks');
      }
    }
    // Cigale : quand elle disparaît, toute sa rangée disparaît avec elle (et les cigales de cette rangée chantent à leur tour).
    let cicadas = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (!tiles[i].cicada) continue;
      cicadas++;
      const row = cells[i].r;
      for (let c = 0; c < g.cols; c++) {
        const t = g.get(c, row);
        const k = row * g.cols + c;
        if (!t || seen.has(k) || t.special || t.kind === 'mortar' || (t.state !== 'idle' && t.state !== 'hovering')) continue;
        seen.add(k);
        cells.push({ c, r: row });
        tiles.push(t);
      }
    }
    if (cicadas) this.notices.push('cicadaSing');
    for (const t of tiles) {
      t.state = 'clearing';
      t.timer = cfg.clearDurationMs;
      t.cicada = false;
    }
    for (const k of rosaces) g.get(k.center.c, k.center.r)!.special = true;
    // Rosace arc-en-ciel (carte d'Expédition) : des tuiles autour de l'anneau deviennent des jokers.
    if (cfg.rosaceJokers > 0 && rosaces.length) {
      let left = Math.round(cfg.rosaceJokers) * rosaces.length;
      for (const k of rosaces) {
        for (const { c, r } of k.ring) {
          for (const dir of ALL_DIRS) {
            if (left <= 0) break;
            const n = neighbor(c, r, dir);
            const t = g.get(n.c, n.r);
            if (t && t.state === 'idle' && t.kind === 'normal' && !t.special) {
              t.kind = 'joker';
              left--;
            }
          }
        }
      }
      this.notices.push('rainbow');
    }
    // Un clear répare les tomettes fêlées, libère les tuiles scellées et fait tomber en tuiles les dalles voisines.
    const slabs = new Set<number>();
    for (const { c, r } of cells) {
      for (const dir of ALL_DIRS) {
        const n = neighbor(c, r, dir);
        const t = g.get(n.c, n.r);
        if (!t || t.state === 'clearing') continue;
        if (t.kind === 'cracked' || t.kind === 'sealed') {
          t.kind = 'normal';
          this.fresh.add(t.id);
          this.stats.repairs++;
          this.signals.push('repair');
        } else if (t.kind === 'mortar' && t.state !== 'falling') slabs.add(t.slab);
      }
    }
    for (const s of slabs) this.crumble(s);
    this.rosaceCount += rosaces.length;

    const size = cells.length;
    const farandole = shape === 'farandole' ? matched.length : 0;
    const points =
      pointsFor(cfg, this.chain, size) +
      rosaces.length * cfg.rosaceBonus * this.chain +
      (farandole ? Math.round(cfg.farandoleBonus * (1 + (farandole - 5) * 0.5) * this.chain) : 0);
    this.score += points;
    const pause = Math.max(stopTimeFor(cfg, this.chain, size), rosaces.length ? cfg.rosacePauseS : 0, farandole ? cfg.farandolePauseS : 0);
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
    this.events.push({
      kind: 'clear',
      cells: where,
      chain: this.chain,
      size,
      points,
      rosaces: rosaces.length,
      gold,
      ...(shape ? { shape } : {}),
      ...(farandole ? { farandole } : {}),
      ...(cicadas ? { cicadas } : {}),
    });
    // Commandes réalisées par ce clear.
    const o = this.order;
    if (o) {
      const done =
        shape === 'order' ||
        (o.kind === 'farandole' && shape === 'farandole' && shapeColor === o.color) ||
        (o.kind === 'rosace' && rosaces.length > 0) ||
        (o.kind === 'combo5' && size >= 5) ||
        (o.kind === 'chain3' && this.chain >= 3);
      if (done) this.completeOrder();
    }
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
        if (this.shields > 0) {
          // Bouclier (Expédition) : les 3 rangées du haut sont balayées au lieu de perdre.
          this.shields--;
          g.forEach((_t, c, r) => {
            if (r < 3) g.set(c, r, null);
          });
          this.alert = false;
          this.notices.push('shieldUsed');
        } else this.over = true;
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
