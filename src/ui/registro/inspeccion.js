// @ts-check
// TarjetaInspeccion (REQ-INS-01 a 16; REQ-VAL-30; DD-08; WF-01, WF-02).

import { MENSAJES } from '../../domain/mensajes.js';
import { formatoFecha, formatoHora } from '../../domain/tiempo.js';
import { seleccionarInspeccionCompleta, seleccionarProductoresSugeridos } from '../../state/store.js';
import { confirmar, crear, fijarHabilitado, fijarTexto, icono, sincronizarValor } from '../comunes.js';

/** @typedef {import('../../state/store.js').Store} Store */
/** @typedef {import('../../state/store.js').EstadoApp} EstadoApp */

/**
 * Campo de solo lectura con la etiqueta «Sistema» (REQ-INS-02): <output>, nunca <input>.
 * @param {string} id
 * @param {string} etiqueta
 */
function campoSistema(id, etiqueta) {
  const salida = crear('output', { id, class: 'sistema-valor' });
  const campo = crear('div', { class: 'campo' }, [
    crear('span', { class: 'etiqueta', id: `${id}-etiqueta`, text: etiqueta }),
    crear('div', { class: 'sistema', role: 'group', 'aria-labelledby': `${id}-etiqueta` }, [salida, crear('span', { class: 'sistema-etiqueta', text: 'Sistema' })]),
  ]);
  return { campo, salida };
}

/**
 * @param {HTMLElement} contenedor
 * @param {Store} store
 */
