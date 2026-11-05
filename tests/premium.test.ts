import { describe, expect, it } from 'vitest';
import { dayKey, atelierAllowed, FREE_STAGES, modeLocked, stageLocked, themeLocked, PREMIUM_THEME } from '../src/core/premium';

describe('version gratuite et version complète', () => {
  it('modes : Classique et duel gratuits, les autres avec l\'achat', () => {
    expect(modeLocked('endless', false)).toBe(false);
    expect(modeLocked('duel', false)).toBe(false);
    expect(modeLocked('campaign', false)).toBe(false);
    for (const m of ['timeAttack', 'mosaic', 'express'] as const) {
      expect(modeLocked(m, false)).toBe(true);
      expect(modeLocked(m, true)).toBe(false);
    }
  });

  it('campagne : 10 manches gratuites', () => {
    expect(stageLocked(FREE_STAGES, false)).toBe(false);
    expect(stageLocked(FREE_STAGES + 1, false)).toBe(true);
    expect(stageLocked(30, true)).toBe(false);
  });

  it('thème Tomettes réservé à la version complète', () => {
    expect(themeLocked(PREMIUM_THEME, false)).toBe(true);
    expect(themeLocked(PREMIUM_THEME, true)).toBe(false);
    expect(themeLocked(0, false)).toBe(false);
  });

  it('atelier : un gratuit par jour', () => {
    const today = dayKey(new Date(2026, 9, 31, 23, 59));
    expect(today).toBe('2026-10-31');
    expect(atelierAllowed(false, '', today)).toBe(true);
    expect(atelierAllowed(false, '2026-10-30', today)).toBe(true);
    expect(atelierAllowed(false, today, today)).toBe(false);
    expect(atelierAllowed(true, today, today)).toBe(true);
    expect(dayKey(new Date(2026, 10, 1, 0, 1))).toBe('2026-11-01');
  });
});
