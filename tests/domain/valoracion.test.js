// @ts-check
// T-1.7 · Valoración y motivo del rechazo (RN-05, RN-06; REQ-VAL-08, 09; DD-03, DD-04).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirMotivoRechazo, parametrosQueAplican, valorarLote } from '../../src/domain/valoracion.js';
import { MOTIVO_VEHICULO_NO_CUMPLE } from '../../src/domain/criterios.js';

/** @typedef {import('../../src/domain/valoracion.js').EntradaValoracion} Entrada */

/** @param {Partial<Entrada>} c @returns {Entrada} */
const banano = (c = {}) => ({ chequeoVehiculo: true, producto: 'Banano', brix: 3, temperatura: 26, peso: null, dentroCalibre: true, ...c });
/** @param {Partial<Entrada>} c @returns {Entrada} */
const malanga = (c = {}) => ({ chequeoVehiculo: true, producto: 'Malanga', brix: 8, temperatura: 26, peso: 1235, dentroCalibre: null, ...c });
/** @param {Partial<Entrada>} c @returns {Entrada} */
const platano = (c = {}) => ({ chequeoVehiculo: true, producto: 'Plátano', brix: 5, temperatura: 26, peso: null, dentroCalibre: true, ...c });

const estado = (/** @type {Entrada} */ e) => valorarLote(e).estado;

test('parámetros que aplican según el producto (REQ-LOT-04)', () => {
  assert.deepEqual(parametrosQueAplican('Banano'), ['brix', 'temperatura', 'dentroCalibre']);
  assert.deepEqual(parametrosQueAplican('Plátano'), ['brix', 'temperatura', 'dentroCalibre']);
  assert.deepEqual(parametrosQueAplican('Yuca'), ['temperatura']);
  assert.deepEqual(parametrosQueAplican('Malanga'), ['brix', 'temperatura', 'peso']);
});

test('temperatura 23.9 ✗ / 24.0 ✓ / 30.0 ✓ / 30.1 ✗', () => {
  assert.equal(estado(banano({ temperatura: 23.9 })), 'Rechazado');
  assert.equal(estado(banano({ temperatura: 24.0 })), 'Aprobado');
  assert.equal(estado(banano({ temperatura: 30.0 })), 'Aprobado');
  assert.equal(estado(banano({ temperatura: 30.1 })), 'Rechazado');
});

test('peso Malanga 399.9 ✗ / 400.0 ✓ / 2000.0 ✓ / 2000.1 ✗', () => {
  assert.equal(estado(malanga({ peso: 399.9 })), 'Rechazado');
  assert.equal(estado(malanga({ peso: 400.0 })), 'Aprobado');
  assert.equal(estado(malanga({ peso: 2000.0 })), 'Aprobado');
  assert.equal(estado(malanga({ peso: 2000.1 })), 'Rechazado');
});

test('Brix Banano 5.0 ✓ / 5.1 ✗; Plátano 8.0 ✓ / 8.1 ✗; Malanga 3.9 ✗ / 4.0 ✓ / 12.0 ✓ / 12.1 ✗', () => {
  assert.equal(estado(banano({ brix: 5.0 })), 'Aprobado');
  assert.equal(estado(banano({ brix: 5.1 })), 'Rechazado');
  assert.equal(estado(platano({ brix: 8.0 })), 'Aprobado');
  assert.equal(estado(platano({ brix: 8.1 })), 'Rechazado');
  assert.equal(estado(malanga({ brix: 3.9 })), 'Rechazado');
  assert.equal(estado(malanga({ brix: 4.0 })), 'Aprobado');
  assert.equal(estado(malanga({ brix: 12.0 })), 'Aprobado');
  assert.equal(estado(malanga({ brix: 12.1 })), 'Rechazado');
});

test('Banano fuera de calibre (REQ-LOT-14)', () => {
  assert.deepEqual(valorarLote(banano({ dentroCalibre: false })), { estado: 'Rechazado', motivoRechazo: 'No cumple: Fuera de calibre' });
});

test('motivo exacto (REQ-LOT-15, DD-04)', () => {
  assert.equal(valorarLote(banano({ brix: 6.2, temperatura: 31.0 })).motivoRechazo, 'No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)');
  assert.equal(valorarLote(banano({ brix: 6.2, dentroCalibre: false })).motivoRechazo, 'No cumple: Brix 6.2 (rango 2 a 5); Fuera de calibre');
  assert.equal(valorarLote(malanga({ peso: 399.9 })).motivoRechazo, 'No cumple: Peso promedio por pieza 399.9 g (rango 400 a 2000)');
  assert.equal(construirMotivoRechazo([{ parametro: 'temperatura', valor: 23.9, min: 24, max: 30 }]), 'No cumple: Temperatura 23.9 °C (rango 24 a 30)');
});

test('Aprobado lleva motivo null (REQ-LOT-11)', () => {
  assert.deepEqual(valorarLote(banano()), { estado: 'Aprobado', motivoRechazo: null });
});

test('vehículo que no cumple → Rechazado con el motivo del vehículo (RN-07, DD-03)', () => {
  assert.deepEqual(valorarLote(banano({ chequeoVehiculo: false })), { estado: 'Rechazado', motivoRechazo: MOTIVO_VEHICULO_NO_CUMPLE });
  assert.equal(MOTIVO_VEHICULO_NO_CUMPLE, 'No cumple: el vehículo no cumple con el chequeo');
});

test('algún parámetro aplicable en null → Pendiente de valorar (estado null)', () => {
  assert.deepEqual(valorarLote(malanga({ peso: null })), { estado: null, motivoRechazo: null });
  assert.deepEqual(valorarLote(banano({ dentroCalibre: null })), { estado: null, motivoRechazo: null });
  // Un parámetro que no aplica en null no impide valorar.
  assert.equal(estado({ chequeoVehiculo: true, producto: 'Yuca', brix: null, temperatura: 26, peso: null, dentroCalibre: null }), 'Aprobado');
});

test('mismos datos → mismo resultado (INV-13)', () => {
  const e = banano({ brix: 6.2, temperatura: 31 });
  assert.deepEqual(valorarLote(e), valorarLote({ ...e }));
});
