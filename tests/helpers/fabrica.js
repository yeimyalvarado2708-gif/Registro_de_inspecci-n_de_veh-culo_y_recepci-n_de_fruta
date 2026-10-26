// @ts-check
// Datos de prueba válidos según el contrato, para modificarlos en cada caso.

import { valorarLote } from '../../src/domain/valoracion.js';

/** @typedef {import('../../src/domain/tipos.js').Registro} Registro */
/** @typedef {import('../../src/domain/tipos.js').LoteMateriaPrima} LoteMateriaPrima */
/** @typedef {import('../../src/domain/tipos.js').InspeccionVehiculo} InspeccionVehiculo */

let contador = 0;

/** UUID v4 determinista (n opcional) o consecutivo. @param {number} [n] */
export function uuid(n) {
  const valor = n ?? ++contador;
  const hex = valor.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

/**
 * Inspección completa en curso.
 * @param {Partial<InspeccionVehiculo>} [cambios]
 * @returns {InspeccionVehiculo}
 */
export function inspeccion(cambios = {}) {
  return {
    id: uuid(),
    fecha: '2026-10-25',
    horaInicio: '2026-10-25T16:47',
    placa: 'CL76543',
    productor: 'Gerald Garcia',
    inspector: 'Melquisedec GP',
    horaFin: null,
    chequeoVehiculo: true,
    ...cambios,
  };
}

/**
 * Lote valorado de forma coherente con el chequeo indicado.
 * @param {string} inspeccionId
 * @param {Partial<LoteMateriaPrima>} [cambios]
 * @param {boolean|null} [chequeo]
 * @returns {LoteMateriaPrima}
 */
export function lote(inspeccionId, cambios = {}, chequeo = true) {
  const base = {
    id: uuid(),
    inspeccionId,
    numeroLote: null,
    ordenCompra: null,
    producto: /** @type {const} */ ('Malanga'),
    dentroCalibre: null,
    brix: 8,
    temperatura: 26,
    peso: 1235,
    observaciones: null,
    ...cambios,
  };
  const { estado, motivoRechazo } = valorarLote({ chequeoVehiculo: chequeo, ...base });
  return { ...base, estado, motivoRechazo, ...pick(cambios, ['estado', 'motivoRechazo']) };
}

/**
 * Registro completo con lotes coherentes.
 * @param {{ inspeccion?: Partial<InspeccionVehiculo>, lotes?: Partial<LoteMateriaPrima>[] }} [datos]
 * @returns {Registro}
 */
export function registro(datos = {}) {
  const insp = inspeccion(datos.inspeccion);
  const lotes = (datos.lotes ?? [{}]).map((c) => lote(insp.id, c, insp.chequeoVehiculo));
  return { inspeccion: insp, lotes };
}

/** Copia profunda. @template T @param {T} o @returns {T} */
export function copia(o) {
  return JSON.parse(JSON.stringify(o));
}

/** @param {Record<string, unknown>} o @param {string[]} claves */
function pick(o, claves) {
  /** @type {Record<string, unknown>} */
  const r = {};
  for (const k of claves) if (k in o) r[k] = o[k];
  return r;
}
