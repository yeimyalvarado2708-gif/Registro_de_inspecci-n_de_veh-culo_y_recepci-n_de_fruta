// @ts-check
// SeccionLotes, TablaLotes, FormularioLote y AvisoLoteGuardado
// (REQ-LOT-01 a 35; REQ-VAL-01 a 16, 20, 23, 24, 28, 29; DD-07, DD-10, DD-12; WF-03, WF-04).

import { CRITERIOS_APROBACION, NOMBRES_PARAMETRO, PRODUCTOS, RANGOS_ENTRADA } from '../../domain/criterios.js';
import { MENSAJES } from '../../domain/mensajes.js';
import { parametrosQueAplican } from '../../domain/valoracion.js';
import {
  seleccionarCambiosSinGuardar, seleccionarEstadoVisible, seleccionarInspeccionCompleta, seleccionarMotivoVisible,
} from '../../state/store.js';
import {
  accionProtegida, confirmar, crear, fijarHabilitado, fijarTexto, icono, mostrarError, sincronizarValor, unDecimal,
} from '../comunes.js';

/** @typedef {import('../../state/store.js').Store} Store */
/** @typedef {import('../../state/store.js').EstadoApp} EstadoApp */
/** @typedef {import('../../domain/tipos.js').LoteMateriaPrima} LoteMateriaPrima */
/** @typedef {import('../../domain/tipos.js').Producto} Producto */

/** Unidad de cada parámetro numérico en pantalla. */
const UNIDADES = Object.freeze({ brix: '°Bx', temperatura: RANGOS_ENTRADA.temperatura.unidad, peso: RANGOS_ENTRADA.peso.unidad });

/** Etiqueta del campo de cada parámetro. */
const ETIQUETAS = Object.freeze({
  brix: `${NOMBRES_PARAMETRO.brix} (${UNIDADES.brix})`,
  temperatura: `${NOMBRES_PARAMETRO.temperatura} (${UNIDADES.temperatura})`,
  peso: `${NOMBRES_PARAMETRO.peso} (${UNIDADES.peso})`,
});

/**
 * Parámetros del lote con unidades y un decimal: «Brix 8.0», «26.0 °C», «1235.0 g/pieza».
 * @param {LoteMateriaPrima} lote
 * @returns {string[]}
 */
export function textosParametros(lote) {
  /** @type {string[]} */
  const textos = [];
  if (lote.brix !== null) textos.push(`Brix ${unDecimal(lote.brix)}`);
  if (lote.temperatura !== null) textos.push(`${unDecimal(lote.temperatura)} °C`);
  if (lote.dentroCalibre !== null) textos.push(lote.dentroCalibre ? 'Dentro de calibre' : 'Fuera de calibre');
  if (lote.peso !== null) textos.push(`${unDecimal(lote.peso)} g/pieza`);
  return textos;
}

/**
 * Insignia de estado: Rechazado indica que el producto no se recibe (REQ-LOT-20).
 * @param {LoteMateriaPrima['estado']} estado
 */
export function insigniaEstado(estado) {
  if (estado === 'Aprobado') return crear('span', { class: 'insignia insignia-aprobado', text: 'Aprobado' });
  if (estado === 'Rechazado') return crear('span', { class: 'insignia insignia-rechazado', text: 'Rechazado · No se recibe' });
  return crear('span', { class: 'insignia insignia-pendiente', text: 'Pendiente de valorar' });
}

/** @param {Producto} producto */
export function nombreProducto(producto) {
  return crear('span', { class: 'producto-nombre' }, [crear('span', { class: `punto punto-${producto}`, 'aria-hidden': 'true' }), producto]);
}

/**
 * Leyenda con los rangos de aprobación del producto, leída de criterios.js (REQ-LOT-05, RNF-11).
 * @param {Producto} producto
 */
function textoLeyenda(producto) {
  const c = CRITERIOS_APROBACION[producto];
  /** @type {string[]} */
  const partes = [];
  if (c.brix) partes.push(`Brix ${c.brix.min} a ${c.brix.max}`);
  if (c.temperatura) partes.push(`Temperatura ${c.temperatura.min} a ${c.temperatura.max} °C`);
  if (c.dentroCalibre) partes.push('Dentro de calibre');
  if (c.peso) partes.push(`Peso promedio por pieza ${c.peso.min} a ${c.peso.max} g`);
  return partes.join(' · ');
}

