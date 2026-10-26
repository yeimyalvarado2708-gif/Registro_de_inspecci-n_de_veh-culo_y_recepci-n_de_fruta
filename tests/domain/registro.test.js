// @ts-check
// T-1.10 · Transiciones puras del registro (design §8.4; INV-02, 03, 04, 10, 14, 16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actualizarCampo, agregarOReemplazarLote, aplicarChequeo, condicionesFinalizacion, condicionesQueFaltan,
  contadores, crearInspeccion, finalizar, quitarLote,
} from '../../src/domain/registro.js';
import { MOTIVO_VEHICULO_NO_CUMPLE } from '../../src/domain/criterios.js';
import { MENSAJES } from '../../src/domain/mensajes.js';
import { copia, lote, registro, uuid } from '../helpers/fabrica.js';

test('crearInspeccion: campos del inspector en null y fecha derivada de horaInicio', () => {
  assert.deepEqual(crearInspeccion(uuid(1), { fechaHora: '2026-10-25T16:47' }), {
    id: uuid(1), fecha: '2026-10-25', horaInicio: '2026-10-25T16:47',
    placa: null, productor: null, inspector: null, horaFin: null, chequeoVehiculo: null,
  });
});

test('actualizarCampo normaliza y nunca toca los campos del sistema (INV-02)', () => {
  const insp = crearInspeccion(uuid(1), { fechaHora: '2026-10-25T16:47' });
  const conPlaca = actualizarCampo(insp, 'placa', ' cl 76543 ');
  assert.equal(conPlaca.placa, 'CL 76543');
  const sinPlaca = actualizarCampo(conPlaca, 'placa', '  ');
  assert.equal(sinPlaca.placa, null);
  assert.equal(sinPlaca.horaInicio, insp.horaInicio);
  assert.equal(sinPlaca.fecha, insp.fecha);
  assert.equal(actualizarCampo(insp, 'productor', ' Gerald ').productor, 'Gerald');
  assert.throws(() => actualizarCampo(insp, /** @type {any} */ ('horaInicio'), 'x'));
  assert.equal(insp.placa, null, 'no muta la entrada');
});

test('Cumple → No cumple con 3 lotes: Rechazados, parámetros null, motivo del vehículo, observaciones intactas', () => {
  const r = registro({ lotes: [{ observaciones: 'Uno' }, { producto: 'Yuca', brix: null, peso: null }, { producto: 'Banano', brix: 3, peso: null, dentroCalibre: true, observaciones: 'Tres' }] });
  const antes = copia(r);
  const n = aplicarChequeo(r, false);
  assert.equal(n.inspeccion.chequeoVehiculo, false);
  for (const l of n.lotes) {
    assert.equal(l.estado, 'Rechazado');
    assert.equal(l.motivoRechazo, MOTIVO_VEHICULO_NO_CUMPLE);
    assert.deepEqual([l.brix, l.temperatura, l.dentroCalibre, l.peso], [null, null, null, null]);
  }
  assert.deepEqual(n.lotes.map((l) => l.observaciones), ['Uno', null, 'Tres']);
  assert.deepEqual(r, antes, 'no muta la entrada');
});

test('No cumple → Cumple deja Pendiente de valorar; y vuelta a No cumple → Rechazado', () => {
  const r = registro({ inspeccion: { chequeoVehiculo: false }, lotes: [{ brix: null, temperatura: null, peso: null, observaciones: 'Obs' }] });
  const cumple = aplicarChequeo(r, true);
  assert.equal(cumple.lotes[0].estado, null);
  assert.equal(cumple.lotes[0].motivoRechazo, null);
  const otraVez = aplicarChequeo(cumple, false);
  assert.equal(otraVez.lotes[0].estado, 'Rechazado');
  assert.equal(otraVez.lotes[0].observaciones, 'Obs');
});

test('agregar, reemplazar y quitar lotes', () => {
  const r = registro({ lotes: [] });
  const l = lote(r.inspeccion.id);
  const conLote = agregarOReemplazarLote(r, l);
  assert.equal(conLote.lotes.length, 1);
  const reemplazado = agregarOReemplazarLote(conLote, { ...l, numeroLote: 'X1' });
  assert.equal(reemplazado.lotes.length, 1);
  assert.equal(reemplazado.lotes[0].numeroLote, 'X1');
  assert.equal(quitarLote(reemplazado, l.id).lotes.length, 0);
  assert.equal(r.lotes.length, 0, 'no muta la entrada');
});

test('contadores Aprobados / Rechazados / Pendientes', () => {
  const r = registro({ lotes: [{}, { brix: 20 }, { peso: null }] });
  assert.deepEqual(contadores(r), { aprobados: 1, rechazados: 1, pendientes: 1 });
  assert.deepEqual(contadores(null), { aprobados: 0, rechazados: 0, pendientes: 0 });
});

test('condiciones de finalización (REQ-REG-03)', () => {
  assert.deepEqual(condicionesQueFaltan(registro({ lotes: [] })), [MENSAJES.condicionAlMenosUnLote, MENSAJES.condicionTodosValorados]);
  assert.deepEqual(condicionesQueFaltan(registro({ inspeccion: { inspector: null } })), [MENSAJES.condicionInspeccionCompleta]);
  assert.deepEqual(condicionesQueFaltan(registro({ lotes: [{}, { peso: null }] })), [MENSAJES.condicionTodosValorados]);
  assert.deepEqual(condicionesQueFaltan(registro()), []);
  assert.equal(condicionesFinalizacion(null).length, 3);
});

test('finalizar cruzando la medianoche conserva la fecha (REQ-VAL-22, INV-03)', () => {
  const r = registro({ inspeccion: { fecha: '2026-10-25', horaInicio: '2026-10-25T23:50' } });
  const f = finalizar(r, { fechaHora: '2026-10-26T00:10' });
  assert.equal(f.inspeccion.fecha, '2026-10-25');
  assert.equal(f.inspeccion.horaFin, '2026-10-26T00:10');
  assert.equal(r.inspeccion.horaFin, null, 'no muta la entrada');
});
