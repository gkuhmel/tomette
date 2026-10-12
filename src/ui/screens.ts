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

export function homeScreen(): { screen: Screen; modes: HTMLElement; howto: HTMLElement } {
  const modes = el('div', { class: 'mode-list' });
  const howto = el('button', { type: 'button', class: 'btn' }, ['Comment jouer']);
  const screen = new Screen('screen-home', [
    el('h1', {}, ['Tomettes']),
    modes,
    el('div', { class: 'home-buttons' }, [howto]),
  ]);
  return { screen, modes, howto };
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
  replay: HTMLElement;
  menu: HTMLElement;
} {
  const title = el('h2', {}, ['Partie terminée']);
  const score = el('p', { class: 'score' });
  const record = el('p', { class: 'best' });
  const replay = el('button', { type: 'button', class: 'btn primary' }, ['Rejouer']);
  const menu = el('button', { type: 'button', class: 'btn' }, ['Menu']);
  const screen = new Screen('screen-over', [
    title,
    score,
    record,
    el('div', { class: 'home-buttons' }, [replay, menu]),
  ]);
  return { screen, title, score, record, replay, menu };
}

export function pauseScreen(): Screen {
  return new Screen('screen-pause', [el('h2', {}, ['Pause']), el('p', { class: 'cta' }, ['Touche pour reprendre'])]);
}

export function rotateScreen(): Screen {
  return new Screen('screen-rotate', [el('p', { class: 'rotate-icon' }, ['📱']), el('p', {}, ['Tourne ton téléphone'])]);
}
