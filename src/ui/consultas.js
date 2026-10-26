// @ts-check
// PantallaConsultas, UltimasInspecciones, ResultadosPorPlaca, ResultadosPorLote y DetalleRegistro
// (REQ-CON-01 a 11; REQ-INS-07; REQ-REG-05; REQ-UNC-12; REQ-PER-14; Q-03, Q-04; WF-06).
// Todo es de solo lectura: no hay controles de edición, eliminación ni cancelación (REQ-CON-10).

import { resumenLotes, ultimasInspecciones } from '../domain/consultas.js';
import { MENSAJES } from '../domain/mensajes.js';
import { limpiarTexto } from '../domain/normalizacion.js';
import { formatoFecha, formatoFechaHora, formatoHora } from '../domain/tiempo.js';
import { crear, fijarHabilitado, icono, sincronizarValor } from './comunes.js';
import { insigniaEstado, nombreProducto, textosParametros } from './registro/lotes.js';

/** @typedef {import('../state/store.js').Store} Store */
/** @typedef {import('../state/store.js').EstadoApp} EstadoApp */
/** @typedef {import('../domain/tipos.js').Registro} Registro */
/** @typedef {import('../domain/tipos.js').LoteMateriaPrima} LoteMateriaPrima */

const EJEMPLOS = Object.freeze({ placa: 'Ej. CL-284519', lote: 'Ej. BN-0453' });

/** @param {Registro} r «25/10/2026 16:47–17:20» */
function fechaYHoras(r) {
  const { horaInicio, horaFin } = r.inspeccion;
  return `${formatoFechaHora(horaInicio)}–${horaFin ? formatoHora(horaFin) : ''}`;
}

/** @param {boolean|null} chequeo */
function insigniaChequeo(chequeo) {
  return chequeo
    ? crear('span', { class: 'insignia insignia-aprobado', text: 'Cumple' })
    : crear('span', { class: 'insignia insignia-rechazado', text: 'No cumple' });
}

/**
 * @param {HTMLElement} contenedor
 * @param {Store} store
 * @returns {() => void}
 */
