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
import { ClearEvent, Game, STEP_MS } from './core/game';
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
import { ACHIEVEMENTS } from './core/progress';
import { el, formatTime } from './ui/dom';
import { isDevMode, isPhone } from './ui/guard';
import { Key, lang, t } from './i18n';
import { achName, longText, missionText, modeTag, tutoText as tutoText_, tutoTitle as tutoTitle_ } from './ui/text';
import { howToScreen } from './ui/howto';
import { settingsScreen } from './ui/settings';
import { aboutScreen } from './ui/about';
import { HomeBackground } from './ui/home-bg';
import { Progress, progressScreen } from './ui/progress';
import { bar, Missions, missionsScreen, playerLevel } from './ui/missions';
import { longMission } from './core/missions';
import { unlocksBetween } from './core/unlocks';
import { STAGE_COUNT, stageConfig, stageSpec, starsFor } from './core/campaign';
import { campaignScreen, saveStars, starText, totalStars } from './ui/campaign';
import { Ai, AI_PROFILES, AiSkill } from './core/ai';
import { Duel, duelConfig } from './core/duel';

/** Pictogramme d'un malus en approche (au-dessus de la grille du joueur). */
const MALUS_ICON = { night: '🌙', freeze: '❄', crack: '⚡', quake: '〰' } as const;
import { drawMini } from './render/mini';
import { loadDuel, recordDuel } from './ui/duel';
import { duelResult } from './ui/duel-result';
import { gameOverScreen, homeScreen, pauseScreen, rotateScreen } from './ui/screens';
import { load, loadBest, loadDifficulty, save, saveBest, saveDifficulty } from './ui/storage';

type State = 'home' | 'playing' | 'paused' | 'over' | 'tutorial';

