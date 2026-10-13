import type { Game } from '../core/game';
import { MODES } from '../core/modes';
import { Achievement, ACHIEVEMENTS, emptyTotals, newlyUnlocked, Snapshot, Totals, withGame } from '../core/progress';
import { el, formatTime } from './dom';
import { Screen } from './screens';
import { load, loadBest, save } from './storage';

const TOTALS_KEY = 'tomettes.stats';
const UNLOCKED_KEY = 'tomettes.achievements';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = load(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const snapshot = (g: Game): Snapshot => ({
  mode: g.mode.id,
  score: g.score,
  elapsed: g.elapsed,
  rosaces: g.rosaceCount,
  stats: g.stats,
});

/** Statistiques et succès : sauvegarde, vérification en direct, notifications. */
export class Progress {
  totals: Totals = readJson(TOTALS_KEY, emptyTotals());
  unlocked = new Set<string>(readJson<{ ids: string[] }>(UNLOCKED_KEY, { ids: [] }).ids);
  private toast: HTMLDivElement;
  private queue: Achievement[] = [];
  private showing = false;

  constructor() {
    this.toast = el('div', { id: 'toast' });
    this.toast.hidden = true;
    document.body.append(this.toast);
  }

  private unlock(list: Achievement[]): Achievement[] {
    if (!list.length) return list;
    for (const a of list) this.unlocked.add(a.id);
    save(UNLOCKED_KEY, JSON.stringify({ ids: [...this.unlocked] }));
    this.queue.push(...list);
    this.next();
    return list;
  }

  /** Pendant la partie : débloque ce qui est déjà acquis. */
  checkLive(game: Game): void {
    const s = snapshot(game);
    this.unlock(newlyUnlocked(withGame(this.totals, s, false), s, this.unlocked));
  }

  /** Fin de partie : enregistre les statistiques et renvoie les nouveaux succès. */
  finish(game: Game): Achievement[] {
    const s = snapshot(game);
    this.totals = withGame(this.totals, s, true);
    save(TOTALS_KEY, JSON.stringify(this.totals));
    return this.unlock(newlyUnlocked(this.totals, s, this.unlocked));
  }

  private next(): void {
    if (this.showing) return;
    const a = this.queue.shift();
    if (!a) return;
    this.showing = true;
    this.toast.replaceChildren(el('span', { class: 'toast-icon' }, ['🏆']), el('span', {}, [el('strong', {}, [a.name]), el('small', {}, [a.desc])]));
    this.toast.hidden = false;
    this.toast.classList.remove('out');
    window.setTimeout(() => this.toast.classList.add('out'), 2400);
    window.setTimeout(() => {
      this.toast.hidden = true;
      this.showing = false;
      this.next();
    }, 2800);
  }
}

/** Écran « Succès et statistiques ». */
export function progressScreen(progress: Progress, onBack: () => void): Screen & { refresh(): void } {
  const body = el('div');
  const back = el('button', { type: 'button', class: 'btn primary' }, ['Retour']);
  back.addEventListener('click', onBack);
  const screen = new Screen('screen-progress', [el('div', { class: 'panel' }, [el('h2', {}, ['Succès']), body, el('div', { class: 'home-buttons' }, [back])])]);

  const refresh = () => {
    const t = progress.totals;
    const stat = (label: string, value: string) => el('div', { class: 'stat' }, [el('strong', {}, [value]), el('small', {}, [label])]);
    const records = MODES.map((m) => {
      const r = loadBest(m.id);
      return stat(`Record ${m.name}`, r ? (m.record === 'rosaces' ? `${r} 🌸` : String(r)) : '—');
    });
    const done = ACHIEVEMENTS.filter((a) => progress.unlocked.has(a.id)).length;
    body.replaceChildren(
      el('p', { class: 'progress-count' }, [`${done} / ${ACHIEVEMENTS.length} débloqués`]),
      el(
        'div',
        { class: 'ach-list' },
        ACHIEVEMENTS.map((a) =>
          el('div', { class: `ach${progress.unlocked.has(a.id) ? ' on' : ''}` }, [
            el('span', { class: 'ach-icon' }, [progress.unlocked.has(a.id) ? '🏆' : '🔒']),
            el('span', {}, [el('strong', {}, [a.name]), el('small', {}, [a.desc])]),
          ]),
        ),
      ),
      el('h3', {}, ['Statistiques']),
      el('div', { class: 'stat-grid' }, [
        stat('Parties', String(t.games)),
        stat('Temps de jeu', formatTime(t.timeS)),
        stat('Tuiles alignées', String(t.tiles)),
        stat('Rosaces', String(t.rosaces)),
        stat('Meilleure chaîne', `×${t.bestChain}`),
        stat('Meilleur combo', String(t.bestCombo)),
        stat('Niveau max', String(t.bestLevel)),
        stat('Tomettes d\'or', String(t.gold)),
        ...records,
      ]),
    );
  };
  refresh();
  return Object.assign(screen, { refresh });
}
