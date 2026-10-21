import { STAGE_COUNT, stageOpen } from '../core/campaign';
import { t } from '../i18n';
import { el } from './dom';
import { Screen } from './screens';
import { load, save } from './storage';

const KEY = 'tomettes.campaign';

/** Meilleures étoiles par manche (0 = pas encore réussie). */
export function loadStars(): number[] {
  try {
    const raw = load(KEY);
    const v = raw ? (JSON.parse(raw) as { stars?: number[] }).stars : null;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Enregistre un résultat ; renvoie true si c'est un nouveau meilleur résultat. */
export function saveStars(stage: number, stars: number): boolean {
  const list = loadStars();
  if ((list[stage - 1] ?? 0) >= stars) return false;
  for (let i = 0; i < stage; i++) list[i] = list[i] ?? 0;
  list[stage - 1] = stars;
  save(KEY, JSON.stringify({ stars: list }));
  return true;
}

export const totalStars = (list = loadStars()) => list.reduce((n, s) => n + (s || 0), 0);

export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

/** Écran Campagne : les 30 manches en nid d'abeille, avec leurs étoiles. */
export function campaignScreen(onPick: (stage: number) => void, onBack: () => void): Screen & { refresh(): void } {
  const total = el('p', { class: 'campaign-total' });
  const grid = el('div', { class: 'stage-grid' });
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', onBack);
  const screen = new Screen('screen-campaign', [
    el('div', { class: 'panel' }, [
      el('h2', {}, [t('mode.campaign.name')]),
      el('p', { class: 'campaign-intro' }, [t('camp.intro')]),
      total,
      grid,
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
  const refresh = () => {
    const stars = loadStars();
    total.textContent = t('camp.total', { n: totalStars(stars), total: STAGE_COUNT * 3 });
    grid.replaceChildren(
      ...Array.from({ length: STAGE_COUNT }, (_, i) => {
        const n = i + 1;
        const open = stageOpen(n, stars);
        const got = stars[i] ?? 0;
        const b = el('button', { type: 'button', class: `stage-btn${open ? '' : ' locked'}${got ? ' done' : ''}` }, [
          el('b', {}, [open ? String(n) : '🔒']),
          el('small', {}, [open ? starText(got) : '']),
        ]);
        b.disabled = !open;
        b.addEventListener('click', () => onPick(n));
        return b;
      }),
    );
  };
  refresh();
  return Object.assign(screen, { refresh });
}
