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
  | { t: 'rematch' };

/** Messages de la salle vers le joueur (les messages de l'autre joueur sont relayés tels quels). */
export type ServerMsg =
  | { t: 'wait' }
  | { t: 'start'; seed: number; side: 0 | 1 }
  | { t: 'left' }
  | { t: 'full' }
  | { t: 'rematchAsked' }
  | ClientMsg;

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
    for (const a of list) this.pending.push({ ...a, in: ATTACK_DELAY_S });
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
