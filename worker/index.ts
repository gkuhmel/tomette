import { DurableObject } from 'cloudflare:workers';
import { cleanName, isRoomCode, randomRoomCode } from '../src/core/net';
import { safeName } from '../src/core/names';

/**
 * Serveur du duel en ligne (« Défier un ami »).
 * - /api/room/ABCD : connexion WebSocket à la salle ABCD (un Durable Object par salle).
 * - /api/lobby?name=… : salle d'attente du « joueur au hasard » (un seul Durable Object) ;
 *   dès que deux joueurs attendent, elle leur donne un code de salle et les renvoie dessus.
 * - tout le reste : le jeu (fichiers statiques de dist/, servis sans passer par ce code).
 * Rien n'est enregistré : la salle relaie les messages entre les deux joueurs, puis disparaît.
 */
interface Env {
  ROOMS: DurableObjectNamespace;
  LOBBY: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/room\/([A-Z]{4})$/);
    if (m && isRoomCode(m[1])) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    if (url.pathname === '/api/lobby') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
      return env.LOBBY.get(env.LOBBY.idFromName('global')).fetch(req);
    }
    if (url.pathname.startsWith('/api/')) return new Response('Introuvable', { status: 404 });
    return env.ASSETS.fetch(req);
  },
};

/** Taille maximale d'un message relayé (un aperçu de grille fait moins de 1 Ko). */
const MAX_MESSAGE = 8192;

/**
 * Garde-fous contre les abus (un joueur normal en est très loin) :
 * - un joueur envoie environ 5 messages par seconde ; au-delà de 30, le surplus est ignoré,
 *   et au-delà de 100 la connexion est coupée ;
 * - une connexion à une salle dure au plus 30 minutes (un duel en dure quelques-unes) ;
 * - la file du joueur au hasard accepte au plus 30 recherches par minute et par adresse IP
 *   (une recherche dure 30 s : un joueur en fait au plus 2 par minute ; la marge couvre les
 *   joueurs sur mobile qui partagent une même adresse chez leur opérateur).
 */
const MSG_PER_S = 30;
const MSG_PER_S_KICK = 100;
const MAX_CONNECTION_MS = 30 * 60 * 1000;
const SEARCHES_PER_MIN = 30;

type Seat = { side: 0 | 1; rematch: boolean; since: number };

/** Compteur de messages par seconde d'une connexion (en mémoire : perdu en hibernation, sans conséquence). */
class Throttle {
  private counts = new WeakMap<WebSocket, { at: number; n: number }>();

  /** 'ok', 'drop' (message ignoré) ou 'kick' (connexion à couper). */
  check(ws: WebSocket, now: number): 'ok' | 'drop' | 'kick' {
    let c = this.counts.get(ws);
    if (!c || now - c.at >= 1000) {
      c = { at: now, n: 0 };
      this.counts.set(ws, c);
    }
    c.n++;
    return c.n > MSG_PER_S_KICK ? 'kick' : c.n > MSG_PER_S ? 'drop' : 'ok';
  }
}

