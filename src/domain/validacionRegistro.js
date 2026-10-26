// @ts-check
// Guardia de contrato e invariantes (REQ-PER-05, 13; REQ-UNC-17; INV-01 a INV-20; DD-13).
// Verifica a mano data-contract.json v1.0.0 y los invariantes que comparan con la versión
// anterior. Devuelve los IDs de los invariantes violados; lista vacía = se puede escribir.
// INV-01 (una sola clave en curso) lo completa storage.js, que conoce las claves.

import { CRITERIOS_APROBACION, PATRON_UN_DECIMAL, PRODUCTOS, RANGOS_ENTRADA } from './criterios.js';
import { valorNormalizado } from './normalizacion.js';
import { inspeccionCompleta } from './validacion.js';
import { valorarLote } from './valoracion.js';

/** @typedef {import('./tipos.js').Registro} Registro */

// Patrones copiados de data-contract.json › $defs.
const PATRON_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const PATRON_UUID_V4 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_FECHA_HORA = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
const PATRON_TEXTO_NO_VACIO = /^\S(?:.*\S)?$/;
const PATRON_TEXTO_MAYUSCULAS = /^(?!.*[a-záéíóúüñ])\S(?:.*\S)?$/;

const CLAVES_INSPECCION = Object.freeze(['id', 'fecha', 'horaInicio', 'placa', 'productor', 'inspector', 'horaFin', 'chequeoVehiculo']);
const CLAVES_LOTE = Object.freeze([
  'id', 'inspeccionId', 'numeroLote', 'ordenCompra', 'producto',
  'dentroCalibre', 'brix', 'temperatura', 'peso',
  'estado', 'observaciones', 'motivoRechazo',
]);
const CLAVES_REGISTRO = Object.freeze(['inspeccion', 'lotes']);

/** @param {unknown} o @returns {o is Record<string, unknown>} */
const esObjeto = (o) => typeof o === 'object' && o !== null && !Array.isArray(o);

/**
 * Claves exactas, sin extras ni faltantes; un valor undefined cuenta como faltante (INV-17, INV-20).
 * @param {Record<string, unknown>} o
 * @param {readonly string[]} claves
 * @param {Set<string>} v
 */
function verificarClaves(o, claves, v) {
  const presentes = Object.keys(o);
  if (presentes.length !== claves.length || presentes.some((k) => !claves.includes(k))) v.add('INV-20');
  for (const k of claves) {
    if (!(k in o)) v.add('INV-20');
    else if (o[k] === undefined) { v.add('INV-17'); v.add('INV-20'); }
  }
}

/**
 * Texto opcional que, si tiene valor, cumple TextoNoVacio (INV-17).
 * @param {unknown} valor
 * @param {Set<string>} v
 */
function verificarTextoOpcional(valor, v) {
  if (valor === null || valor === undefined) return;
  if (typeof valor !== 'string') { v.add('INV-20'); return; }
  if (!PATRON_TEXTO_NO_VACIO.test(valor)) { v.add('INV-17'); v.add('INV-20'); }
}

/**
 * Número opcional dentro del rango válido de entrada y con un decimal como máximo (INV-12).
 * @param {unknown} valor
 * @param {{min: number, max: number}} rango
 * @param {Set<string>} v
 */
function verificarParametro(valor, rango, v) {
  if (valor === null || valor === undefined) return;
  if (typeof valor !== 'number' || !Number.isFinite(valor)) { v.add('INV-12'); v.add('INV-20'); return; }
  if (valor < rango.min || valor > rango.max) { v.add('INV-12'); v.add('INV-20'); return; }
  if (!PATRON_UN_DECIMAL.test(String(valor))) v.add('INV-12');
}

/**
 * Invariantes que viola una inspección frente al contrato.
 * @param {unknown} o
 * @returns {Set<string>}
 */
