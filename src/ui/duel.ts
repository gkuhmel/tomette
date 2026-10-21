import type { AiSkill } from '../core/ai';
import { load, save } from './storage';

const KEY = 'tomettes.duel';

export type DuelRecord = Record<AiSkill, { wins: number; losses: number; streak: number }>;

export function loadDuel(): DuelRecord {
  const z = () => ({ wins: 0, losses: 0, streak: 0 });
  const empty: DuelRecord = { easy: z(), normal: z(), hard: z(), extreme: z() };
  try {
    const raw = load(KEY);
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<DuelRecord>;
    for (const k of Object.keys(empty) as AiSkill[]) empty[k] = { ...empty[k], ...saved[k] };
    return empty;
  } catch {
    return empty;
  }
}

/** Compte un duel terminé (une égalité ne compte ni en victoire ni en défaite). */
export function recordDuel(skill: AiSkill, result: 'win' | 'lose' | 'draw'): DuelRecord {
  const r = loadDuel();
  if (result === 'win') {
    r[skill].wins++;
    r[skill].streak++;
  } else if (result === 'lose') {
    r[skill].losses++;
    r[skill].streak = 0;
  }
  save(KEY, JSON.stringify(r));
  return r;
}