/**
 * @param {HTMLElement} contenedor
 * @param {Store} store
 */
export function montarSeccionLotes(contenedor, store) {
  const paso = crear('span', { class: 'paso', 'aria-hidden': 'true', text: '2' });
  const contador = crear('span', { class: 'tarjeta-extra', role: 'status' });
  const notaBloqueo = crear('p', { class: 'nota-bloqueo', text: 'Complete la inspección del vehículo para registrar lotes.' });
  const zonaTabla = crear('div');
  const zonaAviso = crear('div');
  const zonaFormulario = crear('div');
  const botonNuevo = crear('button', { type: 'button', class: 'boton boton-primario' }, [icono('mas'), 'Lote']);
  botonNuevo.setAttribute('aria-label', 'Agregar lote');
  const zonaBoton = crear('div', { class: 'acciones' }, [botonNuevo]);
  const cuerpo = crear('div', { class: 'tarjeta-cuerpo' }, [notaBloqueo, zonaTabla, zonaAviso, zonaFormulario, zonaBoton]);
  const seccion = crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-lotes' }, [
    crear('div', { class: 'tarjeta-cabecera' }, [paso, crear('h2', { class: 'tarjeta-titulo', id: 'titulo-lotes', text: 'Lotes de materia prima' }), contador]),
    cuerpo,
  ]);
  contenedor.replaceChildren(seccion);

  /** «+ Lote»: confirma si hay cambios sin guardar (REQ-VAL-24). */
  async function abrirNuevo() {
    if (seleccionarCambiosSinGuardar(store.obtenerEstado())) {
      if (!(await confirmar(MENSAJES.confirmarLoteNuevoConCambios))) return;
    }
    if (store.abrirLoteNuevo()) enfocarFormulario();
  }
  accionProtegida(botonNuevo, abrirNuevo);

  function enfocarFormulario() {
    requestAnimationFrame(() => /** @type {HTMLElement|null} */ (zonaFormulario.querySelector('input[name="producto"]'))?.focus());
  }

  const tabla = montarTablaLotes(zonaTabla, store, enfocarFormulario);
  const formulario = montarFormularioLote(zonaFormulario, store);

  /** @type {string|null} */
  let avisoPintado = null;

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    const habilitada = seleccionarInspeccionCompleta(estado) && estado.almacenamientoDisponible && !estado.soloLectura;
    // REQ-LOT-01, REQ-VAL-20: sección bloqueada mientras la inspección no esté completa.
    cuerpo.inert = !habilitada;
    seccion.setAttribute('aria-disabled', String(!habilitada));
    seccion.classList.toggle('seccion-bloqueada', !habilitada);
    notaBloqueo.hidden = habilitada || !estado.almacenamientoDisponible || estado.soloLectura;
    paso.dataset.completo = String(habilitada);

    const lotes = estado.registroEnCurso?.lotes ?? [];
    fijarTexto(contador, `${lotes.length} lote(s) registrados`); // REQ-LOT-25

    // AvisoLoteGuardado (REQ-LOT-24, WF-04, Q-01).
    const aviso = estado.formularioLote ? null : estado.ultimoLoteGuardado;
    if (aviso !== avisoPintado) {
      avisoPintado = aviso;
      if (aviso === null) zonaAviso.replaceChildren();
      else {
        const otro = crear('button', { type: 'button', class: 'boton boton-primario' }, [icono('mas'), 'Lote']);
        otro.setAttribute('aria-label', 'Agregar otro lote');
        accionProtegida(otro, abrirNuevo);
        zonaAviso.replaceChildren(crear('div', { class: 'aviso-lote-guardado', role: 'status' }, [crear('span', { class: 'guardado' }, [icono('check'), aviso]), otro]));
      }
    }
    zonaBoton.hidden = estado.formularioLote !== null || aviso !== null;
    fijarHabilitado(botonNuevo, habilitada);
    for (const b of zonaAviso.querySelectorAll('button')) fijarHabilitado(/** @type {HTMLButtonElement} */ (b), habilitada);

    tabla(estado, habilitada);
    formulario(estado, habilitada);
  }

  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}

