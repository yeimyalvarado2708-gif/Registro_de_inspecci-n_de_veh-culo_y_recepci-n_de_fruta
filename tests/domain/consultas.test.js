// @ts-check
// T-1.11 · Consultas (REQ-CON-03, 05, 07, 08, 11; DD-06).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANTIDAD_ULTIMAS_INSPECCIONES, buscarPorNumeroLote, buscarPorPlaca, resumenLotes, ultimasInspecciones } from '../../src/domain/consultas.js';
import { registro } from '../helpers/fabrica.js';

const antiguo = registro({ inspeccion: { placa: 'CL-0672', horaInicio: '2026-10-25T16:28', horaFin: '2026-10-25T16:32' }, lotes: [{ numeroLote: 'BN-0453' }, { numeroLote: null, brix: 20 }] });
const reciente = registro({ inspeccion: { placa: 'CL 0672', horaInicio: '2026-10-25T16:47', horaFin: '2026-10-25T17:20' }, lotes: [{ numeroLote: 'BN0453' }] });
const enCurso = registro({ inspeccion: { placa: 'CL0672', horaInicio: '2026-10-25T18:00' }, lotes: [{ numeroLote: 'BN-0453' }] });
const otro = registro({ inspeccion: { placa: 'AB123', horaFin: '2026-10-25T17:00' } });
const todos = [antiguo, enCurso, otro, reciente];

test('cl-0672 encuentra CL-0672 y CL 0672; el registro en curso no aparece; más reciente primero', () => {
  for (const texto of ['cl-0672', 'CL 0672', 'cl0672']) {
    assert.deepEqual(buscarPorPlaca(todos, texto), [reciente, antiguo]);
  }
  assert.deepEqual(buscarPorPlaca(todos, '   '), []);
  assert.deepEqual(buscarPorPlaca(todos, 'ZZZ'), []);
});

test('por número de lote: solo finalizados, sin lotes null, más reciente primero', () => {
  const r = buscarPorNumeroLote(todos, 'bn 0453');
  assert.equal(r.length, 2);
  assert.equal(r[0].registro, reciente);
  assert.equal(r[1].registro, antiguo);
  assert.equal(r[1].lote.numeroLote, 'BN-0453');
  assert.deepEqual(buscarPorNumeroLote(todos, ''), []);
});

test('resumen de lotes', () => {
  assert.deepEqual(resumenLotes(antiguo.lotes), { total: 2, aprobados: 1, rechazados: 1 });
});

test('últimas inspecciones: solo finalizados, más reciente primero, máximo 10 (REQ-CON-11)', () => {
  assert.equal(CANTIDAD_ULTIMAS_INSPECCIONES, 10);
  assert.deepEqual(ultimasInspecciones([]), []);
  assert.deepEqual(ultimasInspecciones([enCurso]), [], 'el registro en curso no aparece');
  const ultimasDeTodos = ultimasInspecciones(todos);
  assert.equal(ultimasDeTodos.length, 3);
  assert.ok(!ultimasDeTodos.includes(enCurso));
  assert.equal(ultimasDeTodos.at(-1), antiguo);

  const hora = (n) => `2026-10-${String(n).padStart(2, '0')}T08:00`;
  const finalizados = (cantidad) =>
    Array.from({ length: cantidad }, (_, i) => registro({ inspeccion: { horaInicio: hora(i + 1), fecha: hora(i + 1).slice(0, 10), horaFin: hora(i + 1).replace('08', '09') } }));
  for (const [cantidad, esperado] of [[9, 9], [10, 10], [11, 10]]) {
    const lista = finalizados(cantidad);
    const ultimas = ultimasInspecciones([...lista, enCurso]);
    assert.equal(ultimas.length, esperado, `${cantidad} finalizados`);
    assert.equal(ultimas[0], lista[cantidad - 1], 'la más reciente primero');
    assert.equal(ultimas.at(-1), lista[cantidad - esperado], 'se omiten las más antiguas');
  }
  const lista = finalizados(3);
  const copia = [...lista];
  ultimasInspecciones(lista);
  assert.deepEqual(lista, copia, 'no reordena el arreglo recibido');
});
