// @ts-check
// Estado global en memoria, acciones y suscripción (design §7.2, §7.3). Sin DOM.
// Escritura pesimista: un cambio se confirma en memoria solo después de que storage
// informa { ok: true } (REQ-PER-12).

import { INSPECTORES } from '../config/inspectores.js';
import {
  borradorDesdeLote, borradorVacio, cambiarProducto, estadoVisible, loteDesdeBorrador, motivoVisible,
  requiereAvisoObservaciones, siguienteEstadoCalculado, tieneCambiosSinGuardar,
} from '../domain/borrador.js';
import { buscarPorNumeroLote, buscarPorPlaca } from '../domain/consultas.js';
import { depurarInspectores } from '../domain/inspectores.js';
import { MENSAJES } from '../domain/mensajes.js';
import { limpiarTexto } from '../domain/normalizacion.js';
import {
  actualizarCampo, agregarOReemplazarLote, aplicarChequeo, condicionesFinalizacion, condicionesQueFaltan,
  contadores, crearInspeccion, finalizar, quitarLote as quitarLoteDelRegistro,
} from '../domain/registro.js';
import { ahoraCostaRica, esAnterior, formatoHora } from '../domain/tiempo.js';
import { inspeccionCompleta, validarLoteParaGuardar, validarParametro } from '../domain/validacion.js';
import { crearStorage } from './storage.js';

/** @typedef {import('../domain/tipos.js').Registro} Registro */
/** @typedef {import('../domain/tipos.js').LoteMateriaPrima} LoteMateriaPrima */
/** @typedef {import('../domain/tipos.js').FormularioLote} FormularioLote */
/** @typedef {import('../domain/tipos.js').Borrador} Borrador */
/** @typedef {import('./storage.js').ApiStorage} ApiStorage */
/** @typedef {import('./storage.js').ResultadoEscritura} ResultadoEscritura */
/** @typedef {'registro'|'consultas'|'criterios'} Pantalla */

/**
 * @typedef {{ tipo: 'registro', registro: Registro }
 *         | { tipo: 'lote', registro: Registro, lote: LoteMateriaPrima }
 *         | { tipo: 'noEncontrado' }} SeleccionConsulta
 */

/**
 * @typedef {Object} EstadoConsulta
 * @property {'placa'|'lote'} modo
 * @property {string} texto                     contenido actual del campo de búsqueda
 * @property {string|null} textoBuscado          texto de la última búsqueda ejecutada
 * @property {Registro[]|{registro: Registro, lote: LoteMateriaPrima}[]|null} resultados
 * @property {SeleccionConsulta|null} seleccion
 */

/**
 * @typedef {Object} EstadoApp
 * @property {Pantalla} pantalla
 * @property {boolean} almacenamientoDisponible   REQ-PER-14
 * @property {boolean} soloLectura                REQ-VAL-26, REQ-PER-15, DD-05
 * @property {'otraPestana'|'loteDanado'|null} motivoSoloLectura
 * @property {Registro|null} registroEnCurso      espejo de lo guardado
 * @property {Registro[]} registrosFinalizados    caché para Consultas y productores sugeridos
 * @property {FormularioLote|null} formularioLote un solo formulario abierto a la vez
 * @property {string|null} ultimoLoteGuardado     texto «Lote guardado como …» (WF-04)
 * @property {string|null} ultimoGuardado         HH:mm del último guardado exitoso (REQ-INS-16, Q-02)
 * @property {string|null} errorGuardado          error de la última escritura (role="alert")
 * @property {EstadoConsulta} consulta
 * @property {string[]} avisos                    datos dañados, solo lectura, reloj, etc.
 * @property {string} ahora                       YYYY-MM-DDTHH:mm de Costa Rica
 */

/**
 * @param {{ storage?: ApiStorage, reloj?: () => Date, generarId?: () => string, inspectores?: readonly unknown[] }} [dependencias]
 */
