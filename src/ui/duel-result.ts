import { t } from '../i18n';
import { el } from './dom';
import { resultBlock } from './result';
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

/** Bloc de fin de duel. */
export function duelResult(d: DuelResultData): HTMLElement {
  const side = (s: DuelSide): [string, string][] => [
    [t('duel.sent'), String(s.sent)],
    [t('duel.chain'), `×${s.chain}`],
    [t('stat.rosaces'), String(s.rosaces)],
  ];
  const streak = d.result === 'win' && d.streak >= 2 ? ` · ${t('duel.streak', { n: d.streak })}` : '';
  return resultBlock({
    tone: d.result === 'win' ? 'gold' : d.result === 'lose' ? 'grey' : 'blue',
    art: d.result === 'win' ? 'trophy' : d.result === 'lose' ? 'crack' : 'scale',
    title: t(`duel.${d.result}`),
    sub: t('duel.sub', { level: d.level, time: d.time }),
    cards: [
      { title: t('duel.you'), color: 'var(--t1)', big: d.me.score.toLocaleString(), rows: side(d.me), winner: d.result === 'win', dim: d.result === 'lose' },
      { title: t('hud.cpu'), color: 'var(--t0)', big: d.cpu.score.toLocaleString(), rows: side(d.cpu), winner: d.result === 'lose', dim: d.result === 'win' },
    ],
    footer: [
      `${d.level} : `,
      el('span', { class: 'w' }, [t('duel.winsN', { n: d.wins })]),
      ' · ',
      el('span', { class: 'l' }, [t('duel.lossesN', { n: d.losses })]),
      streak,
    ],
    confetti: d.result === 'win',
  });
}