export function montarPantallaConsultas(contenedor, store) {
  // Indica si el detalle se abrió desde los resultados de esta sesión, para que «Volver» equivalga a «Atrás».
  let vinoDeResultados = false;

  const radioPlaca = crear('input', { type: 'radio', name: 'modo-consulta', value: 'placa', id: 'modo-placa' });
  const radioLote = crear('input', { type: 'radio', name: 'modo-consulta', value: 'lote', id: 'modo-lote' });
  const etiquetaBusqueda = crear('label', { for: 'texto-busqueda', class: 'sr-only' });
  const texto = crear('input', { id: 'texto-busqueda', class: 'entrada mono', type: 'search', autocomplete: 'off', spellcheck: 'false' });
  const buscar = crear('button', { type: 'button', class: 'boton boton-primario' }, [icono('buscar'), 'Buscar']);
  const zonaResultados = crear('div', { 'aria-live': 'polite' });
  const barra = crear('div', { class: 'barra-busqueda', role: 'search' }, [
    crear('fieldset', {}, [
      crear('legend', { class: 'sr-only', text: 'Buscar' }),
      crear('div', { class: 'segmentado' }, [
        crear('label', { for: 'modo-placa' }, [radioPlaca, 'Por placa']),
        crear('label', { for: 'modo-lote' }, [radioLote, 'Por número de lote']),
      ]),
    ]),
    etiquetaBusqueda,
    texto,
    buscar,
  ]);

  contenedor.replaceChildren(
    crear('p', { class: 'rotulo', text: 'Registros finalizados · Solo lectura' }),
    crear('h1', { class: 'titulo-pantalla', text: 'Consultas' }),
    crear('p', {
      class: 'texto-pantalla',
      text: 'Busque por placa para ver el historial de entregas del vehículo, o por número de lote. No distingue mayúsculas, espacios ni guiones.',
    }),
    barra,
    zonaResultados
  );

  for (const radio of [radioPlaca, radioLote]) {
    radio.addEventListener('change', () => store.cambiarModoConsulta(radio.value === 'lote' ? 'lote' : 'placa'));
  }
  texto.addEventListener('input', () => store.cambiarTextoConsulta(texto.value));
  // Enter en el campo ejecuta la búsqueda (T-6.1).
  texto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !buscar.disabled) ejecutarBusqueda();
  });
  buscar.addEventListener('click', ejecutarBusqueda);

  function ejecutarBusqueda() {
    if (location.hash !== '#/consultas') location.hash = '#/consultas';
    store.buscar();
  }

  /** @param {string} hash */
  function abrirDetalle(hash) {
    vinoDeResultados = true;
    location.hash = hash;
  }

  function volver() {
    if (vinoDeResultados) history.back();
    else location.hash = '#/consultas';
    vinoDeResultados = false;
  }

  /** @type {unknown} */
  let pintado = null;

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    const c = estado.consulta;
    radioPlaca.checked = c.modo === 'placa';
    radioLote.checked = c.modo === 'lote';
    etiquetaBusqueda.textContent = c.modo === 'placa' ? 'Placa a buscar' : 'Número de lote a buscar';
    texto.placeholder = EJEMPLOS[c.modo];
    sincronizarValor(texto, c.texto);
    // REQ-CON-02: «Buscar» deshabilitado con el campo vacío o solo espacios.
    fijarHabilitado(buscar, limpiarTexto(c.texto) !== null && estado.almacenamientoDisponible);

    const clave = [c.seleccion, c.resultados, c.textoBuscado, c.modo, estado.almacenamientoDisponible, estado.registrosFinalizados];
    if (Array.isArray(pintado) && clave.every((v, i) => v === /** @type {unknown[]} */ (pintado)[i])) return;
    pintado = clave;

    // P-04: sin almacenamiento no hay registros que leer; se muestra el mismo aviso.
    if (!estado.almacenamientoDisponible) {
      zonaResultados.replaceChildren(crear('div', { class: 'aviso aviso-error' }, [crear('p', { class: 'aviso-texto', text: MENSAJES.almacenamientoNoDisponible })]));
      return;
    }
    if (c.seleccion) {
      barra.hidden = true;
      zonaResultados.replaceChildren(detalle(c.seleccion, volver));
      return;
    }
    barra.hidden = false;
    // Antes de buscar se muestran las últimas inspecciones finalizadas (REQ-CON-11 [Propuesto]).
    if (c.resultados === null || c.textoBuscado === null) {
      zonaResultados.replaceChildren(ultimasFinalizadas(estado.registrosFinalizados, abrirDetalle));
      return;
    }
    zonaResultados.replaceChildren(
      c.modo === 'placa'
        ? resultadosPorPlaca(/** @type {Registro[]} */ (c.resultados), c.textoBuscado, abrirDetalle)
        : resultadosPorLote(/** @type {{registro: Registro, lote: LoteMateriaPrima}[]} */ (c.resultados), c.textoBuscado, abrirDetalle)
    );
  }

  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}

/**
 * UltimasInspecciones: se muestran antes de buscar (REQ-CON-11 [Propuesto]; WF-06).
 * @param {Registro[]} registros todos los finalizados
 * @param {(hash: string) => void} abrir
 */
function ultimasFinalizadas(registros, abrir) {
  const ultimas = ultimasInspecciones(registros);
  if (ultimas.length === 0) return sinResultados(MENSAJES.sinFinalizados);
  return tablaInspecciones(ultimas, MENSAJES.ultimasInspecciones, MENSAJES.ultimasInspeccionesDetalle(ultimas.length, registros.length), abrir);
}

/**
 * ResultadosPorPlaca (REQ-CON-03, 09; WF-06).
 * @param {Registro[]} registros
 * @param {string} textoBuscado
 * @param {(hash: string) => void} abrir
 */
function resultadosPorPlaca(registros, textoBuscado, abrir) {
  if (registros.length === 0) return sinResultados(MENSAJES.sinResultadosPlaca(textoBuscado));
  return tablaInspecciones(registros, 'Inspecciones registradas', `${registros.length} finalizada(s) · de la más reciente a la más antigua`, abrir);
}

/**
 * Tabla de inspecciones con «Ver» (REQ-CON-03, 11).
 * @param {Registro[]} registros
 * @param {string} titulo
 * @param {string} extra
 * @param {(hash: string) => void} abrir
 */
