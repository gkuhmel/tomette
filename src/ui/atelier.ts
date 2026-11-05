import { ATELIER_STAGES, BonItem, itemFinished, itemStep, itemTotal, MAX_TIPS } from '../core/atelier';
import { DIFFICULTIES, Difficulty } from '../core/difficulty';
import { Key, t } from '../i18n';
import { el } from './dom';
import { orderSvg } from './order-chip';
import { Screen } from './screens';
import { load, remove, save } from './storage';

/*
 * L'Atelier : record, partie en cours, écran de présentation, bandeau du bon de commande
 * pendant la partie, écran entre deux manches.
 */

const KEY = 'tomettes.atelier';
const RUN_KEY = 'tomettes.atelierRun';
const DELIVERED_KEY = 'tomettes.atelierDelivered';

export interface AtelierRecord {
  best: number;
  bestStage: number;
}

export function loadAtelier(): AtelierRecord {
  try {
    const raw = load(KEY);
    return raw ? { best: 0, bestStage: 0, ...JSON.parse(raw) } : { best: 0, bestStage: 0 };
  } catch {
    return { best: 0, bestStage: 0 };
  }
}

/** Enregistre un atelier fini ; renvoie true si c'est un nouveau record. */
export function saveAtelier(score: number, stage: number): boolean {
  const r = loadAtelier();
  save(KEY, JSON.stringify({ best: Math.max(r.best, score), bestStage: Math.max(r.bestStage, stage) }));
  return score > r.best;
}

/** Commandes livrées depuis toujours (succès « 100 commandes ») ; ajoute `n` et renvoie le total. */
export function addDelivered(n: number): number {
  const total = (Number(load(DELIVERED_KEY)) || 0) + n;
  save(DELIVERED_KEY, String(total));
  return total;
}

/** Atelier en cours, gardé entre deux sessions (reprise au début de la manche). */
export interface SavedAtelier {
  /** Manche à jouer. */
  stage: number;
  score: number;
  tips: number;
  time: number;
  delivered: number;
  seed: number;
  difficulty: Difficulty;
}

