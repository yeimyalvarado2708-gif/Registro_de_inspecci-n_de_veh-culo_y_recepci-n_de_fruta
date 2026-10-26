// @ts-check
// T-1.6 y T-1.8 · Validación del texto de un parámetro y condiciones de guardado del lote.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspeccionCompleta, validarLoteParaGuardar, validarParametro } from '../../src/domain/validacion.js';
import { borradorVacio } from '../../src/domain/borrador.js';
import { MENSAJES } from '../../src/domain/mensajes.js';
import { inspeccion, registro } from '../helpers/fabrica.js';

/** @param {string} texto @param {'brix'|'temperatura'|'peso'} p */
const ok = (texto, p) => validarParametro(texto, p).error === null;

test('rango válido de entrada con extremos incluidos (REQ-VAL-04 a 07)', () => {
  assert.ok(ok('0.0', 'brix'));
  assert.ok(ok('30.0', 'brix'));
  assert.ok(!ok('30.1', 'brix'));
  assert.ok(!ok('-0.1', 'brix'));
  assert.ok(ok('50.0', 'temperatura'));
  assert.ok(!ok('50.1', 'temperatura'));
  assert.ok(ok('1.0', 'peso'));
  assert.ok(!ok('0.9', 'peso'));
  assert.ok(ok('5000.0', 'peso'));
  assert.ok(!ok('5000.1', 'peso'));
  assert.deepEqual(validarParametro('4.5', 'brix'), { valor: 4.5, error: null });
});

test('mensajes en el orden de design §8.2', () => {
  assert.equal(validarParametro('  ', 'brix').error, MENSAJES.parametroVacio('brix'));
  assert.equal(validarParametro('4,5', 'brix').error, MENSAJES.usarPuntoDecimal);
  assert.equal(validarParametro('-3', 'brix').error, MENSAJES.valorNegativo);
  assert.equal(validarParametro('abc', 'brix').error, MENSAJES.soloNumeros);
  assert.equal(validarParametro('4.', 'brix').error, MENSAJES.soloNumeros);
  assert.equal(validarParametro('.5', 'brix').error, MENSAJES.soloNumeros);
  assert.equal(validarParametro('4.55', 'brix').error, MENSAJES.maximoUnDecimal);
  assert.equal(validarParametro('30.1', 'brix').error, MENSAJES.fueraRangoEntrada(0, 30));
  assert.equal(validarParametro('-0.1', 'brix').error, MENSAJES.valorNegativo);
});

test('inspección completa (RN-01)', () => {
  assert.equal(inspeccionCompleta(inspeccion()), true);
  assert.equal(inspeccionCompleta(inspeccion({ chequeoVehiculo: false })), true);
  assert.equal(inspeccionCompleta(inspeccion({ chequeoVehiculo: null })), false);
  assert.equal(inspeccionCompleta(inspeccion({ placa: null })), false);
  assert.equal(inspeccionCompleta(null), false);
});

/** @param {Partial<import('../../src/domain/tipos.js').Borrador>} c */
const borrador = (c) => ({ ...borradorVacio(), ...c });

test('número de lote repetido solo dentro de la misma inspección (INV-09)', () => {
  const r = registro({ lotes: [{ numeroLote: 'BN-0453' }] });
  const b = borrador({ producto: 'Yuca', numeroLote: 'bn 0453', temperatura: '26.0' });
  assert.equal(validarLoteParaGuardar(b, { registro: r, loteId: null }).numeroLote, MENSAJES.loteRepetido('BN 0453'));

  const otra = registro({ lotes: [] });
  assert.deepEqual(validarLoteParaGuardar(b, { registro: otra, loteId: null }), {});

  const propio = r.lotes[0].id;
  assert.equal(validarLoteParaGuardar(b, { registro: r, loteId: propio }).numeroLote, undefined);
});

test('dos lotes sin número de lote sí se permiten', () => {
  const r = registro({ lotes: [{ numeroLote: null }] });
  const b = borrador({ producto: 'Yuca', temperatura: '26.0' });
  assert.deepEqual(validarLoteParaGuardar(b, { registro: r, loteId: null }), {});
});

test('producto sin elegir, calibre sin elegir y parámetros vacíos (REQ-VAL-01, 12, 13)', () => {
  const r = registro({ lotes: [] });
  assert.equal(validarLoteParaGuardar(borradorVacio(), { registro: r, loteId: null }).producto, MENSAJES.productoSinElegir);
  const e = validarLoteParaGuardar(borrador({ producto: 'Banano' }), { registro: r, loteId: null });
  assert.equal(e.dentroCalibre, MENSAJES.calibreSinElegir);
  assert.equal(e.brix, MENSAJES.parametroVacio('brix'));
  assert.equal(e.temperatura, MENSAJES.parametroVacio('temperatura'));
  assert.equal(e.peso, undefined);
});

test('Pendiente de valorar con parámetros vacíos no se guarda (REQ-VAL-29)', () => {
  const r = registro({ lotes: [{ brix: null, temperatura: null, peso: null }] });
  assert.equal(r.lotes[0].estado, null);
  const e = validarLoteParaGuardar(borrador({ producto: 'Malanga' }), { registro: r, loteId: r.lotes[0].id });
  assert.deepEqual(Object.keys(e).sort(), ['brix', 'peso', 'temperatura']);
});

test('con chequeo «No cumple» no se exigen parámetros (REQ-VAL-28)', () => {
  const r = registro({ inspeccion: { chequeoVehiculo: false }, lotes: [] });
  assert.deepEqual(validarLoteParaGuardar(borrador({ producto: 'Banano' }), { registro: r, loteId: null }), {});
});

test('inspección incompleta bloquea el guardado (REQ-UNC-13)', () => {
  const r = registro({ inspeccion: { productor: null }, lotes: [] });
  const e = validarLoteParaGuardar(borrador({ producto: 'Yuca', temperatura: '26.0' }), { registro: r, loteId: null });
  assert.equal(e.inspeccion, MENSAJES.inspeccionIncompleta);
});

test('textos con salto de línea no cumplen el contrato (REQ-PER-05)', () => {
  const r = registro({ lotes: [] });
  const e = validarLoteParaGuardar(borrador({ producto: 'Yuca', temperatura: '26.0', observaciones: 'a\nb' }), { registro: r, loteId: null });
  assert.equal(e.observaciones, MENSAJES.textoEnUnaLinea);
});
