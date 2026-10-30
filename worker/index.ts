import { DurableObject } from 'cloudflare:workers';
import { checkClientMsg, isRoomCode, randomRoomCode, ROOM_PROTOCOL } from '../src/core/net';
import { safeName } from '../src/core/names';

/**
 * Serveur du duel en ligne (« Défier un ami »).
 * - /api/room : connexion WebSocket à une salle (un Durable Object par salle) ; le code de
 *   la salle est dans l'en-tête de connexion (sous-protocole), jamais dans l'adresse.
 * - /api/lobby : salle d'attente du « joueur au hasard » (un seul Durable Object) ; dès que
 *   deux joueurs attendent, elle leur donne un code de salle et les renvoie dessus.
 * - tout le reste : le jeu (fichiers statiques de dist/, servis sans passer par ce code).
 * Rien n'est enregistré : la salle relaie les messages entre les deux joueurs, puis disparaît.
 */
interface Env {
  ROOMS: DurableObjectNamespace;
  LOBBY: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** Connexions par adresse IP et par minute (absent : pas de limite, ex. tests). */
  CONNECT_LIMIT?: RateLimit;
}

/**
 * Pages autorisées à se connecter : le site lui-même (production, prévisualisations, local)
 * et l'application native (Capacitor). Un autre site ne peut pas utiliser ce serveur.
 */
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

function allowedOrigin(req: Request, url: URL): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return false;
  if (NATIVE_ORIGINS.includes(origin)) return true;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

/** Code de salle demandé dans les sous-protocoles de la connexion (« tomettes.room.ABCDEFGH »). */
function requestedRoom(req: Request): { code: string; protocol: string } | null {
  for (const p of (req.headers.get('Sec-WebSocket-Protocol') ?? '').split(',')) {
    const protocol = p.trim();
    const code = protocol.startsWith(ROOM_PROTOCOL) ? protocol.slice(ROOM_PROTOCOL.length) : '';
    if (isRoomCode(code)) return { code, protocol };
  }
  return null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/room' || url.pathname === '/api/lobby') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket attendu', { status: 426 });
      if (!allowedOrigin(req, url)) return new Response('Origine refusée', { status: 403 });
      const ip = req.headers.get('CF-Connecting-IP') ?? '';
      if (env.CONNECT_LIMIT && !(await env.CONNECT_LIMIT.limit({ key: ip })).success) return new Response('Trop de connexions', { status: 429 });
      if (url.pathname === '/api/lobby') return env.LOBBY.get(env.LOBBY.idFromName('global')).fetch(req);
      const room = requestedRoom(req);
      if (!room) return new Response('Code de salle invalide', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(room.code)).fetch(req);
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
 * - une salle sert une seule fois : dès que les deux joueurs sont là, plus personne n'y entre ;
 *   une salle où personne n'arrive ferme au bout de 10 minutes (un lien retrouvé plus tard
 *   ne mène plus nulle part) ;
 * - au plus 30 connexions par minute et par adresse IP (règle `CONNECT_LIMIT` de wrangler.jsonc) ;
 * - la file du joueur au hasard accepte au plus 30 recherches par minute et par adresse IP
 *   (une recherche dure 30 s : un joueur en fait au plus 2 par minute ; la marge couvre les
 *   joueurs sur mobile qui partagent une même adresse chez leur opérateur).
 */
const MSG_PER_S = 30;
const MSG_PER_S_KICK = 100;
const MAX_CONNECTION_MS = 30 * 60 * 1000;
const INVITE_MS = 10 * 60 * 1000;
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

/** Une salle de duel : deux places, à usage unique. */
export class Room extends DurableObject<Env> {
  private throttle = new Throttle();

