// @ts-check
// T-1.4 · Tiempo de Costa Rica (REQ-TEC-07, REQ-UI-07, INV-02, INV-03).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ahoraCostaRica, esAnterior, formatoFecha, formatoFechaHora, formatoHora, minutosTranscurridos } from '../../src/domain/tiempo.js';

test('UTC 05:59 es 23:59 del día anterior en Costa Rica', () => {
  const r = ahoraCostaRica(new Date(Date.UTC(2026, 9, 26, 5, 59, 30)));
  assert.deepEqual(r, { fecha: '2026-10-25', fechaHora: '2026-10-25T23:59', segundos: '30' });
});

test('medianoche en formato 24 h: 00:xx, nunca 24:xx', () => {
  const r = ahoraCostaRica(new Date(Date.UTC(2026, 9, 26, 6, 5, 0)));
  assert.equal(r.fechaHora, '2026-10-26T00:05');
  assert.equal(r.fecha, '2026-10-26');
});

test('formatos de visualización', () => {
  assert.equal(formatoFecha('2026-10-25'), '25/10/2026');
  assert.equal(formatoHora('2026-10-25T16:47'), '16:47');
  assert.equal(formatoFechaHora('2026-10-25T16:47'), '25/10/2026 16:47');
});

test('minutos transcurridos, también cruzando la medianoche', () => {
  assert.equal(minutosTranscurridos('2026-10-25T16:47', '2026-10-25T17:16'), 29);
  assert.equal(minutosTranscurridos('2026-10-25T23:50', '2026-10-26T00:10'), 20);
  assert.equal(minutosTranscurridos('2026-10-25T17:00', '2026-10-25T16:00'), 0);
});

test('horaFin < horaInicio se detecta comparando el texto (REQ-VAL-21)', () => {
  assert.equal(esAnterior('2026-10-25T16:00', '2026-10-25T16:47'), true);
  assert.equal(esAnterior('2026-10-26T00:01', '2026-10-25T23:59'), false);
});
