import { el } from './dom';

/** Écran plein (accueil, game over, pause, garde, orientation). */
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

  onTap(fn: () => void): void {
    this.root.addEventListener('pointerup', (e) => {
      e.preventDefault();
      fn();
    });
  }
}

export function homeScreen(): { screen: Screen; modes: HTMLElement; howto: HTMLElement; settings: HTMLElement; progress: HTMLElement } {
  const modes = el('div', { class: 'mode-list' });
  const howto = el('button', { type: 'button', class: 'btn' }, ['Comment jouer']);
  const settings = el('button', { type: 'button', class: 'btn' }, ['Réglages']);
  const progress = el('button', { type: 'button', class: 'btn' }, ['Succès']);
  const screen = new Screen('screen-home', [
    el('h1', {}, ['Tomettes']),
    modes,
    el('div', { class: 'home-row' }, [howto, progress, settings]),
  ]);
  return { screen, modes, howto, settings, progress };
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
  const title = el('h2', {}, ['Partie terminée']);
  const score = el('p', { class: 'score' });
  const record = el('p', { class: 'best' });
  const unlocked = el('div', { class: 'over-ach' });
  const replay = el('button', { type: 'button', class: 'btn primary' }, ['Rejouer']);
  const menu = el('button', { type: 'button', class: 'btn' }, ['Menu']);
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
  const resume = el('button', { type: 'button', class: 'btn primary' }, ['Reprendre']);
  const restart = el('button', { type: 'button', class: 'btn' }, ['Recommencer']);
  const settings = el('button', { type: 'button', class: 'btn' }, ['Réglages']);
  const menu = el('button', { type: 'button', class: 'btn' }, ['Menu']);
  const screen = new Screen('screen-pause', [
    el('h2', {}, ['Pause']),
    el('div', { class: 'home-buttons' }, [resume, restart, settings, menu]),
  ]);
  return { screen, resume, restart, settings, menu };
}

export function rotateScreen(): Screen {
  return new Screen('screen-rotate', [el('p', { class: 'rotate-icon' }, ['📱']), el('p', {}, ['Tourne ton téléphone'])]);
}
