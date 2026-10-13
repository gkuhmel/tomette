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
