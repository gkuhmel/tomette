import { t } from '../i18n';
import { el } from './dom';
import { hexButton, HexButtonParts, rosaceMenu } from './hex-ui';
import { modeName } from './text';

/** Écran plein (accueil, fin de partie, pause, réglages, orientation…). */
export class Screen {
  readonly root: HTMLDivElement;

  constructor(id: string, children: (Node | string)[]) {
    this.root = el('div', { class: 'screen', id }, children);
    this.root.hidden = true;
    document.body.append(this.root);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

}

export interface HomeScreen {
  screen: Screen;
  difficulty: HTMLElement;
  play: HexButtonParts;
  timeAttack: HexButtonParts;
  mosaic: HexButtonParts;
  express: HexButtonParts;
  progress: HexButtonParts;
  settings: HexButtonParts;
  howto: HexButtonParts;
  bestClassic: HTMLElement;
  totalRosaces: HTMLElement;
}

/** Accueil : titre, rosace de boutons (modes au centre et autour), difficulté, records. */
export function homeScreen(): HomeScreen {
  const difficulty = el('div', { class: 'diff-list', role: 'radiogroup', 'aria-label': t('diff.label') });
  const play = hexButton('var(--primary)', 'play', t('common.play'), true);
  const timeAttack = hexButton('var(--t0)', 'clock', modeName('timeAttack'));
  const mosaic = hexButton('var(--t4)', 'flower', modeName('mosaic'));
  const settings = hexButton('var(--t5)', 'gear', t('common.settings'));
  const progress = hexButton('var(--t3)', 'trophy', t('common.achievements'));
  const howto = hexButton('var(--t1)', 'help', t('common.help'));
  const express = hexButton('var(--t2)', 'bolt', modeName('express'));
  const bestClassic = el('b');
  const totalRosaces = el('b');
  const screen = new Screen('screen-home', [
    el('div', { class: 'home-top' }, [el('h1', { class: 'title' }, ['Tomettes']), el('small', { class: 'tagline' }, [t('home.tagline')])]),
    rosaceMenu(play, [timeAttack, mosaic, settings, progress, howto, express]),
    difficulty,
    el('div', { class: 'recbar' }, [
      el('span', {}, [t('home.bestClassic'), bestClassic]),
      el('span', {}, [t('home.totalRosaces'), totalRosaces]),
    ]),
  ]);
  return { screen, difficulty, play, timeAttack, mosaic, express, progress, settings, howto, bestClassic, totalRosaces };
}

export function gameOverScreen(): {
  screen: Screen;
  title: HTMLElement;
  score: HTMLElement;
  record: HTMLElement;
  unlocked: HTMLElement;
  replay: HTMLElement;
  menu: HTMLElement;
} {
  const title = el('h2', {}, [t('over.title')]);
  const score = el('p', { class: 'score' });
  const record = el('p', { class: 'best' });
  const unlocked = el('div', { class: 'over-ach' });
  const replay = el('button', { type: 'button', class: 'btn primary' }, [t('common.replay')]);
  const menu = el('button', { type: 'button', class: 'btn' }, [t('common.menu')]);
  const screen = new Screen('screen-over', [
    title,
    score,
    record,
    unlocked,
    el('div', { class: 'home-buttons' }, [replay, menu]),
  ]);
  return { screen, title, score, record, unlocked, replay, menu };
}

export interface PauseScreen {
  screen: Screen;
  stats: HTMLElement;
  resume: HTMLElement;
  restart: HTMLElement;
  settings: HTMLElement;
  sound: HTMLElement;
  music: HTMLElement;
  howto: HTMLElement;
  menu: HTMLElement;
}

/** Pause : la partie floutée derrière, une rosace d'actions par-dessus. */
export function pauseScreen(): PauseScreen {
  const resume = hexButton('var(--primary)', 'play', t('common.resume'), true);
  const restart = hexButton('var(--t1)', 'restart', t('common.restart'));
  const settings = hexButton('var(--t5)', 'gear', t('common.settings'));
  const sound = hexButton('var(--t3)', 'sound', t('common.sound'));
  const music = hexButton('var(--t4)', 'music', t('common.music'));
  const howto = hexButton('var(--t2)', 'help', t('common.help'));
  const menu = hexButton('var(--t0)', 'home', t('common.menu'));
  const stats = el('small', { class: 'tagline' });
  const screen = new Screen('screen-pause', [
    el('div', { class: 'home-top' }, [el('h1', { class: 'title' }, [t('common.pause')]), stats]),
    rosaceMenu(resume, [restart, settings, sound, music, howto, menu]),
  ]);
  return {
    screen,
    stats,
    resume: resume.button,
    restart: restart.button,
    settings: settings.button,
    sound: sound.button,
    music: music.button,
    howto: howto.button,
    menu: menu.button,
  };
}

export function rotateScreen(): Screen {
  return new Screen('screen-rotate', [el('p', { class: 'rotate-icon' }, ['📱']), el('p', {}, [t('common.rotate')])]);
}
