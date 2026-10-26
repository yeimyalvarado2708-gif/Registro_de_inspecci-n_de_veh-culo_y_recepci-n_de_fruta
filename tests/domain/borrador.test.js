// @ts-check
// T-1.9 · Lógica del formulario del lote (REQ-LOT-10, 19, 21, 30, 31; DD-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  borradorDesdeLote, borradorVacio, cambiarProducto, estadoVisible, loteDesdeBorrador, motivoVisible,
  requiereAvisoObservaciones, siguienteEstadoCalculado, tieneCambiosSinGuardar,
} from '../../src/domain/borrador.js';
import { MOTIVO_VEHICULO_NO_CUMPLE } from '../../src/domain/criterios.js';
import { lote, uuid } from '../helpers/fabrica.js';

/** @param {Partial<import('../../src/domain/tipos.js').Borrador>} c */
const borrador = (c) => ({ ...borradorVacio(), ...c });

test('cambiar Banano → Yuca conserva la temperatura y vacía Brix y calibre (REQ-LOT-10)', () => {
  const b = cambiarProducto(borrador({ producto: 'Banano', brix: '4.0', temperatura: '26.0', dentroCalibre: true }), 'Yuca');
  assert.equal(b.producto, 'Yuca');
  assert.equal(b.temperatura, '26.0');
  assert.equal(b.brix, '');
  assert.equal(b.dentroCalibre, null);
});

test('los cinco textos de estado visible (REQ-LOT-21)', () => {
  assert.equal(estadoVisible(borradorVacio(), true, null), 'Sin producto');
  assert.equal(estadoVisible(borrador({ producto: 'Yuca' }), true, null), 'Faltan parámetros');
  assert.equal(estadoVisible(borrador({ producto: 'Yuca', temperatura: '26.0' }), true, null), 'Aprobado');
  assert.equal(estadoVisible(borrador({ producto: 'Yuca', temperatura: '31.0' }), true, null), 'Rechazado');
  assert.equal(estadoVisible(borrador({ producto: 'Yuca' }), false, null), 'Rechazado');

  const pendiente = lote(uuid(), { producto: 'Yuca', temperatura: null, peso: null, brix: null });
  assert.equal(pendiente.estado, null);
  assert.equal(estadoVisible(borradorDesdeLote(pendiente), true, pendiente), 'Pendiente de valorar');
  assert.equal(estadoVisible({ ...borradorDesdeLote(pendiente), temperatura: '2' }, true, pendiente), 'Rechazado');
  assert.equal(estadoVisible({ ...borradorDesdeLote(pendiente), temperatura: '4,' }, true, pendiente), 'Faltan parámetros');
});

test('un valor inválido cuenta como parámetro faltante', () => {
  assert.equal(estadoVisible(borrador({ producto: 'Yuca', temperatura: '26,5' }), true, null), 'Faltan parámetros');
  assert.equal(motivoVisible(borrador({ producto: 'Yuca', temperatura: '26,5' }), true), null);
  assert.equal(motivoVisible(borrador({ producto: 'Yuca' }), false), MOTIVO_VEHICULO_NO_CUMPLE);
});

test('cambios sin guardar (design §8.6)', () => {
  assert.equal(tieneCambiosSinGuardar(borradorVacio(), null), false);
  assert.equal(tieneCambiosSinGuardar(borrador({ numeroLote: '   ' }), null), false);
  assert.equal(tieneCambiosSinGuardar(borrador({ producto: 'Yuca' }), null), true);
  const guardado = lote(uuid(), { observaciones: 'Fruta verde' });
  const b = borradorDesdeLote(guardado);
  assert.equal(tieneCambiosSinGuardar(b, guardado), false);
  assert.equal(tieneCambiosSinGuardar({ ...b, observaciones: ' Fruta verde  ' }, guardado), false);
  assert.equal(tieneCambiosSinGuardar({ ...b, brix: '8.1' }, guardado), true);
});

test('loteDesdeBorrador limpia, convierte y valora (REQ-LOT-09, 35; REQ-PER-07)', () => {
  const b = borrador({ producto: 'Banano', numeroLote: ' bn-0453 ', ordenCompra: '  ', brix: '6.2', temperatura: '31.0', dentroCalibre: true, peso: '99', observaciones: ' ok ' });
  const l = loteDesdeBorrador(b, { id: uuid(1), inspeccionId: uuid(2), chequeo: true });
  assert.deepEqual(l, {
    id: uuid(1),
    inspeccionId: uuid(2),
    numeroLote: 'BN-0453',
    ordenCompra: null,
    producto: 'Banano',
    dentroCalibre: true,
    brix: 6.2,
    temperatura: 31,
    peso: null,
    estado: 'Rechazado',
    observaciones: 'ok',
    motivoRechazo: 'No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)',
  });
  const noCumple = loteDesdeBorrador(b, { id: uuid(1), inspeccionId: uuid(2), chequeo: false });
  assert.deepEqual([noCumple.brix, noCumple.temperatura, noCumple.dentroCalibre, noCumple.peso], [null, null, null, null]);
  assert.equal(noCumple.motivoRechazo, MOTIVO_VEHICULO_NO_CUMPLE);
});

/**
 * Simula la secuencia de estados visibles del formulario y devuelve si aparece el aviso.
 * @param {import('../../src/domain/tipos.js').EstadoLote} inicial ultimoEstadoCalculado al abrir
 * @param {import('../../src/domain/borrador.js').EstadoVisible[]} secuencia
 * @param {string} observaciones
 */
function avisoEnSecuencia(inicial, secuencia, observaciones) {
  let ultimo = inicial;
  let aviso = false;
  for (const visible of secuencia) {
    if (requiereAvisoObservaciones(ultimo, visible, observaciones)) aviso = true;
    ultimo = siguienteEstadoCalculado(ultimo, visible);
  }
  return aviso;
}

test('aviso de observaciones en los cinco escenarios confirmados (DD-12)', () => {
  assert.equal(avisoEnSecuencia(null, ['Sin producto', 'Faltan parámetros', 'Rechazado', 'Aprobado'], 'Fruta golpeada'), true);
  assert.equal(avisoEnSecuencia('Rechazado', ['Aprobado'], 'Fruta golpeada'), true);
  assert.equal(avisoEnSecuencia(null, ['Pendiente de valorar', 'Faltan parámetros', 'Aprobado'], 'Fruta golpeada'), false);
  assert.equal(avisoEnSecuencia('Rechazado', ['Aprobado'], '   '), false);
  assert.equal(avisoEnSecuencia('Rechazado', ['Faltan parámetros', 'Aprobado'], 'Fruta golpeada'), true);
});
