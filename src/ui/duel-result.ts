import { t } from '../i18n';
import { el } from './dom';
import { roundHexPathD } from './hex-ui';

export interface DuelSide {
  score: number;
  sent: number;
  chain: number;
  rosaces: number;
}

export interface DuelResultData {
  result: 'win' | 'lose' | 'draw';
  /** Niveau de l'ordinateur (déjà traduit) et durée (m:ss). */
  level: string;
  time: string;
  me: DuelSide;
  cpu: DuelSide;
  wins: number;
  losses: number;
  streak: number;
}

const HEX = roundHexPathD(50, 43.3, 49, 9);
const INNER = roundHexPathD(50, 43.3, 38, 7);

/** Médaille hexagonale : trophée doré (victoire), tomette fêlée grise (défaite), balance (égalité). */
function medal(result: DuelResultData['result']): string {
  const [outer, inner] = result === 'win' ? ['#f2c94c', '#e8b53b'] : result === 'lose' ? ['#a9b3c8', '#97a2b9'] : ['#9fc3e6', '#8ab2da'];
  const art =
    result === 'win'
      ? '<path d="M38 26h24v14a12 12 0 0 1-24 0z" fill="#fff"/><path d="M38 30h-7a8 8 0 0 0 8 10M62 30h7a8 8 0 0 1-8 10M50 52v8M42 64h16" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : result === 'lose'
        ? '<path d="M50 14l-6 18 10 8-8 14 6 18" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
        : '<path d="M30 40h40M50 26v36M36 62h28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>';
  return `<svg class="medal" viewBox="0 0 100 86.6" aria-hidden="true"><path d="${HEX}" fill="${outer}"/><path d="${INNER}" fill="${inner}"/>${art}</svg>`;
}

function hexDot(color: string): string {
  return `<svg class="dot" viewBox="0 0 100 86.6" aria-hidden="true"><path d="${HEX}" fill="${color}"/></svg>`;
}

function card(who: string, color: string, side: DuelSide, winner: boolean): HTMLElement {
  const head = el('div', { class: 'dr-who' }, [who]);
  head.insertAdjacentHTML('afterbegin', hexDot(color));
  const row = (label: string, value: string) => el('div', { class: 'dr-row' }, [label, el('b', {}, [value])]);
  return el('div', { class: `dr-card${winner ? ' winner' : ''}` }, [
    ...(winner ? [el('span', { class: 'dr-crown' }, ['👑'])] : []),
    head,
    el('div', { class: 'dr-score' }, [side.score.toLocaleString()]),
    row(t('duel.sent'), String(side.sent)),
    row(t('duel.chain'), `×${side.chain}`),
    row(t('stat.rosaces'), String(side.rosaces)),
  ]);
}

/** Bloc de fin de duel (proposition « Médaille ») ; les confettis de tomettes accompagnent une victoire. */
export function duelResult(d: DuelResultData): HTMLElement {
  const top = el('div', { class: 'dr-medal' });
  top.innerHTML = medal(d.result);
  const confetti = el('div', { class: 'dr-confetti' });
  if (d.result === 'win') {
    const colors = ['var(--t0)', 'var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];
    for (let i = 0; i < 18; i++) {
      const s = 8 + ((i * 37) % 14);
      const piece = el('i', {
        style: `left:${(i * 53) % 100}%;width:${s}px;height:${s * 0.866}px;background:${colors[i % 6]};animation-delay:${(i % 6) * 0.35}s;animation-duration:${2.6 + (i % 5) * 0.5}s`,
      });
      confetti.append(piece);
    }
  }
  const streak = d.result === 'win' && d.streak >= 2 ? ` · ${t('duel.streak', { n: d.streak })}` : '';
  return el('div', { class: `duel-result ${d.result}` }, [
    confetti,
    top,
    el('h1', { class: 'title dr-title' }, [t(`duel.${d.result}`)]),
    el('p', { class: 'dr-sub' }, [t('duel.sub', { level: d.level, time: d.time })]),
    el('div', { class: 'dr-cards' }, [
      card(t('duel.you'), 'var(--t1)', d.me, d.result === 'win'),
      card(t('hud.cpu'), 'var(--t0)', d.cpu, d.result === 'lose'),
    ]),
    el('p', { class: 'dr-record' }, [
      `${d.level} : `,
      el('span', { class: 'w' }, [t('duel.winsN', { n: d.wins })]),
      ' · ',
      el('span', { class: 'l' }, [t('duel.lossesN', { n: d.losses })]),
      streak,
    ]),
  ]);
}
