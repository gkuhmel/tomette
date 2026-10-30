import { ATTACK_DELAY_S, Attack, attacksFor } from './duel';
import type { Game } from './game';

/**
 * Duel en ligne (« Défier un ami ») : chaque joueur fait tourner sa propre partie ;
 * le serveur (une salle de 2 joueurs) ne fait que relayer ces messages.
 */

/** Aperçu compact d'une grille : un caractère par case ('.' vide, '0'-'5' couleur, 'm' mortier). */
export interface BoardView {
  cols: number;
  rows: number;
  cells: string;
  rise: number;
  alert: boolean;
  night: boolean;
}

export function packView(g: Game): BoardView {
  let cells = '';
  for (let r = 0; r < g.grid.rows; r++) {
    for (let c = 0; c < g.grid.cols; c++) {
      const t = g.grid.get(c, r);
      cells += !t || t.state === 'clearing' ? '.' : t.kind === 'mortar' ? 'm' : String(t.color % 10);
    }
  }
  return { cols: g.grid.cols, rows: g.grid.rows, cells, rise: Math.round(g.riseOffset * 100) / 100, alert: g.alert, night: g.nightLeft > 0 };
}

/** Statistiques échangées pour l'écran de fin. */
export interface NetStats {
  score: number;
  sent: number;
  chain: number;
  rosaces: number;
}

/** Messages du joueur vers la salle. */
export type ClientMsg =
  | { t: 'state'; view: BoardView; stats: NetStats; pending: number }
  | { t: 'attack'; a: Attack[] }
  | { t: 'over'; stats: NetStats }
  | { t: 'rematch' }
  /** Pseudo du joueur, envoyé au début de chaque partie. */
  | { t: 'hello'; name: string };

/** Messages de la salle vers le joueur (les messages de l'autre joueur sont relayés tels quels). */
export type ServerMsg =
  | { t: 'wait' }
  | { t: 'start'; seed: number; side: 0 | 1 }
  | { t: 'left' }
  | { t: 'full' }
  | { t: 'rematchAsked' }
  | ClientMsg;

/** Messages de la salle d'attente (« joueur au hasard »). */
export type LobbyMsg = { t: 'queued' } | { t: 'match'; code: string; opponent: string; host: boolean };

/** Pseudo propre : lettres, chiffres, espaces, tirets et « # » ; 20 caractères au plus. */
export function cleanName(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _#-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

/** Codes de salle : 4 lettres sans ambiguïté (pas de I, O, L…). */
export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';

export function isRoomCode(s: string): boolean {
  return s.length === 4 && [...s].every((ch) => ROOM_ALPHABET.includes(ch));
}

export function randomRoomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)];
  return s;
}

/*
 * Messages venus de l'autre joueur : le serveur les relaie, mais un jeu modifié peut envoyer
 * n'importe quoi (grille démesurée, nuit d'un million de secondes, données incomplètes).
 * Chaque message est vérifié et borné aux valeurs qu'une vraie partie peut produire ;
 * sinon il est ignoré. Utilisé par le serveur (avant de relayer) et par le jeu (à la réception).
 */

/** Taille de grille maximale acceptée (le jeu va jusqu'à 11 × 16). */
const MAX_COLS = 16;
const MAX_ROWS = 24;
/** Attaques par message : une seule action en produit au plus 3. */
const MAX_ATTACKS = 8;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;
const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;

function checkView(v: unknown): BoardView | null {
  if (!isObj(v)) return null;
  const cols = int(v.cols, 1, MAX_COLS);
  const rows = int(v.rows, 1, MAX_ROWS);
  const rise = num(v.rise, 0, 1);
  if (cols === null || rows === null || rise === null || typeof v.cells !== 'string') return null;
  if (v.cells.length !== cols * rows || !/^[.0-9m]*$/.test(v.cells)) return null;
  return { cols, rows, cells: v.cells, rise, alert: v.alert === true, night: v.night === true };
}

function checkStats(v: unknown): NetStats | null {
  if (!isObj(v)) return null;
  const score = int(v.score, 0, 1e9);
  const sent = int(v.sent, 0, 1e6);
  const chain = int(v.chain, 0, 1000);
  const rosaces = int(v.rosaces, 0, 1e6);
  if (score === null || sent === null || chain === null || rosaces === null) return null;
  return { score, sent, chain, rosaces };
}

