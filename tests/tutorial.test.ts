import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { ClearEvent } from '../src/core/game';
import { findMatches } from '../src/core/match';
import { TUTORIAL_STEPS } from '../src/core/tutorial';

describe('tutoriel', () => {
  TUTORIAL_STEPS.forEach((step, i) => {
    it(`étape ${i + 1} (${step.title}) : grille stable, réussie avec le geste conseillé`, () => {
      const game = step.build({ ...defaultConfig });
      expect(findMatches(game.grid)).toHaveLength(0);
      // Rien ne se passe tout seul.
      const events: ClearEvent[] = [];
      for (let k = 0; k < 120; k++) game.tick();
      expect(game.events).toHaveLength(0);
      expect(step.done(game, events)).toBe(false);

      if (step.hint) {
        const { from, to } = step.hint;
        expect(game.trySwap(from.c, from.r, to.c, to.r)).toBe(true);
      } else {
        game.manualRise = true;
      }
      for (let k = 0; k < 240; k++) {
        game.tick();
        events.push(...game.events);
        game.events.length = 0;
      }
      expect(step.done(game, events)).toBe(true);
      expect(game.over).toBe(false);
    });
  });
});
