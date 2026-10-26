// @ts-check
// Servidor estático: solo archivos dentro de la raíz (REQ-TEC-03).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverArchivo } from '../scripts/serve.js';

test('«/» sirve index.html', () => {
  assert.ok(resolverArchivo('/')?.endsWith('index.html'));
});

test('rechaza rutas que salen de la raíz', () => {
  assert.equal(resolverArchivo('/../CLAUDE.md'), null);
  assert.equal(resolverArchivo('/%2e%2e/CLAUDE.md'), null);
  assert.equal(resolverArchivo('/src/../../x.js'), null);
});

test('solo entrega extensiones permitidas', () => {
  assert.ok(resolverArchivo('/src/ui/app.js')?.endsWith('app.js'));
  assert.equal(resolverArchivo('/CLAUDE.md'), null);
});
