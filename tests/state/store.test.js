// @ts-check
// T-3.8 · Escenarios de los requerimientos con reloj fijo, ids deterministas y almacén en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearStore, seleccionarCambiosSinGuardar, seleccionarContadores, seleccionarEstadoVisible, seleccionarProductoresSugeridos } from '../../src/state/store.js';
import { CLAVE_EN_CURSO, crearStorage } from '../../src/state/storage.js';
import { MOTIVO_VEHICULO_NO_CUMPLE } from '../../src/domain/criterios.js';
import { MENSAJES } from '../../src/domain/mensajes.js';
import { crearLocalStorageMemoria } from '../helpers/localStorageMemoria.js';
import { uuid } from '../helpers/fabrica.js';

/** Reloj controlable: instante en hora de Costa Rica (UTC-6). */
function crearReloj(fechaHoraCR = '2026-10-25T16:47') {
  let actual = fechaHoraCR;
  const reloj = () => {
    const [f, h] = actual.split('T');
    const [a, m, d] = f.split('-').map(Number);
    const [hh, mm] = h.split(':').map(Number);
    return new Date(Date.UTC(a, m - 1, d, hh + 6, mm));
  };
  return { reloj, fijar: (/** @type {string} */ v) => { actual = v; } };
}

/** @param {{ ls?: ReturnType<typeof crearLocalStorageMemoria>, inicio?: string, inspectores?: string[] }} [o] */
function preparar(o = {}) {
  const ls = o.ls ?? crearLocalStorageMemoria();
  const tiempo = crearReloj(o.inicio);
  let n = 1000;
  const storage = crearStorage(ls, { pestanaId: 'A', eventos: null, reloj: tiempo.reloj });
  const store = crearStore({ storage, reloj: tiempo.reloj, generarId: () => uuid(++n), ...(o.inspectores ? { inspectores: o.inspectores } : {}) });
  store.iniciar();
  return { ls, store, storage, tiempo, estado: () => store.obtenerEstado() };
}

/** Inspección completa con chequeo «Cumple» (o el indicado). @param {ReturnType<typeof crearStore>} store */
function completarInspeccion(store, chequeo = true) {
  store.actualizarCampoInspeccion('placa', 'cl 76543');
  store.actualizarCampoInspeccion('productor', 'Gerald Garcia');
  store.actualizarCampoInspeccion('inspector', 'Melquisedec GP');
  store.cambiarChequeo(chequeo);
}

/**
 * Abre un lote nuevo, llena el borrador y lo guarda.
 * @param {ReturnType<typeof crearStore>} store
 * @param {Partial<import('../../src/domain/tipos.js').Borrador>} datos
 */
function guardarLoteNuevo(store, datos) {
  assert.ok(store.abrirLoteNuevo());
  for (const [campo, valor] of Object.entries(datos)) store.actualizarBorrador(/** @type {any} */ (campo), valor);
  return store.guardarLote();
}

const malangaAprobada = { producto: /** @type {const} */ ('Malanga'), numeroLote: 'lt105490', ordenCompra: 'OC2540', brix: '8.0', temperatura: '26.0', peso: '1235.0' };

test('el primer dato crea la inspección con id, horaInicio y fecha (REQ-INS-01)', () => {
  const { store, ls, estado } = preparar();
  assert.equal(ls.getItem(CLAVE_EN_CURSO), null);
  store.actualizarCampoInspeccion('placa', '  ');
  assert.equal(ls.getItem(CLAVE_EN_CURSO), null, 'solo espacios no es un primer dato');
  store.actualizarCampoInspeccion('placa', 'cl 76543');
  const insp = estado().registroEnCurso?.inspeccion;
  assert.equal(insp?.placa, 'CL 76543');
  assert.equal(insp?.horaInicio, '2026-10-25T16:47');
  assert.equal(insp?.fecha, '2026-10-25');
  assert.equal(insp?.chequeoVehiculo, null);
  assert.equal(estado().ultimoGuardado, '16:47');
  assert.ok(ls.getItem(CLAVE_EN_CURSO));
});

