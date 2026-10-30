import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './style.css';
import { Sound } from './audio/sound';
import { bucket, initTelemetry, track } from './telemetry';
import { config } from './config';
import { ClearEvent, Game, GameEvent, STEP_MS } from './core/game';
import { cellCenter } from './core/hex';
import { TUTORIAL_STEPS } from './core/tutorial';
import { modeById, ModeId } from './core/modes';
import { DIFFICULTIES, Difficulty, withDifficulty } from './core/difficulty';
import { randomSeed } from './core/rng';
import { BoardInput } from './input/board-input';
import { computeLayout, Layout } from './render/layout';
import { GAME_OVER_FADE_MS } from './render/effects';
import { Renderer } from './render/renderer';
import { applyThemeCss, themeFor } from './render/theme';
import { attachLongPress, DebugPanel, loadSavedConfig, setConfigValue } from './ui/debug';
import { hexBadge, HexButtonParts, icon } from './ui/hex-ui';
import { ACHIEVEMENTS, onlineWinAchievements } from './core/progress';
import { el, formatTime } from './ui/dom';
import { isCaptureMode, isDevMode, isPhone } from './ui/guard';
import { Key, lang, t } from './i18n';
import { achName, longText, missionText, modeName, modeTag, tutoText as tutoText_, tutoTitle as tutoTitle_ } from './ui/text';
import { howToScreen } from './ui/howto';
import { settingsScreen } from './ui/settings';
import { aboutScreen } from './ui/about';
import { HomeBackground } from './ui/home-bg';
import { Progress, progressScreen } from './ui/progress';
import { bar, Missions, missionsScreen, playerLevel } from './ui/missions';
import { longMission } from './core/missions';
import { unlocksBetween } from './core/unlocks';
import { STAGE_COUNT, stageConfig, stageSpec, starsFor } from './core/campaign';
import { campaignScreen, loadStars, saveStars, totalStars } from './ui/campaign';
import { drawCards, modsFor, RUN_STAGES, runStage, stagePoints } from './core/expedition';
import { activeCards, cardBadge, cardsScreen, clearRun, expIntroScreen, loadExp, loadRun, saveExp, saveRun, SavedRun } from './ui/expedition';
import { Rng } from './core/rng';
import { Ai, AI_PROFILES, AiProfile, AiSkill } from './core/ai';
import { Duel, duelConfig } from './core/duel';

/** Pictogramme d'un malus en approche (au-dessus de la grille du joueur). */
const MALUS_ICON = { night: '🌙', freeze: '❄', crack: '⚡', quake: '〰' } as const;
import { drawMini } from './render/mini';
import { safeName } from './core/names';
import { BoardView, cleanName, LinkedDuel, NetStats, packView, ServerMsg } from './core/net';
import { OnlineClient } from './net/client';
import { LobbyClient } from './net/lobby';
import { RobotFriend } from './net/robot';
import { duelMenuScreen, inviteCode, loadOnline, playerLabel, recordOnline, roomScreen, searchScreen } from './ui/online';
import { loadDuel, recordDuel } from './ui/duel';
import { duelResult } from './ui/duel-result';
import { orderChip } from './ui/order-chip';
import { resultBlock } from './ui/result';
import { gameOverScreen, homeScreen, pauseScreen, rotateScreen } from './ui/screens';
import { load, loadBest, loadDifficulty, save, saveBest, saveDifficulty } from './ui/storage';

type State = 'home' | 'playing' | 'paused' | 'over' | 'tutorial';

const dev = __DEV_TOOLS__ && isDevMode();
const phone = isPhone();

