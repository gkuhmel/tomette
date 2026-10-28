import type { LobbyMsg } from '../core/net';

/**
 * File du « joueur au hasard » (WebSocket vers /api/lobby) : on attend qu'un autre joueur
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
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/lobby?name=${encodeURIComponent(this.name)}`);
    this.ws = ws;
    ws.addEventListener('message', (e) => {
      let m: LobbyMsg;
      try {
        m = JSON.parse(String(e.data)) as LobbyMsg;
      } catch {
        return;
      }
      if (m.t === 'match' && !this.done) {
        this.done = true;
        this.onMatch(m.code, m.opponent, m.host);
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
