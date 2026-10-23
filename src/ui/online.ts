import { isRoomCode, randomRoomCode } from '../core/net';
import { t } from '../i18n';
import { el } from './dom';
import { icon } from './hex-ui';
import { Screen } from './screens';
import { load, save } from './storage';

const KEY = 'tomettes.online';

export function loadOnline(): { wins: number; losses: number } {
  try {
    const raw = load(KEY);
    return raw ? { wins: 0, losses: 0, ...JSON.parse(raw) } : { wins: 0, losses: 0 };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

export function recordOnline(result: 'win' | 'lose' | 'draw'): { wins: number; losses: number } {
  const r = loadOnline();
  if (result === 'win') r.wins++;
  else if (result === 'lose') r.losses++;
  save(KEY, JSON.stringify(r));
  return r;
}

/** Lien à partager pour rejoindre une salle. */
export function roomLink(code: string): string {
  return `${location.origin}${location.pathname}?room=${code}`;
}

/** Écran Duel : contre l'ordinateur, ou défier un ami (créer / rejoindre une salle). */
export function duelMenuScreen(handlers: { cpu: () => void; create: (code: string) => void; join: (code: string) => void; back: () => void }): Screen & {
  setCpuLabel(s: string): void;
} {
  const cpuSub = el('small');
  const cpu = el('button', { type: 'button', class: 'duel-choice' }, [el('strong', {}, [t('online.vsCpu')]), cpuSub]);
  cpu.insertAdjacentHTML('afterbegin', icon('swords'));
  cpu.addEventListener('click', handlers.cpu);
  const create = el('button', { type: 'button', class: 'btn primary' }, [t('online.create')]);
  create.addEventListener('click', () => handlers.create(randomRoomCode()));
  const input = el('input', { class: 'room-input', maxlength: '4', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABCD', 'aria-label': t('online.code') });
  const join = el('button', { type: 'button', class: 'btn' }, [t('online.join')]);
  const error = el('p', { class: 'room-error' });
  const tryJoin = () => {
    const code = input.value.trim().toUpperCase();
    if (!isRoomCode(code)) {
      error.textContent = t('online.badCode');
      return;
    }
    error.textContent = '';
    handlers.join(code);
  };
  join.addEventListener('click', tryJoin);
  input.addEventListener('input', () => (input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)));
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') tryJoin();
  });
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', handlers.back);
  const screen = new Screen('screen-duel', [
    el('div', { class: 'panel' }, [
      el('h2', {}, [t('mode.duel.name')]),
      cpu,
      el('div', { class: 'friend-box' }, [
        el('strong', {}, [t('online.friend')]),
        el('p', {}, [t('online.friendHelp')]),
        create,
        el('div', { class: 'join-row' }, [input, join]),
        error,
      ]),
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
  return Object.assign(screen, { setCpuLabel: (s: string) => (cpuSub.textContent = s) });
}

/** Écran d'attente d'une salle : code, partage du lien, état. */
export function roomScreen(onCancel: () => void): Screen & { open(code: string, creator: boolean): void; status(s: string): void } {
  const code = el('div', { class: 'room-code' });
  const status = el('p', { class: 'room-status' });
  const share = el('button', { type: 'button', class: 'btn primary' }, [t('online.share')]);
  const cancel = el('button', { type: 'button', class: 'btn' }, [t('common.cancel')]);
  cancel.addEventListener('click', onCancel);
  let current = '';
  share.addEventListener('click', async () => {
    const url = roomLink(current);
    try {
      if (navigator.share) await navigator.share({ title: 'Tomettes', text: t('online.shareText', { code: current }), url });
      else {
        await navigator.clipboard.writeText(url);
        status.textContent = t('online.copied');
      }
    } catch {
      /* partage annulé */
    }
  });
  const screen = new Screen('screen-room', [
    el('div', { class: 'panel room-panel' }, [el('h2', {}, [t('online.friend')]), el('p', { class: 'room-label' }, [t('online.code')]), code, status, share, cancel]),
  ]);
  return Object.assign(screen, {
    open(c: string, creator: boolean) {
      current = c;
      code.textContent = c;
      share.hidden = !creator;
      status.textContent = t('online.connecting');
      screen.show();
    },
    status(s: string) {
      status.textContent = s;
    },
  });
}
