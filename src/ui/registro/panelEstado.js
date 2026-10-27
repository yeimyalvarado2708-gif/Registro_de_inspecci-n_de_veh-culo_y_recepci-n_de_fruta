// @ts-check
// PanelEstado (REQ-REG-01 a 08, 10; REQ-VAL-20, 21, 23; WF-05).

import { MENSAJES } from '../../domain/mensajes.js';
import { condicionesQueFaltan } from '../../domain/registro.js';
import { formatoFechaHora, minutosTranscurridos } from '../../domain/tiempo.js';
import { seleccionarCambiosSinGuardar, seleccionarCondiciones, seleccionarContadores } from '../../state/store.js';
import { accionProtegida, confirmar, crear, fijarHabilitado, fijarTexto, icono } from '../comunes.js';

/** @typedef {import('../../state/store.js').Store} Store */
/** @typedef {import('../../state/store.js').EstadoApp} EstadoApp */

/**
 * @param {HTMLElement} contenedor
 * @param {Store} store
 */
export function montarPanelEstado(contenedor, store) {
  const insignia = crear('span', { class: 'insignia insignia-en-curso', text: 'En curso' });
  const placa = crear('dd');
  const inicio = crear('dd');
  const transcurrido = crear('dd');

  /** @param {string} clase @param {string} etiqueta */
  const contador = (clase, etiqueta) => {
    const numero = crear('span', { class: 'contador-numero' });
    return { numero, el: crear('div', { class: `contador ${clase}` }, [numero, crear('span', { class: 'contador-etiqueta', text: etiqueta })]) };
  };
  const aprobados = contador('contador-aprobados', 'Aprobados');
  const rechazados = contador('contador-rechazados', 'Rechazados');
  const pendientes = contador('contador-pendientes', 'Pendientes');

  const condiciones = crear('ul', { class: 'condiciones', 'aria-label': 'Condiciones para finalizar' });
  const mensaje = crear('p', { class: 'mensaje-finalizar', role: 'alert', id: 'mensaje-finalizar' });
  const finalizar = crear('button', { type: 'button', class: 'boton boton-primario boton-ancho', text: 'Finalizar registro', 'aria-describedby': 'mensaje-finalizar' });
  const cancelar = crear('button', { type: 'button', class: 'boton boton-peligro boton-ancho', text: 'Cancelar registro' });

  contenedor.replaceChildren(
    crear('section', { class: 'tarjeta' }, [
      crear('div', { class: 'tarjeta-cabecera' }, [crear('h2', { class: 'tarjeta-titulo', id: 'titulo-estado', text: 'Estado del registro' }), crear('span', { class: 'tarjeta-extra' }, [insignia])]),
      crear('div', { class: 'tarjeta-cuerpo' }, [
        crear('dl', { class: 'datos-registro' }, [
          crear('dt', { text: 'Placa' }), placa,
          crear('dt', { text: 'Inicio' }), inicio,
          crear('dt', { text: 'Transcurrido' }), transcurrido,
        ]),
        crear('div', { class: 'contadores' }, [aprobados.el, rechazados.el, pendientes.el]),
        condiciones,
        mensaje,
        finalizar,
        cancelar,
      ]),
    ])
  );

  // «Finalizar registro» (REQ-REG-02, 03, 04).
  accionProtegida(finalizar, async () => {
    const estado = store.obtenerEstado();
    const faltan = condicionesQueFaltan(estado.registroEnCurso);
    if (faltan.length > 0) {
      fijarTexto(mensaje, MENSAJES.finalizarBloqueado(faltan));
      return;
    }
    fijarTexto(mensaje, '');
    if (seleccionarCambiosSinGuardar(estado)) {
      const t = MENSAJES.confirmarFinalizarConCambios;
      if (!(await confirmar(t))) return;
    }
    const resultado = store.finalizarRegistro();
    if (!resultado.ok && resultado.faltan.length > 0) fijarTexto(mensaje, MENSAJES.finalizarBloqueado(resultado.faltan));
  });

  // «Cancelar registro» (REQ-REG-06, 07, 08, 11).
  accionProtegida(cancelar, async () => {
    const { rechazados: cantidad } = seleccionarContadores(store.obtenerEstado());
    const t = MENSAJES.confirmarCancelarRegistro;
    if (!(await confirmar({ titulo: t.titulo, mensaje: t.mensaje(cantidad), aceptar: t.aceptar, cancelar: t.cancelar }))) return;
    fijarTexto(mensaje, '');
    store.cancelarRegistro();
  });

  /** @type {string} */
  let condicionesPintadas = '';

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    const registro = estado.registroEnCurso;
    const insp = registro?.inspeccion ?? null;
    insignia.hidden = !registro;
    fijarTexto(placa, insp?.placa ?? '—');
    fijarTexto(inicio, insp ? formatoFechaHora(insp.horaInicio) : '—');
    fijarTexto(transcurrido, insp ? `${minutosTranscurridos(insp.horaInicio, estado.ahora)} min` : '—');

    const c = seleccionarContadores(estado);
    fijarTexto(aprobados.numero, String(c.aprobados));
    fijarTexto(rechazados.numero, String(c.rechazados));
    fijarTexto(pendientes.numero, String(c.pendientes));

    const lista = seleccionarCondiciones(estado);
    const clave = lista.map((x) => `${x.texto}:${x.cumple}`).join('|');
    if (clave !== condicionesPintadas) {
      condicionesPintadas = clave;
      condiciones.replaceChildren(
        ...lista.map((x) =>
          crear('li', { class: 'condicion', 'data-cumple': String(x.cumple) }, [
            crear('span', { class: 'marca', 'aria-hidden': 'true' }, [icono('check')]),
            crear('span', { text: x.texto }),
            crear('span', { class: 'sr-only', text: x.cumple ? ' (cumple)' : ' (falta)' }),
          ])
        )
      );
      if (mensaje.textContent && condicionesQueFaltan(registro).length === 0) fijarTexto(mensaje, '');
    }
    if (!registro) fijarTexto(mensaje, '');

    // REQ-REG-11: sin registro en curso, ambos botones deshabilitados.
    const editable = !!registro && estado.almacenamientoDisponible && !estado.soloLectura;
    fijarHabilitado(finalizar, editable);
    // DD-05: con un lote dañado, «Cancelar registro» es la única acción.
    fijarHabilitado(cancelar, !!registro && estado.almacenamientoDisponible && (!estado.soloLectura || estado.motivoSoloLectura === 'loteDanado'));
  }

  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}
