// @ts-check
// Transiciones puras del registro: reciben un registro y devuelven uno nuevo, sin mutar
// (REQ-INS-01, 03, 08, 09, 11, 13; REQ-REG-01, 02, 03; REQ-VAL-21, 22; INV-02, 03, 04, 10, 14, 16).
// Ninguna función lee ni escribe observaciones.

import { MENSAJES } from './mensajes.js';
import { limpiarTexto, textoMayusculas } from './normalizacion.js';
import { inspeccionCompleta } from './validacion.js';
import { valorarLote } from './valoracion.js';

/** @typedef {import('./tipos.js').InspeccionVehiculo} InspeccionVehiculo */
/** @typedef {import('./tipos.js').LoteMateriaPrima} LoteMateriaPrima */
/** @typedef {import('./tipos.js').Registro} Registro */

/**
 * Nueva inspección con los datos del sistema; los del inspector en null (REQ-INS-01, 08).
 * @param {string} id UUID v4
 * @param {{ fechaHora: string }} instante resultado de ahoraCostaRica
 * @returns {InspeccionVehiculo}
 */
export function crearInspeccion(id, instante) {
  return {
    id,
    fecha: instante.fechaHora.slice(0, 10), // fecha = parte de fecha de horaInicio (INV-03)
    horaInicio: instante.fechaHora,
    placa: null,
    productor: null,
    inspector: null,
    horaFin: null,
    chequeoVehiculo: null,
  };
}

/** Campos de texto de la inspección que edita el inspector. */
export const CAMPOS_TEXTO_INSPECCION = Object.freeze(['placa', 'productor', 'inspector']);

/**
 * Cambia un campo de texto de la inspección, normalizado. Nunca toca id, fecha,
 * horaInicio ni horaFin (INV-02). El chequeo se cambia con aplicarChequeo.
 * @param {InspeccionVehiculo} inspeccion
 * @param {'placa'|'productor'|'inspector'} campo
 * @param {string|null} valor
 * @returns {InspeccionVehiculo}
 */
export function actualizarCampo(inspeccion, campo, valor) {
  if (!CAMPOS_TEXTO_INSPECCION.includes(campo)) throw new Error(`El campo ${campo} no se edita con actualizarCampo.`);
  const normalizado = campo === 'placa' ? textoMayusculas(valor) : limpiarTexto(valor);
  return { ...inspeccion, [campo]: normalizado };
}

/**
 * Aplica un cambio del chequeo del vehículo a la inspección y a todos sus lotes (design §8.4):
 * - «No cumple»: parámetros en null, Rechazado, motivo del vehículo (REQ-INS-11, INV-10).
 * - «Cumple»: cada lote se revalora; los que no tienen parámetros quedan Pendientes de valorar
 *   (REQ-INS-13). Las observaciones no se tocan (INV-16).
 * @param {Registro} registro
 * @param {boolean} valor
 * @returns {Registro}
 */
export function aplicarChequeo(registro, valor) {
  const inspeccion = { ...registro.inspeccion, chequeoVehiculo: valor };
  const lotes = registro.lotes.map((lote) => {
    const base = valor === false ? { ...lote, brix: null, temperatura: null, dentroCalibre: null, peso: null } : { ...lote };
    const { estado, motivoRechazo } = valorarLote({
      chequeoVehiculo: valor,
      producto: base.producto,
      brix: base.brix,
      temperatura: base.temperatura,
      peso: base.peso,
      dentroCalibre: base.dentroCalibre,
    });
    return { ...base, estado, motivoRechazo };
  });
  return { inspeccion, lotes };
}

/**
 * Agrega el lote o reemplaza la versión guardada con el mismo id.
 * @param {Registro} registro
 * @param {LoteMateriaPrima} lote
 * @returns {Registro}
 */
export function agregarOReemplazarLote(registro, lote) {
  const existe = registro.lotes.some((l) => l.id === lote.id);
  const lotes = existe ? registro.lotes.map((l) => (l.id === lote.id ? lote : l)) : [...registro.lotes, lote];
  return { inspeccion: registro.inspeccion, lotes };
}

/**
 * Quita un lote guardado del registro en curso (REQ-LOT-27).
 * @param {Registro} registro
 * @param {string} loteId
 * @returns {Registro}
 */
export function quitarLote(registro, loteId) {
  return { inspeccion: registro.inspeccion, lotes: registro.lotes.filter((l) => l.id !== loteId) };
}

/**
 * Contadores del panel «Estado del registro» (REQ-REG-01).
 * @param {Registro|null} registro
 */
export function contadores(registro) {
  const lotes = registro ? registro.lotes : [];
  return {
    aprobados: lotes.filter((l) => l.estado === 'Aprobado').length,
    rechazados: lotes.filter((l) => l.estado === 'Rechazado').length,
    pendientes: lotes.filter((l) => l.estado === null).length,
  };
}

/**
 * Las tres condiciones de finalización con su cumplimiento (REQ-REG-01, 02, 03; INV-04).
 * @param {Registro|null} registro
 * @returns {{ texto: string, cumple: boolean }[]}
 */
export function condicionesFinalizacion(registro) {
  const lotes = registro ? registro.lotes : [];
  return [
    { texto: MENSAJES.condicionInspeccionCompleta, cumple: inspeccionCompleta(registro?.inspeccion) },
    { texto: MENSAJES.condicionAlMenosUnLote, cumple: lotes.length > 0 },
    { texto: MENSAJES.condicionTodosValorados, cumple: lotes.length > 0 && lotes.every((l) => l.estado !== null) },
  ];
}

/**
 * Textos de las condiciones que faltan para finalizar (vacío = se puede finalizar).
 * @param {Registro|null} registro
 * @returns {string[]}
 */
export function condicionesQueFaltan(registro) {
  return condicionesFinalizacion(registro).filter((c) => !c.cumple).map((c) => c.texto);
}

/**
 * Asigna horaFin. La fecha no cambia aunque el registro cruce la medianoche (REQ-VAL-22, INV-03).
 * @param {Registro} registro
 * @param {{ fechaHora: string }} instante resultado de ahoraCostaRica
 * @returns {Registro}
 */
export function finalizar(registro, instante) {
  return { inspeccion: { ...registro.inspeccion, horaFin: instante.fechaHora }, lotes: registro.lotes };
}