function erroresInspeccion(o) {
  const v = new Set();
  if (!esObjeto(o)) { v.add('INV-20'); return v; }
  verificarClaves(o, CLAVES_INSPECCION, v);

  if (typeof o.id !== 'string' || !PATRON_UUID.test(o.id)) { v.add('INV-19'); v.add('INV-20'); }
  else if (!PATRON_UUID_V4.test(o.id)) v.add('INV-19');
  if (typeof o.fecha !== 'string' || !PATRON_FECHA.test(o.fecha)) { v.add('INV-03'); v.add('INV-20'); }
  if (typeof o.horaInicio !== 'string' || !PATRON_FECHA_HORA.test(o.horaInicio)) { v.add('INV-02'); v.add('INV-20'); }
  if (o.horaFin !== null && o.horaFin !== undefined && (typeof o.horaFin !== 'string' || !PATRON_FECHA_HORA.test(o.horaFin))) v.add('INV-20');

  if (o.placa !== null && o.placa !== undefined) {
    if (typeof o.placa !== 'string') v.add('INV-20');
    else if (!PATRON_TEXTO_NO_VACIO.test(o.placa)) { v.add('INV-17'); v.add('INV-18'); v.add('INV-20'); }
    else if (!PATRON_TEXTO_MAYUSCULAS.test(o.placa)) { v.add('INV-18'); v.add('INV-20'); }
  }
  verificarTextoOpcional(o.productor, v);
  verificarTextoOpcional(o.inspector, v);
  if (o.chequeoVehiculo !== null && o.chequeoVehiculo !== undefined && typeof o.chequeoVehiculo !== 'boolean') v.add('INV-20');
  return v;
}

/**
 * Invariantes que viola un lote frente al contrato (incluidos los allOf condicionales).
 * @param {unknown} o
 * @returns {Set<string>}
 */
function erroresLote(o) {
  const v = new Set();
  if (!esObjeto(o)) { v.add('INV-20'); return v; }
  verificarClaves(o, CLAVES_LOTE, v);

  if (typeof o.id !== 'string' || !PATRON_UUID.test(o.id)) { v.add('INV-19'); v.add('INV-20'); }
  else if (!PATRON_UUID_V4.test(o.id)) v.add('INV-19');
  if (typeof o.inspeccionId !== 'string' || !PATRON_UUID.test(o.inspeccionId)) { v.add('INV-07'); v.add('INV-20'); }

  if (o.numeroLote !== null && o.numeroLote !== undefined) {
    if (typeof o.numeroLote !== 'string') v.add('INV-20');
    else if (!PATRON_TEXTO_NO_VACIO.test(o.numeroLote)) { v.add('INV-17'); v.add('INV-20'); }
    else if (!PATRON_TEXTO_MAYUSCULAS.test(o.numeroLote)) v.add('INV-20');
  }
  verificarTextoOpcional(o.ordenCompra, v);
  verificarTextoOpcional(o.observaciones, v);

  const producto = /** @type {import('./tipos.js').Producto} */ (o.producto);
  const productoValido = typeof producto === 'string' && PRODUCTOS.includes(producto);
  if (!productoValido) { v.add('INV-08'); v.add('INV-20'); }

  if (o.dentroCalibre !== null && o.dentroCalibre !== undefined && typeof o.dentroCalibre !== 'boolean') v.add('INV-20');
  verificarParametro(o.brix, RANGOS_ENTRADA.brix, v);
  verificarParametro(o.temperatura, RANGOS_ENTRADA.temperatura, v);
  verificarParametro(o.peso, RANGOS_ENTRADA.peso, v);

  // allOf de RN-06: los parámetros que no aplican al producto van en null (INV-11).
  if (productoValido) {
    const criterio = CRITERIOS_APROBACION[producto];
    for (const p of /** @type {const} */ (['brix', 'dentroCalibre', 'peso'])) {
      if (criterio[p] === null && o[p] !== null && o[p] !== undefined) { v.add('INV-11'); v.add('INV-20'); }
    }
  }

  if (o.estado !== 'Aprobado' && o.estado !== 'Rechazado' && o.estado !== null) { v.add('INV-14'); v.add('INV-20'); }

  // allOf de RN-08: Rechazado ⇔ motivo no vacío (INV-15).
  if (o.motivoRechazo !== null && o.motivoRechazo !== undefined && typeof o.motivoRechazo !== 'string') v.add('INV-20');
  if (o.estado === 'Rechazado') {
    if (typeof o.motivoRechazo !== 'string' || o.motivoRechazo.trim() === '') { v.add('INV-15'); v.add('INV-20'); }
  } else if (o.motivoRechazo !== null) { v.add('INV-15'); v.add('INV-20'); }
  return v;
}

/**
 * La inspección cumple data-contract.json (se usa también al leer).
 * @param {unknown} o
 */
export function inspeccionCumpleContrato(o) {
  return erroresInspeccion(o).size === 0;
}

/**
 * El lote cumple data-contract.json (se usa también al leer).
 * @param {unknown} o
 */
export function loteCumpleContrato(o) {
  return erroresLote(o).size === 0;
}

