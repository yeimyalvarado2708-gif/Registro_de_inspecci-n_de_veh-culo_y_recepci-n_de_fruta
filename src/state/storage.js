// @ts-check
// ÚNICO módulo que toca localStorage (REQ-TEC-05) y responsable final de los invariantes:
// ninguna escritura sale si viola uno (design §7.4, DD-01, DD-02, DD-05, DD-13).
//
// Claves (DD-01):
//   foas07.v1.enCurso            → Registro con horaFin = null (una sola clave: INV-01 por construcción)
//   foas07.v1.finalizado.<id>    → Registro con horaFin, se escribe una sola vez (INV-05)
//   foas07.v1.pestanaActiva      → { pestanaId, desde } señal entre pestañas (DD-02)

import { MENSAJES } from '../domain/mensajes.js';
import { ahoraCostaRica } from '../domain/tiempo.js';
import { inspeccionCumpleContrato, loteCumpleContrato, validarRegistro } from '../domain/validacionRegistro.js';

/** @typedef {import('../domain/tipos.js').Registro} Registro */
/**
 * @typedef {{ ok: true }
 *         | { ok: false, motivo: 'espacio'|'invariante'|'soloLectura'|'noDisponible', detalle: string }} ResultadoEscritura
 */
/**
 * @typedef {Object} Lectura
 * @property {Registro|null} enCurso
 * @property {Registro[]} finalizados
 * @property {string[]} avisos
 * @property {boolean} enCursoConLotesOmitidos   DD-05
 */
/**
 * @typedef {Pick<Storage, 'getItem'|'setItem'|'removeItem'|'key'|'length'>} Almacen
 */

export const PREFIJO = 'foas07.v1.';
export const CLAVE_EN_CURSO = `${PREFIJO}enCurso`;
export const PREFIJO_FINALIZADO = `${PREFIJO}finalizado.`;
export const CLAVE_PESTANA_ACTIVA = `${PREFIJO}pestanaActiva`;

/** Almacén del navegador; null si acceder a él lanza un error (REQ-PER-14). */
function almacenDelNavegador() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * ¿El error es de falta de espacio? (Chrome/Edge: QuotaExceededError o código 22; Firefox: 1014)
 * @param {unknown} error
 */
function esErrorDeEspacio(error) {
  if (!(error instanceof Error) && !(typeof DOMException !== 'undefined' && error instanceof DOMException)) return false;
  const e = /** @type {DOMException} */ (error);
  return e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014;
}

/**
 * @param {Almacen|null} [almacen] por defecto, el almacenamiento local del navegador
 * @param {{ pestanaId?: string, eventos?: EventTarget|null, reloj?: () => Date }} [opciones]
 */
