// @ts-check
// INV-12 · Parámetros válidos (RN-15).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

const casos = /** @type {const} */ ([
  ['brix = 30.1', { brix: 30.1 }],
  ['temperatura = -1', { temperatura: -1 }],
  ['peso = 2.25', { peso: 2.25 }],
  ['peso = 0.9', { peso: 0.9 }],
]);

for (const [nombre, cambios] of casos) {
  test(`INV-12: ${nombre} se rechaza`, () => {
    const { ls, storage, enCurso } = preparar();
    const n = copia(enCurso);
    Object.assign(n.lotes[0], cambios);
    debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-12');
  });
}