function tablaInspecciones(registros, titulo, extra, abrir) {
  const filas = registros.map((r) => {
    const resumen = resumenLotes(r.lotes);
    const ver = crear('button', { type: 'button', class: 'boton', 'aria-label': `Ver registro de ${r.inspeccion.placa} del ${fechaYHoras(r)}` }, [icono('ojo'), 'Ver']);
    ver.addEventListener('click', () => abrir(`#/consultas/${encodeURIComponent(r.inspeccion.id)}`));
    return crear('tr', {}, [
      crear('td', { class: 'mono', text: fechaYHoras(r) }),
      crear('td', { class: 'mono', text: r.inspeccion.placa ?? '' }),
      crear('td', {}, [crear('div', { text: r.inspeccion.productor ?? '' }), crear('div', { class: 'secundario', text: r.inspeccion.inspector ?? '' })]),
      crear('td', {}, [insigniaChequeo(r.inspeccion.chequeoVehiculo)]),
      crear('td', {}, [
        crear('span', { class: 'resumen-lotes' }, [
          crear('strong', { text: String(resumen.total) }),
          resumen.aprobados > 0 ? crear('span', { class: 'aprobados', text: `${resumen.aprobados} aprob.` }) : null,
          resumen.rechazados > 0 ? crear('span', { class: 'rechazados', text: `${resumen.rechazados} rech.` }) : null,
        ]),
      ]),
      crear('td', { class: 'acciones-fila' }, [ver]),
    ]);
  });
  return tarjetaResultados(titulo, extra, ['Fecha y hora', 'Placa', 'Productor / Inspector', 'Chequeo', 'Lotes'], filas);
}

/**
 * ResultadosPorLote (REQ-CON-05, 08, 09; DD-06).
 * @param {{registro: Registro, lote: LoteMateriaPrima}[]} coincidencias
 * @param {string} textoBuscado
 * @param {(hash: string) => void} abrir
 */
function resultadosPorLote(coincidencias, textoBuscado, abrir) {
  if (coincidencias.length === 0) return sinResultados(MENSAJES.sinResultadosLote(textoBuscado));
  const filas = coincidencias.map(({ registro, lote }) => {
    const ver = crear('button', { type: 'button', class: 'boton', 'aria-label': `Ver lote ${lote.numeroLote} del ${fechaYHoras(registro)}` }, [icono('ojo'), 'Ver']);
    ver.addEventListener('click', () => abrir(`#/consultas/${encodeURIComponent(registro.inspeccion.id)}/lote/${encodeURIComponent(lote.id)}`));
    return crear('tr', {}, [
      crear('td', { class: 'mono', text: fechaYHoras(registro) }),
      crear('td', { class: 'mono', text: registro.inspeccion.placa ?? '' }),
      crear('td', { text: registro.inspeccion.productor ?? '' }),
      crear('td', {}, [crear('div', { class: 'mono', text: lote.numeroLote ?? '' }), nombreProducto(lote.producto)]),
      crear('td', {}, [insigniaEstado(lote.estado)]),
      crear('td', { class: 'acciones-fila' }, [ver]),
    ]);
  });
  return tarjetaResultados(
    'Lotes encontrados',
    `${coincidencias.length} lote(s) · del más reciente al más antiguo`,
    ['Fecha y hora', 'Placa', 'Productor', 'Lote', 'Estado'],
    filas
  );
}

/**
 * @param {string} titulo
 * @param {string} extra
 * @param {string[]} columnas
 * @param {HTMLElement[]} filas
 */
function tarjetaResultados(titulo, extra, columnas, filas) {
  return crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-resultados' }, [
    crear('div', { class: 'tarjeta-cabecera' }, [crear('h2', { class: 'tarjeta-titulo', id: 'titulo-resultados', text: titulo }), crear('span', { class: 'tarjeta-extra', text: extra })]),
    crear('table', { class: 'tabla' }, [
      crear('thead', {}, [crear('tr', {}, [...columnas.map((t) => crear('th', { scope: 'col', text: t })), crear('th', { scope: 'col' }, [crear('span', { class: 'sr-only', text: 'Acciones' })])])]),
      crear('tbody', {}, filas),
    ]),
  ]);
}

/** @param {string} mensaje */
function sinResultados(mensaje) {
  return crear('section', { class: 'tarjeta' }, [crear('p', { class: 'sin-resultados', role: 'status', text: mensaje })]);
}

/**
 * DetalleRegistro: registro completo o lote con su inspección, en solo lectura (REQ-CON-04, 06, 10; Q-03).
 * @param {NonNullable<import('../state/store.js').EstadoConsulta['seleccion']>} seleccion
 * @param {() => void} volver
 */
