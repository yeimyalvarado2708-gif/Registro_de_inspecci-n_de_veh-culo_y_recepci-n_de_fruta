// @ts-check
// INV-08 · Producto obligatorio (RN-02, REQ-PER-06).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-08: «Platano» sin tilde se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].producto = /** @type {any} */ ('Platano');
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-08');
});

test('INV-08: producto null se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].producto = /** @type {any} */ (null);
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-08');
});