/**
 * TablaLotes (REQ-LOT-25 a 28, DD-07).
 * @param {HTMLElement} contenedor
 * @param {Store} store
 * @param {() => void} enfocarFormulario
 * @returns {(estado: EstadoApp, habilitada: boolean) => void}
 */
function montarTablaLotes(contenedor, store, enfocarFormulario) {
  const cuerpo = crear('tbody');
  const tabla = crear('div', { class: 'tabla-contenedor' }, [
    crear('table', { class: 'tabla' }, [
      crear('caption', { class: 'sr-only', text: 'Lotes registrados en esta inspección' }),
      crear('thead', {}, [
        crear('tr', {}, [
          crear('th', { scope: 'col', text: 'Lote / OC' }),
          crear('th', { scope: 'col', text: 'Producto' }),
          crear('th', { scope: 'col', text: 'Parámetros' }),
          crear('th', { scope: 'col', text: 'Estado' }),
          crear('th', { scope: 'col' }, [crear('span', { class: 'sr-only', text: 'Acciones' })]),
        ]),
      ]),
      cuerpo,
    ]),
  ]);

  /** @param {LoteMateriaPrima} lote */
  async function editar(lote) {
    const estado = store.obtenerEstado();
    if (estado.formularioLote?.loteId === lote.id) return enfocarFormulario();
    if (seleccionarCambiosSinGuardar(estado) && !(await confirmar(MENSAJES.confirmarEditarConCambios))) return;
    if (store.editarLote(lote.id)) enfocarFormulario();
  }

  /** @param {LoteMateriaPrima} lote */
  async function quitar(lote) {
    const estado = store.obtenerEstado();
    const abiertoConCambios = estado.formularioLote?.loteId === lote.id && seleccionarCambiosSinGuardar(estado);
    const t = MENSAJES.confirmarQuitar;
    const acepta = await confirmar({ titulo: t.titulo, mensaje: t.mensaje(lote.producto, lote.numeroLote, abiertoConCambios), aceptar: t.aceptar, cancelar: t.cancelar });
    if (acepta) store.quitarLote(lote.id); // REQ-LOT-27, 28
  }

  /** @type {unknown} */
  let lotesPintados = null;
  /** @type {string|null} */
  let editandoPintado = null;
  /** @type {boolean|null} */
  let habilitadaPintada = null;

  return (estado, habilitada) => {
    const lotes = estado.registroEnCurso?.lotes ?? [];
    if (lotes.length > 0 && !tabla.isConnected) contenedor.replaceChildren(tabla);
    if (lotes.length === 0 && tabla.isConnected) contenedor.replaceChildren();
    const editando = estado.formularioLote?.loteId ?? null;
    if (lotes === lotesPintados && editando === editandoPintado && habilitada === habilitadaPintada) return;
    lotesPintados = lotes;
    editandoPintado = editando;
    habilitadaPintada = habilitada;

    cuerpo.replaceChildren(
      ...lotes.map((lote) => {
        const nombre = `${lote.producto} ${lote.numeroLote ?? 'sin número de lote'}`;
        const botonEditar = crear('button', { type: 'button', class: 'boton boton-enlace', text: 'Editar', 'aria-label': `Editar lote ${nombre}` });
        const botonQuitar = crear('button', { type: 'button', class: 'boton boton-enlace peligro', text: 'Quitar', 'aria-label': `Quitar lote ${nombre}` });
        accionProtegida(botonEditar, () => editar(lote));
        accionProtegida(botonQuitar, () => quitar(lote));
        fijarHabilitado(botonEditar, habilitada);
        fijarHabilitado(botonQuitar, habilitada);
        const parametros = textosParametros(lote);
        return crear('tr', { 'data-editando': String(lote.id === editando) }, [
          crear('td', {}, [
            crear('div', { class: 'mono', text: lote.numeroLote ?? 'Sin número' }),
            lote.ordenCompra ? crear('div', { class: 'secundario mono', text: lote.ordenCompra }) : null,
          ]),
          crear('td', {}, [nombreProducto(lote.producto)]),
          crear('td', {}, [
            parametros.length > 0
              ? crear('ul', { class: 'lista-parametros' }, parametros.map((t) => crear('li', { text: t })))
              : crear('span', { class: 'secundario', text: 'Sin parámetros' }),
          ]),
          crear('td', {}, [insigniaEstado(lote.estado)]),
          crear('td', { class: 'acciones-fila' }, [botonEditar, botonQuitar]),
        ]);
      })
    );
  };
}

