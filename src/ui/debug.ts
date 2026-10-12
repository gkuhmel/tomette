import { config, ConfigKey, defaultConfig, structuralKeys } from '../config';
import type { Game } from '../core/game';
import { el } from './dom';
import { load, remove, save } from './storage';

const CONFIG_KEY = 'tomettes.config';

/** Applique au démarrage les réglages mémorisés. */
export function loadSavedConfig(): void {
  const raw = load(CONFIG_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    for (const key of Object.keys(defaultConfig) as ConfigKey[]) {
      const v = saved[key];
      if (typeof v === 'number' && Number.isFinite(v)) config[key] = v;
    }
  } catch {
    /* réglages corrompus : ignorés */
  }
}

function persist(): void {
  const diff: Partial<Record<ConfigKey, number>> = {};
  for (const key of Object.keys(defaultConfig) as ConfigKey[]) {
    if (config[key] !== defaultConfig[key]) diff[key] = config[key];
  }
  if (Object.keys(diff).length) save(CONFIG_KEY, JSON.stringify(diff));
  else remove(CONFIG_KEY);
}

export interface DebugHooks {
  getGame(): Game | null;
  getFps(): number;
  restart(seed?: number): void;
  onOpenChange(open: boolean): void;
}

export class DebugPanel {
  readonly root: HTMLDivElement;
  private stats: HTMLPreElement;
  private inputs = new Map<ConfigKey, HTMLInputElement>();
  private timer = 0;

  constructor(private hooks: DebugHooks) {
    this.stats = el('pre', { class: 'debug-stats' });
    const fields = el('div', { class: 'debug-fields' });
    for (const key of Object.keys(defaultConfig) as ConfigKey[]) {
      const input = el('input', {
        type: 'number',
        inputmode: 'decimal',
        step: 'any',
        value: String(config[key]),
      });
      input.addEventListener('input', () => {
        const v = parseFloat(input.value.replace(',', '.'));
        if (!Number.isFinite(v)) return;
        config[key] = v;
        persist();
      });
      this.inputs.set(key, input);
      const label = structuralKeys.includes(key) ? `${key} ↻` : key;
      fields.append(el('label', {}, [el('span', {}, [label]), input]));
    }

    const level = el('input', { type: 'number', inputmode: 'numeric', value: '5', min: '1' });
    const button = (text: string, fn: () => void) => {
      const b = el('button', { type: 'button' }, [text]);
      b.addEventListener('click', fn);
      return b;
    };

    this.root = el('div', { id: 'debug-panel' }, [
      el('div', { class: 'debug-head' }, [el('strong', {}, ['Debug']), button('Fermer', () => this.close())]),
      this.stats,
      el('div', { class: 'debug-actions' }, [
        button('Redémarrer', () => {
          this.hooks.restart();
          this.close();
        }),
        button('Même graine', () => {
          this.hooks.restart(this.hooks.getGame()?.seed);
          this.close();
        }),
        el('span', { class: 'debug-level' }, [
          level,
          button('Aller au niveau', () => {
            const n = parseInt(level.value, 10);
            if (n >= 1) this.hooks.getGame()?.jumpToLevel(n);
          }),
        ]),
      ]),
      fields,
      el('p', { class: 'debug-note' }, ['↻ : appliqué au prochain redémarrage.']),
      el('div', { class: 'debug-actions' }, [
        button('Exporter', () => this.exportConfig()),
        button('Valeurs par défaut', () => {
          Object.assign(config, defaultConfig);
          persist();
          this.syncInputs();
        }),
      ]),
    ]);
    this.root.hidden = true;
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    if (this.isOpen) return;
    this.syncInputs();
    this.root.hidden = false;
    this.refresh();
    this.timer = window.setInterval(() => this.refresh(), 250);
    this.hooks.onOpenChange(true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    window.clearInterval(this.timer);
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.hooks.onOpenChange(false);
  }

  private syncInputs(): void {
    for (const [key, input] of this.inputs) input.value = String(config[key]);
  }

  private refresh(): void {
    const g = this.hooks.getGame();
    const lines = [`fps          ${this.hooks.getFps().toFixed(0)}`];
    if (g) {
      lines.push(
        `niveau       ${g.level}`,
        `s/rangée     ${g.secondsPerRow.toFixed(2)}`,
        `chaîne       ×${g.chain}`,
        `stop time    ${g.stopTime.toFixed(2)} s`,
        `alerte       ${g.alert ? `oui (${g.graceLeft.toFixed(2)} s)` : 'non'}`,
        `graine       ${g.seed}`,
      );
    }
    this.stats.textContent = lines.join('\n');
  }

  private exportConfig(): void {
    const json = JSON.stringify(config, null, 2);
    const fallback = () => window.prompt('Config JSON :', json);
    try {
      navigator.clipboard.writeText(json).then(
        () => window.alert('Config copiée dans le presse-papiers.'),
        fallback,
      );
    } catch {
      fallback();
    }
  }
}

/** Appui long (1 s) dans un élément pour ouvrir le panneau. */
export function attachLongPress(target: HTMLElement, ms: number, fn: () => void): void {
  let t = 0;
  const cancel = () => window.clearTimeout(t);
  target.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    cancel();
    t = window.setTimeout(fn, ms);
  });
  target.addEventListener('pointerup', cancel);
  target.addEventListener('pointercancel', cancel);
  target.addEventListener('pointerleave', cancel);
}
