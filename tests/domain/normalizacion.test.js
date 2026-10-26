// @ts-check
// T-1.3 · Normalización (REQ-VAL-17, 18, 19; INV-17, INV-18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarTexto, textoMayusculas, valorNormalizado } from '../../src/domain/normalizacion.js';

test('limpiarTexto: vacío o solo espacios → null; recorta', () => {
  assert.equal(limpiarTexto('  '), null);
  assert.equal(limpiarTexto(''), null);
  assert.equal(limpiarTexto(' Gerald Garcia '), 'Gerald Garcia');
  assert.equal(limpiarTexto(undefined), null);
  assert.equal(limpiarTexto(null), null);
});

test('textoMayusculas: recorta y pasa a mayúsculas (CT-08)', () => {
  assert.equal(textoMayusculas(' cl 76543 '), 'CL 76543');
  assert.equal(textoMayusculas('   '), null);
});

test('valorNormalizado: ABC-123, abc123 y ABC 123 son equivalentes (REQ-VAL-19)', () => {
  assert.equal(valorNormalizado('ABC-123'), 'ABC123');
  assert.equal(valorNormalizado('abc123'), 'ABC123');
  assert.equal(valorNormalizado('ABC 123'), 'ABC123');
  assert.equal(valorNormalizado(' - '), null);
});

test('nunca devuelve undefined', () => {
  for (const f of [limpiarTexto, textoMayusculas, valorNormalizado]) {
    for (const entrada of [undefined, null, '', ' ', 5, {}]) assert.notEqual(f(entrada), undefined);
  }
});