export function crearStorage(almacen = almacenDelNavegador(), opciones = {}) {
  const pestanaId = opciones.pestanaId ?? globalThis.crypto.randomUUID();
  const eventos = opciones.eventos === undefined ? /** @type {EventTarget|null} */ (globalThis.addEventListener ? globalThis : null) : opciones.eventos;
  const reloj = opciones.reloj ?? (() => new Date());
  let bloqueado = false;

  /** @param {string} detalle @returns {ResultadoEscritura} */
  const rechazo = (detalle) => ({ ok: false, motivo: 'invariante', detalle });

  /** @returns {ResultadoEscritura|null} motivo para no escribir, o null si se puede */
  function impedimento() {
    if (!almacen) return { ok: false, motivo: 'noDisponible', detalle: MENSAJES.almacenamientoNoDisponible };
    if (bloqueado) return { ok: false, motivo: 'soloLectura', detalle: MENSAJES.escrituraSoloLectura };
    return null;
  }

  /**
   * Lee y parsea una clave; null si no existe o no se puede interpretar.
   * @param {string} clave
   * @returns {Registro|null}
   */
  function leerClave(clave) {
    try {
      const texto = /** @type {Almacen} */ (almacen).getItem(clave);
      return texto === null ? null : JSON.parse(texto);
    } catch {
      return null;
    }
  }

  /**
   * setItem con detección de falta de espacio (REQ-PER-12).
   * @param {string} clave
   * @param {Registro} registro
   * @returns {ResultadoEscritura}
   */
  function escribir(clave, registro) {
    try {
      /** @type {Almacen} */ (almacen).setItem(clave, JSON.stringify(registro));
      return { ok: true };
    } catch (error) {
      if (esErrorDeEspacio(error)) return { ok: false, motivo: 'espacio', detalle: MENSAJES.sinEspacio };
      return { ok: false, motivo: 'noDisponible', detalle: MENSAJES.almacenamientoNoDisponible };
    }
  }

  /** Prueba de escritura y borrado (REQ-PER-14, P-04). */
  function disponible() {
    if (!almacen) return false;
    const prueba = `${PREFIJO}prueba`;
    try {
      almacen.setItem(prueba, '1');
      almacen.removeItem(prueba);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lee todos los registros válidos y omite con aviso los dañados (design §7.4.3, CT-12).
   * @returns {Lectura}
   */
  function leerRegistros() {
    /** @type {Lectura} */
    const lectura = { enCurso: null, finalizados: [], avisos: [], enCursoConLotesOmitidos: false };
    if (!almacen) return lectura;

    /** @type {string[]} */
    const claves = [];
    try {
      for (let i = 0; i < almacen.length; i++) {
        const clave = almacen.key(i);
        if (clave !== null && clave.startsWith(PREFIJO)) claves.push(clave);
      }
    } catch {
      return lectura;
    }

    for (const clave of claves) {
      const esEnCurso = clave === CLAVE_EN_CURSO;
      const esFinalizado = clave.startsWith(PREFIJO_FINALIZADO);
      if (!esEnCurso && !esFinalizado) continue;

      const crudo = /** @type {unknown} */ (leerClave(clave));
      const raiz = /** @type {Record<string, unknown>|null} */ (typeof crudo === 'object' && crudo !== null && !Array.isArray(crudo) ? crudo : null);
      if (!raiz || !Array.isArray(raiz.lotes) || !inspeccionCumpleContrato(raiz.inspeccion)) {
        lectura.avisos.push(MENSAJES.registroDanado);
        continue;
      }
      const inspeccion = /** @type {import('../domain/tipos.js').InspeccionVehiculo} */ (raiz.inspeccion);
      const coincideClave = esEnCurso ? inspeccion.horaFin === null : inspeccion.horaFin !== null && clave === PREFIJO_FINALIZADO + inspeccion.id;
      if (!coincideClave) {
        lectura.avisos.push(MENSAJES.registroDanado);
        continue;
      }

      // Lotes que no cumplen el contrato o no pertenecen a la inspección (REQ-PER-11).
      const lotes = /** @type {import('../domain/tipos.js').LoteMateriaPrima[]} */ (
        raiz.lotes.filter((l) => loteCumpleContrato(l) && /** @type {any} */ (l).inspeccionId === inspeccion.id)
      );
      if (lotes.length !== raiz.lotes.length) {
        lectura.avisos.push(MENSAJES.loteInconsistente);
        if (esEnCurso) lectura.enCursoConLotesOmitidos = true;
      }

      const registro = { inspeccion, lotes };
      if (esEnCurso) lectura.enCurso = registro;
      else lectura.finalizados.push(registro);
    }

    // Finalización interrumpida entre dos escrituras: prevalece el finalizado (design §7.4.3).
    const enCurso = lectura.enCurso;
    if (enCurso && lectura.finalizados.some((r) => r.inspeccion.id === enCurso.inspeccion.id)) {
      lectura.enCurso = null;
      lectura.enCursoConLotesOmitidos = false;
      if (!bloqueado) {
        try {
          almacen.removeItem(CLAVE_EN_CURSO);
        } catch {
          // Si no se puede borrar, se ignora: la próxima lectura lo vuelve a resolver.
        }
      }
    }
    return lectura;
  }

  /**
   * Guarda el registro en curso (design §7.4.4).
   * @param {Registro} registro
   * @param {{ loteEditadoId?: string|null }} [opciones] lote cuyas observaciones puede cambiar esta escritura (INV-16)
   * @returns {ResultadoEscritura}
   */
  function guardarRegistroEnCurso(registro, { loteEditadoId = null } = {}) {
    const impide = impedimento();
    if (impide) return impide;
    if (!inspeccionCumpleContrato(registro?.inspeccion)) return rechazo(MENSAJES.escrituraInvalida(validarRegistro(registro, null)));
    if (registro.inspeccion.horaFin !== null) return rechazo(MENSAJES.escrituraInvalida(['INV-05']));

    const anterior = leerClave(CLAVE_EN_CURSO);
    const anteriorValido = anterior && inspeccionCumpleContrato(anterior.inspeccion) ? anterior : null;
    // INV-01, REQ-VAL-27: no se reemplaza un registro en curso por otro distinto.
    if (anteriorValido && anteriorValido.inspeccion.id !== registro.inspeccion.id) {
      return rechazo(MENSAJES.escrituraInvalida(['INV-01']));
    }
    // INV-05: un registro finalizado no vuelve a estar en curso.
    if (leerClave(PREFIJO_FINALIZADO + registro.inspeccion.id) !== null) {
      return rechazo(MENSAJES.escrituraInvalida(['INV-05']));
    }
    const violaciones = validarRegistro(registro, anteriorValido, { loteEditadoId });
    if (violaciones.length > 0) return rechazo(MENSAJES.escrituraInvalida(violaciones));
    return escribir(CLAVE_EN_CURSO, registro);
  }

  /**
   * Escribe el registro finalizado y después elimina el en curso (REQ-PER-09).
   * @param {Registro} registro
   * @returns {ResultadoEscritura}
   */
  function guardarRegistroFinalizado(registro) {
    const impide = impedimento();
    if (impide) return impide;
    if (!inspeccionCumpleContrato(registro?.inspeccion)) return rechazo(MENSAJES.escrituraInvalida(validarRegistro(registro, null)));
    if (registro.inspeccion.horaFin === null) return rechazo(MENSAJES.escrituraInvalida(['INV-04']));

    const clave = PREFIJO_FINALIZADO + registro.inspeccion.id;
    if (leerClave(clave) !== null) return rechazo(MENSAJES.escrituraInvalida(['INV-05']));
    const enCurso = leerClave(CLAVE_EN_CURSO);
    if (!enCurso || enCurso.inspeccion?.id !== registro.inspeccion.id) {
      return rechazo(MENSAJES.escrituraInvalida(['INV-05']));
    }
    const violaciones = validarRegistro(registro, enCurso);
    if (violaciones.length > 0) return rechazo(MENSAJES.escrituraInvalida(violaciones));

    const resultado = escribir(clave, registro);
    if (!resultado.ok) return resultado;
    try {
      /** @type {Almacen} */ (almacen).removeItem(CLAVE_EN_CURSO);
    } catch {
      // La próxima lectura resuelve la finalización interrumpida.
    }
    return { ok: true };
  }

  /**
   * Cancelar registro: elimina la única clave que contiene la inspección y sus lotes (INV-06).
   * Nunca elimina un finalizado (INV-05).
   * @param {string} id
   * @returns {ResultadoEscritura}
   */
  function eliminarRegistroEnCurso(id) {
    const impide = impedimento();
    if (impide) return impide;
    const texto = /** @type {Almacen} */ (almacen).getItem(CLAVE_EN_CURSO);
    let enCursoId = null;
    let horaFin = null;
    try {
      const enCurso = texto === null ? null : JSON.parse(texto);
      enCursoId = enCurso?.inspeccion?.id ?? null;
      horaFin = enCurso?.inspeccion?.horaFin ?? null;
    } catch {
      // Clave dañada: no se puede confirmar que sea este registro.
    }
    if (enCursoId !== id || horaFin !== null) return rechazo(MENSAJES.escrituraInvalida(['INV-05', 'INV-06']));
    try {
      /** @type {Almacen} */ (almacen).removeItem(CLAVE_EN_CURSO);
      return { ok: true };
    } catch {
      return { ok: false, motivo: 'noDisponible', detalle: MENSAJES.almacenamientoNoDisponible };
    }
  }

  /** Marca esta pestaña como la activa (DD-02). Solo desde iniciar() y «Continuar en esta pestaña». */
  function reclamarPestanaActiva() {
    if (!almacen) return;
    try {
      almacen.setItem(CLAVE_PESTANA_ACTIVA, JSON.stringify({ pestanaId, desde: ahoraCostaRica(reloj()).fechaHora }));
    } catch {
      // Sin espacio para la marca: la pestaña sigue funcionando.
    }
  }

  /** ¿La marca de pestaña activa es de otra pestaña? */
  function otraPestanaEsActiva() {
    const marca = /** @type {{ pestanaId?: string }|null} */ (/** @type {unknown} */ (leerClave(CLAVE_PESTANA_ACTIVA)));
    return marca !== null && marca.pestanaId !== pestanaId;
  }

  /** REQ-PER-15: el bloqueo vive aquí, no solo en la interfaz. */
  function bloquearEscrituras() {
    bloqueado = true;
  }

  /** REQ-VAL-32. */
  function desbloquearEscrituras() {
    bloqueado = false;
  }

  function estaBloqueado() {
    return bloqueado;
  }

  /**
   * Avisa cuando otra pestaña cambia una clave foas07.v1.* y bloquea si esta ya no es la activa.
   * El evento solo llega a las OTRAS pestañas, así que quien escribe no se bloquea a sí misma.
   * @param {() => void} fn
   * @returns {() => void} función para dejar de escuchar
   */
  function alCambiarEnOtraPestana(fn) {
    if (!eventos) return () => {};
    /** @param {Event} evento */
    const manejador = (evento) => {
      const clave = /** @type {StorageEvent} */ (evento).key;
      if (clave !== null && !clave.startsWith(PREFIJO)) return;
      if (!otraPestanaEsActiva()) return;
      bloquearEscrituras();
      fn();
    };
    eventos.addEventListener('storage', manejador);
    return () => eventos.removeEventListener('storage', manejador);
  }

  return {
    disponible,
    leerRegistros,
    guardarRegistroEnCurso,
    guardarRegistroFinalizado,
    eliminarRegistroEnCurso,
    reclamarPestanaActiva,
    bloquearEscrituras,
    desbloquearEscrituras,
    estaBloqueado,
    alCambiarEnOtraPestana,
  };
}

/** @typedef {ReturnType<typeof crearStorage>} ApiStorage */
