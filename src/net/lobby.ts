import { isRoomCode, LobbyMsg } from '../core/net';
import { socketBase } from '../native';

/**
 * File du « joueur au hasard » (WebSocket vers /api/lobby) : on donne son pseudo dans le
 * premier message (pas dans l'adresse), puis on attend qu'un autre joueur
 * arrive ; la salle d'attente nous donne alors un code de salle et le pseudo de l'adversaire.
 */
export class LobbyClient {
  private ws: WebSocket | null = null;
  private done = false;

  constructor(
    private name: string,
    private onMatch: (code: string, opponent: string, host: boolean) => void,
    private onFail: () => void,
  ) {}

  connect(): void {
    const ws = new WebSocket(`${socketBase()}/api/lobby`);
    this.ws = ws;
    ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', name: this.name })));
    ws.addEventListener('message', (e) => {
      let m: LobbyMsg;
      try {
        m = JSON.parse(String(e.data)) as LobbyMsg;
      } catch {
        return;
      }
      if (m.t === 'match' && isRoomCode(String(m.code)) && !this.done) {
        const opponent = typeof m.opponent === 'string' ? m.opponent : '';
        this.done = true;
        this.onMatch(m.code, opponent, m.host === true);
      }
    });
    ws.addEventListener('close', () => {
      if (!this.done) {
        this.done = true;
        this.onFail();
      }
    });
  }

  /** Quitte la file (abandon ou délai dépassé). */
  close(): void {
    this.done = true;
    this.ws?.close();
    this.ws = null;
  }
}
