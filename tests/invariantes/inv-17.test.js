// @ts-check
// INV-17 · Vacío es null (CT-14).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test("INV-17: productor = '  ' se rechaza", () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.productor = '  ';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-17');
});

test("INV-17: ordenCompra = '' se rechaza", () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].ordenCompra = '';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-17');
});

test('INV-17: un campo undefined se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  /** @type {any} */ (n.lotes[0]).observaciones = undefined;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-17');
});

test('INV-17: texto con espacios al final se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].observaciones = 'ok ';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-17');
});