test('borrar la placa conserva horaInicio (REQ-INS-03)', () => {
  const { store, tiempo, estado } = preparar();
  store.actualizarCampoInspeccion('placa', 'CL1');
  tiempo.fijar('2026-10-25T17:10');
  store.actualizarCampoInspeccion('placa', '');
  assert.equal(estado().registroEnCurso?.inspeccion.placa, null);
  assert.equal(estado().registroEnCurso?.inspeccion.horaInicio, '2026-10-25T16:47');
  assert.equal(estado().ultimoGuardado, '17:10');
});

test('recargar la página retoma el registro en curso (REQ-REG-09)', () => {
  const primera = preparar();
  completarInspeccion(primera.store);
  guardarLoteNuevo(primera.store, malangaAprobada);
  const segunda = preparar({ ls: primera.ls, inicio: '2026-10-25T17:30' });
  assert.deepEqual(segunda.estado().registroEnCurso, primera.estado().registroEnCurso);
  assert.equal(segunda.estado().registroEnCurso?.inspeccion.horaInicio, '2026-10-25T16:47');
});

test('guardar lote: aviso con número (WF-04) y sin número (Q-01); contador de guardado (Q-02)', () => {
  const { store, tiempo, estado } = preparar();
  completarInspeccion(store);
  tiempo.fijar('2026-10-25T17:19');
  assert.equal(guardarLoteNuevo(store, malangaAprobada), true);
  assert.equal(estado().ultimoLoteGuardado, 'Lote guardado como LT105490. ¿Llegó otro lote en este vehículo?');
  assert.equal(estado().ultimoGuardado, '17:19');
  assert.equal(estado().formularioLote, null);
  assert.equal(estado().registroEnCurso?.lotes[0].estado, 'Aprobado');
  guardarLoteNuevo(store, { producto: 'Yuca', temperatura: '26.0' });
  assert.equal(estado().ultimoLoteGuardado, 'Lote de Yuca guardado. ¿Llegó otro lote en este vehículo?');
});

test('guardar lote inválido muestra errores y no persiste (REQ-LOT-23)', () => {
  const { store, ls, estado } = preparar();
  completarInspeccion(store);
  const antes = ls.instantanea();
  assert.equal(guardarLoteNuevo(store, { producto: 'Banano', brix: '4,5' }), false);
  const errores = estado().formularioLote?.errores ?? {};
  assert.equal(errores.brix, MENSAJES.usarPuntoDecimal);
  assert.equal(errores.dentroCalibre, MENSAJES.calibreSinElegir);
  assert.deepEqual(ls.instantanea(), antes);
});

test('número de lote repetido en la misma inspección (REQ-VAL-14)', () => {
  const { store, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, { ...malangaAprobada, numeroLote: 'BN-0453' });
  assert.equal(guardarLoteNuevo(store, { producto: 'Yuca', temperatura: '26.0', numeroLote: 'bn 0453' }), false);
  assert.equal(estado().formularioLote?.errores.numeroLote, MENSAJES.loteRepetido('BN 0453'));
});

test('cambio de chequeo Cumple → No cumple → Cumple con lotes (REQ-INS-11, 13; REQ-PER-04)', () => {
  const { store, storage, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, { ...malangaAprobada, observaciones: 'Fruta fresca' });
  guardarLoteNuevo(store, { producto: 'Yuca', temperatura: '31.0' });
  store.cambiarChequeo(false);
  let guardado = storage.leerRegistros().enCurso;
  assert.deepEqual(guardado, estado().registroEnCurso);
  for (const l of guardado?.lotes ?? []) {
    assert.equal(l.estado, 'Rechazado');
    assert.equal(l.motivoRechazo, MOTIVO_VEHICULO_NO_CUMPLE);
    assert.deepEqual([l.brix, l.temperatura, l.peso, l.dentroCalibre], [null, null, null, null]);
  }
  assert.equal(guardado?.lotes[0].observaciones, 'Fruta fresca');
  store.cambiarChequeo(true);
  guardado = storage.leerRegistros().enCurso;
  assert.deepEqual(guardado?.lotes.map((l) => l.estado), [null, null]);
  assert.deepEqual(seleccionarContadores(estado()), { aprobados: 0, rechazados: 0, pendientes: 2 });
});

