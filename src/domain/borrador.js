// @ts-check
// Lógica del formulario del lote, sin DOM (REQ-LOT-02, 03, 06, 09, 10, 19, 21, 30, 31, 35;
// REQ-PER-07; INV-11, INV-17; DD-12). El borrador nunca se persiste (REQ-PER-03).

import { limpiarTexto, textoMayusculas } from './normalizacion.js';
import { validarParametro } from './validacion.js';
import { parametrosQueAplican, valorarLote } from './valoracion.js';

/** @typedef {import('./tipos.js').Borrador} Borrador */
/** @typedef {import('./tipos.js').Producto} Producto */
/** @typedef {import('./tipos.js').EstadoLote} EstadoLote */
/** @typedef {import('./tipos.js').LoteMateriaPrima} LoteMateriaPrima */
/** @typedef {'Sin producto'|'Faltan parámetros'|'Pendiente de valorar'|'Aprobado'|'Rechazado'} EstadoVisible */

const PARAMETROS_NUMERICOS = /** @type {const} */ (['brix', 'temperatura', 'peso']);

/** @returns {Borrador} */
export function borradorVacio() {
  return {
    producto: null,
    numeroLote: '',
    ordenCompra: '',
    observaciones: '',
    brix: '',
    temperatura: '',
    peso: '',
    dentroCalibre: null,
  };
}

/** @param {number|null} n */
const numeroATexto = (n) => (n === null ? '' : n.toFixed(1));

/**
 * Borrador con la última versión guardada del lote (REQ-LOT-26).
 * @param {LoteMateriaPrima} lote
 * @returns {Borrador}
 */
export function borradorDesdeLote(lote) {
  return {
    producto: lote.producto,
    numeroLote: lote.numeroLote ?? '',
    ordenCompra: lote.ordenCompra ?? '',
    observaciones: lote.observaciones ?? '',
    brix: numeroATexto(lote.brix),
    temperatura: numeroATexto(lote.temperatura),
    peso: numeroATexto(lote.peso),
    dentroCalibre: lote.dentroCalibre,
  };
}

/**
 * Cambia el producto: vacía los parámetros que no aplican y conserva los que sí (REQ-LOT-10, CT-01).
 * @param {Borrador} b
 * @param {Producto} producto
 * @returns {Borrador}
 */
export function cambiarProducto(b, producto) {
  const aplican = parametrosQueAplican(producto);
  return {
    ...b,
    producto,
    brix: aplican.includes('brix') ? b.brix : '',
    temperatura: aplican.includes('temperatura') ? b.temperatura : '',
    peso: aplican.includes('peso') ? b.peso : '',
    dentroCalibre: aplican.includes('dentroCalibre') ? b.dentroCalibre : null,
  };
}

/**
 * Valores de los parámetros listos para guardar: los que no aplican o con chequeo
 * «No cumple» quedan en null (REQ-PER-07, REQ-VAL-28, INV-10, INV-11).
 * @param {Borrador} b
 * @param {boolean|null} chequeo
 */
function parametrosDelBorrador(b, chequeo) {
  const aplican = b.producto === null || chequeo === false ? [] : parametrosQueAplican(b.producto);
  /** @param {'brix'|'temperatura'|'peso'} p */
  const numero = (p) => (aplican.includes(p) ? validarParametro(b[p], p).valor : null);
  return {
    brix: numero('brix'),
    temperatura: numero('temperatura'),
    peso: numero('peso'),
    dentroCalibre: aplican.includes('dentroCalibre') ? b.dentroCalibre : null,
  };
}

/**
 * Construye el lote a guardar y lo valora. Se llama solo después de validarLoteParaGuardar.
 * @param {Borrador} b
 * @param {{ id: string, inspeccionId: string, chequeo: boolean|null }} datos
 * @returns {LoteMateriaPrima}
 */
export function loteDesdeBorrador(b, { id, inspeccionId, chequeo }) {
  if (b.producto === null) throw new Error('El lote necesita un producto.');
  const parametros = parametrosDelBorrador(b, chequeo);
  const { estado, motivoRechazo } = valorarLote({ chequeoVehiculo: chequeo, producto: b.producto, ...parametros });
  return {
    id,
    inspeccionId,
    numeroLote: textoMayusculas(b.numeroLote),
    ordenCompra: limpiarTexto(b.ordenCompra),
    producto: b.producto,
    dentroCalibre: parametros.dentroCalibre,
    brix: parametros.brix,
    temperatura: parametros.temperatura,
    peso: parametros.peso,
    estado,
    observaciones: limpiarTexto(b.observaciones),
    motivoRechazo,
  };
}

