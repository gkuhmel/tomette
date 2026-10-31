import { config, ConfigKey, defaultConfig, playerKeys, structuralKeys } from '../config';
import type { Game } from '../core/game';
import { el } from './dom';
import { isPremium, setDevPremium } from '../purchase';
import { PARAM_SECTIONS, ParamMeta } from './params';
import { load, remove, save } from './storage';

const CONFIG_KEY = 'tomettes.config';

/**
 * Applique au démarrage les réglages mémorisés. Hors développement, seuls ceux de l'écran
 * Réglages sont repris : un réglage de jeu modifié autrefois (ou à la main) ne compte pas.
 */
export function loadSavedConfig(): void {
  const raw = load(CONFIG_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const keys = __DEV_TOOLS__ ? (Object.keys(defaultConfig) as ConfigKey[]) : playerKeys;
    for (const key of keys) {
      const v = saved[key];
      if (typeof v === 'number' && Number.isFinite(v)) config[key] = v;
    }
  } catch {
    /* réglages corrompus : ignorés */
  }
}

export function persist(): void {
  const diff: Partial<Record<ConfigKey, number>> = {};
  for (const key of Object.keys(defaultConfig) as ConfigKey[]) {
    if (config[key] !== defaultConfig[key]) diff[key] = config[key];
  }
  if (Object.keys(diff).length) save(CONFIG_KEY, JSON.stringify(diff));
  else remove(CONFIG_KEY);
}

/** Change un réglage et le mémorise (utilisé aussi par l'écran Réglages du joueur). */
export function setConfigValue(key: ConfigKey, value: number): void {
  config[key] = value;
  persist();
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
  private syncers: (() => void)[] = [];
  private timer = 0;

  constructor(private hooks: DebugHooks) {
    this.stats = el('pre', { class: 'debug-stats' });
    const fields = el('div', { class: 'debug-fields' });
    for (const section of PARAM_SECTIONS) {
      fields.append(el('h4', { class: 'debug-section' }, [section.title]));
      for (const meta of section.params) fields.append(this.paramRow(meta));
    }

    const level = el('input', { type: 'number', inputmode: 'numeric', value: '5', min: '1' });
    const button = (text: string, fn: () => void) => {
      const b = el('button', { type: 'button' }, [text]);
      b.addEventListener('click', fn);
      return b;
    };

    // Version complète simulée (tester les verrous et l'écran d'achat sans payer).
    const fullLabel = () => `Version complète : ${isPremium() ? 'oui' : 'non'}`;
    const full = button(fullLabel(), () => {
      setDevPremium(!isPremium());
      full.textContent = fullLabel();
    });

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
        full,
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

  /** Une ligne de réglage : libellé, explication, curseur (ou choix) et champ numérique. */
  private paramRow(meta: ParamMeta): HTMLElement {
    const key = meta.key;
    const dot = el('span', { class: 'debug-dot', title: 'Modifié' });
    const title = structuralKeys.includes(key) ? `${meta.label} ↻` : meta.label;
    const head = el('div', { class: 'debug-param-head' }, [
      el('span', { class: 'debug-param-label' }, [title]),
      dot,
      el('code', {}, [key]),
    ]);
    const help = el('p', { class: 'debug-help' }, [meta.help + (meta.unit ? ` (${meta.unit})` : '')]);
    const set = (v: number) => {
      if (!Number.isFinite(v)) return;
      config[key] = v;
      persist();
      sync();
    };

    let controls: HTMLElement;
    let sync: () => void;
    if (meta.options) {
      const select = el(
        'select',
        {},
        meta.options.map((label, i) => el('option', { value: String(i) }, [label])),
      );
      select.addEventListener('change', () => set(Number(select.value)));
      controls = select;
      sync = () => {
        select.value = String(config[key]);
        dot.hidden = config[key] === defaultConfig[key];
      };
    } else if (meta.toggle) {
      const box = el('input', { type: 'checkbox' });
      box.addEventListener('change', () => set(box.checked ? 1 : 0));
      controls = el('label', { class: 'debug-toggle' }, [box, 'activée']);
      sync = () => {
        box.checked = config[key] !== 0;
        dot.hidden = config[key] === defaultConfig[key];
      };
    } else {
      const attrs = { min: String(meta.min), max: String(meta.max), step: String(meta.step) };
      const range = el('input', { type: 'range', ...attrs });
      const num = el('input', { type: 'number', inputmode: 'decimal', step: 'any' });
      range.addEventListener('input', () => set(parseFloat(range.value)));
      num.addEventListener('change', () => set(parseFloat(num.value.replace(',', '.'))));
      controls = el('div', { class: 'debug-controls' }, [range, num]);
      sync = () => {
        range.value = String(config[key]);
        if (document.activeElement !== num) num.value = String(config[key]);
        dot.hidden = config[key] === defaultConfig[key];
      };
    }
    sync();
    this.syncers.push(sync);
    return el('div', { class: 'debug-param' }, [head, help, controls]);
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
    for (const sync of this.syncers) sync();
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
