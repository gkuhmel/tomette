import { t } from '../i18n';
import { el } from './dom';
import { autoFitRosace, hexButton, HexButtonParts, icon, IconName, rosaceMenu } from './hex-ui';
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
  /** Rosace : les modes de jeu (et les missions). */
  play: HexButtonParts;
  timeAttack: HexButtonParts;
  mosaic: HexButtonParts;
  express: HexButtonParts;
  campaign: HexButtonParts;
  duel: HexButtonParts;
  missions: HexButtonParts;
  /** Sous la rosace : ce qui n'est pas un mode de jeu. */
  howto: HTMLElement;
  progress: HTMLElement;
  progressCount: HTMLElement;
  settings: HTMLElement;
  /** Barre du joueur (niveau, XP) : ouvre l'écran Missions. */
  player: HTMLElement;
  playerLevel: HTMLElement;
}

/** Bouton rond de la rangée d'outils (aide, succès, réglages). */
function toolButton(iconName: IconName, label: string, extra?: HTMLElement): HTMLButtonElement {
  const b = el('button', { type: 'button', class: 'tool-btn' }, [el('span', {}, [label]), ...(extra ? [extra] : [])]);
  b.insertAdjacentHTML('afterbegin', icon(iconName));
  return b;
}

/** Accueil : titre, rosace des modes de jeu, outils, difficulté, niveau du joueur. */
export function homeScreen(): HomeScreen {
  const difficulty = el('div', { class: 'diff-list', role: 'radiogroup', 'aria-label': t('diff.label') });
  const play = hexButton('var(--primary)', 'play', t('common.play'), true);
  const duel = hexButton('var(--t0)', 'swords', modeName('duel'));
  const timeAttack = hexButton('var(--t5)', 'clock', modeName('timeAttack'));
  const mosaic = hexButton('var(--t4)', 'flower', modeName('mosaic'));
  const missions = hexButton('var(--t3)', 'target', t('missions.title'));
  const campaign = hexButton('var(--t1)', 'flag', modeName('campaign'));
  const express = hexButton('var(--t2)', 'bolt', modeName('express'));
  // « Tutoriel » : rejoue le tutoriel pas à pas (les règles détaillées sont dans les Réglages).
  const howto = toolButton('help', t('common.tutorial'));
  const progressCount = el('small');
  const progress = toolButton('trophy', t('common.achievements'), progressCount);
  const settings = toolButton('gear', t('common.settings'));
  const playerLevel = el('span', { class: 'pb-level' });
  const player = el('button', { type: 'button', class: 'player-bar' }, [playerLevel]);
  const rosace = rosaceMenu(play, [duel, timeAttack, mosaic, missions, campaign, express]);
  const screen = new Screen('screen-home', [
    el('div', { class: 'home-top' }, [el('h1', { class: 'title' }, ['Tomettes']), el('small', { class: 'tagline' }, [t('home.tagline')])]),
    rosace,
    el('div', { class: 'tool-row' }, [howto, progress, settings]),
    difficulty,
    player,
  ]);
  autoFitRosace(rosace);
  return { screen, difficulty, play, timeAttack, mosaic, express, campaign, duel, missions, howto, progress, progressCount, settings, player, playerLevel };
}

export function gameOverScreen(): {
  screen: Screen;
  title: HTMLElement;
  score: HTMLElement;
  record: HTMLElement;
  unlocked: HTMLElement;
  xp: HTMLElement;
  /** Bloc de fin de duel (vide hors duel). */
  duel: HTMLElement;
  next: HTMLElement;
  replay: HTMLElement;
  menu: HTMLElement;
} {
  const title = el('h2', {}, [t('over.title')]);
  const score = el('p', { class: 'score' });
  const record = el('p', { class: 'best' });
  const unlocked = el('div', { class: 'over-ach' });
  const xp = el('div', { class: 'over-xp' });
  const duel = el('div', { class: 'over-duel' });
  const next = el('button', { type: 'button', class: 'btn primary' }, [t('camp.next')]);
  next.hidden = true;
  const replay = el('button', { type: 'button', class: 'btn primary' }, [t('common.replay')]);
  const menu = el('button', { type: 'button', class: 'btn' }, [t('common.menu')]);
  const screen = new Screen('screen-over', [
    duel,
    title,
    score,
    record,
    el('div', { class: 'over-buttons' }, [next, el('div', { class: 'over-row' }, [replay, menu])]),
    xp,
    unlocked,
  ]);
  return { screen, title, score, record, unlocked, xp, duel, next, replay, menu };
}

export interface PauseScreen {
  screen: Screen;
  stats: HTMLElement;
  /** Cartes d'Expédition en jeu (vide hors expédition). */
  cards: HTMLElement;
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
  const pauseRosace = rosaceMenu(resume, [restart, settings, sound, music, howto, menu]);
  const cards = el('div', { class: 'pause-cards' });
  const screen = new Screen('screen-pause', [
    el('div', { class: 'home-top' }, [el('h1', { class: 'title' }, [t('common.pause')]), stats]),
    pauseRosace,
    cards,
  ]);
  autoFitRosace(pauseRosace);
  return {
    screen,
    stats,
    cards,
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