function detalle(seleccion, volver) {
  const botonVolver = crear('button', { type: 'button', class: 'boton', text: 'Volver a los resultados' });
  botonVolver.addEventListener('click', volver);

  if (seleccion.tipo === 'noEncontrado') {
    return crear('div', { class: 'columna' }, [crear('section', { class: 'tarjeta' }, [crear('p', { class: 'sin-resultados', role: 'status', text: MENSAJES.registroNoEncontrado })]), crear('div', { class: 'acciones' }, [botonVolver])]);
  }

  const { registro } = seleccion;
  const lotes = seleccion.tipo === 'lote' ? [seleccion.lote] : registro.lotes;
  const tituloLotes = seleccion.tipo === 'lote' ? 'Lote consultado' : `Lotes (${registro.lotes.length})`;
  return crear('div', { class: 'columna' }, [
    crear('div', { class: 'acciones' }, [botonVolver]),
    seleccion.tipo === 'lote' ? tarjetaLotes(tituloLotes, lotes) : null,
    tarjetaInspeccion(registro),
    seleccion.tipo === 'registro' ? tarjetaLotes(tituloLotes, lotes) : null,
  ]);
}

/** @param {Registro} registro */
function tarjetaInspeccion(registro) {
  const i = registro.inspeccion;
  /** @type {[string, string][]} */
  const datos = [
    ['Fecha de entrada', formatoFecha(i.fecha)],
    ['Hora de inicio', formatoHora(i.horaInicio)],
    ['Hora de fin', i.horaFin ? (i.horaFin.slice(0, 10) === i.fecha ? formatoHora(i.horaFin) : formatoFechaHora(i.horaFin)) : ''],
    ['Placa', i.placa ?? ''],
    ['Productor', i.productor ?? ''],
    ['Inspector', i.inspector ?? ''], // REQ-INS-07: tal como se guardó
  ];
  return crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-detalle-inspeccion' }, [
    crear('div', { class: 'tarjeta-cabecera' }, [
      crear('h2', { class: 'tarjeta-titulo', id: 'titulo-detalle-inspeccion', text: 'Inspección del vehículo' }),
      crear('span', { class: 'tarjeta-extra' }, [crear('span', { class: 'insignia insignia-neutra', text: 'Finalizado · Solo lectura' })]),
    ]),
    crear('div', { class: 'tarjeta-cuerpo' }, [
      crear('dl', { class: 'detalle-datos' }, [
        ...datos.flatMap(([dt, dd]) => [crear('div', {}, [crear('dt', { text: dt }), crear('dd', { text: dd })])]),
        crear('div', {}, [crear('dt', { text: 'Chequeo del vehículo' }), crear('dd', {}, [insigniaChequeo(i.chequeoVehiculo)])]),
      ]),
    ]),
  ]);
}

/**
 * @param {string} titulo
 * @param {LoteMateriaPrima[]} lotes
 */
function tarjetaLotes(titulo, lotes) {
  return crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-detalle-lotes' }, [
    crear('div', { class: 'tarjeta-cabecera' }, [crear('h2', { class: 'tarjeta-titulo', id: 'titulo-detalle-lotes', text: titulo })]),
    crear(
      'div',
      { class: 'tarjeta-cuerpo' },
      lotes.map((lote) => {
        const parametros = textosParametros(lote);
        return crear('article', { class: 'detalle-lote', 'aria-label': `Lote ${lote.numeroLote ?? 'sin número'}` }, [
          crear('div', { class: 'detalle-lote-cabecera' }, [nombreProducto(lote.producto), insigniaEstado(lote.estado)]),
          crear('dl', { class: 'detalle-datos' }, [
            crear('div', {}, [crear('dt', { text: 'Número de lote' }), crear('dd', { class: 'mono', text: lote.numeroLote ?? 'Sin número' })]),
            crear('div', {}, [crear('dt', { text: 'Orden de compra' }), crear('dd', { class: 'mono', text: lote.ordenCompra ?? '—' })]),
            crear('div', {}, [crear('dt', { text: 'Parámetros' }), crear('dd', { class: 'mono', text: parametros.length > 0 ? parametros.join(' · ') : 'Sin parámetros' })]),
            crear('div', {}, [crear('dt', { text: 'Motivo del rechazo' }), crear('dd', { text: lote.motivoRechazo ?? '—' })]),
            crear('div', {}, [crear('dt', { text: 'Observaciones' }), crear('dd', { text: lote.observaciones ?? '—' })]),
          ]),
        ]);
      })
    ),
  ]);
}