function checkAttack(v: unknown): Attack | null {
  if (!isObj(v)) return null;
  switch (v.kind) {
    case 'slab': {
      const w = int(v.w, 1, MAX_COLS);
      const h = int(v.h, 1, 2);
      return w === null || h === null ? null : { kind: 'slab', w, h };
    }
    case 'night': {
      const seconds = num(v.seconds, 0, 10);
      return seconds === null ? null : { kind: 'night', seconds };
    }
    case 'freeze':
    case 'crack': {
      const n = int(v.n, 1, 6);
      return n === null ? null : { kind: v.kind, n };
    }
    case 'quake':
      return { kind: 'quake' };
  }
  return null;
}

/** Message d'un joueur vérifié (copie propre, sans champ en trop), ou null s'il est invalide. */
export function checkClientMsg(raw: unknown): ClientMsg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'state': {
      const view = checkView(raw.view);
      const stats = checkStats(raw.stats);
      const pending = int(raw.pending, 0, 1000);
      return view && stats && pending !== null ? { t: 'state', view, stats, pending } : null;
    }
    case 'attack': {
      if (!Array.isArray(raw.a) || raw.a.length === 0 || raw.a.length > MAX_ATTACKS) return null;
      const a = raw.a.map(checkAttack);
      return a.every((x): x is Attack => x !== null) ? { t: 'attack', a } : null;
    }
    case 'over': {
      const stats = checkStats(raw.stats);
      return stats ? { t: 'over', stats } : null;
    }
    case 'rematch':
      return { t: 'rematch' };
    case 'hello':
      return typeof raw.name === 'string' ? { t: 'hello', name: cleanName(raw.name.slice(0, 64)) } : null;
  }
  return null;
}

/** Message reçu de la salle : ceux du serveur passent, ceux relayés de l'autre joueur sont vérifiés. */
export function checkServerMsg(raw: unknown): ServerMsg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'wait':
    case 'left':
    case 'full':
    case 'rematchAsked':
      return { t: raw.t };
    case 'start': {
      const seed = int(raw.seed, 0, 2 ** 31);
      return seed !== null && (raw.side === 0 || raw.side === 1) ? { t: 'start', seed, side: raw.side } : null;
    }
    case 'rematch':
      return null;
  }
  return checkClientMsg(raw);
}

/** Dalles et malus en attente au-delà desquels on ignore les suivants (un vrai duel en compte quelques-uns). */
const MAX_PENDING = 24;

type Pending = Attack & { in: number };

/**
 * Côté local d'un duel en ligne : mêmes règles que le duel contre l'ordinateur
 * (attaques, contre-attaque, bouclier), mais l'adversaire est à distance.
 */
export class LinkedDuel {
  /** Dalles et malus qui arrivent vers le joueur. */
  readonly pending: Pending[] = [];
  shield = false;
  sent = 0;
  private read = 0;

  constructor(readonly game: Game) {}

  /** À appeler après chaque pas de logique : renvoie les attaques à envoyer à l'adversaire. */
  step(dtS: number): Attack[] {
    const g = this.game;
    const out: Attack[] = [];
    const fresh = g.events.slice(this.read);
    this.read = g.events.length;
    for (const e of fresh) {
      if (e.kind !== 'clear') continue;
      if (e.rosaces > 0 && !this.shield) {
        this.shield = true;
        g.notices.push('shield');
      }
      for (const a of attacksFor(e, g.grid.cols)) {
        const incoming = a.kind === 'slab' ? this.pending.findIndex((p) => p.kind === 'slab') : -1;
        if (incoming >= 0) {
          this.pending.splice(incoming, 1);
          g.notices.push('counter');
          continue;
        }
        out.push(a);
        this.sent++;
      }
    }
    for (const p of this.pending) p.in -= dtS;
    while (this.pending.length && this.pending[0].in <= 0) this.deliver(this.pending.shift()!);
    return out;
  }

  /** Attaques reçues de l'adversaire. */
  receive(list: Attack[]): void {
    for (const a of list) if (this.pending.length < MAX_PENDING) this.pending.push({ ...a, in: ATTACK_DELAY_S });
  }

  eventsCleared(): void {
    this.read = 0;
  }

  private deliver(a: Attack): void {
    const g = this.game;
    switch (a.kind) {
      case 'slab':
        if (this.shield) {
          this.shield = false;
          g.notices.push('blocked');
        } else g.dropMortar(a.w, a.h);
        break;
      case 'night':
        g.night(a.seconds);
        break;
      case 'freeze':
        g.freezeTiles(a.n);
        break;
      case 'crack':
        g.crackTiles(a.n);
        break;
      case 'quake':
        g.quake();
        break;
    }
  }
}
