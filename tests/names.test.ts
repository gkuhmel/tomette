import { describe, expect, it } from 'vitest';
import { isOffensive, safeName } from '../src/core/names';

describe('filtre des pseudos', () => {
  it('refuse les grossièretés, même déguisées', () => {
    for (const n of ['Connard', 'xXconnardXx', 'C0nn4rd', 'fuuuck', 'F.U.C.K', 'Con', 'c o n', 'pute', 'Salope#1234', 'Arschloch', 'cazzo', 'Hijo de puta', 'ShitHead', 'p_d', '傻逼', 'NTM', 'Nazi']) {
      expect(isOffensive(n), n).toBe(true);
    }
  });

  it('laisse passer les noms innocents qui contiennent un mot court', () => {
    for (const n of ['Cigale#2741', 'Constance', 'Hercule', 'Monique', 'Technique', 'Pornic', 'Falcon', 'Computer', 'Député', 'Classe', 'Massilia', 'Calcul', 'Bitter', 'Assassin', 'Grape', 'Essex', 'Raton', 'Cazorla', 'EnRetard', 'Scunthorpe', 'Mistral', 'Pétanque', '花砖']) {
      expect(isOffensive(n), n).toBe(false);
    }
  });

  it('remplace un pseudo grossier', () => {
    expect(safeName('Connard', 'Joueur')).toBe('Joueur');
    expect(safeName('Lavande', 'Joueur')).toBe('Lavande');
  });
});