test('completar un lote Pendiente de valorar; con parámetros vacíos no se guarda (REQ-LOT-29, REQ-VAL-29)', () => {
  const { store, storage, estado } = preparar();
  completarInspeccion(store, false);
  guardarLoteNuevo(store, { producto: 'Yuca', observaciones: 'Golpeada' });
  store.cambiarChequeo(true);
  const loteId = /** @type {string} */ (estado().registroEnCurso?.lotes[0].id);
  store.editarLote(loteId);
  assert.equal(seleccionarEstadoVisible(estado()), 'Pendiente de valorar');
  assert.equal(store.guardarLote(), false);
  assert.equal(storage.leerRegistros().enCurso?.lotes[0].estado, null);
  store.actualizarBorrador('temperatura', '26.0');
  assert.equal(seleccionarEstadoVisible(estado()), 'Aprobado');
  assert.equal(estado().formularioLote?.avisoObservaciones, null, 'viene de Pendiente de valorar: sin aviso (DD-12)');
  assert.equal(store.guardarLote(), true);
  assert.equal(storage.leerRegistros().enCurso?.lotes[0].estado, 'Aprobado');
});

test('aviso de observaciones en un lote nuevo que pasa de Rechazado a Aprobado (REQ-LOT-19, DD-12)', () => {
  const { store, estado } = preparar();
  completarInspeccion(store);
  store.abrirLoteNuevo();
  store.actualizarBorrador('producto', 'Yuca');
  store.actualizarBorrador('observaciones', 'Temperatura alta');
  store.actualizarBorrador('temperatura', '31.0');
  assert.equal(seleccionarEstadoVisible(estado()), 'Rechazado');
  store.actualizarBorrador('temperatura', '');
  assert.equal(estado().formularioLote?.avisoObservaciones, null);
  store.actualizarBorrador('temperatura', '29.0');
  assert.equal(estado().formularioLote?.avisoObservaciones, MENSAJES.revisarObservaciones);
});

test('«Cerrar sin guardar» de un lote nuevo con vehículo que no cumple no deja nada (REQ-LOT-32)', () => {
  const { store, ls, estado } = preparar();
  completarInspeccion(store, false);
  const antes = ls.instantanea();
  store.abrirLoteNuevo();
  store.actualizarBorrador('producto', 'Banano');
  assert.equal(seleccionarEstadoVisible(estado()), 'Rechazado');
  assert.equal(seleccionarCambiosSinGuardar(estado()), true);
  store.cerrarLote();
  assert.equal(estado().formularioLote, null);
  assert.deepEqual(ls.instantanea(), antes);
});

test('«Cerrar sin guardar» de un lote editado conserva los cambios del sistema (REQ-LOT-33)', () => {
  const { store, storage, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, malangaAprobada);
  const loteId = /** @type {string} */ (estado().registroEnCurso?.lotes[0].id);
  store.editarLote(loteId);
  store.actualizarBorrador('ordenCompra', 'OC-9999');
  store.cambiarChequeo(false);
  const f = estado().formularioLote;
  assert.equal(f?.original?.estado, 'Rechazado');
  assert.equal(f?.borrador.brix, '', 'DD-08: el borrador pierde sus parámetros');
  store.cerrarLote();
  const guardado = storage.leerRegistros().enCurso?.lotes[0];
  assert.equal(guardado?.estado, 'Rechazado');
  assert.equal(guardado?.ordenCompra, 'OC2540');
});

test('quitar el lote abierto cierra el formulario (DD-07)', () => {
  const { store, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, malangaAprobada);
  const loteId = /** @type {string} */ (estado().registroEnCurso?.lotes[0].id);
  store.editarLote(loteId);
  store.actualizarBorrador('ordenCompra', 'OC-1');
  assert.equal(store.quitarLote(loteId), true);
  assert.equal(estado().formularioLote, null);
  assert.equal(estado().registroEnCurso?.lotes.length, 0);
});

test('finalizar bloqueado indica cada condición que falta (REQ-REG-03)', () => {
  const { store, ls } = preparar();
  store.actualizarCampoInspeccion('placa', 'CL1');
  const antes = ls.instantanea();
  const r = store.finalizarRegistro();
  assert.deepEqual(r, { ok: false, faltan: [MENSAJES.condicionInspeccionCompleta, MENSAJES.condicionAlMenosUnLote, MENSAJES.condicionTodosValorados] });
  assert.deepEqual(ls.instantanea(), antes);
});

