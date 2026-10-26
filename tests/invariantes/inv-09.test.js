// @ts-check
// INV-09 · Número de lote único por inspección (RN-16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia, lote } from '../helpers/fabrica.js';

test('INV-09: BN-0453 y bn 0453 en la misma inspección se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{ numeroLote: 'BN-0453' }] });
  const n = copia(enCurso);
  n.lotes.push(lote(n.inspeccion.id, { numeroLote: 'BN 0453' }));
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-09');
});

test('INV-09: dos lotes sin número de lote sí se permiten', () => {
  const { storage, enCurso } = preparar({ lotes: [{ numeroLote: null }] });
  const n = copia(enCurso);
  n.lotes.push(lote(n.inspeccion.id, { numeroLote: null }));
  assert.deepEqual(storage.guardarRegistroEnCurso(n), { ok: true });
});
