// @ts-check
// INV-01 · Un solo registro en curso (RN-13, REQ-VAL-27).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { registro } from '../helpers/fabrica.js';
import { CLAVE_EN_CURSO } from '../../src/state/storage.js';

test('INV-01: un segundo registro en curso con otro id se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(registro()), 'INV-01');
  assert.equal(JSON.parse(/** @type {string} */ (ls.getItem(CLAVE_EN_CURSO))).inspeccion.id, enCurso.inspeccion.id);
});
