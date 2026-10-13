import { t } from '../i18n';
import { el } from './dom';
import { logoSvg } from './home-bg';

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

export function homeScreen(): {
  screen: Screen;
  difficulty: HTMLElement;
  modes: HTMLElement;
  howto: HTMLElement;
  settings: HTMLElement;
  progress: HTMLElement;
} {
  const difficulty = el('div', { class: 'diff-list', role: 'radiogroup', 'aria-label': t('diff.label') });
  const modes = el('div', { class: 'mode-list' });
  const howto = el('button', { type: 'button', class: 'btn' }, [t('common.howto')]);
  const settings = el('button', { type: 'button', class: 'btn' }, [t('common.settings')]);
  const progress = el('button', { type: 'button', class: 'btn' }, [t('common.achievements')]);
  const logo = el('div', { class: 'logo-wrap' });
  logo.innerHTML = logoSvg(92);
  const screen = new Screen('screen-home', [
    logo,
    el('h1', {}, ['Tomettes']),
    difficulty,
    modes,
    el('div', { class: 'home-row' }, [howto, progress, settings]),
  ]);
  return { screen, difficulty, modes, howto, settings, progress };
}

/** Bouton de mode : nom, sous-titre et record. */
export function modeButton(name: string, tagline: string, record: string, primary: boolean): HTMLButtonElement {
  return el('button', { type: 'button', class: `mode-btn${primary ? ' primary' : ''}` }, [
    el('span', { class: 'mode-name' }, [name]),
    el('span', { class: 'mode-tag' }, [tagline]),
    el('span', { class: 'mode-rec' }, [record]),
  ]);
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

export function pauseScreen(): {
  screen: Screen;
  resume: HTMLElement;
  restart: HTMLElement;
  settings: HTMLElement;
  menu: HTMLElement;
} {
  const resume = el('button', { type: 'button', class: 'btn primary' }, [t('common.resume')]);
  const restart = el('button', { type: 'button', class: 'btn' }, [t('common.restart')]);
  const settings = el('button', { type: 'button', class: 'btn' }, [t('common.settings')]);
  const menu = el('button', { type: 'button', class: 'btn' }, [t('common.menu')]);
  const screen = new Screen('screen-pause', [
    el('h2', {}, [t('common.pause')]),
    el('div', { class: 'home-buttons' }, [resume, restart, settings, menu]),
  ]);
  return { screen, resume, restart, settings, menu };
}

export function rotateScreen(): Screen {
  return new Screen('screen-rotate', [el('p', { class: 'rotate-icon' }, ['📱']), el('p', {}, [t('common.rotate')])]);
}
