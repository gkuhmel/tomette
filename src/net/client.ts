import type { ClientMsg, ServerMsg } from '../core/net';

/** Connexion à une salle de duel en ligne (WebSocket vers /api/room/CODE). */
export class OnlineClient {
  private ws: WebSocket | null = null;
  /** Fermée volontairement : ne pas signaler une coupure. */
  private closing = false;

  constructor(
    readonly code: string,
    private onMessage: (m: ServerMsg) => void,
    private onDrop: () => void,
  ) {}

  connect(): void {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/room/${this.code}`);
    this.ws = ws;
    ws.addEventListener('message', (e) => {
      try {
        this.onMessage(JSON.parse(String(e.data)) as ServerMsg);
      } catch {
        /* message illisible : ignoré */
      }
    });
    ws.addEventListener('close', () => {
      if (!this.closing) this.onDrop();
    });
  }

  send(m: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  close(): void {
    this.closing = true;
    this.ws?.close();
    this.ws = null;
  }
}
