// @ts-check
// INV-20 · Conformidad con el contrato (REQ-PER-05).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';
import { CLAVE_EN_CURSO } from '../../src/state/storage.js';

test('INV-20: un campo extra se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  /** @type {any} */ (n.inspeccion).extra = 'x';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-20');
});

test('INV-20: un campo renombrado se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = /** @type {any} */ (copia(enCurso));
  n.lotes[0].oc = n.lotes[0].ordenCompra;
  delete n.lotes[0].ordenCompra;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-20');
});

test('INV-20: al leer, un registro fuera de contrato se omite con aviso', () => {
  const { ls, storage, enCurso } = preparar();
  const n = /** @type {any} */ (copia(enCurso));
  n.inspeccion.chequeoVehiculo = 'Cumple';
  ls.setItem(CLAVE_EN_CURSO, JSON.stringify(n));
  const lectura = storage.leerRegistros();
  assert.equal(lectura.enCurso, null);
  assert.equal(lectura.avisos.length, 1);
});
