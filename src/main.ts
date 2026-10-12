import './style.css';
import { config } from './config';
import { Game, STEP_MS } from './core/game';
import { randomSeed } from './core/rng';
import { BoardInput } from './input/board-input';
import { computeLayout, Layout } from './render/layout';
import { Renderer } from './render/renderer';
import { attachLongPress, DebugPanel, loadSavedConfig } from './ui/debug';
import { el, formatTime } from './ui/dom';
import { isDevMode, isPhone } from './ui/guard';
import { howToScreen } from './ui/howto';
import { gameOverScreen, homeScreen, pauseScreen, rotateScreen } from './ui/screens';
import { loadBest, saveBest } from './ui/storage';

type State = 'home' | 'playing' | 'paused' | 'over';

const dev = isDevMode();
const phone = isPhone();

function boot(): void {
  if (dev) document.body.classList.add('dev');
  loadSavedConfig();

  // --- DOM ---------------------------------------------------------------
  const hudScore = el('span', { class: 'v' });
  const hudBest = el('span', { class: 'v' });
  const hudLevel = el('span', { class: 'v' });
  const hudTime = el('span', { class: 'v' });
  const hudItem = (label: string, v: HTMLElement) => el('div', { class: 'hud-item' }, [el('span', { class: 'k' }, [label]), v]);
  const hud = el('header', { id: 'hud' }, [
    hudItem('Score', hudScore),
    hudItem('Record', hudBest),
    hudItem('Niveau', hudLevel),
    hudItem('Temps', hudTime),
  ]);
  const canvas = el('canvas', { id: 'board' });
  const stage = el('main', { id: 'stage' }, [canvas]);
  const raise = el('button', { id: 'raise', type: 'button' }, ['▲ Monter']);
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
  let best = loadBest();
  let game = new Game(config, randomSeed());
  let layout: Layout | null = null;
  let fps = 60;
  let debugOpen = false;

  const renderer = new Renderer(canvas);
  const input = new BoardInput(canvas, () => (state === 'playing' ? game : null), () => layout);

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
  // Phase d'élaboration : bouton de debug toujours visible, à côté de « Monter ».
  const gear = el('button', { id: 'debug-gear', type: 'button', 'aria-label': 'Debug' }, ['⚙']);
  gear.addEventListener('click', () => (debug.isOpen ? debug.close() : debug.open()));
  footer.append(gear);

  function relayout(): void {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    layout = computeLayout(w, h, game.grid.cols, game.grid.rows, dpr);
    renderer.resize(layout, game.grid.cols, game.grid.rows);
  }

  function startGame(seed: number = randomSeed()): void {
    const prev = game.grid;
    game = new Game(config, seed);
    input.release();
    renderer.reset();
    if (prev.cols !== game.grid.cols || prev.rows !== game.grid.rows) relayout();
    home.screen.hide();
    howto.hide();
    over.screen.hide();
    pause.hide();
    state = 'playing';
  }

  function endGame(): void {
    state = 'over';
    input.release();
    game.manualRise = false;
    const record = game.score > best;
    if (record) {
      best = game.score;
      saveBest(best);
    }
    over.score.textContent = `Score : ${game.score}`;
    over.record.textContent = record ? 'Nouveau record !' : `Record : ${best}`;
    over.screen.show();
  }

  function pauseGame(): void {
    if (state !== 'playing') return;
    state = 'paused';
    input.release();
    game.manualRise = false;
    pause.show();
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

  home.best.textContent = best > 0 ? `Record : ${best}` : '';
  home.screen.show();
  const howto = howToScreen(
    () => startGame(),
    () => {
      howto.hide();
      home.screen.show();
    },
  );
  home.play.addEventListener('click', () => startGame());
  home.howto.addEventListener('click', () => {
    home.screen.hide();
    howto.root.scrollTop = 0;
    howto.show();
  });
  over.screen.onTap(() => startGame());
  pause.onTap(() => {
    if (isLandscape()) return;
    pause.hide();
    state = 'playing';
  });

  // --- Accélération manuelle ---------------------------------------------
  const setRise = (on: boolean) => {
    game.manualRise = on && state === 'playing';
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
    if (e.code !== 'Space' || debugOpen) return;
    e.preventDefault();
    if (state === 'playing') setRise(true);
    else if (!e.repeat && (state === 'home' || state === 'over') && !howto.visible) startGame();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') setRise(false);
  });
  window.addEventListener('blur', () => setRise(false));

  // --- Plateforme ---------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
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
      if (!(e.target instanceof Element && e.target.closest('#debug-panel, #screen-howto'))) e.preventDefault();
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
    setText(0, hudScore, String(game.score));
    setText(1, hudBest, String(Math.max(best, game.score)));
    setText(2, hudLevel, String(game.level));
    setText(3, hudTime, formatTime(game.time));
    const alert = game.alert ? '1' : '';
    if (hudCache[4] !== alert) {
      hudCache[4] = alert;
      document.body.classList.toggle('alert', game.alert);
    }
  }

  // --- Boucle à pas fixe ---------------------------------------------------
  let last = performance.now();
  let acc = 0;
  function frame(now: number): void {
    const dt = Math.min(250, now - last);
    last = now;
    if (dt > 0) fps = fps * 0.95 + (1000 / dt) * 0.05;

    if (state === 'playing' && !debugOpen) {
      acc += dt;
      while (acc >= STEP_MS) {
        input.update();
        game.tick(STEP_MS);
        acc -= STEP_MS;
        if (game.over) {
          endGame();
          break;
        }
      }
    } else {
      acc = 0;
    }

    renderer.consumeEvents(game, now);
    renderer.draw(game, input.heldId, now);
    updateHud();
    requestAnimationFrame(frame);
  }

  updateOrientation();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(relayout).observe(stage);
  requestAnimationFrame(frame);
}

boot();
