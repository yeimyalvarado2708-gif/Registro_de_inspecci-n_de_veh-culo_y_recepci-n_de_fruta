// @ts-check
// Valoración automática del lote y motivo del rechazo
// (REQ-LOT-04, 11 a 16, 18; REQ-VAL-08, 09; REQ-UNC-03, 04, 05; INV-10, 11, 13, 14, 15, 16; DD-03, DD-04).

import { CRITERIOS_APROBACION, MOTIVO_VEHICULO_NO_CUMPLE, NOMBRES_PARAMETRO, ORDEN_PARAMETROS } from './criterios.js';

/** @typedef {import('./tipos.js').Producto} Producto */
/** @typedef {import('./tipos.js').Parametro} Parametro */
/** @typedef {import('./tipos.js').EstadoLote} EstadoLote */

/**
 * Datos que decide el estado. No incluye observaciones: la valoración no puede leerlas
 * ni tocarlas (REQ-LOT-18, INV-16).
 * @typedef {Object} EntradaValoracion
 * @property {boolean|null} chequeoVehiculo
 * @property {Producto} producto
 * @property {number|null} brix
 * @property {number|null} temperatura
 * @property {number|null} peso
 * @property {boolean|null} dentroCalibre
 */

/**
 * @typedef {{ parametro: 'brix'|'temperatura'|'peso', valor: number, min: number, max: number }
 *         | { parametro: 'dentroCalibre' }} Fallo
 */

/**
 * Parámetros cuyo criterio no es null para el producto, en el orden de DD-04.
 * @param {Producto} producto
 * @returns {Parametro[]}
 */
export function parametrosQueAplican(producto) {
  const criterio = CRITERIOS_APROBACION[producto];
  if (!criterio) return [];
  return ORDEN_PARAMETROS.filter((p) => criterio[p] !== null);
}

/**
 * Estado y motivo del rechazo de un lote (RN-05). Mismos datos → mismo resultado (INV-13).
 * @param {EntradaValoracion} e
 * @returns {{ estado: EstadoLote, motivoRechazo: string|null }}
 */
export function valorarLote(e) {
  if (e.chequeoVehiculo === false) return { estado: 'Rechazado', motivoRechazo: MOTIVO_VEHICULO_NO_CUMPLE };
  if (e.chequeoVehiculo !== true) return { estado: null, motivoRechazo: null };

  const criterio = CRITERIOS_APROBACION[e.producto];
  const aplican = parametrosQueAplican(e.producto);
  if (aplican.some((p) => e[p] === null)) return { estado: null, motivoRechazo: null }; // Pendiente de valorar

  /** @type {Fallo[]} */
  const fallos = [];
  for (const p of aplican) {
    if (p === 'dentroCalibre') {
      if (e.dentroCalibre !== true) fallos.push({ parametro: 'dentroCalibre' });
      continue;
    }
    const rango = /** @type {{min: number, max: number}} */ (criterio[p]);
    const valor = /** @type {number} */ (e[p]);
    // Extremos incluidos y sin redondear (REQ-LOT-13, REQ-VAL-08, 09).
    if (!(valor >= rango.min && valor <= rango.max)) fallos.push({ parametro: p, valor, min: rango.min, max: rango.max });
  }

  return fallos.length === 0
    ? { estado: 'Aprobado', motivoRechazo: null }
    : { estado: 'Rechazado', motivoRechazo: construirMotivoRechazo(fallos) };
}

/** Unidad que acompaña al valor en el motivo del rechazo. */
const UNIDAD_EN_MOTIVO = Object.freeze({ brix: '', temperatura: ' °C', peso: ' g' });

/**
 * «No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)» (REQ-LOT-15).
 * El calibre se escribe solo como «Fuera de calibre» (DD-04).
 * @param {Fallo[]} fallos en el orden Brix, Temperatura, Calibre, Peso
 */
export function construirMotivoRechazo(fallos) {
  const partes = fallos.map((f) => {
    if (f.parametro === 'dentroCalibre') return 'Fuera de calibre';
    // toFixed(1) solo para el texto: el valor ya tiene como máximo un decimal.
    return `${NOMBRES_PARAMETRO[f.parametro]} ${f.valor.toFixed(1)}${UNIDAD_EN_MOTIVO[f.parametro]} (rango ${f.min} a ${f.max})`;
  });
  return `No cumple: ${partes.join('; ')}`;
}
