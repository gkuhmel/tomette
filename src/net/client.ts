import { checkServerMsg, ClientMsg, ROOM_PROTOCOL, ServerMsg } from '../core/net';
import { socketBase } from '../native';

/** Connexion à une salle de duel en ligne (WebSocket vers /api/room ; le code voyage dans l'en-tête, pas dans l'adresse). */
export class OnlineClient {
  private ws: WebSocket | null = null;
  /** Fermée volontairement : ne pas signaler une coupure. */
  private closing = false;

  constructor(
    readonly code: string,
    private onMessage: (m: ServerMsg) => void,
    /** Coupure non voulue ; `code` : code de fermeture (4010 : invitation expirée). */
    private onDrop: (code: number) => void,
  ) {}

  connect(): void {
    const ws = new WebSocket(`${socketBase()}/api/room`, [ROOM_PROTOCOL + this.code]);
    this.ws = ws;
    ws.addEventListener('message', (e) => {
      let m: ServerMsg | null = null;
      try {
        m = checkServerMsg(JSON.parse(String(e.data)));
      } catch {
        /* message illisible : ignoré */
      }
      if (m) this.onMessage(m);
    });
    ws.addEventListener('close', (e) => {
      if (!this.closing) this.onDrop(e.code);
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
