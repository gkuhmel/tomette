import { el } from './dom';
import { roundHexPathD } from './hex-ui';

/**
 * Écran de fin commun (modèle « Médaille ») : médaille hexagonale, titre en relief,
 * sous-titre, une ou deux cartes de chiffres, ligne de bilan. Confettis de tomettes
 * pour les belles fins (victoire, manche réussie, record).
 */
export type MedalTone = 'gold' | 'grey' | 'blue';
export type MedalArt = 'trophy' | 'crack' | 'scale' | 'flag' | 'clock' | 'star';

export interface ResultCard {
  title: string;
  /** Couleur de la pastille devant le titre (variable CSS). */
  color: string;
  big: string;
  rows: [string, string][];
  winner?: boolean;
  dim?: boolean;
}

export interface ResultOptions {
  tone: MedalTone;
  art: MedalArt;
  title: string;
  /** Étoiles de campagne affichées sous le titre (0 = aucune ligne). */
  stars?: number;
  sub: string;
  cards: ResultCard[];
  footer: (Node | string)[];
  confetti?: boolean;
}

const HEX = roundHexPathD(50, 43.3, 49, 9);
const INNER = roundHexPathD(50, 43.3, 38, 7);

const TONES: Record<MedalTone, [string, string]> = {
  gold: ['#f2c94c', '#e8b53b'],
  grey: ['#a9b3c8', '#97a2b9'],
  blue: ['#7fa3ec', '#5f88e0'],
};

const ART: Record<MedalArt, string> = {
  trophy:
    '<path d="M38 26h24v14a12 12 0 0 1-24 0z" fill="#fff"/><path d="M38 30h-7a8 8 0 0 0 8 10M62 30h7a8 8 0 0 1-8 10M50 52v8M42 64h16" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>',
  crack: '<path d="M50 14l-6 18 10 8-8 14 6 18" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>',
  scale: '<path d="M30 40h40M50 26v36M36 62h28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>',
  flag: '<path d="M38 66V20" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M38 22h26l-6 9 6 9H38z" fill="#fff"/>',
  clock: '<circle cx="50" cy="45" r="19" stroke="#fff" stroke-width="5" fill="none"/><path d="M50 35v10l7 5M44 20h12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>',
  star: '<path d="M50 20l7.6 15.4 17 2.5-12.3 12 2.9 16.9L50 58.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" fill="#fff"/>',
};

function medal(tone: MedalTone, art: MedalArt): string {
  const [outer, inner] = TONES[tone];
  return `<svg class="medal" viewBox="0 0 100 86.6" aria-hidden="true"><path d="${HEX}" fill="${outer}"/><path d="${INNER}" fill="${inner}"/>${ART[art]}</svg>`;
}

function card(c: ResultCard): HTMLElement {
  const head = el('div', { class: 'dr-who' }, [c.title]);
  head.insertAdjacentHTML('afterbegin', `<svg class="dot" viewBox="0 0 100 86.6" aria-hidden="true"><path d="${HEX}" fill="${c.color}"/></svg>`);
  return el('div', { class: `dr-card${c.winner ? ' winner' : ''}${c.dim ? ' dim' : ''}` }, [
    ...(c.winner ? [el('span', { class: 'dr-crown' }, ['👑'])] : []),
    head,
    el('div', { class: 'dr-score' }, [c.big]),
    ...c.rows.map(([label, value]) => el('div', { class: 'dr-row' }, [label, el('b', {}, [value])])),
  ]);
}

export function resultBlock(o: ResultOptions): HTMLElement {
  const top = el('div', { class: 'dr-medal' });
  top.innerHTML = medal(o.tone, o.art);
  const confetti = el('div', { class: 'dr-confetti' });
  if (o.confetti) {
    const colors = ['var(--t0)', 'var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];
    for (let i = 0; i < 18; i++) {
      const s = 8 + ((i * 37) % 14);
      confetti.append(
        el('i', {
          style: `left:${(i * 53) % 100}%;width:${s}px;height:${s * 0.866}px;background:${colors[i % 6]};animation-delay:${(i % 6) * 0.35}s;animation-duration:${2.6 + (i % 5) * 0.5}s`,
        }),
      );
    }
  }
  return el('div', { class: `duel-result ${o.tone}` }, [
    confetti,
    top,
    el('h1', { class: 'title dr-title' }, [o.title]),
    ...(o.stars !== undefined ? [el('p', { class: 'dr-stars' }, ['★'.repeat(o.stars), el('span', {}, ['★'.repeat(3 - o.stars)])])] : []),
    el('p', { class: 'dr-sub' }, [o.sub]),
    el('div', { class: `dr-cards${o.cards.length === 1 ? ' single' : ''}` }, o.cards.map(card)),
    el('p', { class: 'dr-record' }, o.footer),
  ]);
}
