// @ts-check
// INV-07 · Pertenencia (RN-04, REQ-PER-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia, lote, uuid } from '../helpers/fabrica.js';
import { CLAVE_EN_CURSO } from '../../src/state/storage.js';

test('INV-07: un lote con inspeccionId ajeno se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes.push(lote(uuid()));
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-07');
});

test('INV-07: al leer, un lote huérfano se omite con aviso', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes.push(lote(uuid()));
  ls.setItem(CLAVE_EN_CURSO, JSON.stringify(n));
  const lectura = storage.leerRegistros();
  assert.equal(lectura.enCurso?.lotes.length, enCurso.lotes.length);
  assert.equal(lectura.avisos.length, 1);
});
