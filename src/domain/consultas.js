// @ts-check
// Consultas de registros finalizados (REQ-CON-03, 05, 07, 08, 11; REQ-VAL-19; DD-06).

import { valorNormalizado } from './normalizacion.js';

/** @typedef {import('./tipos.js').Registro} Registro */
/** @typedef {import('./tipos.js').LoteMateriaPrima} LoteMateriaPrima */

/** Cantidad de inspecciones que se muestran antes de buscar (REQ-CON-11 [Propuesto]). */
export const CANTIDAD_ULTIMAS_INSPECCIONES = 10;

/**
 * Solo registros finalizados, del más reciente al más antiguo (REQ-CON-07).
 * @param {Registro[]} registros
 */
function finalizadosRecientesPrimero(registros) {
  return registros
    .filter((r) => r.inspeccion.horaFin !== null)
    .sort((a, b) => (a.inspeccion.horaInicio < b.inspeccion.horaInicio ? 1 : a.inspeccion.horaInicio > b.inspeccion.horaInicio ? -1 : 0));
}

/**
 * Últimas inspecciones finalizadas, de la más reciente a la más antigua (REQ-CON-07, 11).
 * @param {Registro[]} registros
 * @param {number} [cantidad]
 * @returns {Registro[]}
 */
export function ultimasInspecciones(registros, cantidad = CANTIDAD_ULTIMAS_INSPECCIONES) {
  return finalizadosRecientesPrimero(registros).slice(0, cantidad);
}

/**
 * Registros finalizados cuya placa normalizada coincide con el texto normalizado (REQ-CON-03).
 * @param {Registro[]} registros
 * @param {string} texto
 * @returns {Registro[]}
 */
export function buscarPorPlaca(registros, texto) {
  const buscado = valorNormalizado(texto);
  if (buscado === null) return [];
  return finalizadosRecientesPrimero(registros).filter((r) => valorNormalizado(r.inspeccion.placa) === buscado);
}

/**
 * Lotes de registros finalizados con ese número de lote normalizado, cada uno con su registro.
 * Los lotes sin número no aparecen (REQ-CON-05, 08; DD-06).
 * @param {Registro[]} registros
 * @param {string} texto
 * @returns {{ registro: Registro, lote: LoteMateriaPrima }[]}
 */
export function buscarPorNumeroLote(registros, texto) {
  const buscado = valorNormalizado(texto);
  if (buscado === null) return [];
  /** @type {{ registro: Registro, lote: LoteMateriaPrima }[]} */
  const resultado = [];
  for (const registro of finalizadosRecientesPrimero(registros)) {
    for (const lote of registro.lotes) {
      if (lote.numeroLote !== null && valorNormalizado(lote.numeroLote) === buscado) resultado.push({ registro, lote });
    }
  }
  return resultado;
}

/**
 * Total de lotes con su desglose (REQ-CON-03).
 * @param {LoteMateriaPrima[]} lotes
 */
export function resumenLotes(lotes) {
  return {
    total: lotes.length,
    aprobados: lotes.filter((l) => l.estado === 'Aprobado').length,
    rechazados: lotes.filter((l) => l.estado === 'Rechazado').length,
  };
}