export function loadAtelierRun(): SavedAtelier | null {
  try {
    const raw = load(RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as SavedAtelier;
    const ok =
      Number.isInteger(r.stage) && r.stage >= 1 && r.stage <= ATELIER_STAGES &&
      typeof r.score === 'number' && typeof r.seed === 'number' && DIFFICULTIES.includes(r.difficulty);
    if (!ok) return null;
    return { ...r, tips: Math.max(0, Math.min(MAX_TIPS, r.tips || 0)), time: r.time || 0, delivered: r.delivered || 0 };
  } catch {
    return null;
  }
}

export function saveAtelierRun(r: SavedAtelier): void {
  save(RUN_KEY, JSON.stringify(r));
}

export function clearAtelierRun(): void {
  remove(RUN_KEY);
}

/** Une règle de l'atelier : pictogramme dans une tomette, titre, explication. */
function rule(emoji: string, color: string, n: number): HTMLElement {
  return el('div', { class: 'exp-rule' }, [
    el('span', { class: 'card-badge', style: `--c:${color}` }, [emoji]),
    el('span', {}, [el('strong', {}, [t(`atl.r${n}.t` as Key)]), el('small', {}, [t(`atl.r${n}.p` as Key)])]),
  ]);
}

export interface AtelierIntroHandlers {
  start(): void;
  resume(): void;
  abandon(): void;
  back(): void;
}

/** Présentation de l'atelier, avec reprise ou abandon de celui en cours. */
export function atelierIntroScreen(h: AtelierIntroHandlers): Screen & { open(saved: SavedAtelier | null, diffName: string, note?: string): void } {
  const hero = el('div', { class: 'exp-hero atl-hero' });
  hero.innerHTML = orderSvg({ kind: 'triangle', color: 1 });
  const meta = el('p', { class: 'exp-meta' });
  const freeNote = el('p', { class: 'exp-free' });
  const saved = el('div', { class: 'exp-saved' });
  const main = el('button', { type: 'button', class: 'btn primary' });
  const abandon = el('button', { type: 'button', class: 'btn danger' }, [t('exp.abandon')]);
  const back = el('button', { type: 'button', class: 'btn' }, [t('common.back')]);
  let hasRun = false;
  main.addEventListener('click', () => (hasRun ? h.resume() : h.start()));
  abandon.addEventListener('click', () => {
    if (window.confirm(t('atl.abandonConfirm'))) h.abandon();
  });
  back.addEventListener('click', () => h.back());
  const screen = new Screen('screen-atelier', [
    el('div', { class: 'panel exp-intro' }, [
      hero,
      el('h2', {}, [t('mode.atelier.name')]),
      el('p', { class: 'exp-tagline' }, [t('atl.tagline')]),
      saved,
      el('div', { class: 'exp-rules' }, [
        rule('📋', 'var(--t3)', 1),
        rule('❤️', 'var(--t0)', 2),
        rule('🪙', 'var(--t1)', 3),
        rule('🏆', 'var(--t4)', 4),
      ]),
      meta,
      freeNote,
      el('div', { class: 'home-buttons' }, [main, el('div', { class: 'exp-row' }, [back, abandon])]),
    ]),
  ]);
  return Object.assign(screen, {
    open(run: SavedAtelier | null, diffName: string, note = '') {
      hasRun = !!run;
      const rec = loadAtelier();
      meta.replaceChildren(
        el('span', {}, [`${t('diff.label')} : ${diffName}`]),
        el('span', {}, [rec.best ? t('exp.best', { n: rec.best, s: rec.bestStage }) : t('exp.noBest')]),
      );
      freeNote.textContent = note;
      freeNote.hidden = !note;
      saved.hidden = !run;
      saved.replaceChildren(
        ...(run
          ? [
              el('strong', {}, [t('atl.saved')]),
              el('span', { class: 'exp-saved-line' }, [t('atl.savedLine', { n: run.stage, score: run.score, tips: run.tips })]),
              el('small', {}, [t('exp.savedHint')]),
            ]
          : []),
      );
      main.textContent = run ? t('exp.resume', { n: run.stage }) : t('atl.start');
      abandon.hidden = !run;
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}

/**
 * Bandeau du bon de commande, sous le score : une pastille par ligne (motif à livrer,
 * avancement), cochée une fois livrée. Avec un pourboire, toucher une ligne propose de
 * la sauter ; un second appui confirme.
 */
export function bonStrip(onSkip: (index: number) => void): { root: HTMLElement; update(bon: readonly BonItem[] | null, tips: number): void } {
  const root = el('div', { class: 'bon-strip' });
  let key = '';
  let armed = -1;
  let armTimer = 0;
  let tipsNow = 0;
  const render = (bon: readonly BonItem[], tips: number) => {
    root.replaceChildren(
      ...bon.map((i, index) => {
        const done = itemFinished(i);
        const b = el('button', { type: 'button', class: `bon-item${done ? ' done' : ''}${index === armed ? ' armed' : ''}` });
        if (index === armed) b.append(el('small', {}, [t('atl.skip')]));
        else {
          const art = el('span', { class: 'bon-art' });
          art.innerHTML = orderSvg({ kind: itemStep(i), color: i.color });
          b.append(art);
          if (done) b.append(el('b', {}, ['✓']));
          else if (itemTotal(i) > 1) b.append(el('small', {}, [`${i.done}/${itemTotal(i)}`]));
        }
        b.disabled = done;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (done || tipsNow <= 0) return;
          window.clearTimeout(armTimer);
          if (armed === index) {
            armed = -1;
            onSkip(index);
            return;
          }
          armed = index;
          key = '';
          // Sans confirmation dans les 2 s, la pastille redevient normale.
          armTimer = window.setTimeout(() => {
            armed = -1;
            key = '';
          }, 2000);
        });
        return b;
      }),
      ...(tips > 0 ? [el('span', { class: 'bon-tips' }, [`🪙${tips > 1 ? `×${tips}` : ''}`])] : []),
    );
  };
  return {
    root,
    update(bon, tips) {
      tipsNow = tips;
      const k = bon ? `${bon.map((i) => `${i.done}`).join(',')}|${tips}|${armed}` : '';
      if (k === key) return;
      key = k;
      root.hidden = !bon;
      if (bon) render(bon, tips);
      else root.replaceChildren();
    },
  };
}

/** Écran entre deux manches : manche livrée, pourboire éventuel, score. */
export function atelierBreakScreen(onNext: () => void, onMenu: () => void): Screen & { open(stage: number, score: number, tipEarned: boolean, tips: number): void } {
  const title = el('h1', { class: 'title dr-title' });
  const sub = el('p', { class: 'dr-sub' });
  const tip = el('p', { class: 'atl-tip' });
  const tipsLine = el('p', { class: 'exp-free' });
  const next = el('button', { type: 'button', class: 'btn primary' }, [t('atl.next')]);
  next.addEventListener('click', onNext);
  const menu = el('button', { type: 'button', class: 'btn' }, [t('common.menu')]);
  menu.addEventListener('click', onMenu);
  const screen = new Screen('screen-atelier-break', [
    el('div', { class: 'panel exp-panel' }, [title, sub, tip, tipsLine, el('div', { class: 'home-buttons' }, [next, menu])]),
  ]);
  return Object.assign(screen, {
    open(stage: number, score: number, tipEarned: boolean, tips: number) {
      title.textContent = t('atl.stageWon', { n: stage });
      sub.textContent = t('atl.runScore', { n: score });
      tip.textContent = t(tipEarned ? 'atl.tip' : 'atl.noTip');
      tipsLine.textContent = t('atl.tips', { n: tips });
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}
