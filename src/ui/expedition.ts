import { DIFFICULTIES, Difficulty } from '../core/difficulty';
import { cardById, CARDS, RUN_STAGES } from '../core/expedition';
import { Key, t } from '../i18n';
import { el } from './dom';
import { icon, roundHexPathD } from './hex-ui';
import { Screen } from './screens';
import { load, remove, save } from './storage';

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

/** Expédition en cours, gardée entre deux sessions (reprise au début de la manche). */
export interface SavedRun {
  /** Manche à jouer, ou manche tout juste réussie si `choices` attend un choix. */
  stage: number;
  cards: string[];
  score: number;
  shields: number;
  time: number;
  /** Graine de l'expédition : les cartes proposées en découlent. */
  seed: number;
  difficulty: Difficulty;
  /** Cartes proposées et pas encore choisies. */
  choices?: string[];
}

const RUN_KEY = 'tomettes.run';

export function loadRun(): SavedRun | null {
  try {
    const raw = load(RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as SavedRun;
    const ok =
      Number.isInteger(r.stage) && r.stage >= 1 && r.stage <= RUN_STAGES &&
      Array.isArray(r.cards) && r.cards.every((id) => cardById(id)) &&
      typeof r.score === 'number' && typeof r.seed === 'number' && DIFFICULTIES.includes(r.difficulty);
    if (!ok) return null;
    const choices = Array.isArray(r.choices) && r.choices.every((id) => cardById(id)) ? r.choices : undefined;
    return { ...r, shields: r.shields || 0, time: r.time || 0, choices };
  } catch {
    return null;
  }
}

export function saveRun(r: SavedRun): void {
  save(RUN_KEY, JSON.stringify(r));
}

export function clearRun(): void {
  remove(RUN_KEY);
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

export interface ExpIntroHandlers {
  start(): void;
  resume(): void;
  abandon(): void;
  back(): void;
}

/** Une règle de l'expédition : pictogramme dans une tomette, titre, explication. */
function rule(emoji: string, color: string, n: number): HTMLElement {
  return el('div', { class: 'exp-rule' }, [
    el('span', { class: 'card-badge', style: `--c:${color}` }, [emoji]),
    el('span', {}, [el('strong', {}, [t(`exp.r${n}.t` as Key)]), el('small', {}, [t(`exp.r${n}.p` as Key)])]),
  ]);
}

/** Présentation de l'expédition, avec reprise ou abandon de celle en cours. */
export function expIntroScreen(h: ExpIntroHandlers): Screen & { open(saved: SavedRun | null, diffName: string): void } {
  const w = 120;
  const hh = 104;
  const hero = el('div', { class: 'exp-hero' });
  hero.innerHTML =
    `<svg class="exp-hero-hex" viewBox="0 0 ${w} ${hh}" aria-hidden="true">` +
    `<path class="halo" d="${roundHexPathD(w / 2, hh / 2, 58, 10)}"/><path d="${roundHexPathD(w / 2, hh / 2, 50, 9)}"/></svg>` +
    `<span class="exp-hero-icon">${icon('compass')}</span>`;
  const meta = el('p', { class: 'exp-meta' });
  const saved = el('div', { class: 'exp-saved' });
  const main = el('button', { type: 'button', class: 'btn primary' });
  const abandon = el('button', { type: 'button', class: 'btn danger' }, [t('exp.abandon')]);
  const back = el('button', { type: 'button', class: 'btn' }, [t('common.back')]);
  let hasRun = false;
  main.addEventListener('click', () => (hasRun ? h.resume() : h.start()));
  abandon.addEventListener('click', () => {
    if (window.confirm(t('exp.abandonConfirm'))) h.abandon();
  });
  back.addEventListener('click', () => h.back());
  const deck = el('div', { class: 'exp-deck' }, CARDS.map((c) => cardBadge(c.id, true)));
  const screen = new Screen('screen-exp', [
    el('div', { class: 'panel exp-intro' }, [
      hero,
      el('h2', {}, [t('mode.expedition.name')]),
      el('p', { class: 'exp-tagline' }, [t('exp.tagline')]),
      saved,
      el('div', { class: 'exp-rules' }, [
        rule('🏁', 'var(--t3)', 1),
        rule('❤️', 'var(--t0)', 2),
        rule('🃏', 'var(--t4)', 3),
        rule('🏆', 'var(--t1)', 4),
      ]),
      el('h3', {}, [t('exp.deck', { n: CARDS.length })]),
      deck,
      meta,
      el('div', { class: 'home-buttons' }, [main, el('div', { class: 'exp-row' }, [back, abandon])]),
    ]),
  ]);
  return Object.assign(screen, {
    open(run: SavedRun | null, diffName: string) {
      hasRun = !!run;
      const rec = loadExp();
      const next = run ? (run.choices ? run.stage + 1 : run.stage) : 1;
      meta.replaceChildren(
        el('span', {}, [`${t('diff.label')} : ${diffName}`]),
        el('span', {}, [rec.best ? t('exp.best', { n: rec.best, s: rec.bestStage }) : t('exp.noBest')]),
      );
      saved.hidden = !run;
      saved.replaceChildren(
        ...(run
          ? [
              el('strong', {}, [t('exp.saved')]),
              el('span', { class: 'exp-saved-line' }, [t('exp.savedLine', { n: next, score: run.score })]),
              ...(run.cards.length ? [el('div', { class: 'exp-deck' }, run.cards.map((id) => cardBadge(id, true)))] : []),
              el('small', {}, [t('exp.savedHint')]),
            ]
          : []),
      );
      main.textContent = run ? t('exp.resume', { n: next }) : t('exp.start');
      abandon.hidden = !run;
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}
