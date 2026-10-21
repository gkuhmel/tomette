import type { Game } from '../core/game';
import {
  applyGame, DAILY_XP, emptyMissionState, forDay, GameResult, levelFromXp, LONG_XP, longMission, MissionState,
} from '../core/missions';
import { t } from '../i18n';
import { el } from './dom';
import { snapshot } from './progress';
import { Screen } from './screens';
import { load, save } from './storage';
import { longText, missionText } from './text';

const KEY = 'tomettes.missions';

/** Jour local au format AAAA-MM-JJ (les missions changent à minuit, heure du joueur). */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function read(): MissionState {
  try {
    const raw = load(KEY);
    return raw ? { ...emptyMissionState(), ...JSON.parse(raw) } : emptyMissionState();
  } catch {
    return emptyMissionState();
  }
}

/** Missions du jour, mission au long cours et XP du joueur (sauvegardées). */
export class Missions {
  private s = read();

  /** État à jour pour aujourd'hui (nouvelles missions après minuit). */
  get state(): MissionState {
    const next = forDay(this.s, today());
    if (next !== this.s) {
      this.s = next;
      save(KEY, JSON.stringify(this.s));
    }
    return this.s;
  }

  get level(): ReturnType<typeof levelFromXp> {
    return levelFromXp(this.state.xp);
  }

  /** Fin de partie : avance les missions et ajoute l'XP. */
  finish(game: Game): GameResult & { levelBefore: number; levelAfter: number } {
    const before = this.level.level;
    const r = applyGame(this.state, snapshot(game), today());
    this.s = r.state;
    save(KEY, JSON.stringify(this.s));
    return { ...r, levelBefore: before, levelAfter: levelFromXp(r.state.xp).level };
  }
}

/** Barre de progression horizontale. */
export function bar(value: number, max: number): HTMLElement {
  const fill = el('i');
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100)}%`;
  return el('span', { class: 'bar' }, [fill]);
}

function missionRow(text: string, progress: number, target: number, xp: number, done: boolean): HTMLElement {
  return el('div', { class: `mission${done ? ' done' : ''}` }, [
    el('div', { class: 'mission-head' }, [
      el('strong', {}, [text]),
      el('span', { class: 'mission-xp' }, [done ? `✓ ${t('missions.done')}` : t('missions.reward', { n: xp })]),
    ]),
    el('div', { class: 'mission-foot' }, [bar(progress, target), el('small', {}, [`${Math.min(progress, target)} / ${target}`])]),
  ]);
}

/** Niveau du joueur et barre d'XP. */
export function playerLevel(m: Missions): HTMLElement {
  const lv = m.level;
  return el('div', { class: 'player-level' }, [
    el('strong', {}, [t('player.level', { n: lv.level })]),
    bar(lv.into, lv.need),
    el('small', {}, [t('player.xp', { n: lv.into, need: lv.need })]),
  ]);
}

/** Écran Missions : niveau du joueur, missions du jour et mission au long cours. */
export function missionsScreen(missions: Missions, onBack: () => void): Screen & { refresh(): void } {
  const body = el('div');
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', onBack);
  const screen = new Screen('screen-missions', [
    el('div', { class: 'panel' }, [el('h2', {}, [t('missions.title')]), body, el('div', { class: 'home-buttons' }, [back])]),
  ]);
  const refresh = () => {
    const s = missions.state;
    const long = longMission(s.longIndex);
    body.replaceChildren(
      playerLevel(missions),
      el('h3', {}, [t('missions.daily')]),
      ...s.daily.map((m) => missionRow(missionText(m.id, m.target), m.progress, m.target, DAILY_XP[m.tier], m.done)),
      el('p', { class: 'missions-renew' }, [t('missions.renew')]),
      el('h3', {}, [t('missions.long')]),
      missionRow(longText(long.id, long.target), s.longProgress, long.target, LONG_XP, false),
    );
  };
  refresh();
  return Object.assign(screen, { refresh });
}
