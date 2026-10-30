import { isOffensive } from '../core/names';
import { cleanName, formatRoomCode, isRoomCode, parseRoomCode, randomRoomCode } from '../core/net';
import { sitePage } from '../native';
import { t } from '../i18n';
import { el } from './dom';
import { icon } from './hex-ui';
import { Screen } from './screens';
import { load, save } from './storage';

const KEY = 'tomettes.online';
const PLAYER_KEY = 'tomettes.player';

/** Noms proposés au premier lancement (le joueur peut changer le sien). */
const NAMES = ['Cigale', 'Mistral', 'Lavande', 'Calisson', 'Santon', 'Olivier', 'Tomette', 'Garrigue', 'Farigoule', 'Navette', 'Pétanque', 'Cyprès', 'Sardine', 'Fougasse', 'Tapenade', 'Galet'];

/** Pseudo du joueur, sans inscription : un nom et un numéro tiré une fois pour toutes. */
export interface Player {
  name: string;
  tag: string;
}

export function loadPlayer(): Player {
  try {
    const raw = load(PLAYER_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Player>) : null;
    if (p && typeof p.name === 'string' && /^\d{4}$/.test(p.tag ?? '') && !isOffensive(p.name)) return { name: cleanName(p.name).replace(/#/g, '') || NAMES[0], tag: p.tag! };
  } catch {
    /* pseudo illisible : on en tire un nouveau */
  }
  const fresh = { name: NAMES[Math.floor(Math.random() * NAMES.length)], tag: String(Math.floor(1000 + Math.random() * 9000)) };
  save(PLAYER_KEY, JSON.stringify(fresh));
  return fresh;
}

/** Change le nom ; `refused` : pseudo grossier, l'ancien est gardé. */
export function savePlayerName(name: string): Player & { refused: boolean } {
  const p = loadPlayer();
  const clean = cleanName(name).replace(/#/g, '').slice(0, 14);
  if (clean && isOffensive(clean)) return { ...p, refused: true };
  if (clean) p.name = clean;
  save(PLAYER_KEY, JSON.stringify(p));
  return { ...p, refused: false };
}

/** Pseudo affiché : « Cigale#2741 ». */
export const playerLabel = (p: Player = loadPlayer()) => `${p.name}#${p.tag}`;

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

/**
 * Lien à partager pour rejoindre une salle. Le code est après « # » : cette partie de
 * l'adresse n'est jamais envoyée au serveur (ni journaux, ni en-tête Referer).
 */
export function roomLink(code: string): string {
  return `${sitePage()}#room=${code}`;
}

/** Code de salle d'un lien d'invitation (« #room=ABCDEFGH »), ou ''. */
export function inviteCode(hash: string): string {
  const code = parseRoomCode(new URLSearchParams(hash.replace(/^#/, '')).get('room') ?? '');
  return isRoomCode(code) ? code : '';
}

/** Écran Duel : contre l'ordinateur, ou défier un ami (créer / rejoindre une salle). */
export function duelMenuScreen(handlers: {
  cpu: () => void;
  create: (code: string) => void;
  join: (code: string) => void;
  back: () => void;
  /** Joueur au hasard : file d'attente commune. */
  random: () => void;
  /** Mode développeur : un robot crée une salle et attend qu'on la rejoigne. */
  robotHost?: (code: string) => void;
}): Screen & {
  setCpuLabel(s: string): void;
  /** Message sous le bouton « joueur au hasard » (personne trouvé…). */
  notice(s: string): void;
} {
  const cpuSub = el('small');
  const cpu = el('button', { type: 'button', class: 'duel-choice' }, [el('strong', {}, [t('online.vsCpu')]), cpuSub]);
  cpu.insertAdjacentHTML('afterbegin', icon('swords'));
  cpu.addEventListener('click', handlers.cpu);
  // Joueur au hasard, avec le pseudo du joueur (modifiable).
  const randomSub = el('small', {}, [t('online.randomHelp')]);
  const random = el('button', { type: 'button', class: 'duel-choice random-choice' }, [el('strong', {}, [t('online.random')]), randomSub]);
  random.insertAdjacentHTML('afterbegin', icon('compass'));
  random.addEventListener('click', handlers.random);
  const randomNotice = el('p', { class: 'room-error' });
  const player = loadPlayer();
  const nameInput = el('input', { class: 'name-input', maxlength: '14', autocomplete: 'off', spellcheck: 'false', 'aria-label': t('online.nameLabel') });
  nameInput.value = player.name;
  const tag = el('span', { class: 'name-tag' }, [`#${player.tag}`]);
  nameInput.addEventListener('keydown', (e) => e.stopPropagation());
  nameInput.addEventListener('change', () => {
    const p = savePlayerName(nameInput.value);
    nameInput.value = p.name;
    randomNotice.textContent = p.refused ? t('online.nameRefused') : '';
  });
  const nameRow = el('label', { class: 'name-row' }, [el('span', {}, [t('online.nameLabel')]), nameInput, tag]);
  const create = el('button', { type: 'button', class: 'btn primary' }, [t('online.create')]);
  create.addEventListener('click', () => handlers.create(randomRoomCode()));
  const input = el('input', { class: 'room-input', maxlength: '9', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABCD-EFGH', 'aria-label': t('online.code') });
  const join = el('button', { type: 'button', class: 'btn' }, [t('online.join')]);
  const error = el('p', { class: 'room-error' });
  const tryJoin = () => {
    const code = parseRoomCode(input.value);
    if (!isRoomCode(code)) {
      error.textContent = t('online.badCode');
      return;
    }
    error.textContent = '';
    handlers.join(code);
  };
  join.addEventListener('click', tryJoin);
  // Saisie en deux groupes de 4 lettres (« ABCD-EFGH »), avec ou sans tiret.
  input.addEventListener('input', () => {
    const c = parseRoomCode(input.value);
    input.value = c.length > 4 ? formatRoomCode(c) : c;
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') tryJoin();
  });
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', handlers.back);
  const robot = el('button', { type: 'button', class: 'btn robot-btn' }, [t('online.robotHost')]);
  robot.hidden = !handlers.robotHost;
  robot.addEventListener('click', () => {
    const code = randomRoomCode();
    handlers.robotHost?.(code);
    input.value = formatRoomCode(code);
    error.textContent = t('online.robotWaiting', { code: formatRoomCode(code) });
  });
  const screen = new Screen('screen-duel', [
    el('div', { class: 'panel' }, [
      el('h2', {}, [t('mode.duel.name')]),
      cpu,
      random,
      randomNotice,
      nameRow,
      el('div', { class: 'friend-box' }, [
        el('strong', {}, [t('online.friend')]),
        el('p', {}, [t('online.friendHelp')]),
        create,
        el('div', { class: 'join-row' }, [input, join]),
        error,
        robot,
      ]),
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
  return Object.assign(screen, {
    setCpuLabel: (s: string) => (cpuSub.textContent = s),
    notice: (s: string) => (randomNotice.textContent = s),
  });
}

/** Écran d'attente d'une salle : code, partage du lien, état. */
export function roomScreen(onCancel: () => void, onRobot?: (code: string) => void): Screen & { open(code: string, creator: boolean): void; status(s: string): void } {
  const code = el('div', { class: 'room-code' });
  const status = el('p', { class: 'room-status' });
  const share = el('button', { type: 'button', class: 'btn primary' }, [t('online.share')]);
  const cancel = el('button', { type: 'button', class: 'btn' }, [t('common.cancel')]);
  cancel.addEventListener('click', onCancel);
  let current = '';
  // Mode développeur : un robot rejoint la salle à la place d'un ami.
  const robot = el('button', { type: 'button', class: 'btn robot-btn' }, [t('online.robotJoin')]);
  robot.addEventListener('click', () => {
    robot.hidden = true;
    onRobot?.(current);
  });
  share.addEventListener('click', async () => {
    const url = roomLink(current);
    try {
      if (navigator.share) await navigator.share({ title: 'Tomettes', text: t('online.shareText', { code: formatRoomCode(current) }), url });
      else {
        await navigator.clipboard.writeText(url);
        status.textContent = t('online.copied');
      }
    } catch {
      /* partage annulé */
    }
  });
  const screen = new Screen('screen-room', [
    el('div', { class: 'panel room-panel' }, [el('h2', {}, [t('online.friend')]), el('p', { class: 'room-label' }, [t('online.code')]), code, status, share, robot, cancel]),
  ]);
  return Object.assign(screen, {
    open(c: string, creator: boolean) {
      current = c;
      code.textContent = formatRoomCode(c);
      share.hidden = !creator;
      robot.hidden = !creator || !onRobot;
      status.textContent = t('online.connecting');
      screen.show();
    },
    status(s: string) {
      status.textContent = s;
    },
  });
}

/** Recherche d'un joueur au hasard : compte à rebours, adversaire trouvé, annulation. */
export function searchScreen(onCancel: () => void, onRobot?: () => void): Screen & { open(): void; tick(left: number): void; found(name: string): void } {
  const count = el('div', { class: 'room-code search-count' });
  const status = el('p', { class: 'room-status' });
  const cancel = el('button', { type: 'button', class: 'btn' }, [t('common.cancel')]);
  cancel.addEventListener('click', onCancel);
  // Mode développeur : un robot entre dans la file pour tester sans autre joueur.
  const robot = el('button', { type: 'button', class: 'btn robot-btn' }, [t('online.robotQueue')]);
  robot.hidden = !onRobot;
  robot.addEventListener('click', () => {
    robot.hidden = true;
    onRobot?.();
  });
  const screen = new Screen('screen-search', [
    el('div', { class: 'panel room-panel' }, [el('h2', {}, [t('online.random')]), el('p', { class: 'room-label' }, [playerLabel()]), count, status, robot, cancel]),
  ]);
  const label = screen.root.querySelector('.room-label')!;
  return Object.assign(screen, {
    open() {
      label.textContent = playerLabel();
      status.textContent = t('online.searching');
      count.textContent = '30';
      robot.hidden = !onRobot;
      cancel.hidden = false;
      screen.show();
    },
    tick(left: number) {
      count.textContent = String(Math.max(0, Math.ceil(left)));
    },
    found(name: string) {
      count.textContent = '⚔️';
      status.textContent = t('online.found', { name });
      robot.hidden = true;
      cancel.hidden = true;
    },
  });
}
