// @ts-check
// T-8.1 · RNF-03: guardar y recalcular < 200 ms y consultar < 1 s con 5 000 lotes almacenados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { crearStore } from '../src/state/store.js';
import { PREFIJO_FINALIZADO, crearStorage } from '../src/state/storage.js';
import { buscarPorNumeroLote, buscarPorPlaca, ultimasInspecciones } from '../src/domain/consultas.js';
import { crearLocalStorageMemoria } from './helpers/localStorageMemoria.js';
import { registro, uuid } from './helpers/fabrica.js';

const REGISTROS = 500;
const LOTES_POR_REGISTRO = 10;

function almacenCon5000Lotes() {
  const ls = crearLocalStorageMemoria();
  for (let i = 0; i < REGISTROS; i++) {
    const r = registro({
      inspeccion: { placa: `CL-${String(i % 50).padStart(4, '0')}`, horaFin: '2026-10-25T18:00' },
      lotes: Array.from({ length: LOTES_POR_REGISTRO }, (_, j) => ({ numeroLote: `LT-${i}-${j}`, observaciones: 'Observación de prueba del inspector' })),
    });
    ls.setItem(PREFIJO_FINALIZADO + r.inspeccion.id, JSON.stringify(r));
  }
  return ls;
}

test('consultar con 5 000 lotes: leerRegistros + búsqueda + últimas inspecciones < 1 s', () => {
  const storage = crearStorage(almacenCon5000Lotes(), { eventos: null });
  const inicio = performance.now();
  const { finalizados } = storage.leerRegistros();
  const porPlaca = buscarPorPlaca(finalizados, 'cl 0007');
  const porLote = buscarPorNumeroLote(finalizados, 'lt-250-3');
  const ultimas = ultimasInspecciones(finalizados);
  const duracion = performance.now() - inicio;
  assert.equal(finalizados.reduce((n, r) => n + r.lotes.length, 0), 5000);
  assert.equal(porPlaca.length, REGISTROS / 50);
  assert.equal(porLote.length, 1);
  assert.equal(ultimas.length, 10);
  assert.ok(duracion < 1000, `${duracion.toFixed(1)} ms`);
});

test('guardar un lote y recalcular con 5 000 lotes almacenados < 200 ms', () => {
  const ls = almacenCon5000Lotes();
  let n = 90000;
  const store = crearStore({ storage: crearStorage(ls, { eventos: null }), generarId: () => uuid(++n) });
  store.iniciar();
  store.actualizarCampoInspeccion('placa', 'CL-9999');
  store.actualizarCampoInspeccion('productor', 'Productor');
  store.actualizarCampoInspeccion('inspector', 'Aurora V');
  store.cambiarChequeo(true);
  for (let i = 0; i < 20; i++) {
    store.abrirLoteNuevo();
    store.actualizarBorrador('producto', 'Yuca');
    store.actualizarBorrador('temperatura', '26.0');
    store.guardarLote();
  }

  store.abrirLoteNuevo();
  store.actualizarBorrador('producto', 'Malanga');
  store.actualizarBorrador('brix', '8.0');
  store.actualizarBorrador('temperatura', '26.0');
  const inicio = performance.now();
  store.actualizarBorrador('peso', '1235.0'); // recálculo del estado
  const guardado = store.guardarLote();
  const duracion = performance.now() - inicio;
  assert.equal(guardado, true);
  assert.ok(duracion < 200, `${duracion.toFixed(1)} ms`);

  const inicioChequeo = performance.now();
  store.cambiarChequeo(false); // recalcula y guarda todos los lotes del registro
  assert.ok(performance.now() - inicioChequeo < 200);
});
