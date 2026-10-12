import { describe, expect, it } from 'vitest';
import { cellCenter, isLateralNeighbor, neighbor, neighbors, pixelToCell } from '../src/core/hex';

describe('voisins (§5.2)', () => {
  it('colonne paire', () => {
    const c = 2, r = 5;
    expect(neighbor(c, r, 'up')).toEqual({ c: 2, r: 4 });
    expect(neighbor(c, r, 'down')).toEqual({ c: 2, r: 6 });
    expect(neighbor(c, r, 'upLeft')).toEqual({ c: 1, r: 4 });
    expect(neighbor(c, r, 'downLeft')).toEqual({ c: 1, r: 5 });
    expect(neighbor(c, r, 'upRight')).toEqual({ c: 3, r: 4 });
    expect(neighbor(c, r, 'downRight')).toEqual({ c: 3, r: 5 });
  });

  it('colonne impaire', () => {
    const c = 3, r = 5;
    expect(neighbor(c, r, 'up')).toEqual({ c: 3, r: 4 });
    expect(neighbor(c, r, 'down')).toEqual({ c: 3, r: 6 });
    expect(neighbor(c, r, 'upLeft')).toEqual({ c: 2, r: 5 });
    expect(neighbor(c, r, 'downLeft')).toEqual({ c: 2, r: 6 });
    expect(neighbor(c, r, 'upRight')).toEqual({ c: 4, r: 5 });
    expect(neighbor(c, r, 'downRight')).toEqual({ c: 4, r: 6 });
  });

  it('bords de grille', () => {
    // Coin haut-gauche (colonne paire) : seuls bas, haut-droite? non (r-1), bas-droite.
    expect(neighbors(0, 0, 7, 12).map((n) => n.dir).sort()).toEqual(['down', 'downRight']);
    // Coin bas-droite (colonne 6, paire).
    expect(neighbors(6, 11, 7, 12).map((n) => n.dir).sort()).toEqual(['downLeft', 'up', 'upLeft']);
    // Colonne impaire en bas : pas de voisins « bas-* ».
    expect(neighbors(1, 11, 7, 12).map((n) => n.dir).sort()).toEqual(['up', 'upLeft', 'upRight']);
    // Colonne impaire en haut : les voisins latéraux hauts existent (même rangée).
    expect(neighbors(1, 0, 7, 12).map((n) => n.dir).sort()).toEqual(
      ['down', 'downLeft', 'downRight', 'upLeft', 'upRight'],
    );
  });

  it('voisins latéraux uniquement', () => {
    expect(isLateralNeighbor(2, 5, 1, 4)).toBe(true);
    expect(isLateralNeighbor(2, 5, 3, 5)).toBe(true);
    expect(isLateralNeighbor(2, 5, 2, 4)).toBe(false);
    expect(isLateralNeighbor(2, 5, 2, 6)).toBe(false);
    expect(isLateralNeighbor(2, 5, 4, 5)).toBe(false);
  });
});

describe('géométrie', () => {
  it('pixelToCell inverse cellCenter', () => {
    const R = 30;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 12; r++) {
        const p = cellCenter(c, r, R);
        expect(pixelToCell(p.x, p.y, R)).toEqual({ c, r });
        // Légèrement décalé, toujours dans l'hexagone.
        expect(pixelToCell(p.x + R * 0.6, p.y + R * 0.3, R)).toEqual({ c, r });
      }
    }
  });
});
