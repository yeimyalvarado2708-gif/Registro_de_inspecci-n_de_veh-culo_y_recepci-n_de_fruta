// @ts-check
// T-1.5 · Depuración de inspectores (REQ-VAL-30, 31; P-06).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { depurarInspectores } from '../../src/domain/inspectores.js';
import { INSPECTORES } from '../../src/config/inspectores.js';

test('omite vacíos y repetidos, conserva la primera aparición y el orden', () => {
  assert.deepEqual(depurarInspectores(['Aurora V', ' aurora v ', '', '  ', 'Margarita C']), ['Aurora V', 'Margarita C']);
});

test('lista vacía → []', () => {
  assert.deepEqual(depurarInspectores([]), []);
  assert.deepEqual(depurarInspectores(['', '   ']), []);
});

test('la configuración se importa estáticamente (T-0.4)', () => {
  assert.deepEqual(depurarInspectores(INSPECTORES), ['Melquisedec GP', 'Aurora V', 'Margarita C']);
});
