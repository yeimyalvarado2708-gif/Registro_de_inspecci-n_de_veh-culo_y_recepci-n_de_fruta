// @ts-check
// Fase 2 · storage.js (REQ-PER-01 a 16; DD-01, DD-02, DD-05; design §7.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE_EN_CURSO, CLAVE_PESTANA_ACTIVA, PREFIJO_FINALIZADO, crearStorage,
} from '../../src/state/storage.js';
import { finalizar } from '../../src/domain/registro.js';
import { MENSAJES } from '../../src/domain/mensajes.js';
import { crearLocalStorageMemoria } from '../helpers/localStorageMemoria.js';
import { copia, lote, registro, uuid } from '../helpers/fabrica.js';

/** @param {ReturnType<typeof crearLocalStorageMemoria>} [ls] @param {EventTarget|null} [eventos] @param {string} [pestanaId] */
const nuevo = (ls = crearLocalStorageMemoria(), eventos = null, pestanaId = 'A') => ({ ls, storage: crearStorage(ls, { pestanaId, eventos }) });

test('disponible() prueba escribir y borrar (REQ-PER-14)', () => {
  assert.equal(nuevo().storage.disponible(), true);
  assert.equal(nuevo(crearLocalStorageMemoria({ noDisponible: true })).storage.disponible(), false);
  assert.equal(crearStorage(null, { eventos: null }).disponible(), false);
  assert.equal(crearStorage(null, { eventos: null }).guardarRegistroEnCurso(registro()).ok, false);
});

test('escritura correcta del registro en curso y lectura', () => {
  const { ls, storage } = nuevo();
  const r = registro();
  assert.deepEqual(storage.guardarRegistroEnCurso(r), { ok: true });
  assert.deepEqual(JSON.parse(/** @type {string} */ (ls.getItem(CLAVE_EN_CURSO))), r);
  const lectura = storage.leerRegistros();
  assert.deepEqual(lectura.enCurso, r);
  assert.deepEqual(lectura.avisos, []);
});

test('cuota excedida → motivo espacio y almacenamiento sin cambios (REQ-PER-12)', () => {
  const { ls, storage } = nuevo();
  const r = registro();
  storage.guardarRegistroEnCurso(r);
  const antes = ls.instantanea();
  ls.fijarLimiteBytes(10);
  const n = copia(r);
  n.lotes.push(lote(r.inspeccion.id));
  assert.deepEqual(storage.guardarRegistroEnCurso(n), { ok: false, motivo: 'espacio', detalle: MENSAJES.sinEspacio });
  assert.deepEqual(ls.instantanea(), antes);
});

test('finalizar escribe finalizado.<id> y después elimina enCurso', () => {
  const { ls, storage } = nuevo();
  const r = registro();
  storage.guardarRegistroEnCurso(r);
  const f = finalizar(r, { fechaHora: '2026-10-25T18:00' });
  assert.deepEqual(storage.guardarRegistroFinalizado(f), { ok: true });
  assert.equal(ls.getItem(CLAVE_EN_CURSO), null);
  assert.deepEqual(JSON.parse(/** @type {string} */ (ls.getItem(PREFIJO_FINALIZADO + r.inspeccion.id))), f);
});

test('finalizar sin espacio no borra el registro en curso', () => {
  const { ls, storage } = nuevo();
  const r = registro();
  storage.guardarRegistroEnCurso(r);
  const antes = ls.instantanea();
  ls.fijarLimiteBytes(JSON.stringify(antes).length * 2);
  assert.equal(storage.guardarRegistroFinalizado(finalizar(r, { fechaHora: '2026-10-25T18:00' })).ok, false);
  assert.deepEqual(ls.instantanea(), antes);
});

test('lectura: JSON roto, fuera de contrato y claves de otra app', () => {
  const { ls, storage } = nuevo();
  const bueno = finalizar(registro(), { fechaHora: '2026-10-25T18:00' });
  ls.setItem(PREFIJO_FINALIZADO + bueno.inspeccion.id, JSON.stringify(bueno));
  ls.setItem(PREFIJO_FINALIZADO + uuid(), '{roto');
  const fuera = /** @type {any} */ (finalizar(registro(), { fechaHora: '2026-10-25T18:00' }));
  fuera.inspeccion.placa = 'minusculas';
  ls.setItem(PREFIJO_FINALIZADO + fuera.inspeccion.id, JSON.stringify(fuera));
  ls.setItem('otraApp.datos', '{roto');
  ls.setItem(CLAVE_PESTANA_ACTIVA, JSON.stringify({ pestanaId: 'A', desde: '2026-10-25T16:00' }));
  const lectura = storage.leerRegistros();
  assert.deepEqual(lectura.finalizados, [bueno]);
  assert.equal(lectura.enCurso, null);
  assert.equal(lectura.avisos.length, 2);
});