  async fetch(req: Request): Promise<Response> {
    const others = this.players();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    // Le navigateur exige qu'on lui renvoie le sous-protocole choisi.
    const headers = { 'Sec-WebSocket-Protocol': requestedRoom(req)?.protocol ?? '' };
    const used = (await this.ctx.storage.get<boolean>('used')) === true;
    if (others.length >= 2 || used) {
      this.ctx.acceptWebSocket(server, ['full']);
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4000, 'full');
      return new Response(null, { status: 101, webSocket: client, headers });
    }
    const taken = others.map((w) => (w.deserializeAttachment() as Seat | null)?.side);
    const side: 0 | 1 = taken.includes(0) ? 1 : 0;
    this.ctx.acceptWebSocket(server, ['player']);
    server.serializeAttachment({ side, rematch: false, since: Date.now() } satisfies Seat);
    if (others.length === 0) {
      // Invitation : valable 10 minutes.
      await this.ctx.storage.setAlarm(Date.now() + INVITE_MS);
      server.send(JSON.stringify({ t: 'wait' }));
    } else {
      // Les deux joueurs sont là : la salle est fermée aux autres jusqu'à sa disparition.
      await this.ctx.storage.put('used', true);
      await this.ctx.storage.setAlarm(Date.now() + MAX_CONNECTION_MS);
      this.start();
    }
    return new Response(null, { status: 101, webSocket: client, headers });
  }

  /** Fin de l'invitation ou de la durée maximale : on ferme tout et la salle est oubliée. */
  async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) ws.close(4010, 'expired');
    await this.ctx.storage.deleteAll();
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
    let msg;
    try {
      msg = checkClientMsg(JSON.parse(message));
    } catch {
      return;
    }
    // Message invalide (jeu modifié) : ignoré, rien n'est relayé.
    if (!msg) return;
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
      other?.send(JSON.stringify({ t: 'hello', name: safeName(msg.name, '') }));
      return;
    }
    // On relaie la copie vérifiée, pas le texte reçu.
    other?.send(JSON.stringify(msg));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    // Un visiteur refusé (salle pleine ou déjà servie) qui s'en va : rien à signaler.
    if (this.ctx.getTags(ws).includes('full')) return;
    const rest = this.players().filter((w) => w !== ws);
    for (const w of rest) w.send(JSON.stringify({ t: 'left' }));
    // Salle vide : oubliée tout de suite.
    if (!rest.length) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}

/** Au-delà, un joueur de la file est considéré comme parti (il abandonne lui-même au bout de 30 s). */
const QUEUE_MAX_MS = 40_000;

/** Joueur de la file ; `ready` : il a donné son pseudo (premier message) et peut être associé. */
type Waiting = { name: string; since: number; ready: boolean };

/**
 * Salle d'attente du « joueur au hasard » : une file de joueurs connectés. Chaque joueur
 * envoie d'abord son pseudo (dans un message, pas dans l'adresse) ; le premier qui attend
 * est associé au suivant ; les deux reçoivent le même code de salle et le pseudo de
 * l'autre, puis la connexion se ferme. Rien n'est enregistré.
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
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const now = Date.now();
    this.ctx.acceptWebSocket(server);
    if (!this.allow(ipKey(req), now)) {
      server.close(4029, 'too many searches');
      return new Response(null, { status: 101, webSocket: client });
    }
    server.serializeAttachment({ name: '', since: now, ready: false } satisfies Waiting);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const info = ws.deserializeAttachment() as Waiting | null;
    if (!info || info.ready || typeof message !== 'string' || message.length > 512) return;
    let msg;
    try {
      msg = checkClientMsg(JSON.parse(message));
    } catch {
      return;
    }
    if (msg?.t !== 'hello') return;
    // Pseudo grossier : remplacé par un pseudo vide (le jeu affiche alors « Joueur »).
    const name = safeName(msg.name, '');
    const now = Date.now();
    ws.serializeAttachment({ name, since: info.since, ready: true } satisfies Waiting);
    // Le plus ancien joueur prêt encore là (on ferme au passage les connexions oubliées).
    let partner: WebSocket | null = null;
    let partnerInfo: Waiting | null = null;
    for (const other of this.ctx.getWebSockets()) {
      if (other === ws) continue;
      const o = other.deserializeAttachment() as Waiting | null;
      // Connexion refusée (trop de recherches) ou pas encore prête.
      if (!o || !o.ready) continue;
      if (now - o.since > QUEUE_MAX_MS) {
        other.close(4001, 'expired');
        continue;
      }
      if (!partnerInfo || o.since < partnerInfo.since) {
        partner = other;
        partnerInfo = o;
      }
    }
    if (partner && partnerInfo) {
      const code = randomRoomCode();
      partner.send(JSON.stringify({ t: 'match', code, opponent: name, host: true }));
      ws.send(JSON.stringify({ t: 'match', code, opponent: partnerInfo.name, host: false }));
      partner.close(1000, 'matched');
      ws.close(1000, 'matched');
    } else ws.send(JSON.stringify({ t: 'queued' }));
  }
}