test('finalizar cruzando la medianoche y con reloj atrasado (REQ-VAL-21, 22)', () => {
  const { store, storage, tiempo, estado } = preparar({ inicio: '2026-10-25T23:50' });
  completarInspeccion(store);
  guardarLoteNuevo(store, malangaAprobada);
  tiempo.fijar('2026-10-26T00:10');
  assert.deepEqual(store.finalizarRegistro(), { ok: true });
  const [f] = storage.leerRegistros().finalizados;
  assert.equal(f.inspeccion.fecha, '2026-10-25');
  assert.equal(f.inspeccion.horaFin, '2026-10-26T00:10');
  assert.equal(estado().registroEnCurso, null);
  assert.equal(estado().formularioLote, null);
  assert.ok(!estado().avisos.includes(MENSAJES.relojEquipo));

  const otro = preparar({ inicio: '2026-10-25T16:47' });
  completarInspeccion(otro.store);
  guardarLoteNuevo(otro.store, malangaAprobada);
  otro.tiempo.fijar('2026-10-25T16:00');
  assert.deepEqual(otro.store.finalizarRegistro(), { ok: true });
  assert.ok(otro.estado().avisos.includes(MENSAJES.relojEquipo));
});

test('cancelar con rechazados elimina todo (REQ-REG-07, INV-06)', () => {
  const { store, ls, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, { producto: 'Yuca', temperatura: '31.0' });
  const id = /** @type {string} */ (estado().registroEnCurso?.inspeccion.id);
  assert.equal(store.cancelarRegistro(), true);
  assert.equal(estado().registroEnCurso, null);
  assert.ok(!JSON.stringify(ls.instantanea()).includes(id));
});

test('cuota excedida al guardar el lote conserva el borrador (REQ-PER-12)', () => {
  const { store, ls, estado } = preparar();
  completarInspeccion(store);
  const antes = ls.instantanea();
  store.abrirLoteNuevo();
  for (const [c, v] of Object.entries(malangaAprobada)) store.actualizarBorrador(/** @type {any} */ (c), v);
  ls.fijarLimiteBytes(JSON.stringify(antes).length * 2);
  assert.equal(store.guardarLote(), false);
  assert.equal(estado().errorGuardado, MENSAJES.sinEspacio);
  assert.equal(estado().formularioLote?.borrador.brix, '8.0');
  assert.equal(estado().registroEnCurso?.lotes.length, 0);
  assert.deepEqual(ls.instantanea(), antes);
});

test('navegar no toca el registro ni el borrador (REQ-UI-08)', () => {
  const { store, estado } = preparar();
  completarInspeccion(store);
  store.abrirLoteNuevo();
  store.actualizarBorrador('producto', 'Yuca');
  const antes = { r: estado().registroEnCurso, f: estado().formularioLote };
  store.navegar('criterios');
  store.navegar('registro');
  assert.equal(estado().registroEnCurso, antes.r);
  assert.equal(estado().formularioLote, antes.f);
});

test('almacenamiento no disponible: aviso y registro deshabilitado (REQ-PER-14)', () => {
  const { store, estado } = preparar({ ls: crearLocalStorageMemoria({ noDisponible: true }) });
  assert.equal(estado().almacenamientoDisponible, false);
  assert.ok(estado().avisos.includes(MENSAJES.almacenamientoNoDisponible));
  assert.equal(store.actualizarCampoInspeccion('placa', 'CL1'), false);
});

test('registro en curso con un lote dañado: solo lectura y solo Cancelar (DD-05)', () => {
  const base = preparar();
  completarInspeccion(base.store);
  guardarLoteNuevo(base.store, malangaAprobada);
  const crudo = JSON.parse(/** @type {string} */ (base.ls.getItem(CLAVE_EN_CURSO)));
  crudo.lotes.push({ ...crudo.lotes[0], id: uuid(9), estado: 'X' });
  base.ls.setItem(CLAVE_EN_CURSO, JSON.stringify(crudo));

  const { store, estado } = preparar({ ls: base.ls });
  assert.equal(estado().soloLectura, true);
  assert.equal(estado().motivoSoloLectura, 'loteDanado');
  assert.ok(estado().avisos.includes(MENSAJES.loteDanadoEnCurso));
  assert.equal(store.actualizarCampoInspeccion('placa', 'OTRA'), false);
  assert.equal(store.abrirLoteNuevo(), false);
  assert.equal(store.cancelarRegistro(), true);
  assert.equal(estado().soloLectura, false);
});

