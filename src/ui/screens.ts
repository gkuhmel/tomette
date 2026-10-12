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

export function homeScreen(): { screen: Screen; best: HTMLElement } {
  const best = el('p', { class: 'best' });
  const screen = new Screen('screen-home', [
    el('h1', {}, ['Tomettes']),
    best,
    el('p', { class: 'cta' }, ['Touche pour jouer']),
  ]);
  return { screen, best };
}

export function gameOverScreen(): { screen: Screen; score: HTMLElement; record: HTMLElement } {
  const score = el('p', { class: 'score' });
  const record = el('p', { class: 'best' });
  const screen = new Screen('screen-over', [
    el('h2', {}, ['Partie terminée']),
    score,
    record,
    el('p', { class: 'cta' }, ['Rejouer']),
  ]);
  return { screen, score, record };
}

export function pauseScreen(): Screen {
  return new Screen('screen-pause', [el('h2', {}, ['Pause']), el('p', { class: 'cta' }, ['Touche pour reprendre'])]);
}

export function guardScreen(url: string): Screen {
  return new Screen('screen-guard', [
    el('h1', {}, ['Tomettes']),
    el('p', {}, ['Tomettes se joue sur iPhone, dans Safari.']),
    el('p', { class: 'url' }, [url]),
  ]);
}

export function rotateScreen(): Screen {
  return new Screen('screen-rotate', [el('p', { class: 'rotate-icon' }, ['📱']), el('p', {}, ['Tourne ton téléphone'])]);
}