/** Empreinte courte de l'adresse IP : la file ne garde pas l'adresse elle-même. */
function ipKey(req: Request): string {
  const ip = req.headers.get('CF-Connecting-IP') ?? '';
  let h = 2166136261;
  for (let i = 0; i < ip.length; i++) h = Math.imul(h ^ ip.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Une salle de duel : deux places au plus. */
export class Room extends DurableObject<Env> {
  private throttle = new Throttle();

  async fetch(_req: Request): Promise<Response> {
    const others = this.ctx.getWebSockets();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    if (others.length >= 2) {
      this.ctx.acceptWebSocket(server, ['full']);
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4000, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const taken = others.map((w) => (w.deserializeAttachment() as Seat | null)?.side);
    const side: 0 | 1 = taken.includes(0) ? 1 : 0;
    this.ctx.acceptWebSocket(server, ['player']);
    server.serializeAttachment({ side, rematch: false, since: Date.now() } satisfies Seat);
    if (others.length === 0) server.send(JSON.stringify({ t: 'wait' }));
    else this.start();
    return new Response(null, { status: 101, webSocket: client });
  }

  private players(): WebSocket[] {
    return this.ctx.getWebSockets('player');
  }

  /** Lance (ou relance) la partie : même graine pour les deux joueurs. */
  private start(): void {
    const seed = Math.floor(Math.random() * 2 ** 31);
    for (const ws of this.players()) {
      const seat = ws.deserializeAttachment() as Seat;
      ws.serializeAttachment({ ...seat, rematch: false });
      ws.send(JSON.stringify({ t: 'start', seed, side: seat.side }));
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE) return;
    const now = Date.now();
    const verdict = this.throttle.check(ws, now);
    if (verdict === 'kick') {
      ws.close(4008, 'too many messages');
      return;
    }
    if (verdict === 'drop') return;
    const seat = ws.deserializeAttachment() as Seat | null;
    if (seat && now - seat.since > MAX_CONNECTION_MS) {
      ws.close(4009, 'too long');
      return;
    }
    let msg: { t?: string };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    const other = this.players().find((w) => w !== ws);
    if (msg.t === 'rematch') {
      const seat = ws.deserializeAttachment() as Seat;
      ws.serializeAttachment({ ...seat, rematch: true });
      const both = this.players().length === 2 && this.players().every((w) => (w.deserializeAttachment() as Seat).rematch);
      if (both) this.start();
      else other?.send(JSON.stringify({ t: 'rematchAsked' }));
      return;
    }
    if (msg.t === 'hello') {
      // Le pseudo est filtré ici aussi : un jeu modifié ne peut pas imposer un pseudo grossier.
      const name = safeName(cleanName(String((msg as { name?: unknown }).name ?? '')), '');
      other?.send(JSON.stringify({ t: 'hello', name }));
      return;
    }
    if (msg.t === 'state' || msg.t === 'attack' || msg.t === 'over') other?.send(message);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    for (const w of this.players()) if (w !== ws) w.send(JSON.stringify({ t: 'left' }));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}

/** Au-delà, un joueur de la file est considéré comme parti (il abandonne lui-même au bout de 30 s). */
const QUEUE_MAX_MS = 40_000;

type Waiting = { name: string; since: number };

/**
 * Salle d'attente du « joueur au hasard » : une file de joueurs connectés. Le premier qui
 * attend est associé au suivant ; les deux reçoivent le même code de salle et le pseudo
 * de l'autre, puis la connexion se ferme. Rien n'est enregistré.
 */
export class Lobby extends DurableObject<Env> {
  /** Heures des dernières recherches par adresse (en mémoire seulement). */
  private recent = new Map<string, number[]>();

  /** Compte une recherche de cette adresse ; false si elle en a déjà fait trop dans la minute. */
  private allow(ip: string, now: number): boolean {
    if (this.recent.size > 5000) {
      for (const [k, list] of this.recent) if (list.every((at) => now - at > 60_000)) this.recent.delete(k);
    }
    const list = (this.recent.get(ip) ?? []).filter((at) => now - at < 60_000);
    list.push(now);
    this.recent.set(ip, list);
    return list.length <= SEARCHES_PER_MIN;
  }

  async fetch(req: Request): Promise<Response> {
    // Pseudo grossier : remplacé par un pseudo vide (le jeu affiche alors « Joueur »).
    const name = safeName(cleanName(new URL(req.url).searchParams.get('name') ?? ''), '');
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const now = Date.now();
    if (!this.allow(ipKey(req), now)) {
      this.ctx.acceptWebSocket(server);
      server.close(4029, 'too many searches');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ name, since: now } satisfies Waiting);
    // Le plus ancien joueur encore là (on ferme au passage les connexions oubliées).
    let partner: WebSocket | null = null;
    let partnerInfo: Waiting | null = null;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === server) continue;
      const info = ws.deserializeAttachment() as Waiting | null;
      // Connexion refusée (trop de recherches) : déjà fermée.
      if (!info) continue;
      if (now - info.since > QUEUE_MAX_MS) {
        ws.close(4001, 'expired');
        continue;
      }
      if (!partnerInfo || info.since < partnerInfo.since) {
        partner = ws;
        partnerInfo = info;
      }
    }
    if (partner && partnerInfo) {
      const code = randomRoomCode();
      partner.send(JSON.stringify({ t: 'match', code, opponent: name, host: true }));
      server.send(JSON.stringify({ t: 'match', code, opponent: partnerInfo.name, host: false }));
      partner.close(1000, 'matched');
      server.close(1000, 'matched');
    } else server.send(JSON.stringify({ t: 'queued' }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(): Promise<void> {
    // La file n'attend aucun message des joueurs.
  }
}
