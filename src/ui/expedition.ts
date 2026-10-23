import { RUN_STAGES } from '../core/expedition';
import { Key, t } from '../i18n';
import { el } from './dom';
import { Screen } from './screens';
import { load, save } from './storage';

const KEY = 'tomettes.expedition';

export interface ExpRecord {
  best: number;
  bestStage: number;
}

export function loadExp(): ExpRecord {
  try {
    const raw = load(KEY);
    return raw ? { best: 0, bestStage: 0, ...JSON.parse(raw) } : { best: 0, bestStage: 0 };
  } catch {
    return { best: 0, bestStage: 0 };
  }
}

/** Enregistre une expédition finie ; renvoie true si c'est un nouveau record. */
export function saveExp(score: number, stage: number): boolean {
  const r = loadExp();
  const better = score > r.best;
  save(KEY, JSON.stringify({ best: Math.max(r.best, score), bestStage: Math.max(r.bestStage, stage) }));
  return better;
}

const cardName = (id: string) => t(`card.${id}.name` as Key);

/** Carte : nom, bonus (vert) et contrepartie (rouge). */
export function cardView(id: string, tag: 'button' | 'div' = 'div'): HTMLElement {
  return el(tag as 'div', { class: 'exp-card', ...(tag === 'button' ? { type: 'button' } : {}) }, [
    el('strong', {}, [cardName(id)]),
    el('span', { class: 'plus' }, [`+ ${t(`card.${id}.plus` as Key)}`]),
    el('span', { class: 'minus' }, [`− ${t(`card.${id}.minus` as Key)}`]),
  ]);
}

/** Écran de choix d'une carte entre deux manches. */
export function cardsScreen(onPick: (id: string) => void): Screen & { open(stage: number, score: number, choices: string[], taken: string[]): void } {
  const title = el('h1', { class: 'title dr-title' });
  const sub = el('p', { class: 'dr-sub' });
  const list = el('div', { class: 'exp-choices' });
  const active = el('div', { class: 'exp-active' });
  const screen = new Screen('screen-cards', [
    el('div', { class: 'panel exp-panel' }, [title, sub, el('h3', {}, [t('exp.pick')]), list, active]),
  ]);
  return Object.assign(screen, {
    open(stage: number, score: number, choices: string[], taken: string[]) {
      title.textContent = t('exp.stageWon', { n: stage });
      sub.textContent = t('exp.runScore', { n: score });
      list.replaceChildren(
        ...choices.map((id) => {
          const b = cardView(id, 'button');
          b.addEventListener('click', () => onPick(id));
          return b;
        }),
      );
      active.replaceChildren(
        ...(taken.length ? [el('h3', {}, [t('exp.active')]), el('p', { class: 'exp-taken' }, [taken.map(cardName).join(' · ')])] : []),
      );
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}

/** Bloc Expédition en tête de l'écran Campagne. */
export function expeditionBlock(onStart: () => void): { root: HTMLElement; refresh(): void } {
  const best = el('small', { class: 'exp-best' });
  const start = el('button', { type: 'button', class: 'btn primary' }, [t('exp.start')]);
  start.addEventListener('click', onStart);
  const root = el('div', { class: 'exp-block' }, [
    el('strong', {}, [t('mode.expedition.name')]),
    el('p', {}, [t('exp.intro')]),
    best,
    start,
  ]);
  return {
    root,
    refresh() {
      const r = loadExp();
      best.textContent = r.best ? t('exp.best', { n: r.best, s: Math.min(r.bestStage, RUN_STAGES) }) : '';
    },
  };
}
