// @ts-check
// Validaciones de entrada y condiciones de guardado del lote
// (REQ-VAL-01 a 16, 28, 29; REQ-LOT-08, 22, 23, 29; REQ-INS-14; REQ-TEC-08; INV-08, 09, 12).

import { CAMPOS_INSPECCION_COMPLETA, PATRON_UN_DECIMAL, RANGOS_ENTRADA } from './criterios.js';
import { MENSAJES } from './mensajes.js';
import { textoMayusculas, valorNormalizado } from './normalizacion.js';
import { parametrosQueAplican } from './valoracion.js';

/** @typedef {import('./tipos.js').ParametroNumerico} ParametroNumerico */
/** @typedef {import('./tipos.js').InspeccionVehiculo} InspeccionVehiculo */
/** @typedef {import('./tipos.js').Registro} Registro */
/** @typedef {import('./tipos.js').Borrador} Borrador */

/** Dígitos con un punto decimal opcional y al menos un dígito a cada lado. */
const PATRON_NUMERO = /^\d+(\.\d+)?$/;

/** Texto sin saltos de línea, como exige el patrón TextoNoVacio del contrato. */
const PATRON_UNA_LINEA = /^[^\n\r\u2028\u2029]*$/;

/**
 * Valida el TEXTO digitado de un parámetro antes de convertirlo (design §8.2).
 * El primer fallo decide el mensaje. Los extremos del rango de entrada se aceptan.
 * @param {string} texto
 * @param {ParametroNumerico} parametro
 * @returns {{ valor: number|null, error: string|null }}
 */
export function validarParametro(texto, parametro) {
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (t === '') return { valor: null, error: MENSAJES.parametroVacio(parametro) };
  if (t.includes(',')) return { valor: null, error: MENSAJES.usarPuntoDecimal };
  if (t.startsWith('-')) return { valor: null, error: MENSAJES.valorNegativo };
  if (!PATRON_NUMERO.test(t)) return { valor: null, error: MENSAJES.soloNumeros };
  if (!PATRON_UN_DECIMAL.test(t)) return { valor: null, error: MENSAJES.maximoUnDecimal };
  const valor = Number(t);
  const rango = RANGOS_ENTRADA[parametro];
  if (!(valor >= rango.min && valor <= rango.max)) {
    return { valor: null, error: MENSAJES.fueraRangoEntrada(rango.min, rango.max) };
  }
  return { valor, error: null };
}

/**
 * La inspección está completa cuando placa, productor, inspector y chequeo tienen valor (RN-01).
 * @param {InspeccionVehiculo|null|undefined} inspeccion
 */
export function inspeccionCompleta(inspeccion) {
  if (!inspeccion) return false;
  return CAMPOS_INSPECCION_COMPLETA.every((campo) => /** @type {Record<string, unknown>} */ (inspeccion)[campo] !== null);
}

/**
 * Errores por campo que impiden guardar el lote (REQ-LOT-22, 23). Objeto vacío = se puede guardar.
 * Con chequeo «No cumple» no se exigen parámetros (REQ-VAL-28).
 * @param {Borrador} borrador
 * @param {{ registro: Registro|null, loteId: string|null }} contexto
 * @returns {Record<string, string>}
 */
export function validarLoteParaGuardar(borrador, { registro, loteId }) {
  /** @type {Record<string, string>} */
  const errores = {};
  if (!registro || !inspeccionCompleta(registro.inspeccion)) errores.inspeccion = MENSAJES.inspeccionIncompleta;

  if (borrador.producto === null) errores.producto = MENSAJES.productoSinElegir;

  // Número de lote único dentro de la misma inspección, normalizado (RN-16, REQ-VAL-14 a 16).
  const normalizado = valorNormalizado(borrador.numeroLote);
  if (normalizado !== null && registro) {
    const repetido = registro.lotes.some((l) => l.id !== loteId && valorNormalizado(l.numeroLote) === normalizado);
    if (repetido) errores.numeroLote = MENSAJES.loteRepetido(/** @type {string} */ (textoMayusculas(borrador.numeroLote)));
  }

  // Los textos opcionales deben caber en una línea para cumplir el contrato (REQ-PER-05).
  for (const campo of /** @type {const} */ (['numeroLote', 'ordenCompra', 'observaciones'])) {
    if (!errores[campo] && !PATRON_UNA_LINEA.test(borrador[campo].trim())) errores[campo] = MENSAJES.textoEnUnaLinea;
  }

  const chequeo = registro ? registro.inspeccion.chequeoVehiculo : null;
  if (borrador.producto !== null && chequeo === true) {
    for (const p of parametrosQueAplican(borrador.producto)) {
      if (p === 'dentroCalibre') {
        if (borrador.dentroCalibre === null) errores.dentroCalibre = MENSAJES.calibreSinElegir;
        continue;
      }
      const { error } = validarParametro(borrador[p], p);
      if (error) errores[p] = error;
    }
  }
  return errores;
}
