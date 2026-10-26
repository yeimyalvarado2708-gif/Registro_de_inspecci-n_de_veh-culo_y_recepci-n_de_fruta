// @ts-check
// INV-06 · Cancelado no deja rastro (RN-14, REQ-PER-10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparar } from '../helpers/invariantes.js';

test('INV-06: tras cancelar no queda ni la inspección ni ningún lote con su id', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{}, { brix: 20 }] });
  assert.deepEqual(storage.eliminarRegistroEnCurso(enCurso.inspeccion.id), { ok: true });
  const contenido = JSON.stringify(ls.instantanea());
  assert.ok(!contenido.includes(enCurso.inspeccion.id));
  for (const l of enCurso.lotes) assert.ok(!contenido.includes(l.id));
  assert.equal(storage.leerRegistros().enCurso, null);
});

test('INV-06: cancelar con otro id no borra nada', () => {
  const { ls, storage } = preparar();
  const antes = ls.instantanea();
  assert.equal(storage.eliminarRegistroEnCurso('00000000-0000-4000-8000-ffffffffffff').ok, false);
  assert.deepEqual(ls.instantanea(), antes);
});
