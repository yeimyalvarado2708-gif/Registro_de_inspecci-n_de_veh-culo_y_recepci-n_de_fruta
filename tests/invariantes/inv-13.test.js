// @ts-check
// INV-13 · Estado derivado (RN-05).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-13: un lote Aprobado con Brix 6.2 en Banano se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{ producto: 'Banano', brix: 3, peso: null, dentroCalibre: true }] });
  const n = copia(enCurso);
  n.lotes[0].brix = 6.2;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-13');
});

test('INV-13: un motivo que no corresponde a los parámetros se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{ brix: 20 }] });
  const n = copia(enCurso);
  n.lotes[0].motivoRechazo = 'No cumple: Brix 99.0 (rango 4 a 12)';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-13');
});
