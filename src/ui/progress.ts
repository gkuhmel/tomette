import type { Game } from '../core/game';
import { MODES } from '../core/modes';
import { Achievement, ACHIEVEMENTS, emptyTotals, newlyUnlocked, Snapshot, Totals, withGame } from '../core/progress';
import { Key, t } from '../i18n';
import { el, formatTime } from './dom';
import { achDesc, achName, modeName } from './text';
import { Screen } from './screens';
import { load, loadBest, loadDifficulty, save } from './storage';

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

export const snapshot = (g: Game): Snapshot => ({
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
    this.toast.replaceChildren(el('span', { class: 'toast-icon' }, ['🏆']), el('span', {}, [el('strong', {}, [achName(a.id)]), el('small', {}, [achDesc(a.id)])]));
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
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', onBack);
  const screen = new Screen('screen-progress', [
    el('div', { class: 'panel' }, [el('h2', {}, [t('common.achievements')]), body, el('div', { class: 'home-buttons' }, [back])]),
  ]);

  const refresh = () => {
    const tot = progress.totals;
    const stat = (label: string, value: string) => el('div', { class: 'stat' }, [el('strong', {}, [value]), el('small', {}, [label])]);
    const records = MODES.map((m) => {
      const d = loadDifficulty();
      const r = loadBest(m.id, d);
      const label = t('stat.record', { mode: modeName(m.id) }) + (d === 'normal' ? '' : ` · ${t(`diff.${d}` as Key)}`);
      return stat(label, r ? (m.record === 'rosaces' ? `${r} 🌸` : String(r)) : '—');
    });
    const done = ACHIEVEMENTS.filter((a) => progress.unlocked.has(a.id)).length;
    body.replaceChildren(
      el('p', { class: 'progress-count' }, [t('prog.unlocked', { n: done, total: ACHIEVEMENTS.length })]),
      el(
        'div',
        { class: 'ach-list' },
        ACHIEVEMENTS.map((a) =>
          el('div', { class: `ach${progress.unlocked.has(a.id) ? ' on' : ''}` }, [
            el('span', { class: 'ach-icon' }, [progress.unlocked.has(a.id) ? '🏆' : '🔒']),
            el('span', {}, [el('strong', {}, [achName(a.id)]), el('small', {}, [achDesc(a.id)])]),
          ]),
        ),
      ),
      el('h3', {}, [t('prog.stats')]),
      el('div', { class: 'stat-grid' }, [
        stat(t('stat.games'), String(tot.games)),
        stat(t('stat.time'), formatTime(tot.timeS)),
        stat(t('stat.tiles'), String(tot.tiles)),
        stat(t('stat.rosaces'), String(tot.rosaces)),
        stat(t('stat.chain'), `×${tot.bestChain}`),
        stat(t('stat.combo'), String(tot.bestCombo)),
        stat(t('stat.level'), String(tot.bestLevel)),
        stat(t('stat.gold'), String(tot.gold)),
        ...records,
      ]),
    );
  };
  refresh();
  return Object.assign(screen, { refresh });
}
