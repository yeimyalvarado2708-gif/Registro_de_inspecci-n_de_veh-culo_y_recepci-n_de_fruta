// @ts-check
// INV-19 · Identidad (RNF-10).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-19: un id de lote que no es v4 se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].id = '00000000-0000-1000-8000-000000000001';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-19');
});

test('INV-19: dos lotes con el mismo id se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{}, {}] });
  const n = copia(enCurso);
  n.lotes[1].id = n.lotes[0].id;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-19');
});