export function montarTarjetaInspeccion(contenedor, store) {
  const inspectores = store.obtenerInspectores();

  const paso = crear('span', { class: 'paso', 'aria-hidden': 'true' });
  const completa = crear('span', { class: 'sr-only' });
  const guardado = crear('span', { class: 'guardado tarjeta-extra', role: 'status' });

  const fecha = campoSistema('insp-fecha', 'Fecha de entrada');
  const inicio = campoSistema('insp-inicio', 'Hora de inicio');
  const fin = campoSistema('insp-fin', 'Hora de fin');

  const placa = crear('input', { id: 'insp-placa', class: 'entrada mono', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-required': 'true' });
  const productor = crear('input', { id: 'insp-productor', class: 'entrada', type: 'text', autocomplete: 'off', list: 'insp-productores', 'aria-required': 'true' });
  const listaProductores = crear('datalist', { id: 'insp-productores' });
  const inspector = crear('select', { id: 'insp-inspector', class: 'entrada', 'aria-required': 'true' });
  const avisoInspectores = crear('p', { id: 'insp-inspector-aviso', class: 'error-campo' });

  const radioCumple = crear('input', { type: 'radio', name: 'chequeo', value: 'true', id: 'chequeo-cumple' });
  const radioNoCumple = crear('input', { type: 'radio', name: 'chequeo', value: 'false', id: 'chequeo-no-cumple' });
  const chequeo = crear('fieldset', { class: 'campo', 'aria-describedby': 'chequeo-ayuda', 'aria-required': 'true' }, [
    crear('legend', {}, ['Chequeo del vehículo', crear('span', { class: 'requerido', 'aria-hidden': 'true', text: '*' })]),
    crear('div', { class: 'segmentado chequeo' }, [
      crear('label', { for: 'chequeo-cumple' }, [radioCumple, 'Cumple']),
      crear('label', { for: 'chequeo-no-cumple' }, [radioNoCumple, 'No cumple']),
    ]),
    crear('p', { id: 'chequeo-ayuda', class: 'ayuda', text: 'Valoración visual de los requisitos de transporte de materia prima.' }),
  ]);

  /** @param {string} id @param {string} texto */
  const etiqueta = (id, texto) => crear('label', { for: id }, [texto, crear('span', { class: 'requerido', 'aria-hidden': 'true', text: '*' })]);

  contenedor.replaceChildren(
    crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-inspeccion' }, [
      crear('div', { class: 'tarjeta-cabecera' }, [
        paso,
        crear('h2', { class: 'tarjeta-titulo', id: 'titulo-inspeccion' }, ['Inspección del vehículo', completa]),
        guardado,
      ]),
      crear('div', { class: 'tarjeta-cuerpo' }, [
        crear('div', { class: 'fila-3' }, [fecha.campo, inicio.campo, fin.campo]),
        crear('div', { class: 'fila-2' }, [
          crear('div', { class: 'campo' }, [etiqueta('insp-placa', 'Número de placa'), placa]),
          crear('div', { class: 'campo' }, [etiqueta('insp-productor', 'Productor'), productor, listaProductores]),
        ]),
        crear('div', { class: 'fila-2' }, [crear('div', { class: 'campo' }, [etiqueta('insp-inspector', 'Nombre del inspector'), inspector, avisoInspectores]), chequeo]),
      ]),
    ])
  );

  // --- Eventos: cada cambio se guarda al instante (REQ-INS-15, REQ-PER-02) ---
  placa.addEventListener('input', () => store.actualizarCampoInspeccion('placa', placa.value));
  placa.addEventListener('blur', () => sincronizarValor(placa, store.obtenerEstado().registroEnCurso?.inspeccion.placa ?? '')); // REQ-INS-04
  productor.addEventListener('input', () => store.actualizarCampoInspeccion('productor', productor.value));
  productor.addEventListener('blur', () => sincronizarValor(productor, store.obtenerEstado().registroEnCurso?.inspeccion.productor ?? ''));
  inspector.addEventListener('change', () => {
    if (!store.actualizarCampoInspeccion('inspector', inspector.value)) {
      inspector.value = store.obtenerEstado().registroEnCurso?.inspeccion.inspector ?? '';
    }
  });

  for (const radio of [radioCumple, radioNoCumple]) {
    radio.addEventListener('change', async () => {
      const valor = radio.value === 'true';
      const estado = store.obtenerEstado();
      const registro = estado.registroEnCurso;
      const lotes = registro?.lotes.length ?? 0;
      // REQ-INS-10: de «Cumple» a «No cumple» con lotes guardados se confirma (DD-08 menciona el formulario abierto).
      if (valor === false && registro?.inspeccion.chequeoVehiculo === true && lotes > 0) {
        const b = estado.formularioLote?.borrador;
        const conParametros = !!b && (b.brix.trim() !== '' || b.temperatura.trim() !== '' || b.peso.trim() !== '' || b.dentroCalibre !== null);
        const textos = MENSAJES.confirmarNoCumple;
        const acepta = await confirmar({ titulo: textos.titulo, mensaje: textos.mensaje(lotes, conParametros), aceptar: textos.aceptar, cancelar: textos.cancelar });
        if (!acepta) {
          actualizar(store.obtenerEstado()); // REQ-INS-12: vuelve a «Cumple»
          return;
        }
      }
      if (!store.cambiarChequeo(valor)) actualizar(store.obtenerEstado());
    });
  }

  /** @type {string} */
  let opcionesInspector = '';

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    const insp = estado.registroEnCurso?.inspeccion ?? null;
    const esCompleta = seleccionarInspeccionCompleta(estado);
    const editable = estado.almacenamientoDisponible && !estado.soloLectura;

    // Cabecera: check de inspección completa (REQ-INS-14) e indicador de guardado (REQ-INS-16).
    paso.dataset.completo = String(esCompleta);
    paso.replaceChildren(esCompleta ? icono('check') : document.createTextNode('1'));
    fijarTexto(completa, esCompleta ? ' (completa)' : ' (incompleta)');
    if (estado.ultimoGuardado && insp) {
      if (!guardado.firstChild || guardado.textContent !== `Guardado en este equipo · ${estado.ultimoGuardado}`) {
        guardado.replaceChildren(icono('check'), `Guardado en este equipo · ${estado.ultimoGuardado}`);
      }
    } else if (guardado.firstChild) guardado.replaceChildren();

    // Campos del sistema (REQ-INS-02, REQ-UI-07).
    fijarTexto(fecha.salida, insp ? formatoFecha(insp.fecha) : '—');
    fijarTexto(inicio.salida, insp ? formatoHora(insp.horaInicio) : '—');
    fijarTexto(fin.salida, insp?.horaFin ? formatoHora(insp.horaFin) : 'Al finalizar');

    sincronizarValor(placa, insp?.placa ?? '');
    sincronizarValor(productor, insp?.productor ?? '');

    // Productores sugeridos (REQ-INS-05).
    const sugeridos = seleccionarProductoresSugeridos(estado);
    if (listaProductores.childElementCount !== sugeridos.length || sugeridos.some((p, i) => /** @type {HTMLOptionElement} */ (listaProductores.children[i]).value !== p)) {
      listaProductores.replaceChildren(...sugeridos.map((p) => crear('option', { value: p })));
    }

    // Inspectores: sin opción inicial; el nombre guardado se conserva aunque ya no esté (REQ-INS-06, 07; REQ-VAL-30).
    const guardadoInspector = insp?.inspector ?? null;
    const opciones = [...inspectores];
    if (guardadoInspector !== null && !opciones.includes(guardadoInspector)) opciones.push(guardadoInspector);
    const clave = `${opciones.join('|')}#${guardadoInspector ?? ''}`;
    if (clave !== opcionesInspector) {
      opcionesInspector = clave;
      inspector.replaceChildren(
        crear('option', { value: '', disabled: true, text: 'Seleccione un inspector' }),
        ...opciones.map((nombre) => crear('option', { value: nombre, text: nombre }))
      );
      inspector.value = guardadoInspector ?? '';
    }
    fijarTexto(avisoInspectores, inspectores.length === 0 ? MENSAJES.sinInspectores : '');

    radioCumple.checked = insp?.chequeoVehiculo === true;
    radioNoCumple.checked = insp?.chequeoVehiculo === false;

    for (const control of [placa, productor, radioCumple, radioNoCumple]) fijarHabilitado(control, editable);
    fijarHabilitado(inspector, editable && inspectores.length > 0);
  }

  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}