function boot(): void {
  initTelemetry();
  if (dev) document.body.classList.add('dev');
  loadSavedConfig();

  // --- DOM ---------------------------------------------------------------
  document.documentElement.lang = lang;
  // HUD : pastille hexagonale (niveau ou rosaces), gros score, record et temps, bouton pause.
  const badge = hexBadge();
  badge.label.textContent = t('hud.level');
  const hudScore = el('div', { class: 'v', 'aria-label': t('hud.score') });
  const hudBest = el('b');
  const hudTime = el('b', { class: 'time' });
  const hudRecLabel = el('span', {}, [t('hud.record')]);
  const hudSub = el('div', { class: 's' }, [hudRecLabel, ' ', hudBest, ' · ', hudTime]);
  hudTime.insertAdjacentHTML('beforebegin', icon('clock'));
  const pauseBtn = el('button', { id: 'pause-btn', type: 'button', 'aria-label': t('common.pause') });
  pauseBtn.innerHTML = icon('pause');
  const incoming = el('div', { class: 'incoming' });
  // Expédition : rappel des cartes en jeu sous le score (un appui ouvre la pause, avec le détail).
  const runCards = el('button', { type: 'button', class: 'run-cards', 'aria-label': t('exp.active') });
  const mini = el('canvas', { id: 'duel-mini' });
  const chip = orderChip();
  chip.root.hidden = true;
  const hud = el('header', { id: 'hud' }, [badge.root, el('div', { class: 'hud-score' }, [hudScore, hudSub, incoming, runCards]), chip.root, mini, pauseBtn]);
  const canvas = el('canvas', { id: 'board' });
  const stage = el('main', { id: 'stage' }, [canvas]);
  const raise = el('button', { id: 'raise', type: 'button' }, [t('common.raise')]);
  raise.insertAdjacentHTML('afterbegin', icon('up'));
  const footer = el('footer', { id: 'controls' }, [raise]);
  const app = el('div', { id: 'app' }, [hud, stage, footer]);
  const corner = el('div', { id: 'debug-corner' });
  document.body.append(app, corner);

  const home = homeScreen();
  const over = gameOverScreen();
  const pause = pauseScreen();
  const rotate = rotateScreen();

  // --- État --------------------------------------------------------------
  let state: State = 'home';
  let mode: ModeId = 'endless';
  /** Duel : partie de l'ordinateur, son IA et l'échange de dalles (null hors duel). */
  let cpu: Game | null = null;
  let ai: Ai | null = null;
  let duel: Duel | null = null;
  const aiSkill = (): AiSkill => difficulty;
  /** Duel en ligne : connexion, côté local, dernier état reçu de l'ami. */
  let net: OnlineClient | null = null;
  let linked: LinkedDuel | null = null;
  let remote: { view: BoardView; stats: NetStats; pending: number } | null = null;
  let remoteOver: NetStats | null = null;
  let rematchAsked = false;
  let lastStateSent = 0;
  /** Pseudo de l'adversaire en ligne (« Ami » tant qu'on ne le connaît pas). */
  let opponentName = '';
  /** Adversaire trouvé par la file du joueur au hasard (et non un ami). */
  let randomMatch = false;
  const opponentLabel = () => opponentName || (randomMatch ? t('online.player') : t('online.opponent'));
  const emptyStats = (): NetStats => ({ score: 0, sent: 0, chain: 1, rosaces: 0 });
  const myStats = (): NetStats => ({ score: game.score, sent: linked?.sent ?? 0, chain: game.stats.maxChain, rosaces: game.rosaceCount });
  function leaveOnline(): void {
    net?.close();
    net = null;
    linked = null;
    remote = null;
  }
  /** Ouvre (ou rejoint) une salle ; le créateur partage le code. `matched` : salle donnée par la file du joueur au hasard. */
  function openRoom(code: string, creator: boolean, matched = ''): void {
    leaveOnline();
    duelMenu.hide();
    home.screen.hide();
    // Joueur au hasard : `matched` est son pseudo (une espace si son pseudo a été refusé par le filtre).
    randomMatch = matched !== '';
    opponentName = matched.trim();
    if (!matched) roomView.open(code, creator);
    net = new OnlineClient(code, onNet, (closeCode) => {
      if (state === 'playing' || state === 'paused') {
        remoteOver = remoteOver ?? remote?.stats ?? emptyStats();
      } else if (searchView.visible) searchFailed(t('online.dropped'));
      else roomView.status(t(closeCode === 4010 ? 'online.expired' : 'online.dropped'));
    });
    net.connect();
  }
  function onNet(m: ServerMsg): void {
    switch (m.t) {
      case 'wait':
        roomView.status(t('online.waiting'));
        break;
      case 'full':
        roomView.status(t('online.full'));
        net?.close();
        net = null;
        break;
      case 'start':
        remoteOver = null;
        rematchAsked = false;
        roomView.hide();
        searchView.hide();
        net?.send({ t: 'hello', name: playerLabel() });
        over.screen.hide();
        startGame(m.seed, 'online');
        // Compte à rebours commun avant le départ.
        state = 'paused';
        resumeAt = performance.now() + 3 * COUNT_STEP_MS;
        countNum.textContent = '';
        countdown.hidden = false;
        break;
      case 'state':
        remote = { view: m.view, stats: m.stats, pending: m.pending };
        break;
      case 'hello':
        opponentName = safeName(cleanName(m.name), '');
        if (mode === 'online') hudRecLabel.textContent = opponentLabel();
        break;
      case 'attack':
        linked?.receive(m.a);
        break;
      case 'over':
        remoteOver = m.stats;
        break;
      case 'left':
        if (searchView.visible) searchFailed(t('online.left'));
        else if (state === 'over' || roomView.visible) {
          roomView.status(t('online.left'));
          over.replay.hidden = true;
        } else remoteOver = remoteOver ?? remote?.stats ?? emptyStats();
        break;
      case 'rematchAsked':
        rematchAsked = true;
        over.replay.textContent = t('online.rematchAccept');
        break;
    }
  }
  /** Ami robot (mode développeur) : teste le duel en ligne sans ami. */
  let robot: RobotFriend | null = null;
  const callRobot = (code: string) => {
    robot?.stop();
    robot = new RobotFriend(code, config, 3 * COUNT_STEP_MS);
    robot.start();
  };
  const duelMenu = duelMenuScreen({
    cpu: () => {
      duelMenu.hide();
      launch('duel');
    },
    create: (code) => openRoom(code, true),
    join: (code) => openRoom(code, false),
    back: () => {
      duelMenu.hide();
      showHome();
    },
    random: startSearch,
    robotHost: dev ? callRobot : undefined,
  });
  // Joueur au hasard : 30 s dans la file commune, puis on abandonne.
  const SEARCH_S = 30;
  let lobby: LobbyClient | null = null;
  let searchTimer = 0;
  function stopSearch(): void {
    window.clearInterval(searchTimer);
    lobby?.close();
    lobby = null;
  }
  function searchFailed(message: string): void {
    stopSearch();
    leaveOnline();
    searchView.hide();
    duelMenu.notice(message);
    duelMenu.show();
  }
  function startSearch(): void {
    stopSearch();
    duelMenu.notice('');
    duelMenu.hide();
    searchView.open();
    const until = performance.now() + SEARCH_S * 1000;
    searchTimer = window.setInterval(() => {
      const left = (until - performance.now()) / 1000;
      searchView.tick(left);
      if (left <= 0) searchFailed(t('online.nobody'));
    }, 250);
    lobby = new LobbyClient(
      playerLabel(),
      (code, opponent, host) => {
        window.clearInterval(searchTimer);
        lobby = null;
        searchView.found(opponent || t('online.player'));
        // L'hôte crée la salle un instant avant que l'autre la rejoigne.
        window.setTimeout(() => openRoom(code, host, opponent || ' '), host ? 300 : 700);
      },
      () => searchFailed(t('online.dropped')),
    );
    lobby.connect();
  }
  /** Mode développeur : un robot entre dans la file, puis joue dans la salle qu'elle lui donne. */
  const robotInQueue = () => new LobbyClient('Robot#0000', (code) => callRobot(code), () => {}).connect();
  const searchView = searchScreen(() => searchFailed(''), dev ? robotInQueue : undefined);
  const roomView = roomScreen(
    () => {
      leaveOnline();
      roomView.hide();
      showHome();
    },
    dev ? callRobot : undefined,
  );
  /** Expédition en cours (null hors expédition). */
  let run: SavedRun | null = null;
  function startExpedition(): void {
    run = { stage: 1, cards: [], score: 0, shields: 0, time: 0, seed: randomSeed(), difficulty };
    saveRun(run);
    expIntro.hide();
    launch('expedition');
  }
  /** Reprise d'une expédition sauvegardée : choix de carte en attente, ou début de la manche. */
  function resumeExpedition(): void {
    run = loadRun();
    if (!run) return startExpedition();
    expIntro.hide();
    home.screen.hide();
    mode = 'expedition';
    if (run.choices) cardsView.open(run.stage, run.score, run.choices, run.cards);
    else startGame(randomSeed(), 'expedition');
  }
  const expIntro = expIntroScreen({
    start: startExpedition,
    resume: resumeExpedition,
    abandon: () => {
      clearRun();
      run = null;
      openExpIntro();
    },
    back: () => {
      expIntro.hide();
      showHome();
    },
  });
  function openExpIntro(): void {
    const saved = loadRun();
    home.screen.hide();
    expIntro.open(saved, t(`diff.${saved?.difficulty ?? difficulty}` as Key));
  }
  const cardsView = cardsScreen((id) => {
    if (!run) return;
    run.cards.push(id);
    if (id === 'shield') run.shields++;
    run.stage++;
    run.choices = undefined;
    saveRun(run);
    cardsView.hide();
    startGame(randomSeed(), 'expedition');
  });
  /** Manche de campagne en cours (ou à lancer). */
  let stageNo = 1;
  let difficulty: Difficulty = loadDifficulty();
  let best = loadBest(mode, difficulty);
  let game = new Game(config, randomSeed());
  let layout: Layout | null = null;
  let fps = 60;
  let debugOpen = false;

  const renderer = new Renderer(canvas);
  const sound = new Sound();
  const progress = new Progress();
  // Victoires en ligne d'avant ces succès : comptées dès le lancement.
  progress.grant(onlineWinAchievements(loadOnline().wins));
  const missions = new Missions();
  const syncSound = () => {
    sound.sfxOn = config.sound !== 0;
    sound.musicOn = config.music !== 0;
  };
  syncSound();
  // Safari n'autorise le son qu'après un geste : on déverrouille au premier contact.
  for (const ev of ['pointerdown', 'keydown'] as const) {
    document.addEventListener(ev, () => sound.unlock(), { capture: true });
  }
  const input = new BoardInput(canvas, () => (state === 'playing' || state === 'tutorial' ? game : null), () => layout);

  // Panneau de debug : seulement dans les builds de développement (retiré de la version publiée).
  if (__DEV_TOOLS__) {
    const debug = new DebugPanel({
      getGame: () => game,
      getFps: () => fps,
      restart: (seed) => startGame(seed),
      onOpenChange: (open) => {
        debugOpen = open;
        input.release();
        game.manualRise = false;
      },
    });
    attachLongPress(corner, 1000, () => debug.open());
    // Bouton de debug visible avec ?dev=1 (sinon : appui long en haut à gauche).
    if (dev && !isCaptureMode()) {
      const gear = el('button', { id: 'debug-gear', type: 'button', 'aria-label': 'Debug' });
      gear.innerHTML = icon('gear');
      gear.addEventListener('click', () => (debug.isOpen ? debug.close() : debug.open()));
      footer.append(gear);
    }
  }

  function relayout(): void {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    layout = computeLayout(w, h, game.grid.cols, game.grid.rows, dpr);
    renderer.resize(layout, game.grid.cols, game.grid.rows);
  }

  let overTimer = 0;
  let hintTimer = 0;
  let shownScore = 0;

  function startGame(seed: number = randomSeed(), m: ModeId = mode): void {
    window.clearTimeout(overTimer);
    shownScore = 0;
    mode = m;
    best = loadBest(mode, difficulty);
    badge.label.textContent = mode === 'campaign' || mode === 'expedition' ? t('hud.stage') : modeById(mode).record === 'rosaces' ? t('hud.rosaces') : t('hud.level');
    hudRecLabel.textContent = t('hud.record');
    hudCache.length = 0;
    const prev = game.grid;
    cpu = ai = duel = null;
    runCards.replaceChildren(...(m === 'expedition' && run ? [...new Set(run.cards)].map((id) => cardBadge(id, true)) : []));
    document.body.classList.toggle('duel', mode === 'duel' || mode === 'online');
    if (mode !== 'online') leaveOnline();
    if (mode === 'campaign') {
      const spec = stageSpec(stageNo, config);
      game = new Game(stageConfig(config, spec), seed, { mode, startLevel: spec.level, goalRows: spec.goal });
    } else if (mode === 'expedition' && run) {
      // L'expédition suit la difficulté choisie sur l'accueil.
      const st = runStage(run.stage, { ...withDifficulty(config, run.difficulty) }, modsFor(run.cards));
      stageNo = run.stage;
      game = new Game(st.cfg, seed, { mode, startLevel: st.spec.level, goalRows: st.goal, orders: true });
      game.shields = run.shields;
      game.shots = modsFor(run.cards).shots;
    } else if (mode === 'online') {
      game = new Game(duelConfig(config), seed, { mode });
      linked = new LinkedDuel(game);
      remote = null;
      hudRecLabel.textContent = opponentLabel();
      incoming.replaceChildren();
      incoming.dataset.key = '';
    } else if (mode === 'duel') {
      game = new Game(duelConfig(config), seed, { mode });
      cpu = new Game(duelConfig(config), seed ^ 0x9e3779b9, { mode });
      ai = new Ai(cpu, AI_PROFILES[aiSkill()], seed);
      duel = new Duel([game, cpu], [1, AI_PROFILES[aiSkill()].power], seed);
      hudRecLabel.textContent = t('hud.cpu');
      incoming.replaceChildren();
      incoming.dataset.key = '';
    } else game = new Game(withDifficulty(config, difficulty), seed, { mode, orders: true });
    input.release();
    renderer.reset();
    if (prev.cols !== game.grid.cols || prev.rows !== game.grid.rows) relayout();
    home.screen.hide();
    howto.hide();
    settings.hide();
    over.screen.hide();
    pause.screen.hide();
    tuto.hidden = true;
    window.clearTimeout(hintTimer);
    // Explication de la ligne d'arrivée à la 1re manche seulement (la bulle disparaît seule) ;
    // en expédition, celle du Carreau à la manche qui suit son choix.
    const newShot = mode === 'expedition' && !!run && run.cards[run.cards.length - 1] === 'carreau';
    if ((mode === 'campaign' || mode === 'expedition') && (stageNo === 1 || newShot)) {
      tutoTitle.textContent = t('camp.stageTitle', { n: stageNo, goal: game.goalRows });
      tutoText.textContent = [stageNo === 1 ? t('camp.hint') : '', game.shots > 0 ? t('exp.shotHint') : ''].filter(Boolean).join(' ');
      tutoActions.replaceChildren();
      tuto.hidden = false;
      hintTimer = window.setTimeout(() => {
        if (state === 'playing' && (mode === 'campaign' || mode === 'expedition')) tuto.hidden = true;
      }, 5000);
    }
    renderer.hint = null;
    raise.classList.remove('pulse');
    state = 'playing';
    lastLevel = game.level;
    sound.startMusic();
    track('game_start', { mode, difficulty, lang, ...(mode === 'campaign' ? { stage: stageNo } : {}) });
  }

  function endGame(): void {
    state = 'over';
    sound.stopMusic();
    if (mode === 'expedition' && run) {
      const mods = modsFor(run.cards);
      run.score += stagePoints(run.stage, game.score, mods, game.won);
      run.shields = game.shields;
      run.time += game.elapsed;
      if (game.won && run.stage < RUN_STAGES) {
        // Manche réussie : la partie compte (stats, missions), puis choix d'une carte.
        sound.level();
        input.release();
        game.manualRise = false;
        progress.finish(game);
        missions.finish(game);
        if (run.stage + 1 >= 10) progress.grant(['expHalf']);
        // Les cartes proposées découlent de la graine : les mêmes après une reprise.
        const choices = drawCards(new Rng(run.seed + run.stage * 7919), run.cards);
        run.choices = choices;
        saveRun(run);
        const stageDone = run.stage;
        const total = run.score;
        const show = () => cardsView.open(stageDone, total, choices, run?.cards ?? []);
        if (config.animations) overTimer = window.setTimeout(show, GAME_OVER_FADE_MS + 250);
        else show();
        return;
      }
    }
    if (game.timeUp || game.won || duel?.winner === 0 || (mode === 'online' && !game.over)) sound.level();
    else sound.gameOver();
    input.release();
    game.manualRise = false;
    const value = game.recordValue;
    const prevBest = best;
    const record = value > best && mode !== 'duel' && mode !== 'campaign' && mode !== 'expedition';
    if (record) {
      best = value;
      saveBest(best, mode, difficulty);
    }
    const rosaces = game.mode.record === 'rosaces';
    over.next.hidden = true;
    over.replay.textContent = t('common.replay');
    over.duel.replaceChildren();
    over.screen.root.classList.remove('gold', 'grey', 'blue');
    over.screen.root.classList.add('is-result');
    const time = formatTime(game.elapsed);
    const diffName = t(`diff.${difficulty}` as Key);
    let block: HTMLElement;
    if (mode === 'online' && linked) {
      const lost = game.over && !game.timeUp;
      const opp = remoteOver ?? remote?.stats ?? emptyStats();
      if (lost) net?.send({ t: 'over', stats: myStats() });
      const result = lost && remoteOver ? 'draw' : lost ? 'lose' : 'win';
      const rec = recordOnline(result);
      progress.grant(onlineWinAchievements(rec.wins));
      block = duelResult({
        result,
        level: opponentLabel(),
        time,
        me: { score: game.score, sent: linked.sent, chain: game.stats.maxChain, rosaces: game.rosaceCount },
        cpu: opp,
        wins: rec.wins,
        losses: rec.losses,
        streak: 0,
        opponent: opponentLabel(),
        sub: t('online.sub', { time }),
        footer: [`${t('online.record')} : `, el('span', { class: 'w' }, [t('duel.winsN', { n: rec.wins })]), ' · ', el('span', { class: 'l' }, [t('duel.lossesN', { n: rec.losses })])],
      });
      over.screen.root.classList.add(result === 'win' ? 'gold' : result === 'lose' ? 'grey' : 'blue');
      over.replay.textContent = t('duel.rematch');
      over.replay.hidden = !net;
      game.over = true;
    } else if (duel && cpu) {
      const w = duel.winner;
      const result = w === 0 ? 'win' : w === 1 ? 'lose' : 'draw';
      const rec = recordDuel(aiSkill(), result)[aiSkill()];
      const strong = aiSkill() === 'hard' || aiSkill() === 'extreme';
      progress.grant([...(result === 'win' && aiSkill() === 'extreme' ? ['duelExtreme'] : []), ...(strong && rec.streak >= 5 ? ['duelStreak'] : [])]);
      block = duelResult({
        result,
        level: diffName,
        time,
        me: { score: game.score, sent: duel.sent[0], chain: game.stats.maxChain, rosaces: game.rosaceCount },
        cpu: { score: cpu.score, sent: duel.sent[1], chain: cpu.stats.maxChain, rosaces: cpu.rosaceCount },
        wins: rec.wins,
        losses: rec.losses,
        streak: rec.streak,
      });
      over.screen.root.classList.add(result === 'win' ? 'gold' : result === 'lose' ? 'grey' : 'blue');
      over.replay.textContent = t('duel.rematch');
      game.over = true;
      cpu.over = true;
    } else if (mode === 'expedition' && run) {
      // Fin d'expédition : réussie (8 manches) ou perdue.
      const done = game.won && run.stage >= RUN_STAGES;
      clearRun();
      const better = saveExp(run.score, done ? RUN_STAGES : run.stage);
      const grants = [
        ...(run.stage >= 10 ? ['expHalf'] : []),
        ...(done ? ['exp1'] : []),
        ...(done && !run.cards.includes('shield') ? ['expNoShield'] : []),
        ...(done && (run.difficulty === 'hard' || run.difficulty === 'extreme') ? ['expExpert'] : []),
      ];
      if (grants.length) progress.grant(grants);
      block = resultBlock({
        tone: done ? 'gold' : 'grey',
        art: done ? 'flag' : 'crack',
        title: done ? t('exp.done') : t('exp.over'),
        sub: `${t('mode.expedition.name')} · ${formatTime(run.time)}`,
        cards: [
          {
            title: t('mode.expedition.name'),
            color: 'var(--t1)',
            big: String(run.score),
            rows: [
              [t('exp.reached'), `${done ? RUN_STAGES : run.stage}/${RUN_STAGES}`],
              [t('exp.cards'), String(run.cards.length)],
            ],
          },
        ],
        footer: [better ? t('over.newRecord') : t('exp.record', { n: loadExp().best })],
        confetti: done,
      });
      over.screen.root.classList.add(done ? 'gold' : 'grey');
      over.replay.textContent = t('exp.new');
    } else if (mode === 'campaign') {
      // Campagne : étoiles selon le temps, manche suivante si réussie.
      const spec = stageSpec(stageNo, config);
      over.replay.textContent = t('camp.retry');
      const sub = `${t('mode.campaign.name')} · ${t('hud.stage')} ${stageNo}`;
      if (game.won) {
        const stars = starsFor(spec, game.elapsed);
        const better = saveStars(stageNo, stars);
        const all = loadStars();
        progress.grant([
          ...(all.filter((n) => n > 0).length >= STAGE_COUNT ? ['camp30'] : []),
          ...(totalStars(all) >= STAGE_COUNT * 3 ? ['camp90'] : []),
        ]);
        block = resultBlock({
          tone: 'gold',
          art: 'flag',
          title: t('camp.won', { n: stageNo }),
          stars,
          sub,
          cards: [{ title: t('duel.you'), color: 'var(--t1)', big: time, rows: [[t('hud.score'), String(game.score)], [t('duel.chain'), `×${game.stats.maxChain}`]] }],
          footer: [better ? t('over.newRecord') : stars < 3 ? t('camp.goal3', { t: formatTime(spec.star3) }) : ''],
          confetti: true,
        });
        over.screen.root.classList.add('gold');
        over.next.hidden = stageNo >= STAGE_COUNT;
      } else {
        block = resultBlock({
          tone: 'grey',
          art: 'crack',
          title: t('camp.lost', { n: stageNo }),
          sub,
          cards: [{ title: t('duel.you'), color: 'var(--t1)', big: String(game.score), rows: [[t('hud.toClear'), String(game.tilesAboveLine() ?? '—')], [t('hud.time'), time]] }],
          footer: [t('camp.goal3', { t: formatTime(spec.star3) })],
        });
        over.screen.root.classList.add('grey');
      }
    } else {
      // Modes solo : médaille dorée pour un record, bleue sinon.
      const tone = record ? 'gold' : 'blue';
      block = resultBlock({
        tone,
        art: record ? 'trophy' : game.timeUp ? 'clock' : 'star',
        title: record ? t('over.newRecord') : game.timeUp ? t('over.timeUp') : t('over.title'),
        sub: `${modeName(mode)} · ${diffName} · ${time}`,
        cards: [
          {
            title: rosaces ? t('hud.rosaces') : t('hud.score'),
            color: 'var(--t1)',
            big: String(value),
            rows: [
              ...(rosaces ? [[t('hud.score'), String(game.score)] as [string, string]] : [[t('stat.rosaces'), String(game.rosaceCount)] as [string, string]]),
              [t('stat.level'), String(game.stats.maxLevel)],
              [t('duel.chain'), `×${game.stats.maxChain}`],
              [t('stat.tiles'), String(game.stats.tilesCleared)],
            ],
          },
        ],
        footer: [
          record
            ? prevBest > 0
              ? t(rosaces ? 'over.prevRecordRosaces' : 'over.prevRecord', { n: prevBest })
              : ''
            : t(rosaces ? 'over.recordRosaces' : 'over.record', { n: best }),
        ],
        confetti: record,
      });
      over.screen.root.classList.add(tone);
    }
    over.duel.append(block);
    const fresh = progress.finish(game);
    const mr = missions.finish(game);
    over.xp.replaceChildren(
      el('p', { class: 'over-xp-gain' }, [t('over.xp', { n: mr.xpGame + mr.xpMissions })]),
      ...(mr.levelAfter > mr.levelBefore ? [el('p', { class: 'over-level-up' }, [t('over.levelUp', { n: mr.levelAfter })])] : []),
      playerLevel(missions),
      ...(mr.daily.length || mr.long !== null ? [el('p', { class: 'over-ach-title' }, [t('over.missionsDone')])] : []),
      ...unlocksBetween(mr.levelBefore, mr.levelAfter).map((u) =>
        el('p', { class: 'over-unlock' }, [t('over.unlocked', { name: t(`${u.kind === 'theme' ? 'theme' : 'glyphs'}.${u.index}` as Key) })]),
      ),
      ...mr.daily.map((m) => el('p', {}, [`✓ ${missionText(m.id, m.target)}`])),
      ...(mr.long !== null ? [el('p', {}, [`✓ ${longText(longMission(mr.long).id, longMission(mr.long).target)}`])] : []),
    );
    track('game_end', {
      mode,
      difficulty,
      timeUp: game.timeUp,
      score: bucket(game.score, [500, 2000, 5000, 10000, 20000, 50000]),
      minutes: bucket(game.elapsed / 60, [1, 2, 3, 5, 10]),
    });
    for (const a of fresh) track('achievement', { id: a.id });
    over.unlocked.replaceChildren(
      ...(fresh.length ? [el('p', { class: 'over-ach-title' }, [t('over.newAch')])] : []),
      ...fresh.map((a) => el('p', {}, [`🏆 ${achName(a.id)}`])),
    );
    // Laisse le temps à la grille de s'assombrir avant l'écran de fin.
    if (config.animations) overTimer = window.setTimeout(() => over.screen.show(), GAME_OVER_FADE_MS + 250);
    else over.screen.show();
  }

  function pauseGame(): void {
    // Duel en ligne : pas de pause (l'ami continue de jouer).
    if (linked) return;
    if (state !== 'playing') return;
    state = 'paused';
    input.release();
    game.manualRise = false;
    sound.stopMusic();
    pause.stats.textContent = [
      `${t('hud.score')} ${game.score}`,
      game.mode.record === 'rosaces' ? `${t('hud.rosaces')} ${game.rosaceCount}` : `${t('hud.level')} ${game.level}`,
      formatTime(game.timeLeft === null ? game.elapsed : Math.ceil(game.timeLeft)),
    ].join(' · ');
    syncPauseToggles();
    pause.cards.replaceChildren(...(mode === 'expedition' && run && run.cards.length ? [el('h3', {}, [t('exp.active')]), activeCards(run.cards)] : []));
    pause.screen.show();
  }

  const isLandscape = () => phone && window.matchMedia('(orientation: landscape)').matches;

  function updateOrientation(): void {
    if (isLandscape()) {
      rotate.show();
      pauseGame();
    } else {
      rotate.hide();
    }
    relayout();
  }

  const homeBg = new HomeBackground(home.screen.root);
  // Le fond animé ne tourne que lorsque l'accueil est visible.
  new MutationObserver(() => (home.screen.visible ? homeBg.start() : homeBg.stop())).observe(home.screen.root, {
    attributes: true,
    attributeFilter: ['hidden'],
  });

  /** Lance un mode depuis l'accueil (la première fois : le tutoriel d'abord). */
  function launch(m: ModeId): void {
    if (load(TUTORIAL_KEY)) startGame(randomSeed(), m);
    else startTutorial(m);
  }
  home.play.button.addEventListener('click', () => launch('endless'));
  home.timeAttack.button.addEventListener('click', () => launch('timeAttack'));
  home.mosaic.button.addEventListener('click', () => launch('mosaic'));
  home.express.button.addEventListener('click', () => launch('express'));

  /** Accueil : records du niveau de difficulté choisi, succès obtenus. */
  function showHome(): void {
    home.difficulty.replaceChildren(
      ...DIFFICULTIES.map((d) => {
        const b = el('button', { type: 'button', class: `diff-btn${d === difficulty ? ' selected' : ''}`, role: 'radio', 'aria-checked': String(d === difficulty) }, [t(`diff.${d}` as Key)]);
        b.addEventListener('click', () => {
          difficulty = d;
          saveDifficulty(d);
          showHome();
        });
        return b;
      }),
    );
    const recs: [ModeId, HexButtonParts][] = [['endless', home.play], ['timeAttack', home.timeAttack], ['mosaic', home.mosaic], ['express', home.express]];
    for (const [id, b] of recs) {
      const rec = loadBest(id, difficulty);
      b.rec.textContent = rec > 0 ? (modeById(id).record === 'rosaces' ? `${rec} ✿` : String(rec)) : '—';
      b.button.title = modeTag(modeById(id), config);
    }
    home.progressCount.textContent = `${progress.unlocked.size}/${ACHIEVEMENTS.length}`;
    const lv = missions.level;
    home.playerLevel.replaceChildren(el('strong', {}, [t('player.level', { n: lv.level })]), bar(lv.into, lv.need), el('small', {}, [t('player.xp', { n: lv.into, need: lv.need })]));
    const daily = missions.state.daily;
    home.missionsCount.textContent = `${daily.filter((m) => m.done).length}/${daily.length}`;
    const exp = loadExp();
    const saved = loadRun();
    home.expedition.rec.textContent = saved ? `▶ ${saved.choices ? saved.stage + 1 : saved.stage}/${RUN_STAGES}` : exp.best ? `${exp.bestStage}/${RUN_STAGES}` : '—';
    home.campaign.rec.textContent = `★ ${totalStars()}/${STAGE_COUNT * 3}`;
    home.duel.rec.textContent = t('duel.wins', { n: loadDuel()[aiSkill()].wins });
    over.screen.hide();
    howto.hide();
    settings.hide();
    pause.screen.hide();
    sound.stopMusic();
    home.screen.show();
    homeBg.start();
  }

  // Réglages : ouverts depuis l'accueil ou la pause, on revient au même endroit.
  let settingsFrom: 'home' | 'pause' = 'home';
  const settings = settingsScreen(
    () => {
      settings.hide();
      if (settingsFrom === 'pause') {
        syncPauseToggles();
        pause.screen.show();
      } else home.screen.show();
    },
    () => syncSound(),
    () => {
      settings.hide();
      about.root.scrollTop = 0;
      about.show();
    },
    () => missions.level.level,
    () => {
      settings.hide();
      openHowto('settings');
    },
  );
  const about = aboutScreen(() => {
    about.hide();
    settings.show();
  });
  function openSettings(from: 'home' | 'pause'): void {
    settingsFrom = from;
    settings.refresh();
    home.screen.hide();
    pause.screen.hide();
    settings.show();
  }
  // Comment jouer : ouvert depuis l'accueil ou la pause, on revient au même endroit.
  let howtoFrom: 'home' | 'pause' | 'settings' = 'home';
  const howto = howToScreen(
    () => {
      if (howtoFrom === 'pause') {
        howto.hide();
        pause.screen.show();
        resumeGame();
      } else startGame();
    },
    () => {
      howto.hide();
      if (howtoFrom === 'pause') pause.screen.show();
      else if (howtoFrom === 'settings') settings.show();
      else home.screen.show();
    },
    () => startTutorial(null),
  );
  function openHowto(from: 'home' | 'pause' | 'settings'): void {
    howtoFrom = from;
    home.screen.hide();
    pause.screen.hide();
    howto.root.scrollTop = 0;
    howto.show();
  }
  showHome();
  // Thème choisi appliqué dès le démarrage (pas de flash de l'ancien thème).
  const theme0 = themeFor(config.theme);
  renderer.setTheme(theme0);
  applyThemeCss(theme0);
  howto.setTheme(theme0);
  home.howto.addEventListener('click', () => startTutorial(null));
  over.replay.addEventListener('click', () => {
    if (mode === 'online') {
      // Revanche : la salle relance quand les deux joueurs l'ont demandée.
      net?.send({ t: 'rematch' });
      over.replay.textContent = rematchAsked ? t('online.connecting') : t('online.rematchWait');
      return;
    }
    if (mode === 'expedition') startExpedition();
    else startGame();
  });
  over.next.addEventListener('click', () => {
    stageNo = Math.min(STAGE_COUNT, stageNo + 1);
    startGame(randomSeed(), 'campaign');
  });
  over.menu.addEventListener('click', () => {
    leaveOnline();
    over.replay.hidden = false;
    state = 'home';
    showHome();
  });
  // Reprise : compte à rebours 3, 2, 1 avant que la partie ne reparte.
  const COUNT_STEP_MS = 650;
  const countNum = el('b');
  const countdown = el('div', { id: 'countdown' }, [countNum]);
  countdown.hidden = true;
  stage.append(countdown);
  let resumeAt = 0;
  function resumeGame(): void {
    if (isLandscape() || state !== 'paused' || !pause.screen.visible) return;
    pause.screen.hide();
    resumeAt = performance.now() + 3 * COUNT_STEP_MS;
    countNum.textContent = '';
    countdown.hidden = false;
  }
  function cancelCountdown(): void {
    if (!resumeAt || linked) return;
    resumeAt = 0;
    countdown.hidden = true;
    pause.screen.show();
  }
  function stepCountdown(now: number): void {
    if (!resumeAt) return;
    const left = resumeAt - now;
    if (left <= 0) {
      resumeAt = 0;
      countdown.hidden = true;
      state = 'playing';
      sound.startMusic();
      return;
    }
    const n = String(Math.ceil(left / COUNT_STEP_MS));
    if (countNum.textContent !== n) {
      countNum.textContent = n;
      // Relance l'animation à chaque chiffre.
      countNum.classList.remove('tick');
      void countNum.offsetWidth;
      countNum.classList.add('tick');
      sound.ui();
    }
  }
  pause.resume.addEventListener('click', resumeGame);
  pause.restart.addEventListener('click', () => {
    if (mode !== 'expedition') startGame();
    else if (window.confirm(t('exp.abandonConfirm'))) startExpedition();
  });
  pause.settings.addEventListener('click', () => openSettings('pause'));
  pause.howto.addEventListener('click', () => openHowto('pause'));
  // Son et musique coupés ou remis directement depuis la pause.
  function syncPauseToggles(): void {
    pause.sound.classList.toggle('off', config.sound === 0);
    pause.music.classList.toggle('off', config.music === 0);
  }
  pause.sound.addEventListener('click', () => {
    setConfigValue('sound', config.sound === 0 ? 1 : 0);
    syncSound();
    syncPauseToggles();
  });
  pause.music.addEventListener('click', () => {
    setConfigValue('music', config.music === 0 ? 1 : 0);
    syncSound();
    syncPauseToggles();
  });
  pause.menu.addEventListener('click', () => {
    state = 'home';
    showHome();
  });
  home.settings.addEventListener('click', () => openSettings('home'));
  const progressView = progressScreen(progress, () => {
    progressView.hide();
    home.screen.show();
  });
  const campaignView = campaignScreen(
    (n) => {
      stageNo = n;
      campaignView.hide();
      launch('campaign');
    },
    () => {
      campaignView.hide();
      showHome();
    },
  );
  home.duel.button.addEventListener('click', () => {
    duelMenu.setCpuLabel(t(`diff.${difficulty}` as Key));
    home.screen.hide();
    duelMenu.root.scrollTop = 0;
    duelMenu.show();
  });
  home.campaign.button.addEventListener('click', () => {
    campaignView.refresh();
    campaignView.root.scrollTop = 0;
    home.screen.hide();
    campaignView.show();
  });
  const missionsView = missionsScreen(missions, () => {
    missionsView.hide();
    showHome();
  });
  const openMissions = () => {
    missionsView.refresh();
    missionsView.root.scrollTop = 0;
    home.screen.hide();
    missionsView.show();
  };
  home.player.addEventListener('click', openMissions);
  home.missions.addEventListener('click', openMissions);
  home.expedition.button.addEventListener('click', openExpIntro);
  home.progress.addEventListener('click', () => {
    progressView.refresh();
    progressView.root.scrollTop = 0;
    home.screen.hide();
    progressView.show();
  });
  /** Duel en ligne : le bouton pause propose d'abandonner. */
  function quitOnline(): void {
    if (state === 'playing' && window.confirm(t('online.quit'))) game.over = true;
  }
  runCards.addEventListener('click', () => pauseGame());
  pauseBtn.addEventListener('click', () => {
    if (linked) {
      quitOnline();
      return;
    }
    sound.ui();
    pauseGame();
  });

  // --- Accélération manuelle ---------------------------------------------
  const setRise = (on: boolean) => {
    game.manualRise = on && (state === 'playing' || state === 'tutorial');
    raise.classList.toggle('active', game.manualRise);
  };
  raise.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      raise.setPointerCapture(e.pointerId);
    } catch {
      /* ignoré */
    }
    setRise(true);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    raise.addEventListener(ev, () => setRise(false));
  }
  // Clavier (ordinateur) : Espace maintenue = accélération.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (linked) quitOnline();
      else if (resumeAt) cancelCountdown();
      else if (state === 'playing') pauseGame();
      else if (state === 'paused' && pause.screen.visible) resumeGame();
      return;
    }
    // Mode développeur : W fait gagner le duel ou la manche (pour tester les écrans de fin).
    // Mode développeur : N passe à l'étape suivante du tutoriel.
    if (dev && e.code === 'KeyN' && state === 'tutorial') {
      tutoStep = Math.min(TUTORIAL_STEPS.length - 1, tutoStep + 1);
      loadTutorialStep();
      return;
    }
    if (dev && e.code === 'KeyW' && state === 'playing') {
      if (cpu) cpu.over = true;
      else if (mode === 'campaign' || mode === 'expedition') game.won = game.over = true;
      return;
    }
    if (e.code !== 'Space' || debugOpen) return;
    e.preventDefault();
    if (state === 'playing' || state === 'tutorial') setRise(true);
    else if (!e.repeat && (state === 'home' || state === 'over') && !howto.visible && !settings.visible) startGame();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') setRise(false);
  });
  window.addEventListener('blur', () => setRise(false));

  // --- Plateforme ---------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelCountdown();
      pauseGame();
      sound.suspend();
    } else sound.resume();
  });
  window.addEventListener('pagehide', pauseGame);
  window.addEventListener('resize', updateOrientation);
  window.matchMedia('(orientation: landscape)').addEventListener?.('change', updateOrientation);
  // Bloque pincement, double-tap et défilement résiduels de Safari.
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick'] as const) {
    document.addEventListener(ev, (e) => e.preventDefault(), { passive: false } as AddEventListenerOptions);
  }
  document.addEventListener(
    'touchmove',
    (e) => {
      // Les écrans (menus, fin de partie…) défilent quand leur contenu dépasse ; le plateau, jamais.
      if (!(e.target instanceof Element && e.target.closest('#debug-panel, .screen'))) e.preventDefault();
    },
    { passive: false },
  );

  // --- HUD ----------------------------------------------------------------
  const hudCache: string[] = [];
  const setText = (i: number, node: HTMLElement, text: string) => {
    if (hudCache[i] !== text) {
      hudCache[i] = text;
      node.textContent = text;
    }
  };
  function updateHud(): void {
    // Score qui défile jusqu'à sa valeur.
    if (!config.animations || game.score < shownScore) shownScore = game.score;
    else if (shownScore < game.score) shownScore = Math.min(game.score, shownScore + Math.max(1, Math.ceil((game.score - shownScore) * 0.12)));
    setText(0, hudScore, String(shownScore));
    if (!duel) setText(1, hudBest, String(Math.max(best, game.recordValue)));
    setText(2, badge.value, String(game.goalRows > 0 ? stageNo : game.mode.record === 'rosaces' ? game.rosaceCount : game.level));
    const left = game.timeLeft;
    setText(3, hudTime, formatTime(left === null ? game.elapsed : Math.ceil(left)));
    // Jauge de la pastille : temps restant (modes chronométrés) ou avancée dans le niveau.
    const limit = game.mode.timeLimitS(game.cfg);
    const dur = Math.max(1e-6, game.cfg.levelDurationS);
    chip.set(game.order);
    // Boucliers de l'expédition, sous le score.
    if (!duel && !linked) setText(6, incoming, '🛡'.repeat(game.shields) + '🎯'.repeat(game.shots));
    if (duel && cpu) setText(1, hudBest, String(cpu.score));
    else if (linked) setText(1, hudBest, String(remote?.stats.score ?? 0));
    else if (game.goalRows > 0) {
      // Campagne : rangées avant l'arrivée de la ligne, puis tuiles encore au-dessus.
      const above = game.tilesAboveLine();
      setText(5, hudRecLabel, above === null ? t('hud.lineIn') : t('hud.toClear'));
      setText(1, hudBest, String(above === null ? game.goalRows - game.rowsRisen : above));
      badge.setProgress(Math.min(1, game.rowsRisen / (game.goalRows + game.grid.rows / 2)));
    } else badge.setProgress(left !== null && limit > 0 ? left / limit : (game.time % dur) / dur);
    document.body.classList.toggle('hurry', left !== null && left <= 10 && state === 'playing');
    const danger = String(game.danger);
    if (hudCache[4] !== danger) {
      hudCache[4] = danger;
      document.body.classList.toggle('warn', game.danger === 1);
      document.body.classList.toggle('alert', game.danger === 2);
    }
  }

  // --- Tutoriel --------------------------------------------------------------
  const TUTORIAL_KEY = 'tomettes.tutorial';
  const tutoTitle = el('strong');
  const tutoText = el('p');
  const tutoRetry = el('button', { type: 'button', class: 'tuto-icon', 'aria-label': t('tuto.retry'), title: t('tuto.retry') }, ['↺']);
  const tutoSkip = el('button', { type: 'button', class: 'tuto-link' }, [`${t('tuto.skip')} ⏭`]);
  const tutoDots = el('div', { class: 'tuto-dots' });
  const tutoActions = el('div', { class: 'tuto-actions' }, [tutoRetry, tutoSkip]);
  const tuto = el('div', { id: 'tuto' }, [tutoDots, tutoTitle, tutoText, tutoActions]);
  tuto.hidden = true;
  stage.append(tuto);
  let tutoStep = 0;
  let tutoDoneAt = 0;
  let tutoThen: ModeId | null = null;

  function startTutorial(then: ModeId | null): void {
    tutoThen = then;
    tutoStep = 0;
    // Le tutoriel se joue seul : pas d'adversaire, pas de cartes d'expédition.
    cpu = ai = duel = null;
    leaveOnline();
    document.body.classList.remove('duel');
    runCards.replaceChildren();
    window.clearTimeout(overTimer);
    home.screen.hide();
    howto.hide();
    over.screen.hide();
    pause.screen.hide();
    badge.label.textContent = t('hud.level');
    state = 'tutorial';
    loadTutorialStep();
    sound.startMusic();
  }

  function loadTutorialStep(): void {
    const step = TUTORIAL_STEPS[tutoStep];
    const prev = game.grid;
    game = step.build(config);
    input.release();
    renderer.reset();
    if (prev.cols !== game.grid.cols || prev.rows !== game.grid.rows) relayout();
    renderer.hint = step.hint ?? null;
    raise.classList.toggle('pulse', !!step.hintRise);
    tutoDoneAt = 0;
    tutoTitle.textContent = tutoTitle_(step.id);
    tutoDots.replaceChildren(...TUTORIAL_STEPS.map((_s, i) => el('i', { class: i < tutoStep ? 'done' : i === tutoStep ? 'on' : '' })));
    tutoText.textContent = tutoText_(step.id);
    tutoActions.replaceChildren(tutoRetry, tutoSkip);
    tuto.hidden = false;
  }

  function checkTutorial(): void {
    const step = TUTORIAL_STEPS[tutoStep];
    if (tutoDoneAt) {
      if (performance.now() - tutoDoneAt > 1500) {
        tutoStep++;
        if (tutoStep < TUTORIAL_STEPS.length) loadTutorialStep();
        else finishTutorial();
      }
      return;
    }
    if (step.done(game, game.events.filter((e): e is ClearEvent => e.kind === 'clear'))) {
      tutoDoneAt = performance.now();
      renderer.hint = null;
      raise.classList.remove('pulse');
      tutoText.textContent = t('tuto.bravo');
    }
  }

  function finishTutorial(): void {
    track('tutorial_done', { step: tutoStep });
    save(TUTORIAL_KEY, '1');
    renderer.hint = null;
    raise.classList.remove('pulse');
    setRise(false);
    state = 'paused';
    const play = el('button', { type: 'button', class: 'btn primary' }, [t('common.play')]);
    const menu = el('button', { type: 'button', class: 'btn' }, [t('common.menu')]);
    play.addEventListener('click', () => {
      tuto.hidden = true;
      startGame(randomSeed(), tutoThen ?? 'endless');
    });
    menu.addEventListener('click', () => {
      tuto.hidden = true;
      state = 'home';
      showHome();
    });
    tutoTitle.textContent = t('tuto.doneTitle');
    tutoText.textContent = t('tuto.doneText');
    tutoActions.replaceChildren(play, menu);
  }

  tutoRetry.addEventListener('click', () => loadTutorialStep());
  tutoSkip.addEventListener('click', () => finishTutorial());

  // --- Son -----------------------------------------------------------------
  let lastLevel = 1;
  let lastAlertBeep = 0;
  function playSounds(now: number): void {
    syncSound();
    for (const s of game.signals) {
      if (s === 'swap') sound.swap();
      else if (s === 'land') sound.land();
      else if (s === 'slide') sound.slide();
      else if (s === 'mortar') sound.mortar();
      else if (s === 'crumble') sound.crumble();
      else sound.repair();
    }
    game.signals.length = 0;
    for (const n of game.notices) {
      if (n === 'order' || n === 'orderGold' || n === 'fireworks' || n === 'rainbow') sound.rosace();
      else if (n === 'mistral') sound.slide();
      else if (n === 'shot') sound.repair();
      else if (n === 'shield' || n === 'blocked' || n === 'counter' || n === 'shieldUsed') sound.repair();
      else sound.mortar();
    }
    for (const e of game.events) {
      if (e.rosaces) sound.rosace();
      else if (e.gold) sound.gold();
      else sound.clear(e.chain, e.size);
    }
    if (state !== 'playing') return;
    if (game.level > lastLevel) sound.level();
    lastLevel = game.level;
    sound.tempo = 1 + (Math.min(game.level, 15) - 1) * 0.04;
    if (game.danger === 2 && now - lastAlertBeep > 500) {
      lastAlertBeep = now;
      sound.alertTick();
    }
  }

  // --- Mode capture (développeur) : piloter une partie depuis un script --------
  /** Joueur automatique sur la partie du joueur (mode capture). */
  let autoAi: Ai | null = null;
  /** Mode capture : la boucle n'avance que du nombre de pas demandé par le script (une image = n pas exacts). */
  let driven = false;
  let drivenSteps = 0;
  if (dev) {
    const capture = {
      get game() {
        return game;
      },
      get cpu() {
        return cpu;
      },
      get state() {
        return state;
      },
      setDifficulty(d: Difficulty) {
        difficulty = d;
      },
      start(seed: number, m: ModeId) {
        autoAi = null;
        startGame(seed, m);
      },
      autoplay(skill: AiSkill | null, seed = 1, overrides: Partial<AiProfile> = {}) {
        autoAi = skill ? new Ai(game, { ...AI_PROFILES[skill], ...overrides }, seed) : null;
      },
      /** Centre d'une case à l'écran (px CSS, coordonnées de la page). */
      cellOnScreen(c: number, r: number) {
        const box = canvas.getBoundingClientRect();
        const L = layout;
        if (!L) return null;
        // Le plateau peut être zoomé (transform CSS) pendant une capture.
        const k = box.width / (canvas.clientWidth || box.width);
        const p = cellCenter(c, r, L.R);
        return { x: box.left + (L.x0 + p.x) * k, y: box.top + (L.y0 + p.y - game.riseOffset * L.h) * k, R: L.R * k };
      },
      /** Un pas de logique, dans le même ordre que la boucle ; renvoie les événements du joueur. */
      step(): GameEvent[] {
        autoAi?.update(STEP_MS);
        game.tick(STEP_MS);
        if (duel && cpu && ai) {
          ai.update(STEP_MS);
          cpu.tick(STEP_MS);
          duel.step(STEP_MS / 1000);
          cpu.events.length = 0;
          cpu.signals.length = 0;
          cpu.notices.length = 0;
          duel.eventsCleared(1);
        }
        const ev = game.events.slice();
        game.events.length = 0;
        game.signals.length = 0;
        game.notices.length = 0;
        duel?.eventsCleared(0);
        return ev;
      },
      /** Une image pilotée : `steps` pas de logique puis le dessin (0 = image figée). */
      frame(steps: number) {
        driven = true;
        drivenSteps = steps;
        frame(performance.now(), true);
      },
      /** Rend la main à la boucle normale. */
      release() {
        driven = false;
      },
      /** Avance rapide sans dessin, jusqu'à `steps` pas ou la fin de la partie. */
      skip(steps: number) {
        for (let i = 0; i < steps && !game.over && !(duel && duel.winner !== null); i++) capture.step();
      },
    };
    Object.assign(window, { tomettes: capture });
  }

  // --- Boucle à pas fixe ---------------------------------------------------
  let liveCheck = 0;
  let last = performance.now();
  let acc = 0;
  function frame(now: number, once = false): void {
    const dt = Math.min(250, now - last);
    last = now;
    if (dt > 0) fps = fps * 0.95 + (1000 / dt) * 0.05;

    if ((state === 'playing' || state === 'tutorial') && !debugOpen) {
      if (driven) {
        acc = drivenSteps * STEP_MS + 1e-6;
        drivenSteps = 0;
      } else acc += dt;
      if (state === 'playing' && ++liveCheck % 30 === 0) progress.checkLive(game);
      while (acc >= STEP_MS) {
        input.update();
        autoAi?.update(STEP_MS);
        game.tick(STEP_MS);
        if (duel && cpu && ai) {
          // Duel : l'ordinateur joue, puis les dalles s'échangent.
          ai.update(STEP_MS);
          cpu.tick(STEP_MS);
          duel.step(STEP_MS / 1000);
          cpu.events.length = 0;
          cpu.signals.length = 0;
          cpu.notices.length = 0;
          duel.eventsCleared(1);
        }
        acc -= STEP_MS;
        if (linked && net && state === 'playing') {
          const out = linked.step(STEP_MS / 1000);
          if (out.length) net.send({ t: 'attack', a: out });
        }
        if (game.over || (duel && duel.winner !== null) || (linked && remoteOver)) {
          if (state === 'tutorial') loadTutorialStep();
          else endGame();
          break;
        }
      }
      if (driven) acc = 0;
    } else {
      acc = 0;
    }

    const theme = themeFor(config.theme);
    if (renderer.setTheme(theme)) {
      applyThemeCss(theme);
      howto.setTheme(theme);
    }
    if (renderer.setGlyphs(Math.round(config.glyphs))) howto.redraw();
    if (state === 'tutorial') checkTutorial();
    stepCountdown(now);
    playSounds(now);
    renderer.consumeEvents(game, now);
    duel?.eventsCleared(0);
    linked?.eventsCleared();
    if (linked && net && state === 'playing' && now - lastStateSent > 200) {
      lastStateSent = now;
      net.send({ t: 'state', view: packView(game), stats: myStats(), pending: linked.pending.length });
    }
    if ((duel && cpu) || linked) {
      if (duel && cpu) drawMini(mini, packView(cpu), theme, duel.pending[1]);
      else if (remote) drawMini(mini, remote.view, theme, Array.from({ length: Math.min(6, remote.pending) }, () => ({ kind: 'slab' as const, w: 4, h: 1 })));
      const list = duel ? duel.pending[0] : linked!.pending;
      const shielded = duel ? duel.shield[0] : linked!.shield;
      const key = `${shielded}|${list.map((a) => (a.kind === 'slab' ? `${a.w}x${a.h}` : a.kind)).join()}`;
      if (incoming.dataset.key !== key) {
        incoming.dataset.key = key;
        incoming.replaceChildren(
          ...(shielded ? [el('b', { class: 'shield' }, ['🛡'])] : []),
          ...list.slice(0, 8).map((a) =>
            a.kind === 'slab' ? el('i', { style: `width:${6 + a.w * 3}px;height:${3 + a.h * 3}px` }) : el('b', { class: 'malus' }, [MALUS_ICON[a.kind]]),
          ),
        );
      }
    }
    renderer.draw(game, input.heldId, now);
    updateHud();
    if (!once) requestAnimationFrame((t) => frame(t));
  }

  // Lien d'invitation (#room=ABCDEFGH) : on rejoint directement la salle de l'ami, et le
  // code disparaît aussitôt de l'adresse (et de l'historique).
  const invite = inviteCode(location.hash);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (invite) openRoom(invite, false);

  updateOrientation();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(relayout).observe(stage);
  requestAnimationFrame((t) => frame(t));
}

boot();

// Hors ligne : service worker (build de production uniquement).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* hors ligne indisponible : le jeu marche quand même */
    });
  });
}
