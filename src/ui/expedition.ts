import { cardById, CARDS } from '../core/expedition';
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

const cardIcon = (id: string) => cardById(id)?.icon ?? '🃏';

/** Pictogramme d'une carte dans une tomette colorée. */
export function cardBadge(id: string, small = false): HTMLElement {
  const i = Math.max(0, CARDS.findIndex((c) => c.id === id));
  return el('span', { class: `card-badge${small ? ' small' : ''}`, style: `--c:var(--t${i % 6})`, title: cardName(id) }, [cardIcon(id)]);
}

/** Carte : pictogramme, nom, bonus (vert) et contrepartie (rouge). */
export function cardView(id: string, tag: 'button' | 'div' = 'div'): HTMLElement {
  return el(tag as 'div', { class: 'exp-card', ...(tag === 'button' ? { type: 'button' } : {}) }, [
    cardBadge(id),
    el('span', { class: 'exp-card-text' }, [
      el('strong', {}, [cardName(id)]),
      el('span', { class: 'plus' }, [`+ ${t(`card.${id}.plus` as Key)}`]),
      el('span', { class: 'minus' }, [`− ${t(`card.${id}.minus` as Key)}`]),
    ]),
  ]);
}

/** Rappel des cartes en jeu : liste détaillée (écran de pause). */
export function activeCards(ids: readonly string[]): HTMLElement {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return el(
    'div',
    { class: 'exp-mini-list' },
    [...counts].map(([id, n]) =>
      el('div', { class: 'exp-mini' }, [
        cardBadge(id, true),
        el('span', {}, [
          el('strong', {}, [`${cardName(id)}${n > 1 ? ` ×${n}` : ''}`]),
          el('small', { class: 'plus' }, [t(`card.${id}.plus` as Key)]),
          el('small', { class: 'minus' }, [t(`card.${id}.minus` as Key)]),
        ]),
      ]),
    ),
  );
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
      active.replaceChildren(...(taken.length ? [el('h3', {}, [t('exp.active')]), activeCards(taken)] : []));
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}
