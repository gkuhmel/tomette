import { describe, expect, it } from 'vitest';
import { emptyTotals, newlyUnlocked, withGame } from '../src/core/progress';

const snap = (over: Record<string, unknown> = {}) => ({
  mode: 'endless' as const,
  score: 0,
  elapsed: 60,
  rosaces: 0,
  stats: { maxChain: 1, maxCombo: 3, tilesCleared: 12, goldUsed: 0, repairs: 0, alertSaves: 0, maxLevel: 2 },
  ...over,
});

describe('statistiques et succès', () => {
  it('cumule les parties', () => {
    let t = withGame(emptyTotals(), snap(), true);
    t = withGame(t, snap({ rosaces: 2, mode: 'mosaic' }), true);
    expect(t.games).toBe(2);
    expect(t.tiles).toBe(24);
    expect(t.rosaces).toBe(2);
    expect(t.gamesByMode).toEqual({ endless: 1, mosaic: 1 });
  });

  it('une partie en cours ne compte pas comme partie jouée', () => {
    const t = withGame(emptyTotals(), snap(), false);
    expect(t.games).toBe(0);
    expect(newlyUnlocked(t, snap(), new Set()).map((a) => a.id)).not.toContain('first');
  });

  it('débloque les bons succès, une seule fois', () => {
    const g = snap({ score: 6000, stats: { maxChain: 3, maxCombo: 5, tilesCleared: 40, goldUsed: 1, repairs: 0, alertSaves: 1, maxLevel: 4 } });
    const t = withGame(emptyTotals(), g, true);
    const ids = newlyUnlocked(t, g, new Set()).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first', 'chain2', 'chain3', 'combo5', 'gold', 'save', 'score5k']));
    expect(ids).not.toContain('chain4');
    expect(newlyUnlocked(t, g, new Set(ids))).toHaveLength(0);
  });
});
