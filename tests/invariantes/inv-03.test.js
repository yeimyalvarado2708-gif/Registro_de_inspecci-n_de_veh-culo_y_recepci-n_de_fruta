// @ts-check
// INV-03 · Fecha anclada al inicio (RN-01, REQ-VAL-22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';
import { finalizar } from '../../src/domain/registro.js';

test('INV-03: fecha distinta de la parte de fecha de horaInicio se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.fecha = '2026-10-26';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-03');
});

test('INV-03: finalizar cruzando la medianoche conserva la fecha', () => {
  const { storage } = preparar({ inspeccion: { fecha: '2026-10-25', horaInicio: '2026-10-25T23:50' } });
  const enCurso = /** @type {import('../../src/domain/tipos.js').Registro} */ (storage.leerRegistros().enCurso);
  assert.deepEqual(storage.guardarRegistroFinalizado(finalizar(enCurso, { fechaHora: '2026-10-26T00:10' })), { ok: true });
  const [f] = storage.leerRegistros().finalizados;
  assert.equal(f.inspeccion.fecha, '2026-10-25');
  assert.equal(f.inspeccion.horaFin, '2026-10-26T00:10');
});
