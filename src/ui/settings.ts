import { config, ConfigKey } from '../config';
import { THEMES } from '../render/theme';
import { setConfigValue } from './debug';
import { el } from './dom';
import { Screen } from './screens';

/** Écran Réglages du joueur (son, musique, thème, effets). */
export function settingsScreen(onBack: () => void, onChange: () => void): Screen & { refresh(): void } {
  const toggles: [ConfigKey, string, string][] = [
    ['sound', 'Effets sonores', 'Échanges, alignements, chaînes…'],
    ['music', 'Musique', 'Petite mélodie douce pendant la partie.'],
    ['animations', 'Effets visuels', 'Éclats, pétales, bandeau de niveau. À couper pour réduire les animations.'],
    ['screenShake', 'Tremblement d\'écran', 'Sur les grosses chaînes et les rosaces.'],
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
      el('span', { class: 'setting-text' }, [el('strong', {}, [label]), el('small', {}, [help])]),
      box,
    ]);
  });

  const themeButtons = THEMES.map((t, i) => {
    const b = el('button', { type: 'button', class: 'theme-btn' }, [
      el('span', { class: 'theme-swatch', style: `background:${t.bg};border-color:${t.tiles[0]}` }, [
        ...t.tiles.slice(0, 3).map((c) => el('i', { style: `background:${c}` })),
      ]),
      t.name,
    ]);
    b.addEventListener('click', () => {
      setConfigValue('theme', i);
      onChange();
      refresh();
    });
    syncers.push(() => b.classList.toggle('selected', Math.round(config.theme) === i));
    return b;
  });

  const back = el('button', { type: 'button', class: 'btn primary' }, ['Retour']);
  back.addEventListener('click', onBack);

  const screen = new Screen('screen-settings', [
    el('div', { class: 'panel' }, [
      el('h2', {}, ['Réglages']),
      ...rows,
      el('h3', {}, ['Thème']),
      el('div', { class: 'theme-list' }, themeButtons),
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
  const refresh = () => syncers.forEach((s) => s());
  refresh();
  return Object.assign(screen, { refresh });
}
