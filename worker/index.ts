import { DurableObject } from 'cloudflare:workers';
import { isRoomCode } from '../src/core/net';

/**
 * Serveur du duel en ligne (« Défier un ami »).
 * - /api/room/ABCD : connexion WebSocket à la salle ABCD (un Durable Object par salle).
 * - tout le reste : le jeu (fichiers statiques de dist/, servis sans passer par ce code).
 * Rien n'est enregistré : la salle relaie les messages entre les deux joueurs, puis disparaît.
 */
interface Env {
  ROOMS: DurableObjectNamespace;
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
    if (url.pathname.startsWith('/api/')) return new Response('Introuvable', { status: 404 });
    return env.ASSETS.fetch(req);
  },
};

/** Taille maximale d'un message relayé (un aperçu de grille fait moins de 1 Ko). */
const MAX_MESSAGE = 8192;

type Seat = { side: 0 | 1; rematch: boolean };

/** Une salle de duel : deux places au plus. */
export class Room extends DurableObject<Env> {
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
    server.serializeAttachment({ side, rematch: false } satisfies Seat);
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
    if (msg.t === 'state' || msg.t === 'attack' || msg.t === 'over') other?.send(message);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    for (const w of this.players()) if (w !== ws) w.send(JSON.stringify({ t: 'left' }));
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
