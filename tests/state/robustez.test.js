// @ts-check
// Fase 7 · Robustez: varias pestañas, datos dañados, sin espacio, almacenamiento no disponible
// (REQ-VAL-21, 25, 26, 32; REQ-PER-11 a 15; DD-02, DD-05).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearStore, seleccionarCambiosSinGuardar } from '../../src/state/store.js';
import { CLAVE_EN_CURSO, PREFIJO_FINALIZADO, crearStorage } from '../../src/state/storage.js';
import { MENSAJES } from '../../src/domain/mensajes.js';
import { crearLocalStorageMemoria } from '../helpers/localStorageMemoria.js';
import { registro, uuid } from '../helpers/fabrica.js';

/**
 * Pestaña simulada: comparte el almacén y recibe los eventos «storage» de las demás.
 * @param {ReturnType<typeof crearLocalStorageMemoria>} ls
 * @param {string} pestanaId
 */
function pestana(ls, pestanaId) {
  const eventos = new EventTarget();
  let n = 0;
  const storage = crearStorage(ls, { pestanaId, eventos });
  const store = crearStore({ storage, generarId: () => uuid(Number.parseInt(pestanaId, 36) * 1000 + ++n) });
  store.iniciar();
  store.alCambiarEnOtraPestana(() => store.recargarDesdeOtraPestana());
  /** El navegador avisa a las OTRAS pestañas cuando una escribe. @param {string} clave */
  const recibir = (clave) => eventos.dispatchEvent(Object.assign(new Event('storage'), { key: clave }));
  return { store, recibir, estado: () => store.obtenerEstado() };
}

test('T-7.2: abrir B deja A en solo lectura; «Continuar en esta pestaña» invierte los papeles', () => {
  const ls = crearLocalStorageMemoria();
  const a = pestana(ls, 'a');
  a.store.actualizarCampoInspeccion('placa', 'CL1');
  const b = pestana(ls, 'b');
  a.recibir('foas07.v1.pestanaActiva');
  assert.equal(a.estado().soloLectura, true);
  assert.ok(a.estado().avisos.includes(MENSAJES.otraPestana));

  // B edita; A recarga los datos y sigue en solo lectura.
  b.store.actualizarCampoInspeccion('productor', 'Productor B');
  a.recibir(CLAVE_EN_CURSO);
  assert.equal(a.estado().registroEnCurso?.inspeccion.productor, 'Productor B');
  assert.equal(a.store.actualizarCampoInspeccion('placa', 'OTRA'), false);

  a.store.continuarEnEstaPestana();
  b.recibir('foas07.v1.pestanaActiva');
  assert.equal(a.estado().soloLectura, false);
  assert.equal(b.estado().soloLectura, true);
  assert.equal(a.store.actualizarCampoInspeccion('placa', 'CL2'), true);
  assert.equal(b.store.actualizarCampoInspeccion('placa', 'CL3'), false);
});

test('T-7.3: registros omitidos producen avisos y la app sigue con los demás', () => {
  const ls = crearLocalStorageMemoria();
  const bueno = registro({ inspeccion: { horaFin: '2026-10-25T18:00' } });
  ls.setItem(PREFIJO_FINALIZADO + bueno.inspeccion.id, JSON.stringify(bueno));
  ls.setItem(`${PREFIJO_FINALIZADO}x`, '{roto');
  const { estado } = pestana(ls, 'c');
  assert.equal(estado().registrosFinalizados.length, 1);
  assert.ok(estado().avisos.includes(MENSAJES.registroDanado));
  assert.equal(estado().soloLectura, false);
});

test('T-7.4: cuota excedida al cambiar la inspección conserva memoria y avisa', () => {
  const ls = crearLocalStorageMemoria();
  const { store, estado } = pestana(ls, 'd');
  store.actualizarCampoInspeccion('placa', 'CL1');
  ls.fijarLimiteBytes(1);
  assert.equal(store.actualizarCampoInspeccion('placa', 'CL2'), false);
  assert.equal(estado().registroEnCurso?.inspeccion.placa, 'CL1');
  assert.equal(estado().errorGuardado, MENSAJES.sinEspacio);
  store.descartarError();
  assert.equal(estado().errorGuardado, null);
});

test('T-7.4: sin almacenamiento, Consultas no tiene registros que leer', () => {
  const { store, estado } = pestana(crearLocalStorageMemoria({ noDisponible: true }), 'e');
  store.cambiarTextoConsulta('CL1');
  store.buscar();
  assert.equal(estado().almacenamientoDisponible, false);
  assert.deepEqual(estado().consulta.resultados, []);
  assert.equal(store.cambiarChequeo(true), false);
  assert.equal(store.abrirLoteNuevo(), false);
});

test('T-7.1: hay cambios sin guardar solo con un borrador modificado (REQ-VAL-25)', () => {
  const { store, estado } = pestana(crearLocalStorageMemoria(), 'f');
  store.actualizarCampoInspeccion('placa', 'CL1');
  store.actualizarCampoInspeccion('productor', 'P');
  store.actualizarCampoInspeccion('inspector', 'Aurora V');
  store.cambiarChequeo(true);
  assert.equal(seleccionarCambiosSinGuardar(estado()), false);
  store.abrirLoteNuevo();
  assert.equal(seleccionarCambiosSinGuardar(estado()), false);
  store.actualizarBorrador('observaciones', 'x');
  assert.equal(seleccionarCambiosSinGuardar(estado()), true);
});

test('los avisos vigentes no se pueden descartar', () => {
  const ls = crearLocalStorageMemoria();
  const a = pestana(ls, 'g');
  a.store.recargarDesdeOtraPestana();
  a.store.descartarAviso(MENSAJES.otraPestana);
  assert.ok(a.estado().avisos.includes(MENSAJES.otraPestana));
});