/**
 * FormularioLote (REQ-LOT-02 a 23, 29 a 34; DD-10, DD-12).
 * @param {HTMLElement} contenedor
 * @param {Store} store
 * @returns {(estado: EstadoApp, habilitada: boolean) => void}
 */
function montarFormularioLote(contenedor, store) {
  /** @type {object|null} */
  let formularioPintado = null;
  /** @type {((estado: EstadoApp, habilitada: boolean) => void)|null} */
  let actualizarAbierto = null;

  return (estado, habilitada) => {
    const f = estado.formularioLote;
    // Se construye una vez por formulario abierto (modo + lote).
    const clave = f ? `${f.modo}:${f.loteId}` : null;
    if (clave !== formularioPintado) {
      formularioPintado = clave;
      if (!f) {
        contenedor.replaceChildren();
        actualizarAbierto = null;
      } else {
        actualizarAbierto = construirFormulario(contenedor, store);
      }
    }
    actualizarAbierto?.(estado, habilitada);
  };
}

/**
 * @param {HTMLElement} contenedor
 * @param {Store} store
 * @returns {(estado: EstadoApp, habilitada: boolean) => void}
 */
function construirFormulario(contenedor, store) {
  const titulo = crear('h3', { id: 'titulo-formulario-lote' });
  const estadoVisible = crear('span', { class: 'estado-visible', role: 'status' });
  const errorInspeccion = crear('p', { class: 'error-campo', role: 'alert' });

  // Producto: radios con color generados desde PRODUCTOS (REQ-LOT-03, REQ-PER-06).
  const errorProducto = crear('p', { class: 'error-campo', id: 'error-producto' });
  const radiosProducto = PRODUCTOS.map((p) => crear('input', { type: 'radio', name: 'producto', value: p, id: `producto-${p}` }));
  const grupoProducto = crear('fieldset', { class: 'campo', 'aria-required': 'true' }, [
    crear('legend', {}, ['Producto', crear('span', { class: 'requerido', 'aria-hidden': 'true', text: '*' })]),
    crear('div', { class: 'productos' }, PRODUCTOS.map((p, i) => crear('label', { class: 'producto-opcion', for: `producto-${p}` }, [radiosProducto[i], crear('span', { class: `punto punto-${p}`, 'aria-hidden': 'true' }), p]))),
    errorProducto,
  ]);
  for (const radio of radiosProducto) {
    radio.addEventListener('change', () => store.actualizarBorrador('producto', /** @type {Producto} */ (radio.value)));
  }

  /** @param {'numeroLote'|'ordenCompra'} campo @param {string} texto @param {string} ejemplo */
  const campoTexto = (campo, texto, ejemplo) => {
    const id = `lote-${campo}`;
    const entrada = crear('input', { id, class: 'entrada mono', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: ejemplo });
    const error = crear('p', { class: 'error-campo', id: `error-${campo}` });
    entrada.addEventListener('input', () => store.actualizarBorrador(campo, entrada.value));
    return { entrada, error, el: crear('div', { class: 'campo' }, [crear('label', { for: id, text: texto }), entrada, error]) };
  };
  const numeroLote = campoTexto('numeroLote', 'Número de lote', 'Ej. BN-0453');
  const ordenCompra = campoTexto('ordenCompra', 'Orden de compra', 'Ej. OC-55822');

  // Parámetros según producto (REQ-LOT-04 a 07).
  const zonaParametros = crear('div', { class: 'campo' });
  /** @type {string|null} */
  let parametrosPintados = null;
  /** @type {Record<string, { control: HTMLElement, error: HTMLElement, entradas: HTMLInputElement[] }>} */
  let controlesParametro = {};

  /**
   * @param {Producto} producto
   * @param {boolean|null} chequeo
   */
  function construirParametros(producto, chequeo) {
    controlesParametro = {};
    const aplican = parametrosQueAplican(producto);
    const deshabilitados = chequeo === false;
    /** @type {HTMLElement[]} */
    const campos = [];
    for (const p of aplican) {
      const error = crear('p', { class: 'error-campo', id: `error-${p}` });
      if (p === 'dentroCalibre') {
        const dentro = crear('input', { type: 'radio', name: 'calibre', value: 'true', id: 'calibre-dentro' });
        const fuera = crear('input', { type: 'radio', name: 'calibre', value: 'false', id: 'calibre-fuera' });
        for (const r of [dentro, fuera]) r.addEventListener('change', () => store.actualizarBorrador('dentroCalibre', r.value === 'true'));
        const grupo = crear('fieldset', { class: 'campo', 'aria-required': String(!deshabilitados) }, [
          crear('legend', {}, ['Calibre', crear('span', { class: 'requerido', 'aria-hidden': 'true', text: '*' })]),
          crear('div', { class: 'segmentado' }, [crear('label', { for: 'calibre-dentro' }, [dentro, 'Dentro de calibre']), crear('label', { for: 'calibre-fuera' }, [fuera, 'Fuera de calibre'])]),
          error,
        ]);
        controlesParametro[p] = { control: grupo, error, entradas: [dentro, fuera] };
        campos.push(grupo);
        continue;
      }
      const id = `lote-${p}`;
      const entrada = crear('input', { id, class: 'entrada mono', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-required': String(!deshabilitados) });
      entrada.addEventListener('input', () => store.actualizarBorrador(p, entrada.value));
      controlesParametro[p] = { control: entrada, error, entradas: [entrada] };
      campos.push(crear('div', { class: 'campo' }, [crear('label', { for: id }, [ETIQUETAS[p], crear('span', { class: 'requerido', 'aria-hidden': 'true', text: '*' })]), entrada, error]));
    }
    zonaParametros.replaceChildren(
      crear('span', { class: 'etiqueta', text: 'Parámetros' }),
      deshabilitados
        ? crear('p', { class: 'nota-vehiculo', text: 'El vehículo no cumple con el chequeo: los parámetros no se valoran y el lote queda Rechazado.' })
        : crear('p', { class: 'leyenda-rangos' }, [crear('strong', { text: 'Rangos de aprobación:' }), textoLeyenda(producto)]),
      crear('div', { class: 'parametros' }, campos)
    );
  }

  // Motivo del rechazo: <output>, lo escribe el sistema (REQ-LOT-17, REQ-UNC-06).
  const motivo = crear('output', { id: 'lote-motivo', class: 'motivo', 'aria-labelledby': 'lote-motivo-etiqueta' });
  const campoMotivo = crear('div', { class: 'campo' }, [
    crear('span', { class: 'etiqueta', id: 'lote-motivo-etiqueta' }, ['Motivo del rechazo', crear('span', { class: 'opcional', text: 'autogenerado' })]),
    motivo,
  ]);

  // Observaciones del inspector y aviso de REQ-LOT-19.
  const observaciones = crear('textarea', { id: 'lote-observaciones', class: 'entrada', placeholder: 'Comentarios del inspector', rows: 3 });
  const errorObservaciones = crear('p', { class: 'error-campo', id: 'error-observaciones' });
  const avisoObservaciones = crear('p', { class: 'aviso-observaciones', id: 'aviso-observaciones', role: 'status' });
  observaciones.addEventListener('input', () => store.actualizarBorrador('observaciones', observaciones.value));
  const campoObservaciones = crear('div', { class: 'campo' }, [
    crear('label', { for: 'lote-observaciones' }, ['Observaciones', crear('span', { class: 'opcional', text: 'opcional' })]),
    observaciones,
    errorObservaciones,
    avisoObservaciones,
  ]);

  const guardar = crear('button', { type: 'button', class: 'boton boton-primario', text: 'Guardar lote' });
  const cerrar = crear('button', { type: 'button', class: 'boton', text: 'Cerrar sin guardar' });
  const errorGuardado = crear('p', { class: 'error-campo', role: 'alert' });

  accionProtegida(guardar, () => {
    const ok = store.guardarLote();
    if (!ok) requestAnimationFrame(() => /** @type {HTMLElement|null} */ (formulario.querySelector('[aria-invalid="true"]'))?.focus());
  });
  // REQ-LOT-30, 31, 34: confirma solo con cambios sin guardar.
  accionProtegida(cerrar, async () => {
    if (seleccionarCambiosSinGuardar(store.obtenerEstado()) && !(await confirmar(MENSAJES.confirmarCerrarSinGuardar))) return;
    store.cerrarLote();
  });

  const formulario = crear('section', { class: 'formulario-lote', 'aria-labelledby': 'titulo-formulario-lote' }, [
    crear('div', { class: 'formulario-cabecera' }, [titulo, estadoVisible]),
    crear('div', { class: 'formulario-cuerpo' }, [
      errorInspeccion,
      grupoProducto,
      crear('div', { class: 'fila-2' }, [numeroLote.el, ordenCompra.el]),
      zonaParametros,
      crear('div', { class: 'fila-2' }, [campoMotivo, campoObservaciones]),
    ]),
    crear('div', { class: 'formulario-pie' }, [errorGuardado, crear('div', { class: 'acciones' }, [guardar, cerrar])]),
  ]);
  contenedor.replaceChildren(formulario);

  return (estado, habilitada) => {
    const f = estado.formularioLote;
    if (!f) return;
    const b = f.borrador;
    const chequeo = estado.registroEnCurso?.inspeccion.chequeoVehiculo ?? null;

    fijarTexto(titulo, f.modo === 'nuevo' ? 'Lote nuevo' : `Editar lote ${f.original?.numeroLote ?? f.original?.producto ?? ''}`.trim());
    // Estado visible en el encabezado (REQ-LOT-21).
    const visible = seleccionarEstadoVisible(estado) ?? 'Sin producto';
    fijarTexto(estadoVisible, visible === 'Rechazado' ? 'Rechazado · No se recibe' : visible);
    estadoVisible.className = `estado-visible ${visible === 'Aprobado' ? 'estado-Aprobado' : visible === 'Rechazado' ? 'estado-Rechazado' : visible === 'Pendiente de valorar' ? 'estado-Pendiente' : 'estado-neutro'}`;

    // DD-10: el formulario se conserva visible y deshabilitado si la inspección queda incompleta.
    formulario.setAttribute('aria-disabled', String(!habilitada));

    for (const radio of radiosProducto) {
      radio.checked = radio.value === b.producto;
      fijarHabilitado(radio, habilitada);
    }
    mostrarError(grupoProducto, errorProducto, f.errores.producto);
    fijarTexto(errorInspeccion, f.errores.inspeccion ?? '');

    sincronizarValor(numeroLote.entrada, b.numeroLote);
    sincronizarValor(ordenCompra.entrada, b.ordenCompra);
    mostrarError(numeroLote.entrada, numeroLote.error, f.errores.numeroLote);
    mostrarError(ordenCompra.entrada, ordenCompra.error, f.errores.ordenCompra);
    fijarHabilitado(numeroLote.entrada, habilitada);
    fijarHabilitado(ordenCompra.entrada, habilitada);

    // Parámetros: se reconstruyen solo cuando cambian el producto o el chequeo.
    const claveParametros = b.producto === null ? null : `${b.producto}|${chequeo}`;
    if (claveParametros !== parametrosPintados) {
      parametrosPintados = claveParametros;
      if (b.producto === null) {
        zonaParametros.replaceChildren();
        controlesParametro = {};
      } else construirParametros(b.producto, chequeo);
    }
    zonaParametros.hidden = b.producto === null; // REQ-LOT-03: sin producto no hay parámetros
    for (const [p, c] of Object.entries(controlesParametro)) {
      const editables = habilitada && chequeo !== false; // REQ-LOT-06
      if (p === 'dentroCalibre') {
        c.entradas[0].checked = b.dentroCalibre === true;
        c.entradas[1].checked = b.dentroCalibre === false;
      } else {
        sincronizarValor(c.entradas[0], /** @type {string} */ (b[/** @type {'brix'|'temperatura'|'peso'} */ (p)]));
      }
      for (const entrada of c.entradas) fijarHabilitado(entrada, editables);
      mostrarError(c.control, c.error, f.errores[p]);
    }

    fijarTexto(motivo, seleccionarMotivoVisible(estado) ?? '—');

    sincronizarValor(observaciones, b.observaciones);
    fijarHabilitado(observaciones, habilitada);
    mostrarError(observaciones, errorObservaciones, f.errores.observaciones);
    fijarTexto(avisoObservaciones, f.avisoObservaciones ?? '');
    avisoObservaciones.hidden = f.avisoObservaciones === null;

    fijarTexto(errorGuardado, estado.errorGuardado ?? '');
    fijarHabilitado(guardar, habilitada);
    fijarHabilitado(cerrar, true);
  };
}
