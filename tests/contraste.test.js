// @ts-check
// T-4.1 · Contraste de texto ≥ 4.5:1 para cada par de colores usado (RNF-08, WCAG 2.1 AA).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
/** @type {Record<string, string>} */
const tokens = Object.fromEntries([...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));

/** @param {string} hex */
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {string} a @param {string} b */
function contraste(a, b) {
  const [x, y] = [luminancia(tokens[a]), luminancia(tokens[b])];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Pares texto / fondo usados en styles/*.css. */
const PARES = [
  ['mostaza-texto', 'mostaza'],
  ['mostaza-texto', 'mostaza-activo'],
  ['sobre-primario', 'primario'],
  ['sobre-primario', 'primario-hover'],
  ['texto', 'fondo'],
  ['texto', 'tarjeta'],
  ['texto', 'superficie'],
  ['texto-suave', 'fondo'],
  ['texto-suave', 'tarjeta'],
  ['texto-suave', 'superficie'],
  ['aprobado', 'aprobado-fondo'],
  ['aprobado', 'tarjeta'],
  ['sobre-primario', 'aprobado'],
  ['rechazado', 'rechazado-fondo'],
  ['rechazado', 'tarjeta'],
  ['pendiente', 'pendiente-fondo'],
  ['pendiente', 'tarjeta'],
  ['primario', 'tarjeta'],
  ['primario', 'pendiente-fondo'],
];

for (const [texto, fondo] of PARES) {
  test(`contraste ${texto} sobre ${fondo} ≥ 4.5:1`, () => {
    assert.ok(tokens[texto] && tokens[fondo], 'el token debe existir');
    assert.ok(contraste(texto, fondo) >= 4.5, `${contraste(texto, fondo).toFixed(2)}:1`);
  });
}

test('el foco visible contrasta ≥ 3:1 con las superficies', () => {
  for (const fondo of ['tarjeta', 'fondo', 'mostaza-activo']) assert.ok(contraste('foco', fondo) >= 3);
});