test('otra pestaña: solo lectura y «Continuar en esta pestaña» (REQ-VAL-26, 32)', () => {
  const { store, storage, estado } = preparar();
  completarInspeccion(store);
  store.recargarDesdeOtraPestana();
  assert.equal(estado().soloLectura, true);
  assert.ok(estado().avisos.includes(MENSAJES.otraPestana));
  assert.equal(store.actualizarCampoInspeccion('placa', 'XX'), false);
  assert.equal(storage.guardarRegistroEnCurso(/** @type {any} */ (estado().registroEnCurso)).ok, false);
  store.continuarEnEstaPestana();
  assert.equal(estado().soloLectura, false);
  assert.ok(!estado().avisos.includes(MENSAJES.otraPestana));
  assert.equal(store.actualizarCampoInspeccion('placa', 'XX'), true);
});

test('un segundo registro en curso no se crea: se retoma el existente (REQ-VAL-27)', () => {
  const ls = crearLocalStorageMemoria();
  const a = preparar({ ls });
  const b = preparar({ ls });
  a.store.actualizarCampoInspeccion('placa', 'AAA');
  b.store.actualizarCampoInspeccion('productor', 'Productor B');
  const guardado = crearStorage(ls, { eventos: null }).leerRegistros().enCurso;
  assert.equal(guardado?.inspeccion.placa, 'AAA');
  assert.equal(guardado?.inspeccion.productor, 'Productor B');
});

test('consultas: buscar, ver registro y ver lote solo entre finalizados (REQ-CON, Q-03)', () => {
  const { store, estado } = preparar();
  completarInspeccion(store);
  guardarLoteNuevo(store, malangaAprobada);
  const id = /** @type {string} */ (estado().registroEnCurso?.inspeccion.id);
  const loteId = /** @type {string} */ (estado().registroEnCurso?.lotes[0].id);

  store.verRegistro(id);
  assert.deepEqual(estado().consulta.seleccion, { tipo: 'noEncontrado' }, 'el registro en curso no se consulta');
  store.cambiarTextoConsulta('cl-76543');
  store.buscar();
  assert.deepEqual(estado().consulta.resultados, []);

  store.finalizarRegistro();
  store.buscar();
  assert.equal(/** @type {any[]} */ (estado().consulta.resultados).length, 1);
  store.cambiarModoConsulta('lote');
  store.cambiarTextoConsulta('LT 105490');
  store.buscar();
  assert.equal(/** @type {any[]} */ (estado().consulta.resultados).length, 1);
  store.verLote(id, loteId);
  assert.equal(estado().consulta.seleccion?.tipo, 'lote');
  store.verRegistro(id);
  assert.equal(estado().consulta.seleccion?.tipo, 'registro');
  assert.deepEqual(seleccionarProductoresSugeridos(estado()), ['Gerald Garcia']);
});

test('al entrar a Consultas se releen los finalizados de otra pestaña (REQ-CON-11, REQ-PER-16)', () => {
  const ls = crearLocalStorageMemoria();
  const a = preparar({ ls });
  const b = preparar({ ls });
  completarInspeccion(b.store);
  guardarLoteNuevo(b.store, malangaAprobada);
  assert.equal(b.store.finalizarRegistro().ok, true);
  assert.equal(a.estado().registrosFinalizados.length, 0);
  a.store.navegar('consultas');
  assert.equal(a.estado().registrosFinalizados.length, 1);
});

test('inspectores depurados desde la configuración (REQ-VAL-30, 31)', () => {
  assert.deepEqual(preparar({ inspectores: ['Aurora V', ' aurora v', ''] }).store.obtenerInspectores(), ['Aurora V']);
  assert.deepEqual(preparar({ inspectores: ['  '] }).store.obtenerInspectores(), []);
});
