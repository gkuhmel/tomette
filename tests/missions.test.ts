import { describe, expect, it } from 'vitest';
import {
  applyGame, dailyMissions, emptyMissionState, forDay, gameXp, levelFromXp, longMission, LONG_MISSIONS,
  MISSION_TEMPLATES, templateById, xpForNext,
} from '../src/core/missions';
import type { Snapshot } from '../src/core/progress';

const snap = (over: Partial<Snapshot> = {}, stats: Partial<Snapshot['stats']> = {}): Snapshot => ({
  mode: 'endless',
  score: 0,
  elapsed: 60,
  rosaces: 0,
  ...over,
  stats: { maxChain: 1, maxCombo: 3, tilesCleared: 0, goldUsed: 0, repairs: 0, alertSaves: 0, maxLevel: 1, slabsBroken: 0, ...stats },
});

describe('missions du jour', () => {
  it('3 missions distinctes, une par palier, identiques pour un même jour', () => {
    const a = dailyMissions('2026-10-21');
    expect(a).toHaveLength(3);
    expect(a.map((m) => m.tier)).toEqual([0, 1, 2]);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(dailyMissions('2026-10-21')).toEqual(a);
    for (const m of a) expect(m.target).toBe(templateById(m.id)!.targets[m.tier]);
  });

  it('les jours changent les missions (sur une semaine, au moins deux tirages différents)', () => {
    const days = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'];
    const keys = new Set(days.map((d) => dailyMissions(d).map((m) => m.id).join()));
    expect(keys.size).toBeGreaterThan(1);
  });

  it('une mission « en une partie » garde le meilleur résultat ; une mission cumulée additionne', () => {
    const day = '2026-10-21';
    let s = forDay(emptyMissionState(), day);
    s = { ...s, daily: [
      { id: 'tilesGame', tier: 1, target: 120, progress: 0, done: false },
      { id: 'tilesDay', tier: 1, target: 600, progress: 0, done: false },
      { id: 'scoreTime', tier: 0, target: 2000, progress: 0, done: false },
    ] };
    let r = applyGame(s, snap({ score: 5000 }, { tilesCleared: 80 }), day);
    expect(r.state.daily[0].progress).toBe(80);
    expect(r.state.daily[1].progress).toBe(80);
    // Mauvais mode : la mission Contre-la-montre n'avance pas.
    expect(r.state.daily[2].progress).toBe(0);
    r = applyGame(r.state, snap({}, { tilesCleared: 50 }), day);
    expect(r.state.daily[0].progress).toBe(80);
    expect(r.state.daily[1].progress).toBe(130);
    r = applyGame(r.state, snap({ mode: 'timeAttack', score: 2500 }, { tilesCleared: 130 }), day);
    expect(r.daily.map((m) => m.id).sort()).toEqual(['scoreTime', 'tilesGame']);
    expect(r.xpMissions).toBe(175 + 100);
    // Une mission réussie ne rapporte qu'une fois.
    r = applyGame(r.state, snap({ mode: 'timeAttack', score: 9000 }, { tilesCleared: 300 }), day);
    expect(r.daily).toHaveLength(0);
  });

  it('un nouveau jour remplace les missions', () => {
    const s = forDay(emptyMissionState(), '2026-10-21');
    const r = applyGame(s, snap(), '2026-10-22');
    expect(r.state.day).toBe('2026-10-22');
    expect(r.state.daily.map((m) => m.id)).toEqual(dailyMissions('2026-10-22').map((m) => m.id));
  });

  it('chaque modèle de mission a des objectifs croissants', () => {
    for (const m of MISSION_TEMPLATES) {
      expect(m.targets[0]).toBeLessThanOrEqual(m.targets[1]);
      expect(m.targets[1]).toBeLessThanOrEqual(m.targets[2]);
    }
  });
});

describe('mission au long cours', () => {
  it('se cumule sur les parties puis passe à la suivante', () => {
    const day = '2026-10-21';
    let s = emptyMissionState();
    const first = longMission(0);
    expect(first.metric).toBe('tiles');
    let r = applyGame(s, snap({}, { tilesCleared: first.target - 10 }), day);
    expect(r.long).toBeNull();
    s = r.state;
    r = applyGame(s, snap({}, { tilesCleared: 10 }), day);
    expect(r.long).toBe(0);
    expect(r.state.longIndex).toBe(1);
    expect(r.state.longProgress).toBe(0);
  });

  it('la liste recommence avec des objectifs plus grands', () => {
    const n = LONG_MISSIONS.length;
    expect(longMission(n).target).toBe(LONG_MISSIONS[0].target * 2);
    expect(longMission(2 * n + 1).target).toBe(LONG_MISSIONS[1].target * 3);
  });
});

describe('XP et niveau', () => {
  it('XP de partie plafonnée', () => {
    expect(gameXp(snap({ score: 0 }))).toBe(10);
    expect(gameXp(snap({ score: 1500 }))).toBe(20);
    expect(gameXp(snap({ score: 1e6 }))).toBe(200);
  });

  it('niveau à partir de l\'XP totale', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: xpForNext(1) });
    expect(levelFromXp(xpForNext(1)).level).toBe(2);
    expect(levelFromXp(xpForNext(1) + xpForNext(2) + 5)).toEqual({ level: 3, into: 5, need: xpForNext(3) });
  });
});