export function crearStore({
  storage = crearStorage(),
  reloj = () => new Date(),
  generarId = () => globalThis.crypto.randomUUID(),
  inspectores = INSPECTORES,
} = {}) {
  const listaInspectores = depurarInspectores(inspectores);

  /** @type {EstadoApp} */
  let estado = {
    pantalla: 'registro',
    almacenamientoDisponible: true,
    soloLectura: false,
    motivoSoloLectura: null,
    registroEnCurso: null,
    registrosFinalizados: [],
    formularioLote: null,
    ultimoLoteGuardado: null,
    ultimoGuardado: null,
    errorGuardado: null,
    consulta: { modo: 'placa', texto: '', textoBuscado: null, resultados: null, seleccion: null },
    avisos: [],
    ahora: ahoraCostaRica(reloj()).fechaHora,
  };

  /** @type {Set<(estado: EstadoApp) => void>} */
  const suscriptores = new Set();

  function obtenerEstado() {
    return estado;
  }

  /** @param {(estado: EstadoApp) => void} fn */
  function suscribir(fn) {
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }

  /** @param {Partial<EstadoApp>} cambios */
  function actualizar(cambios) {
    estado = { ...estado, ...cambios };
    notificar();
  }

  function notificar() {
    for (const fn of suscriptores) fn(estado);
  }

  /** @param {string} aviso */
  const conAviso = (aviso) => (estado.avisos.includes(aviso) ? estado.avisos : [...estado.avisos, aviso]);

  /** ¿Se pueden editar el registro y sus lotes desde esta pestaña? */
  function puedeEditar() {
    return estado.almacenamientoDisponible && !estado.soloLectura;
  }

  /** HH:mm de ahora en Costa Rica, para «Guardado en este equipo · HH:mm». */
  const horaActual = () => formatoHora(ahoraCostaRica(reloj()).fechaHora);

  /**
   * Publica el error de una escritura fallida; memoria y formulario quedan sin cambios (REQ-PER-12).
   * @param {ResultadoEscritura} resultado
   */
  function publicarError(resultado) {
    if (resultado.ok) return;
    actualizar({ errorGuardado: resultado.detalle });
  }

  /**
   * Persiste el registro en curso y, solo si se guardó, lo confirma en memoria.
   * @param {Registro} nuevo
   * @param {string|null} loteEditadoId
   * @param {Partial<EstadoApp>} [ademas] otros cambios a confirmar junto con el registro
   */
  function persistirEnCurso(nuevo, loteEditadoId, ademas = {}) {
    const resultado = storage.guardarRegistroEnCurso(nuevo, { loteEditadoId });
    if (!resultado.ok) {
      publicarError(resultado);
      return false;
    }
    actualizar({ registroEnCurso: nuevo, ultimoGuardado: horaActual(), errorGuardado: null, ...ademas });
    return true;
  }

  // ------------------------------------------------------------------ arranque

  /** Arranque: disponibilidad, pestaña activa, lectura y retomar el registro (REQ-REG-09). */
  function iniciar() {
    if (!storage.disponible()) {
      actualizar({ almacenamientoDisponible: false, avisos: conAviso(MENSAJES.almacenamientoNoDisponible) });
      return;
    }
    storage.reclamarPestanaActiva();
    const lectura = storage.leerRegistros();
    let avisos = estado.avisos;
    for (const aviso of lectura.avisos) if (!avisos.includes(aviso)) avisos = [...avisos, aviso];
    const cambios = {
      almacenamientoDisponible: true,
      registroEnCurso: lectura.enCurso,
      registrosFinalizados: lectura.finalizados,
      avisos,
    };
    if (lectura.enCursoConLotesOmitidos) {
      // DD-05: solo lectura y «Cancelar registro» como única acción.
      Object.assign(cambios, { soloLectura: true, motivoSoloLectura: 'loteDanado', avisos: [...avisos.filter((a) => a !== MENSAJES.loteDanadoEnCurso), MENSAJES.loteDanadoEnCurso] });
    }
    actualizar(cambios);
  }

  /** Tic del reloj: actualiza `ahora` cuando cambia el minuto (REQ-REG-01 «Transcurrido»). */
  function tic() {
    const ahora = ahoraCostaRica(reloj()).fechaHora;
    if (ahora !== estado.ahora) actualizar({ ahora });
  }

  // ------------------------------------------------------------------ inspección

  /**
   * Registro en curso existente o uno nuevo. Antes de crear vuelve a leer lo guardado,
   * por si otra pestaña ya creó uno (REQ-VAL-27).
   * @returns {Registro}
   */
  function registroParaEditar() {
    if (estado.registroEnCurso) return estado.registroEnCurso;
    const releido = storage.leerRegistros().enCurso;
    if (releido) return releido;
    return { inspeccion: crearInspeccion(generarId(), ahoraCostaRica(reloj())), lotes: [] };
  }

  /**
   * Cambia placa, productor o inspector y lo guarda de inmediato (REQ-INS-01, 03, 04, 15; REQ-PER-02).
   * @param {'placa'|'productor'|'inspector'} campo
   * @param {string} valor
   */
  function actualizarCampoInspeccion(campo, valor) {
    if (!puedeEditar()) return false;
    // Sin registro y sin dato real no hay «primer dato» que guardar.
    if (!estado.registroEnCurso && limpiarTexto(valor) === null) return false;
    const registro = registroParaEditar();
    const inspeccion = actualizarCampo(registro.inspeccion, campo, valor);
    if (estado.registroEnCurso && inspeccion[campo] === registro.inspeccion[campo]) return true;
    return persistirEnCurso({ inspeccion, lotes: registro.lotes }, null);
  }

  /**
   * Cambia el chequeo del vehículo y guarda todos los lotes afectados en una escritura
   * (REQ-INS-09, 11, 13; REQ-PER-04). La confirmación la pide la interfaz (REQ-INS-10).
   * @param {boolean} valor
   */
  function cambiarChequeo(valor) {
    if (!puedeEditar()) return false;
    const registro = registroParaEditar();
    const anterior = registro.inspeccion.chequeoVehiculo;
    if (estado.registroEnCurso && anterior === valor) return true;
    const nuevo = aplicarChequeo(registro, valor);

    /** @type {FormularioLote|null} */
    let formulario = estado.formularioLote;
    if (formulario) {
      // REQ-LOT-33: el original pasa a ser la nueva versión guardada.
      const original = formulario.loteId ? nuevo.lotes.find((l) => l.id === formulario?.loteId) ?? null : null;
      // DD-08: con «No cumple» el borrador pierde el texto de sus parámetros.
      const borrador = valor === false ? { ...formulario.borrador, brix: '', temperatura: '', peso: '', dentroCalibre: null } : formulario.borrador;
      // DD-12: al pasar a «Cumple» el lote viene de Pendiente de valorar: su primera valoración no avisa.
      const ultimo = valor === true && anterior === false ? null : formulario.ultimoEstadoCalculado;
      formulario = recalcularFormulario({ ...formulario, original, borrador, ultimoEstadoCalculado: ultimo, errores: {} }, valor);
    }
    return persistirEnCurso(nuevo, null, { formularioLote: formulario });
  }

  // ------------------------------------------------------------------ lotes

  /**
   * Estado visible, último estado calculado y aviso de observaciones (REQ-LOT-16, 19, 21; DD-12).
   * @param {FormularioLote} formulario
   * @param {boolean|null} chequeo
   * @returns {FormularioLote}
   */
  function recalcularFormulario(formulario, chequeo) {
    const visible = estadoVisible(formulario.borrador, chequeo, formulario.original);
    const anterior = formulario.ultimoEstadoCalculado;
    let aviso = formulario.avisoObservaciones;
    if (requiereAvisoObservaciones(anterior, visible, formulario.borrador.observaciones)) aviso = MENSAJES.revisarObservaciones;
    else if (visible !== 'Aprobado' || limpiarTexto(formulario.borrador.observaciones) === null) aviso = null;
    return { ...formulario, avisoObservaciones: aviso, ultimoEstadoCalculado: siguienteEstadoCalculado(anterior, visible) };
  }

  /** «+ Lote»: abre un borrador vacío (REQ-LOT-02). La confirmación con cambios la pide la interfaz. */
  function abrirLoteNuevo() {
    if (!puedeEditar() || !inspeccionCompleta(estado.registroEnCurso?.inspeccion)) return false;
    actualizar({
      formularioLote: {
        modo: 'nuevo', loteId: null, borrador: borradorVacio(), original: null,
        errores: {}, avisoObservaciones: null, ultimoEstadoCalculado: null,
      },
      ultimoLoteGuardado: null,
      errorGuardado: null,
    });
    return true;
  }

  /**
   * «Editar»: abre el formulario con la última versión guardada (REQ-LOT-26).
   * @param {string} loteId
   */
  function editarLote(loteId) {
    if (!puedeEditar() || !inspeccionCompleta(estado.registroEnCurso?.inspeccion)) return false;
    const lote = estado.registroEnCurso?.lotes.find((l) => l.id === loteId);
    if (!lote) return false;
    actualizar({
      formularioLote: {
        modo: 'edicion', loteId, borrador: borradorDesdeLote(lote), original: lote,
        errores: {}, avisoObservaciones: null, ultimoEstadoCalculado: lote.estado,
      },
      ultimoLoteGuardado: null,
      errorGuardado: null,
    });
    return true;
  }

  /**
   * Cambia un campo del borrador; no persiste nada (REQ-PER-03).
   * @template {keyof Borrador} K
   * @param {K} campo
   * @param {Borrador[K]} valor
   */
  function actualizarBorrador(campo, valor) {
    const formulario = estado.formularioLote;
    if (!formulario || !puedeEditar()) return;
    const borrador =
      campo === 'producto'
        ? cambiarProducto(formulario.borrador, /** @type {import('../domain/tipos.js').Producto} */ (valor))
        : { ...formulario.borrador, [campo]: valor };

    // Errores al vuelo: formato y rango de los parámetros; los demás se limpian al corregir.
    const errores = { ...formulario.errores };
    delete errores[campo];
    if (campo === 'producto') for (const p of ['brix', 'temperatura', 'peso', 'dentroCalibre']) delete errores[p];
    if (campo === 'brix' || campo === 'temperatura' || campo === 'peso') {
      const texto = /** @type {string} */ (valor);
      if (texto.trim() !== '') {
        const { error } = validarParametro(texto, campo);
        if (error) errores[campo] = error;
      }
    }
    const chequeo = estado.registroEnCurso?.inspeccion.chequeoVehiculo ?? null;
    actualizar({ formularioLote: recalcularFormulario({ ...formulario, borrador, errores }, chequeo) });
  }

  /** «Guardar lote» (REQ-LOT-09, 22, 23, 29; REQ-PER-03; REQ-VAL-29). */
  function guardarLote() {
    const formulario = estado.formularioLote;
    const registro = estado.registroEnCurso;
    if (!formulario || !registro || !puedeEditar()) return false;

    const errores = validarLoteParaGuardar(formulario.borrador, { registro, loteId: formulario.loteId });
    if (Object.keys(errores).length > 0) {
      actualizar({ formularioLote: { ...formulario, errores } });
      return false;
    }
    const lote = loteDesdeBorrador(formulario.borrador, {
      id: formulario.loteId ?? generarId(),
      inspeccionId: registro.inspeccion.id,
      chequeo: registro.inspeccion.chequeoVehiculo,
    });
    const nuevo = agregarOReemplazarLote(registro, lote);
    return persistirEnCurso(nuevo, lote.id, {
      formularioLote: null,
      ultimoLoteGuardado: MENSAJES.loteGuardado(lote.numeroLote, lote.producto),
    });
  }

  /** «Cerrar sin guardar»: descarta el borrador (REQ-LOT-30 a 34). La confirmación la pide la interfaz. */
  function cerrarLote() {
    if (!estado.formularioLote) return;
    actualizar({ formularioLote: null });
  }

  /**
   * «Quitar»: elimina el lote del registro en curso (REQ-LOT-27). Si es el lote abierto, cierra el formulario (DD-07).
   * @param {string} loteId
   */
  function quitarLote(loteId) {
    const registro = estado.registroEnCurso;
    if (!registro || !puedeEditar() || !inspeccionCompleta(registro.inspeccion)) return false;
    if (!registro.lotes.some((l) => l.id === loteId)) return false;
    const formularioLote = estado.formularioLote?.loteId === loteId ? null : estado.formularioLote;
    return persistirEnCurso(quitarLoteDelRegistro(registro, loteId), null, { formularioLote, ultimoLoteGuardado: null });
  }

  // ------------------------------------------------------------------ registro

  /**
   * «Finalizar registro» (REQ-REG-02, 03; REQ-PER-09; REQ-VAL-21, 22).
   * @returns {{ ok: true } | { ok: false, faltan: string[] }}
   */
  function finalizarRegistro() {
    const registro = estado.registroEnCurso;
    if (!registro || !puedeEditar()) return { ok: false, faltan: [] };
    const faltan = condicionesQueFaltan(registro);
    if (faltan.length > 0) return { ok: false, faltan };

    const finalizado = finalizar(registro, ahoraCostaRica(reloj()));
    const resultado = storage.guardarRegistroFinalizado(finalizado);
    if (!resultado.ok) {
      publicarError(resultado);
      return { ok: false, faltan: [] };
    }
    const { horaInicio, horaFin } = finalizado.inspeccion;
    actualizar({
      registroEnCurso: null,
      formularioLote: null,
      ultimoLoteGuardado: null,
      ultimoGuardado: null,
      errorGuardado: null,
      registrosFinalizados: [...estado.registrosFinalizados, finalizado],
      avisos: horaFin !== null && esAnterior(horaFin, horaInicio) ? conAviso(MENSAJES.relojEquipo) : estado.avisos,
    });
    return { ok: true };
  }

  /** «Cancelar registro» (REQ-REG-07; REQ-PER-10). Única acción permitida con un lote dañado (DD-05). */
  function cancelarRegistro() {
    const registro = estado.registroEnCurso;
    if (!registro || !estado.almacenamientoDisponible) return false;
    if (estado.soloLectura && estado.motivoSoloLectura !== 'loteDanado') return false;
    const resultado = storage.eliminarRegistroEnCurso(registro.inspeccion.id);
    if (!resultado.ok) {
      publicarError(resultado);
      return false;
    }
    const salirDeSoloLectura = estado.motivoSoloLectura === 'loteDanado';
    actualizar({
      registroEnCurso: null,
      formularioLote: null,
      ultimoLoteGuardado: null,
      ultimoGuardado: null,
      errorGuardado: null,
      ...(salirDeSoloLectura
        ? { soloLectura: false, motivoSoloLectura: null, avisos: estado.avisos.filter((a) => a !== MENSAJES.loteDanadoEnCurso) }
        : {}),
    });
    return true;
  }

  // ------------------------------------------------------------------ navegación y consultas

  /**
   * Cambia de pantalla sin tocar el registro en curso ni el borrador (REQ-UI-08).
   * @param {Pantalla} pantalla
   */
  function navegar(pantalla) {
    if (pantalla === estado.pantalla) return;
    // Al entrar a Consultas se releen los finalizados, por si otra pestaña finalizó uno (REQ-PER-16, REQ-CON-11).
    actualizar(pantalla === 'consultas' ? { pantalla, registrosFinalizados: releerFinalizados() } : { pantalla });
  }

  /** @param {'placa'|'lote'} modo */
  function cambiarModoConsulta(modo) {
    actualizar({ consulta: { ...estado.consulta, modo, textoBuscado: null, resultados: null } });
  }

  /** @param {string} texto */
  function cambiarTextoConsulta(texto) {
    estado = { ...estado, consulta: { ...estado.consulta, texto } };
    notificar();
  }

  /** Relee los registros finalizados de storage (REQ-CON-07, REQ-PER-16). */
  function releerFinalizados() {
    if (!estado.almacenamientoDisponible) return [];
    const lectura = storage.leerRegistros();
    return lectura.finalizados;
  }

  /** «Buscar» (REQ-CON-03, 05, 09). */
  function buscar() {
    const texto = estado.consulta.texto;
    if (limpiarTexto(texto) === null) return;
    const finalizados = releerFinalizados();
    const resultados = estado.consulta.modo === 'placa' ? buscarPorPlaca(finalizados, texto) : buscarPorNumeroLote(finalizados, texto);
    actualizar({
      registrosFinalizados: finalizados,
      consulta: { ...estado.consulta, textoBuscado: /** @type {string} */ (limpiarTexto(texto)), resultados, seleccion: null },
    });
  }

  /**
   * Detalle de un registro finalizado (REQ-CON-04, Q-03). Solo busca entre finalizados.
   * @param {string} inspeccionId
   */
  function verRegistro(inspeccionId) {
    const finalizados = releerFinalizados();
    const registro = finalizados.find((r) => r.inspeccion.id === inspeccionId && r.inspeccion.horaFin !== null);
    actualizar({
      registrosFinalizados: finalizados,
      consulta: { ...estado.consulta, seleccion: registro ? { tipo: 'registro', registro } : { tipo: 'noEncontrado' } },
    });
  }

  /**
   * Detalle de un lote con su inspección, obtenida por inspeccionId (REQ-CON-06, Q-03).
   * @param {string} inspeccionId
   * @param {string} loteId
   */
  function verLote(inspeccionId, loteId) {
    const finalizados = releerFinalizados();
    const registro = finalizados.find((r) => r.inspeccion.id === inspeccionId && r.inspeccion.horaFin !== null);
    const lote = registro?.lotes.find((l) => l.id === loteId && l.inspeccionId === inspeccionId);
    actualizar({
      registrosFinalizados: finalizados,
      consulta: { ...estado.consulta, seleccion: registro && lote ? { tipo: 'lote', registro, lote } : { tipo: 'noEncontrado' } },
    });
  }

  /** Vuelve de un detalle a los resultados. */
  function cerrarDetalle() {
    if (estado.consulta.seleccion) actualizar({ consulta: { ...estado.consulta, seleccion: null } });
  }

  // ------------------------------------------------------------------ pestañas

  /**
   * Ajusta el formulario abierto a los datos recién leídos: si su lote desapareció, se cierra.
   * @param {Registro|null} registro
   */
  function formularioTrasRelectura(registro) {
    const formulario = estado.formularioLote;
    if (!formulario || !registro || registro.inspeccion.id !== estado.registroEnCurso?.inspeccion.id) return null;
    if (formulario.loteId === null) return formulario;
    const original = registro.lotes.find((l) => l.id === formulario.loteId);
    return original ? { ...formulario, original } : null;
  }

  /** Otra pestaña cambió los datos: relee y queda en solo lectura (REQ-VAL-26, REQ-PER-15). */
  function recargarDesdeOtraPestana() {
    storage.bloquearEscrituras();
    const lectura = storage.leerRegistros();
    actualizar({
      registroEnCurso: lectura.enCurso,
      registrosFinalizados: lectura.finalizados,
      formularioLote: formularioTrasRelectura(lectura.enCurso),
      soloLectura: true,
      motivoSoloLectura: 'otraPestana',
      avisos: conAviso(MENSAJES.otraPestana),
    });
  }

  /** «Continuar en esta pestaña» (REQ-VAL-32). */
  function continuarEnEstaPestana() {
    if (estado.motivoSoloLectura !== 'otraPestana') return;
    const lectura = storage.leerRegistros();
    storage.reclamarPestanaActiva();
    storage.desbloquearEscrituras();
    const loteDanado = lectura.enCursoConLotesOmitidos;
    actualizar({
      registroEnCurso: lectura.enCurso,
      registrosFinalizados: lectura.finalizados,
      formularioLote: loteDanado ? null : formularioTrasRelectura(lectura.enCurso),
      soloLectura: loteDanado,
      motivoSoloLectura: loteDanado ? 'loteDanado' : null,
      avisos: loteDanado
        ? [...estado.avisos.filter((a) => a !== MENSAJES.otraPestana && a !== MENSAJES.loteDanadoEnCurso), MENSAJES.loteDanadoEnCurso]
        : estado.avisos.filter((a) => a !== MENSAJES.otraPestana),
    });
  }

  /** @param {string} aviso */
  function descartarAviso(aviso) {
    // Los avisos que describen un estado vigente no se descartan.
    if (aviso === MENSAJES.otraPestana && estado.motivoSoloLectura === 'otraPestana') return;
    if (aviso === MENSAJES.loteDanadoEnCurso && estado.motivoSoloLectura === 'loteDanado') return;
    if (aviso === MENSAJES.almacenamientoNoDisponible && !estado.almacenamientoDisponible) return;
    actualizar({ avisos: estado.avisos.filter((a) => a !== aviso) });
  }

  function descartarError() {
    if (estado.errorGuardado) actualizar({ errorGuardado: null });
  }

  /** Lista de inspectores depurada (REQ-INS-06, REQ-VAL-30, 31). */
  function obtenerInspectores() {
    return listaInspectores;
  }

  return {
    obtenerEstado,
    suscribir,
    notificar,
    iniciar,
    tic,
    actualizarCampoInspeccion,
    cambiarChequeo,
    abrirLoteNuevo,
    editarLote,
    actualizarBorrador,
    guardarLote,
    cerrarLote,
    quitarLote,
    finalizarRegistro,
    cancelarRegistro,
    navegar,
    cambiarModoConsulta,
    cambiarTextoConsulta,
    buscar,
    verRegistro,
    verLote,
    cerrarDetalle,
    recargarDesdeOtraPestana,
    continuarEnEstaPestana,
    descartarAviso,
    descartarError,
    obtenerInspectores,
    alCambiarEnOtraPestana: storage.alCambiarEnOtraPestana,
  };
}

