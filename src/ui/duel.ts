import type { AiSkill } from '../core/ai';
import { load, save } from './storage';

const KEY = 'tomettes.duel';

export type DuelRecord = Record<AiSkill, { wins: number; losses: number }>;

export function loadDuel(): DuelRecord {
  const empty: DuelRecord = { easy: { wins: 0, losses: 0 }, normal: { wins: 0, losses: 0 }, hard: { wins: 0, losses: 0 } };
  try {
    const raw = load(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

/** Compte un duel terminé (une égalité ne compte ni en victoire ni en défaite). */
export function recordDuel(skill: AiSkill, result: 'win' | 'lose' | 'draw'): DuelRecord {
  const r = loadDuel();
  if (result === 'win') r[skill].wins++;
  else if (result === 'lose') r[skill].losses++;
  save(KEY, JSON.stringify(r));
  return r;
}
