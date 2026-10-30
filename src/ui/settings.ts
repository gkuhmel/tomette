import { config, ConfigKey } from '../config';
import { THEMES, themeFor } from '../render/theme';
import { SpriteCache } from '../render/sprites';
import { GLYPH_SET_COUNT } from '../render/glyphs';
import { isUnlocked, requiredLevel } from '../core/unlocks';
import { setConfigValue } from './debug';
import { Key, lang, LANGS, langName, setLang, t } from '../i18n';
import { el } from './dom';
import { isNative } from '../native';
import { resetProgress } from './storage';
import { Screen } from './screens';

/** Écran Réglages du joueur (son, musique, thème, effets). */
export function settingsScreen(
  onBack: () => void,
  onChange: () => void,
  onAbout: () => void,
  getLevel: () => number,
  onRules: () => void,
): Screen & { refresh(): void } {
  const toggles: [ConfigKey, Key, Key][] = [
    ['sound', 'set.sound', 'set.soundHelp'],
    ['music', 'set.music', 'set.musicHelp'],
    ['animations', 'set.effects', 'set.effectsHelp'],
    ['screenShake', 'set.shake', 'set.shakeHelp'],
    // Vibrations : seulement dans l'application (Safari ne sait pas faire vibrer un iPhone).
    ...(isNative ? [['vibration', 'set.vibration', 'set.vibrationHelp'] as [ConfigKey, Key, Key]] : []),
    ['hideNames', 'set.hideNames', 'set.hideNamesHelp'],
  ];
  const syncers: (() => void)[] = [];

  const rows = toggles.map(([key, label, help]) => {
    const box = el('input', { type: 'checkbox', class: 'switch' });
    box.addEventListener('change', () => {
      setConfigValue(key, box.checked ? 1 : 0);
      onChange();
    });
    syncers.push(() => (box.checked = config[key] !== 0));
    return el('label', { class: 'setting' }, [
      el('span', { class: 'setting-text' }, [el('strong', {}, [t(label)]), el('small', {}, [t(help)])]),
      box,
    ]);
  });

  /** Bouton verrouillé tant que le niveau du joueur est insuffisant. */
  const lockable = (b: HTMLButtonElement, lock: HTMLElement, kind: 'theme' | 'glyphs', i: number) => {
    syncers.push(() => {
      const open = isUnlocked(kind, i, getLevel());
      b.disabled = !open;
      b.classList.toggle('locked', !open);
      lock.textContent = open ? '' : `🔒 ${t('unlock.level', { n: requiredLevel(kind, i) })}`;
    });
  };

  const themeButtons = THEMES.map((th, i) => {
    const lock = el('small', { class: 'lock' });
    const b = el('button', { type: 'button', class: 'theme-btn' }, [
      el('span', { class: 'theme-swatch', style: `background:${th.bg};border-color:${th.tiles[0]}` }, [
        ...th.tiles.slice(0, 3).map((c) => el('i', { style: `background:${c}` })),
      ]),
      t(`theme.${i}` as Key),
      lock,
    ]);
    b.addEventListener('click', () => {
      setConfigValue('theme', i);
      onChange();
      refresh();
    });
    syncers.push(() => b.classList.toggle('selected', Math.round(config.theme) === i));
    lockable(b, lock, 'theme', i);
    return b;
  });

  // Jeux de pictogrammes : aperçu de quatre tuiles dans le thème courant.
  const glyphButtons = Array.from({ length: GLYPH_SET_COUNT }, (_, i) => {
    const preview = el('canvas', { class: 'glyph-preview' });
    const lock = el('small', { class: 'lock' });
    const b = el('button', { type: 'button', class: 'theme-btn' }, [preview, t(`glyphs.${i}` as Key), lock]);
    b.addEventListener('click', () => {
      setConfigValue('glyphs', i);
      onChange();
      refresh();
    });
    syncers.push(() => {
      b.classList.toggle('selected', Math.round(config.glyphs) === i);
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const R = 13;
      const sprites = new SpriteCache();
      sprites.setTheme(themeFor(config.theme));
      sprites.setSize(R, dpr);
      sprites.setGlyphs(i);
      const w = 4 * R * 2.1;
      const h = R * 2.3;
      preview.width = Math.ceil(w * dpr);
      preview.height = Math.ceil(h * dpr);
      preview.style.width = `${w}px`;
      preview.style.height = `${h}px`;
      const ctx = preview.getContext('2d')!;
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.scale(dpr, dpr);
      for (let k = 0; k < 4; k++) ctx.drawImage(sprites.get(k, 'normal'), k * R * 2.1, h / 2 - sprites.half, sprites.half * 2, sprites.half * 2);
    });
    lockable(b, lock, 'glyphs', i);
    return b;
  });

  // Langue : appliquée en rechargeant l'interface.
  const langButtons = LANGS.map((l) => {
    const b = el('button', { type: 'button', class: `lang-btn${l === lang ? ' selected' : ''}`, lang: l }, [langName(l)]);
    b.addEventListener('click', () => {
      if (l === lang) return;
      setLang(l);
      location.reload();
    });
    return b;
  });

  const reset = el('button', { type: 'button', class: 'btn danger' }, [t('set.reset')]);
  reset.addEventListener('click', () => {
    if (!window.confirm(t('set.resetConfirm'))) return;
    resetProgress();
    window.alert(t('set.resetDone'));
    location.reload();
  });

  const about = el('button', { type: 'button', class: 'btn' }, [t('common.about')]);
  about.addEventListener('click', onAbout);
  const rules = el('button', { type: 'button', class: 'btn' }, [t('common.howto')]);
  rules.addEventListener('click', onRules);

  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', onBack);

  const screen = new Screen('screen-settings', [
    el('div', { class: 'panel' }, [
      el('h2', {}, [t('common.settings')]),
      ...rows,
      el('h3', {}, [t('set.theme')]),
      el('div', { class: 'theme-list' }, themeButtons),
      el('h3', {}, [t('set.glyphs')]),
      el('div', { class: 'theme-list' }, glyphButtons),
      el('h3', {}, [t('set.language')]),
      el('div', { class: 'lang-list' }, langButtons),
      el('h3', {}, [t('set.progress')]),
      el('div', { class: 'home-buttons' }, [rules, reset, about]),
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
  const refresh = () => syncers.forEach((s) => s());
  refresh();
  return Object.assign(screen, { refresh });
}