test('lectura: lote huérfano en un finalizado se omite; en el en curso marca DD-05', () => {
  const { ls, storage } = nuevo();
  const f = /** @type {any} */ (finalizar(registro(), { fechaHora: '2026-10-25T18:00' }));
  f.lotes.push(lote(uuid()));
  ls.setItem(PREFIJO_FINALIZADO + f.inspeccion.id, JSON.stringify(f));
  let lectura = storage.leerRegistros();
  assert.equal(lectura.finalizados[0].lotes.length, 1);
  assert.equal(lectura.enCursoConLotesOmitidos, false);

  const enCurso = /** @type {any} */ (registro());
  enCurso.lotes.push({ ...lote(enCurso.inspeccion.id), estado: 'Dañado' });
  ls.setItem(CLAVE_EN_CURSO, JSON.stringify(enCurso));
  lectura = storage.leerRegistros();
  assert.equal(lectura.enCurso?.lotes.length, 1);
  assert.equal(lectura.enCursoConLotesOmitidos, true);
});

test('finalización interrumpida: prevalece el finalizado y se elimina enCurso', () => {
  const { ls, storage } = nuevo();
  const r = registro();
  ls.setItem(CLAVE_EN_CURSO, JSON.stringify(r));
  const f = finalizar(r, { fechaHora: '2026-10-25T18:00' });
  ls.setItem(PREFIJO_FINALIZADO + r.inspeccion.id, JSON.stringify(f));
  const lectura = storage.leerRegistros();
  assert.equal(lectura.enCurso, null);
  assert.equal(lectura.finalizados.length, 1);
  assert.equal(ls.getItem(CLAVE_EN_CURSO), null);
});

test('un finalizado guardado con otra clave se omite', () => {
  const { ls, storage } = nuevo();
  const f = finalizar(registro(), { fechaHora: '2026-10-25T18:00' });
  ls.setItem(PREFIJO_FINALIZADO + uuid(), JSON.stringify(f));
  assert.equal(storage.leerRegistros().finalizados.length, 0);
});

test('bloqueo por otra pestaña: escrituras en solo lectura (REQ-PER-15)', () => {
  const ls = crearLocalStorageMemoria();
  const eventos = new EventTarget();
  const a = crearStorage(ls, { pestanaId: 'A', eventos });
  const b = crearStorage(ls, { pestanaId: 'B', eventos: null });
  a.reclamarPestanaActiva();
  let avisado = 0;
  a.alCambiarEnOtraPestana(() => avisado++);

  b.reclamarPestanaActiva();
  eventos.dispatchEvent(Object.assign(new Event('storage'), { key: CLAVE_PESTANA_ACTIVA }));
  assert.equal(avisado, 1);
  assert.equal(a.estaBloqueado(), true);
  const r = a.guardarRegistroEnCurso(registro());
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.motivo, 'soloLectura');

  // Claves de otra app no cuentan.
  eventos.dispatchEvent(Object.assign(new Event('storage'), { key: 'otraApp' }));
  assert.equal(avisado, 1);

  // «Continuar en esta pestaña»: A vuelve a ser la activa (REQ-VAL-32).
  a.reclamarPestanaActiva();
  a.desbloquearEscrituras();
  assert.deepEqual(a.guardarRegistroEnCurso(registro()), { ok: true });
});

test('eventos de la propia pestaña activa no bloquean', () => {
  const ls = crearLocalStorageMemoria();
  const eventos = new EventTarget();
  const a = crearStorage(ls, { pestanaId: 'A', eventos });
  a.reclamarPestanaActiva();
  let avisado = 0;
  a.alCambiarEnOtraPestana(() => avisado++);
  eventos.dispatchEvent(Object.assign(new Event('storage'), { key: CLAVE_EN_CURSO }));
  assert.equal(avisado, 0);
  assert.equal(a.estaBloqueado(), false);
});