/**
 * ¿Falta algún parámetro aplicable o alguno es inválido?
 * @param {Borrador} b
 */
function faltanParametros(b) {
  if (b.producto === null) return true;
  return parametrosQueAplican(b.producto).some((p) =>
    p === 'dentroCalibre' ? b.dentroCalibre === null : validarParametro(b[p], p).error !== null
  );
}

/**
 * ¿El borrador cambió algún parámetro respecto a la versión guardada?
 * @param {Borrador} b
 * @param {LoteMateriaPrima} original
 */
function cambioParametros(b, original) {
  const ref = borradorDesdeLote(original);
  return b.dentroCalibre !== ref.dentroCalibre || PARAMETROS_NUMERICOS.some((p) => b[p].trim() !== ref[p].trim());
}

/**
 * Texto del encabezado del formulario (REQ-LOT-21, design §8.5).
 * @param {Borrador} b
 * @param {boolean|null} chequeo
 * @param {LoteMateriaPrima|null} original
 * @returns {EstadoVisible}
 */
export function estadoVisible(b, chequeo, original) {
  if (b.producto === null) return 'Sin producto';
  if (chequeo === false) return 'Rechazado';
  if (faltanParametros(b)) {
    if (original && original.estado === null && !cambioParametros(b, original)) return 'Pendiente de valorar';
    return 'Faltan parámetros';
  }
  const { estado } = valorarLote({ chequeoVehiculo: chequeo, producto: b.producto, ...parametrosDelBorrador(b, chequeo) });
  return estado === null ? 'Faltan parámetros' : estado;
}

/**
 * Motivo del rechazo que se mostraría si el borrador se guardara ahora (REQ-LOT-16, 17).
 * @param {Borrador} b
 * @param {boolean|null} chequeo
 * @returns {string|null}
 */
export function motivoVisible(b, chequeo) {
  if (b.producto === null) return null;
  if (chequeo !== false && faltanParametros(b)) return null;
  return valorarLote({ chequeoVehiculo: chequeo, producto: b.producto, ...parametrosDelBorrador(b, chequeo) }).motivoRechazo;
}

/**
 * Cambios sin guardar: el borrador difiere de su referencia (design §8.6, CT-06).
 * @param {Borrador} b
 * @param {LoteMateriaPrima|null} original
 */
export function tieneCambiosSinGuardar(b, original) {
  const ref = original ? borradorDesdeLote(original) : borradorVacio();
  if (b.producto !== ref.producto || b.dentroCalibre !== ref.dentroCalibre) return true;
  const textos = /** @type {const} */ (['numeroLote', 'ordenCompra', 'observaciones', 'brix', 'temperatura', 'peso']);
  return textos.some((campo) => limpiarTexto(b[campo]) !== limpiarTexto(ref[campo]));
}

/**
 * Aviso de REQ-LOT-19: el estado pasó de Rechazado a Aprobado y hay observaciones.
 * @param {EstadoLote} estadoAnterior   último Aprobado / Rechazado calculado (DD-12)
 * @param {EstadoVisible|EstadoLote} estadoNuevo
 * @param {string|null} observaciones
 */
export function requiereAvisoObservaciones(estadoAnterior, estadoNuevo, observaciones) {
  return estadoAnterior === 'Rechazado' && estadoNuevo === 'Aprobado' && limpiarTexto(observaciones) !== null;
}

/**
 * Nuevo «último estado calculado»: solo Aprobado o Rechazado lo reemplazan;
 * «Sin producto», «Faltan parámetros» y «Pendiente de valorar» no lo modifican (DD-12).
 * @param {EstadoLote} anterior
 * @param {EstadoVisible} visible
 * @returns {EstadoLote}
 */
export function siguienteEstadoCalculado(anterior, visible) {
  return visible === 'Aprobado' || visible === 'Rechazado' ? visible : anterior;
}
