import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { fr } from '../src/i18n/fr';
import { it as itDict } from '../src/i18n/it';
import { zh } from '../src/i18n/zh';

const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('traductions', () => {
  for (const [name, dict] of Object.entries({ en, es, de, it: itDict, zh })) {
    it(`${name} : toutes les clés, mêmes paramètres`, () => {
      for (const [key, value] of Object.entries(fr)) {
        const tr = (dict as Record<string, string>)[key];
        expect(tr, `${name} : clé manquante ${key}`).toBeTruthy();
        expect(params(tr), `${name} : paramètres de ${key}`).toBe(params(value));
      }
      for (const key of Object.keys(dict)) expect(key in fr, `${name} : clé inconnue ${key}`).toBe(true);
    });
  }
});

describe('textes des succès et des thèmes', () => {
  it('chaque succès a un nom et une description, chaque thème un nom', async () => {
    const { ACHIEVEMENTS } = await import('../src/core/progress');
    const { THEMES } = await import('../src/render/theme');
    const keys = fr as Record<string, string>;
    for (const a of ACHIEVEMENTS) {
      expect(keys[`ach.${a.id}.name`], a.id).toBeTruthy();
      expect(keys[`ach.${a.id}.desc`], a.id).toBeTruthy();
    }
    THEMES.forEach((_th, i) => expect(keys[`theme.${i}`], `theme.${i}`).toBeTruthy());
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