const dev = isDevMode();
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
  const mini = el('canvas', { id: 'duel-mini' });
  const hud = el('header', { id: 'hud' }, [badge.root, el('div', { class: 'hud-score' }, [hudScore, hudSub, incoming]), mini, pauseBtn]);
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
  // Bouton de debug visible seulement avec ?dev=1 (sinon : appui long en haut à gauche).
  if (dev) {
    const gear = el('button', { id: 'debug-gear', type: 'button', 'aria-label': 'Debug' });
    gear.innerHTML = icon('gear');
    gear.addEventListener('click', () => (debug.isOpen ? debug.close() : debug.open()));
    footer.append(gear);
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
  let shownScore = 0;

  function startGame(seed: number = randomSeed(), m: ModeId = mode): void {
    window.clearTimeout(overTimer);
    shownScore = 0;
    mode = m;
    best = loadBest(mode, difficulty);
    badge.label.textContent = mode === 'campaign' ? t('hud.stage') : modeById(mode).record === 'rosaces' ? t('hud.rosaces') : t('hud.level');
    hudRecLabel.textContent = t('hud.record');
    hudCache.length = 0;
    const prev = game.grid;
    cpu = ai = duel = null;
    document.body.classList.toggle('duel', mode === 'duel');
    if (mode === 'campaign') {
      const spec = stageSpec(stageNo, config);
      game = new Game(stageConfig(config, spec), seed, { mode, startLevel: spec.level, goalRows: spec.goal });
    } else if (mode === 'duel') {
      game = new Game(duelConfig(config), seed, { mode });
      cpu = new Game(duelConfig(config), seed ^ 0x9e3779b9, { mode });
      ai = new Ai(cpu, AI_PROFILES[aiSkill()], seed);
      duel = new Duel([game, cpu], [1, AI_PROFILES[aiSkill()].power], seed);
      hudRecLabel.textContent = t('hud.cpu');
      incoming.replaceChildren();
      incoming.dataset.key = '';
    } else game = new Game(withDifficulty(config, difficulty), seed, { mode });
    input.release();
    renderer.reset();
    if (prev.cols !== game.grid.cols || prev.rows !== game.grid.rows) relayout();
    home.screen.hide();
    howto.hide();
    settings.hide();
    over.screen.hide();
    pause.screen.hide();
    tuto.hidden = true;
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
    if (game.timeUp || game.won || duel?.winner === 0) sound.level();
    else sound.gameOver();
    input.release();
    game.manualRise = false;
    const value = game.recordValue;
    const record = value > best;
    if (record) {
      best = value;
      saveBest(best, mode, difficulty);
    }
    const rosaces = game.mode.record === 'rosaces';
    over.title.textContent = game.timeUp ? t('over.timeUp') : t('over.title');
    over.score.textContent = rosaces
      ? t(game.rosaceCount === 1 ? 'over.rosaces_one' : 'over.rosaces_other', { r: game.rosaceCount, s: game.score })
      : t('over.score', { n: game.score });
    over.record.textContent = record ? t('over.newRecord') : t(rosaces ? 'over.recordRosaces' : 'over.record', { n: best });
    over.next.hidden = true;
    over.replay.textContent = t('common.replay');
    over.duel.replaceChildren();
    over.screen.root.classList.remove('is-duel', 'win', 'lose', 'draw');
    if (duel && cpu) {
      const w = duel.winner;
      const result = w === 0 ? 'win' : w === 1 ? 'lose' : 'draw';
      const rec = recordDuel(aiSkill(), result)[aiSkill()];
      over.duel.append(
        duelResult({
          result,
          level: t(`diff.${difficulty}` as Key),
          time: formatTime(game.elapsed),
          me: { score: game.score, sent: duel.sent[0], chain: game.stats.maxChain, rosaces: game.rosaceCount },
          cpu: { score: cpu.score, sent: duel.sent[1], chain: cpu.stats.maxChain, rosaces: cpu.rosaceCount },
          wins: rec.wins,
          losses: rec.losses,
          streak: rec.streak,
        }),
      );
      over.screen.root.classList.add('is-duel', result);
      over.replay.textContent = t('duel.rematch');
      game.over = true;
      cpu.over = true;
    }
    if (mode === 'campaign') {
      // Campagne : étoiles selon le temps, manche suivante si réussie.
      const spec = stageSpec(stageNo, config);
      over.replay.textContent = t('camp.retry');
      if (game.won) {
        const stars = starsFor(spec, game.elapsed);
        const better = saveStars(stageNo, stars);
        over.title.textContent = t('camp.won', { n: stageNo });
        over.score.textContent = starText(stars);
        over.record.textContent = `${t('camp.time', { t: formatTime(game.elapsed) })}${better ? ` · ${t('over.newRecord')}` : ''}`;
        over.next.hidden = stageNo >= STAGE_COUNT;
      } else {
        over.title.textContent = t('camp.lost', { n: stageNo });
        over.score.textContent = t('over.score', { n: game.score });
        over.record.textContent = t('camp.goal3', { t: formatTime(spec.star3) });
      }
    }
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
    home.missions.rec.textContent = `${daily.filter((m) => m.done).length}/${daily.length}`;
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
  let howtoFrom: 'home' | 'pause' = 'home';
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
      else home.screen.show();
    },
    () => startTutorial(null),
  );
  function openHowto(from: 'home' | 'pause'): void {
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
  home.howto.addEventListener('click', () => openHowto('home'));
  over.replay.addEventListener('click', () => startGame());
  over.next.addEventListener('click', () => {
    stageNo = Math.min(STAGE_COUNT, stageNo + 1);
    startGame(randomSeed(), 'campaign');
  });
  over.menu.addEventListener('click', () => {
    state = 'home';
    showHome();
  });
  function resumeGame(): void {
    if (isLandscape() || state !== 'paused' || !pause.screen.visible) return;
    pause.screen.hide();
    state = 'playing';
    sound.startMusic();
  }
  pause.resume.addEventListener('click', resumeGame);
  pause.restart.addEventListener('click', () => startGame());
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
  home.duel.button.addEventListener('click', () => launch('duel'));
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
  home.missions.button.addEventListener('click', openMissions);
  home.progress.addEventListener('click', () => {
    progressView.refresh();
    progressView.root.scrollTop = 0;
    home.screen.hide();
    progressView.show();
  });
  pauseBtn.addEventListener('click', () => {
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
      if (state === 'playing') pauseGame();
      else if (state === 'paused' && pause.screen.visible) resumeGame();
      return;
    }
    // Mode développeur : W fait perdre l'ordinateur (pour tester la fin de duel).
    if (dev && e.code === 'KeyW' && cpu && state === 'playing') {
      cpu.over = true;
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
      if (!(e.target instanceof Element && e.target.closest('#debug-panel, #screen-howto, #screen-settings, #screen-progress, #screen-about, #screen-missions, #screen-campaign'))) e.preventDefault();
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
    if (duel && cpu) setText(1, hudBest, String(cpu.score));
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
  const tutoRetry = el('button', { type: 'button', class: 'tuto-link' }, [t('tuto.retry')]);
  const tutoSkip = el('button', { type: 'button', class: 'tuto-link' }, [t('tuto.skip')]);
  const tutoActions = el('div', { class: 'tuto-actions' }, [tutoRetry, tutoSkip]);
  const tuto = el('div', { id: 'tuto' }, [tutoTitle, tutoText, tutoActions]);
  tuto.hidden = true;
  stage.append(tuto);
  let tutoStep = 0;
  let tutoDoneAt = 0;
  let tutoThen: ModeId | null = null;

  function startTutorial(then: ModeId | null): void {
    tutoThen = then;
    tutoStep = 0;
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
    tutoTitle.textContent = t('tuto.step', { i: tutoStep + 1, n: TUTORIAL_STEPS.length, title: tutoTitle_(step.id) });
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
      if (n === 'shield' || n === 'blocked' || n === 'counter') sound.repair();
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

  // --- Boucle à pas fixe ---------------------------------------------------
  let liveCheck = 0;
  let last = performance.now();
  let acc = 0;
  function frame(now: number): void {
    const dt = Math.min(250, now - last);
    last = now;
    if (dt > 0) fps = fps * 0.95 + (1000 / dt) * 0.05;

    if ((state === 'playing' || state === 'tutorial') && !debugOpen) {
      acc += dt;
      if (state === 'playing' && ++liveCheck % 30 === 0) progress.checkLive(game);
      while (acc >= STEP_MS) {
        input.update();
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
        if (game.over || (duel && duel.winner !== null)) {
          if (state === 'tutorial') loadTutorialStep();
          else endGame();
          break;
        }
      }
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
    playSounds(now);
    renderer.consumeEvents(game, now);
    duel?.eventsCleared(0);
    if (duel && cpu) {
      drawMini(mini, cpu, theme, duel.pending[1]);
      const list = duel.pending[0];
      const key = `${duel.shield[0]}|${list.map((a) => (a.kind === 'slab' ? `${a.w}x${a.h}` : a.kind)).join()}`;
      if (incoming.dataset.key !== key) {
        incoming.dataset.key = key;
        incoming.replaceChildren(
          ...(duel.shield[0] ? [el('b', { class: 'shield' }, ['🛡'])] : []),
          ...list.slice(0, 8).map((a) =>
            a.kind === 'slab' ? el('i', { style: `width:${6 + a.w * 3}px;height:${3 + a.h * 3}px` }) : el('b', { class: 'malus' }, [MALUS_ICON[a.kind]]),
          ),
        );
      }
    }
    renderer.draw(game, input.heldId, now);
    updateHud();
    requestAnimationFrame(frame);
  }

  updateOrientation();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(relayout).observe(stage);
  requestAnimationFrame(frame);
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
