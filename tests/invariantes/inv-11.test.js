// @ts-check
// INV-11 · Parámetros según producto (RN-06, REQ-PER-07).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

const casos = /** @type {const} */ ([
  ['Yuca con brix', { producto: 'Yuca', brix: 4, peso: null }],
  ['Malanga con dentroCalibre', { producto: 'Malanga', dentroCalibre: true }],
  ['Banano con peso', { producto: 'Banano', brix: 3, dentroCalibre: true, peso: 100 }],
]);

for (const [nombre, cambios] of casos) {
  test(`INV-11: ${nombre} se rechaza`, () => {
    const { ls, storage, enCurso } = preparar();
    const n = copia(enCurso);
    Object.assign(n.lotes[0], cambios);
    debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-11');
  });
}
