// @ts-check
// INV-02 · Tiempo propiedad del sistema (CT-03).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';
import { actualizarCampo } from '../../src/domain/registro.js';

test('INV-02: reescribir horaInicio se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.horaInicio = '2026-10-25T17:30';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-02');
});

test('INV-02: borrar la placa conserva horaInicio', () => {
  const { storage, enCurso } = preparar();
  const n = { ...enCurso, inspeccion: actualizarCampo(enCurso.inspeccion, 'placa', '') };
  assert.deepEqual(storage.guardarRegistroEnCurso(n), { ok: true });
  assert.equal(storage.leerRegistros().enCurso?.inspeccion.horaInicio, enCurso.inspeccion.horaInicio);
});
