import type { Config } from '../config';
import { Ai, AI_PROFILES, AiSkill } from '../core/ai';
import { duelConfig } from '../core/duel';
import { Game, STEP_MS } from '../core/game';
import { LinkedDuel, NetStats, packView, ServerMsg } from '../core/net';
import { OnlineClient } from './client';

/** Le robot abandonne une salle restée vide aussi longtemps. */
const IDLE_MS = 5 * 60 * 1000;

/**
 * Ami robot (mode développeur) : un second joueur qui se connecte vraiment à la salle
 * par le serveur, fait tourner sa propre partie jouée par l'ordinateur, envoie ses
 * attaques et sa grille, et accepte les revanches. Sert à tester le duel en ligne sans ami.
 */
export class RobotFriend {
  private client: OnlineClient;
  private game: Game | null = null;
  private linked: LinkedDuel | null = null;
  private ai: Ai | null = null;
  private timer = 0;
  private idle = 0;
  private playFrom = 0;
  private last = 0;
  private acc = 0;
  private lastState = 0;
  private finished = false;
  stopped = false;

  constructor(
    readonly code: string,
    private cfg: Config,
    private countdownMs: number,
    private skill: AiSkill = 'normal',
  ) {
    this.client = new OnlineClient(code, (m) => this.onMessage(m), () => this.stop());
  }

  start(): void {
    this.client.connect();
    this.idle = window.setTimeout(() => this.stop(), IDLE_MS);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    window.clearInterval(this.timer);
    window.clearTimeout(this.idle);
    this.client.close();
  }

  private stats(): NetStats {
    const g = this.game!;
    return { score: g.score, sent: this.linked?.sent ?? 0, chain: g.stats.maxChain, rosaces: g.rosaceCount };
  }

  private onMessage(m: ServerMsg): void {
    switch (m.t) {
      case 'start':
        window.clearTimeout(this.idle);
        // Même graine que le joueur : les deux parties démarrent sur la même grille.
        this.game = new Game(duelConfig(this.cfg), m.seed, { mode: 'online' });
        this.linked = new LinkedDuel(this.game);
        this.ai = new Ai(this.game, AI_PROFILES[this.skill], m.seed ^ 0x7a11);
        this.finished = false;
        this.acc = 0;
        // Même compte à rebours que le joueur.
        this.playFrom = performance.now() + this.countdownMs;
        this.last = this.playFrom;
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => this.tick(), 50);
        break;
      case 'attack':
        this.linked?.receive(m.a);
        break;
      case 'over':
        // Le joueur a perdu : la partie du robot s'arrête là.
        this.finished = true;
        break;
      case 'rematchAsked':
        window.setTimeout(() => this.client.send({ t: 'rematch' }), 1200);
        break;
      case 'left':
      case 'full':
        this.stop();
        break;
    }
  }

  private tick(): void {
    const g = this.game;
    const now = performance.now();
    if (!g || !this.linked || !this.ai || this.finished || now < this.playFrom) return;
    this.acc += Math.min(500, now - this.last);
    this.last = now;
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS;
      this.ai.update(STEP_MS);
      g.tick(STEP_MS);
      const out = this.linked.step(STEP_MS / 1000);
      if (out.length) this.client.send({ t: 'attack', a: out });
      this.linked.eventsCleared();
      g.events.length = 0;
      g.signals.length = 0;
      g.notices.length = 0;
      if (g.over) {
        this.finished = true;
        this.client.send({ t: 'over', stats: this.stats() });
        return;
      }
    }
    if (now - this.lastState > 200) {
      this.lastState = now;
      this.client.send({ t: 'state', view: packView(g), stats: this.stats(), pending: this.linked.pending.length });
    }
  }
}