/** @typedef {ReturnType<typeof crearStore>} Store */

// ------------------------------------------------------------------ selectores derivados
// Se calculan desde src/domain/ en cada notificación; nunca se guardan (INV-13).

/** @param {EstadoApp} estado */
export function seleccionarInspeccionCompleta(estado) {
  return inspeccionCompleta(estado.registroEnCurso?.inspeccion);
}

/** @param {EstadoApp} estado */
export function seleccionarContadores(estado) {
  return contadores(estado.registroEnCurso);
}

/** @param {EstadoApp} estado */
export function seleccionarCondiciones(estado) {
  return condicionesFinalizacion(estado.registroEnCurso);
}

/**
 * Productores distintos de todos los registros leídos, en orden alfabético (REQ-INS-05).
 * @param {EstadoApp} estado
 */
export function seleccionarProductoresSugeridos(estado) {
  const nombres = new Map();
  const registros = estado.registroEnCurso ? [...estado.registrosFinalizados, estado.registroEnCurso] : estado.registrosFinalizados;
  for (const r of registros) {
    const p = r.inspeccion.productor;
    if (p !== null && !nombres.has(p.toLowerCase())) nombres.set(p.toLowerCase(), p);
  }
  return [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

/** @param {EstadoApp} estado */
export function seleccionarEstadoVisible(estado) {
  const f = estado.formularioLote;
  if (!f) return null;
  return estadoVisible(f.borrador, estado.registroEnCurso?.inspeccion.chequeoVehiculo ?? null, f.original);
}

/** @param {EstadoApp} estado */
export function seleccionarMotivoVisible(estado) {
  const f = estado.formularioLote;
  if (!f) return null;
  return motivoVisible(f.borrador, estado.registroEnCurso?.inspeccion.chequeoVehiculo ?? null);
}

/** @param {EstadoApp} estado */
export function seleccionarCambiosSinGuardar(estado) {
  const f = estado.formularioLote;
  return f !== null && tieneCambiosSinGuardar(f.borrador, f.original);
}
