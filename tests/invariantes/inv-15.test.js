// @ts-check
// INV-15 · Motivo coherente (RN-08, REQ-PER-08).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-15: Rechazado sin motivo se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{ brix: 20 }] });
  const n = copia(enCurso);
  n.lotes[0].motivoRechazo = null;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-15');
});

test('INV-15: Aprobado con motivo se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].motivoRechazo = 'No cumple: algo';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-15');
});
