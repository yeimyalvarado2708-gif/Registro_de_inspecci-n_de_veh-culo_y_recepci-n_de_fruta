// @ts-check
// Textos de error, aviso y confirmación aprobados (DD-11, design §8.2), en un solo lugar.
// RNF-05: las confirmaciones explican el efecto. RNF-06: los errores indican la acción esperada.

/** @typedef {import('./tipos.js').ParametroNumerico} ParametroNumerico */

/** Nombre del parámetro dentro de una frase («Ingrese el valor de …»). */
const PARAMETRO_EN_FRASE = Object.freeze({
  brix: 'Brix',
  temperatura: 'temperatura',
  peso: 'peso promedio por pieza',
});

/** @param {number} n */
const unDecimal = (n) => n.toFixed(1);

export const MENSAJES = Object.freeze({
  // --- Validación del texto de un parámetro (design §8.2, REQ-VAL-01 a 11) ---
  /** @param {ParametroNumerico} parametro */
  parametroVacio: (parametro) => `Ingrese el valor de ${PARAMETRO_EN_FRASE[parametro]}.`,
  usarPuntoDecimal: 'Use punto decimal (por ejemplo, 4.5).',
  valorNegativo: 'El valor no puede ser negativo.',
  soloNumeros: 'Ingrese solo números con punto decimal.',
  maximoUnDecimal: 'Se admite como máximo un decimal.',
  /** @param {number} min @param {number} max */
  fueraRangoEntrada: (min, max) =>
    `Valor fuera del rango válido de entrada (${unDecimal(min)} a ${unDecimal(max)}). Revise la digitación.`,

  // --- Guardado del lote (REQ-VAL-12 a 14, REQ-UNC-13) ---
  calibreSinElegir: 'Elija Dentro de calibre o Fuera de calibre.',
  productoSinElegir: 'Seleccione un producto.',
  /** @param {string} numeroLote */
  loteRepetido: (numeroLote) => `El número de lote ${numeroLote} ya está registrado en esta inspección.`,
  inspeccionIncompleta: 'Complete la inspección del vehículo para guardar lotes.',
  textoEnUnaLinea: 'Escriba este texto en una sola línea.',

  /**
   * Aviso tras guardar un lote (REQ-LOT-24, WF-04, Q-01).
   * @param {string|null} numeroLote
   * @param {string} producto
   */
  loteGuardado: (numeroLote, producto) =>
    numeroLote === null
      ? `Lote de ${producto} guardado. ¿Llegó otro lote en este vehículo?`
      : `Lote guardado como ${numeroLote}. ¿Llegó otro lote en este vehículo?`,

  /** REQ-LOT-19, DD-12. */
  revisarObservaciones:
    'El lote pasó de Rechazado a Aprobado. Revise las observaciones: pueden referirse al rechazo.',

  // --- Consultas (REQ-CON-09) ---
  /** @param {string} texto */
  sinResultadosPlaca: (texto) => `No hay registros finalizados para la placa ${texto}.`,
  /** @param {string} texto */
  sinResultadosLote: (texto) => `No hay registros finalizados para el número de lote ${texto}.`,
  registroNoEncontrado: 'No hay un registro finalizado con ese identificador.',
  /** REQ-CON-11 [Propuesto]. */
  ultimasInspecciones: 'Últimas inspecciones finalizadas',
  /** @param {number} mostradas @param {number} total */
  ultimasInspeccionesDetalle: (mostradas, total) => `${mostradas} de ${total} finalizada(s) · de la más reciente a la más antigua`,
  sinFinalizados: 'Aún no hay registros finalizados. Aparecerán aquí al finalizar el primero.',

  // --- Persistencia (REQ-PER-11 a 15) ---
  sinEspacio: 'No se pudo guardar: el almacenamiento de este equipo está lleno. Los datos siguen en el formulario.',
  almacenamientoNoDisponible:
    'Los registros no se podrán guardar en este equipo: el navegador no permite usar el almacenamiento local.',
  escrituraSoloLectura: 'No se pudo guardar: esta pestaña está en solo lectura.',
  /** @param {string[]} invariantes */
  escrituraInvalida: (invariantes) =>
    `No se pudo guardar: los datos no cumplen las reglas del registro (${invariantes.join(', ')}).`,
  registroDanado: 'Se omitió un registro guardado que no se puede leer o no cumple el contrato de datos.',
  loteInconsistente: 'Se omitió un lote guardado con datos inconsistentes.',
  loteDanadoEnCurso:
    'Un lote de este registro está dañado y no se puede mostrar. Para no perderlo, el registro quedó en solo lectura. Puede cancelar el registro o pedir revisión del equipo.',
  otraPestana: 'El registro se está editando en otra pestaña. Esta pestaña quedó en solo lectura.',

  // --- Inspectores (REQ-VAL-30) ---
  sinInspectores: 'No hay inspectores configurados. Pida que se agreguen en el archivo de configuración.',

  // --- Ciclo de vida del registro (REQ-REG-01 a 08, REQ-VAL-21) ---
  condicionInspeccionCompleta: 'Inspección del vehículo completa',
  condicionAlMenosUnLote: 'Al menos un lote registrado',
  condicionTodosValorados: 'Todos los lotes valorados',
  /** @param {string[]} faltan */
  finalizarBloqueado: (faltan) => `No se puede finalizar. Falta: ${faltan.join('; ')}.`,
  relojEquipo:
    'La hora de fin quedó antes que la hora de inicio. Revise la fecha y la hora del equipo.',

  // --- Confirmaciones (RNF-05) ---
  confirmarNoCumple: Object.freeze({
    titulo: '¿Cambiar el chequeo a «No cumple»?',
    /** @param {number} cantidad @param {boolean} formularioConParametros */
    mensaje: (cantidad, formularioConParametros) =>
      `Se rechazarán ${cantidad} lote(s) guardados y se borrarán sus parámetros.` +
      (formularioConParametros ? ' El lote abierto en el formulario también perderá sus parámetros.' : ''),
    aceptar: 'Sí, cambiar a No cumple',
    cancelar: 'No, mantener Cumple',
  }),
  confirmarCancelarRegistro: Object.freeze({
    titulo: '¿Cancelar el registro?',
    /** @param {number} rechazados */
    mensaje: (rechazados) =>
      'Se borrarán de este equipo la inspección en curso y todos sus lotes.' +
      (rechazados > 0 ? ` Hay ${rechazados} lote(s) rechazados: su reporte de rechazo se perderá.` : ''),
    aceptar: 'Sí, cancelar registro',
    cancelar: 'No, conservar',
  }),
  confirmarCerrarSinGuardar: Object.freeze({
    titulo: '¿Cerrar sin guardar?',
    mensaje: 'Se descartarán los cambios del lote abierto. Los lotes ya guardados no cambian.',
    aceptar: 'Sí, descartar cambios',
    cancelar: 'No, seguir editando',
  }),
  confirmarQuitar: Object.freeze({
    titulo: '¿Quitar el lote?',
    /** @param {string} producto @param {string|null} numeroLote @param {boolean} abiertoConCambios */
    mensaje: (producto, numeroLote, abiertoConCambios) =>
      `Se eliminará del registro el lote de ${producto} ${numeroLote === null ? 'sin número de lote' : numeroLote}.` +
      (abiertoConCambios ? ' Este lote está abierto en el formulario: también se descartarán sus cambios sin guardar.' : ''),
    aceptar: 'Sí, quitar lote',
    cancelar: 'No, conservar',
  }),
  confirmarFinalizarConCambios: Object.freeze({
    titulo: '¿Finalizar con cambios sin guardar?',
    mensaje: 'El lote abierto tiene cambios sin guardar. Si finaliza el registro, esos cambios se perderán.',
    aceptar: 'Sí, finalizar',
    cancelar: 'No, volver al lote',
  }),
  confirmarLoteNuevoConCambios: Object.freeze({
    titulo: '¿Abrir un lote nuevo?',
    mensaje: 'El lote abierto tiene cambios sin guardar. Si abre un lote nuevo, esos cambios se perderán.',
    aceptar: 'Sí, descartar y abrir',
    cancelar: 'No, seguir editando',
  }),
  confirmarEditarConCambios: Object.freeze({
    titulo: '¿Editar otro lote?',
    mensaje: 'El lote abierto tiene cambios sin guardar. Si edita otro lote, esos cambios se perderán.',
    aceptar: 'Sí, descartar y editar',
    cancelar: 'No, seguir editando',
  }),
});
