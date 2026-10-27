// @ts-check
// T-1.1 · Las constantes coinciden con data-contract.json (RNF-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAMPOS_INSPECCION_COMPLETA, CRITERIOS_APROBACION, FORMULARIO, MOTIVO_VEHICULO_NO_CUMPLE,
  PATRON_UN_DECIMAL, PRODUCTOS, RANGOS_ENTRADA,
} from '../../src/domain/criterios.js';

const contrato = JSON.parse(readFileSync(new URL('../../docs/data-contract.json', import.meta.url), 'utf8'));

/** @param {Record<string, unknown>} o */
const sinDescripcion = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'descripcion' && k !== 'patronUnDecimal'));

test('PRODUCTOS = $defs.Producto.enum', () => {
  assert.deepEqual([...PRODUCTOS], contrato.$defs.Producto.enum);
});

test('CRITERIOS_APROBACION = x-reglas.criteriosAprobacion', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(CRITERIOS_APROBACION)), sinDescripcion(contrato['x-reglas'].criteriosAprobacion));
});

test('RANGOS_ENTRADA = x-reglas.rangosEntrada', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(RANGOS_ENTRADA)), sinDescripcion(contrato['x-reglas'].rangosEntrada));
});

test('PATRON_UN_DECIMAL = x-reglas.rangosEntrada.patronUnDecimal', () => {
  assert.equal(PATRON_UN_DECIMAL.source, contrato['x-reglas'].rangosEntrada.patronUnDecimal);
});

test('FORMULARIO = x-formulario', () => {
  assert.deepEqual({ ...FORMULARIO }, contrato['x-formulario']);
});

test('CAMPOS_INSPECCION_COMPLETA = x-reglas.inspeccionCompleta.camposRequeridos', () => {
  assert.deepEqual([...CAMPOS_INSPECCION_COMPLETA], contrato['x-reglas'].inspeccionCompleta.camposRequeridos);
});

test('las constantes están congeladas', () => {
  assert.ok(Object.isFrozen(PRODUCTOS));
  assert.ok(Object.isFrozen(CRITERIOS_APROBACION));
  assert.ok(Object.isFrozen(CRITERIOS_APROBACION.Banano));
  assert.ok(Object.isFrozen(RANGOS_ENTRADA.peso));
  assert.ok(MOTIVO_VEHICULO_NO_CUMPLE.startsWith('No cumple: '));
});

test('tipos.js declara las 8 claves de la inspección y las 12 del lote (T-0.5)', () => {
  const tipos = readFileSync(new URL('../../src/domain/tipos.js', import.meta.url), 'utf8');
  /** @param {string} nombre */
  const propiedades = (nombre) => {
    const bloque = tipos.split('@typedef {Object} ' + nombre)[1].split('*/')[0];
    return [...bloque.matchAll(/@property \{[^}]+\} (\w+)/g)].map((m) => m[1]);
  };
  assert.deepEqual(propiedades('InspeccionVehiculo'), contrato.$defs.InspeccionVehiculo.required);
  assert.deepEqual(propiedades('LoteMateriaPrima'), contrato.$defs.LoteMateriaPrima.required);
});
