// @ts-check
// INV-16 · Observaciones intactas (RN-08, DD-13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';
import { aplicarChequeo } from '../../src/domain/registro.js';

test('INV-16: alterar las observaciones de un lote no editado se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{ observaciones: 'Fruta golpeada' }, {}] });
  const n = copia(enCurso);
  n.lotes[0].observaciones = 'Fruta golpeada (revisado)';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n, { loteEditadoId: n.lotes[1].id }), 'INV-16');
});

test('INV-16: cambiar el chequeo deja las observaciones idénticas byte a byte', () => {
  const { storage, enCurso } = preparar({ lotes: [{ observaciones: 'Fruta  golpeada · ñ' }] });
  const n = aplicarChequeo(enCurso, false);
  assert.deepEqual(storage.guardarRegistroEnCurso(n), { ok: true });
  assert.equal(storage.leerRegistros().enCurso?.lotes[0].observaciones, 'Fruta  golpeada · ñ');
});

test('INV-16: el lote guardado con «Guardar lote» sí cambia sus observaciones', () => {
  const { storage, enCurso } = preparar({ lotes: [{ observaciones: 'Antes' }] });
  const n = copia(enCurso);
  n.lotes[0].observaciones = 'Después';
  assert.deepEqual(storage.guardarRegistroEnCurso(n, { loteEditadoId: n.lotes[0].id }), { ok: true });
});