/**
 * Invariantes que violaría escribir `nuevo` en lugar de `anterior` (design §7.4.4).
 * @param {unknown} nuevo registro que se quiere escribir
 * @param {Registro|null} anterior última versión guardada del mismo registro (null si no existe)
 * @param {{ loteEditadoId?: string|null }} [opciones] único lote cuyas observaciones puede cambiar esta escritura (DD-13)
 * @returns {string[]} IDs de invariantes violados, ordenados
 */
export function validarRegistro(nuevo, anterior, { loteEditadoId = null } = {}) {
  const v = new Set();
  if (!esObjeto(nuevo)) return ['INV-20'];
  verificarClaves(nuevo, CLAVES_REGISTRO, v);
  if (!Array.isArray(nuevo.lotes)) v.add('INV-20');

  for (const id of erroresInspeccion(nuevo.inspeccion)) v.add(id);
  const lotes = Array.isArray(nuevo.lotes) ? nuevo.lotes : [];
  for (const lote of lotes) for (const id of erroresLote(lote)) v.add(id);
  if (!esObjeto(nuevo.inspeccion)) return [...v].sort();

  const insp = /** @type {import('./tipos.js').InspeccionVehiculo} */ (nuevo.inspeccion);
  const lotesValidos = /** @type {import('./tipos.js').LoteMateriaPrima[]} */ (lotes.filter(esObjeto));

  // INV-03: fecha = parte de fecha de horaInicio.
  if (typeof insp.horaInicio === 'string' && insp.fecha !== insp.horaInicio.slice(0, 10)) v.add('INV-03');

  // INV-07: todo lote pertenece a esta inspección.
  if (lotesValidos.some((l) => l.inspeccionId !== insp.id)) v.add('INV-07');

  // INV-19: ids únicos dentro del registro.
  const ids = lotesValidos.map((l) => l.id);
  if (new Set(ids).size !== ids.length || ids.includes(insp.id)) v.add('INV-19');

  // INV-09: número de lote normalizado único dentro de la inspección (los null no cuentan).
  const numeros = lotesValidos.map((l) => valorNormalizado(l.numeroLote)).filter((n) => n !== null);
  if (new Set(numeros).size !== numeros.length) v.add('INV-09');

  for (const lote of lotesValidos) {
    // INV-10: con vehículo que no cumple, todo lote Rechazado y sin parámetros.
    if (insp.chequeoVehiculo === false) {
      const sinParametros = lote.brix === null && lote.temperatura === null && lote.dentroCalibre === null && lote.peso === null;
      if (lote.estado !== 'Rechazado' || !sinParametros) v.add('INV-10');
    }
    // INV-14: estado null solo en un lote Pendiente de valorar con chequeo Cumple.
    if (lote.estado === null && insp.chequeoVehiculo !== true) v.add('INV-14');
    // INV-13: el estado y el motivo son función de chequeo, producto y parámetros.
    if (PRODUCTOS.includes(lote.producto)) {
      const esperado = valorarLote({
        chequeoVehiculo: insp.chequeoVehiculo,
        producto: lote.producto,
        brix: lote.brix ?? null,
        temperatura: lote.temperatura ?? null,
        peso: lote.peso ?? null,
        dentroCalibre: lote.dentroCalibre ?? null,
      });
      if (esperado.estado !== lote.estado || esperado.motivoRechazo !== lote.motivoRechazo) v.add('INV-13');
    }
  }

  // INV-04: un registro finalizado es válido.
  if (insp.horaFin !== null) {
    const valido = inspeccionCompleta(insp) && lotesValidos.length > 0 && lotesValidos.every((l) => l.estado !== null);
    if (!valido) v.add('INV-04');
  }

  if (anterior) {
    const previa = anterior.inspeccion;
    // INV-05: un registro finalizado no se modifica.
    if (previa.horaFin !== null) v.add('INV-05');
    // INV-19: el id no cambia. INV-02: fecha y horaInicio no cambian.
    if (previa.id !== insp.id) v.add('INV-19');
    if (previa.fecha !== insp.fecha || previa.horaInicio !== insp.horaInicio) v.add('INV-02');
    // INV-16: solo el lote que el inspector guarda puede cambiar sus observaciones.
    for (const lotePrevio of anterior.lotes) {
      if (lotePrevio.id === loteEditadoId) continue;
      const actual = lotesValidos.find((l) => l.id === lotePrevio.id);
      if (actual && actual.observaciones !== lotePrevio.observaciones) v.add('INV-16');
    }
  }

  return [...v].sort();
}
