// @ts-check
// Marco común: MenuLateral, EncabezadoFormulario, Reloj y ZonaAvisos
// (REQ-UI-01, 02, 03, 04, 06; REQ-UNC-01, 18; REQ-VAL-26, 32).

import { FORMULARIO } from '../domain/criterios.js';
import { MENSAJES } from '../domain/mensajes.js';
import { ahoraCostaRica, formatoFecha } from '../domain/tiempo.js';
import { crear, fijarTexto, icono } from './comunes.js';

/** @typedef {import('../state/store.js').Store} Store */
/** @typedef {import('../state/store.js').EstadoApp} EstadoApp */

/**
 * Menú lateral con logo, secciones Operación / Referencia e insignia «En curso».
 * @param {HTMLElement} contenedor
 * @param {Store} store
 */
export function montarMenuLateral(contenedor, store) {
  /** @param {string} href @param {'registro'|'buscar'|'tabla'} nombreIcono @param {string} texto */
  const enlace = (href, nombreIcono, texto) =>
    crear('a', { class: 'menu-enlace', href }, [icono(nombreIcono), crear('span', { text: texto })]);

  const enlaceRegistro = enlace('#/registro', 'registro', 'Registro de recepción');
  const insignia = crear('span', { class: 'menu-insignia', text: 'En curso' });
  const enlaceConsultas = enlace('#/consultas', 'buscar', 'Consultas');
  const enlaceCriterios = enlace('#/criterios', 'tabla', 'Criterios de aceptación');
  const leyendaLocal = crear('p', { text: 'Los registros se guardan solo en este equipo y navegador.' });

  contenedor.replaceChildren(
    crear('div', { class: 'menu-logo' }, [
      crear('img', { src: 'assets/logo-alimentos-bermudez.png', alt: 'Alimentos Bermúdez S.A.', width: 844, height: 304 }),
    ]),
    crear('p', { class: 'menu-area', text: 'Calidad · Recepción de materia prima' }),
    crear('nav', { 'aria-label': 'Secciones' }, [
      crear('p', { class: 'menu-seccion', id: 'menu-operacion', text: 'Operación' }),
      crear('ul', { class: 'menu-lista', 'aria-labelledby': 'menu-operacion' }, [crear('li', {}, [enlaceRegistro]), crear('li', {}, [enlaceConsultas])]),
      crear('p', { class: 'menu-seccion', id: 'menu-referencia', text: 'Referencia' }),
      crear('ul', { class: 'menu-lista', 'aria-labelledby': 'menu-referencia' }, [crear('li', {}, [enlaceCriterios])]),
    ]),
    crear('div', { class: 'menu-pie' }, [crear('p', { text: `Formulario ${FORMULARIO.codigo} · v${FORMULARIO.version}` }), leyendaLocal])
  );

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    const activos = { registro: enlaceRegistro, consultas: enlaceConsultas, criterios: enlaceCriterios };
    for (const [pantalla, el] of Object.entries(activos)) {
      if (pantalla === estado.pantalla) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
    // REQ-UI-04: insignia «En curso» si hay un registro con horaFin = null.
    if (estado.registroEnCurso && !insignia.isConnected) enlaceRegistro.append(insignia);
    if (!estado.registroEnCurso && insignia.isConnected) insignia.remove();
    // REQ-UI-06: leyenda solo si el almacenamiento está disponible.
    leyendaLocal.hidden = !estado.almacenamientoDisponible;
  }
  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}

/**
 * Encabezado con el reloj de Costa Rica (REQ-UI-01). Los metadatos del FO-AS-07 no se muestran
 * por decisión del Head Chef del 26/10/2026.
 * @param {HTMLElement} contenedor
 */
export function montarEncabezado(contenedor) {
  const reloj = crear('div', { class: 'reloj', id: 'reloj' });
  contenedor.replaceChildren(reloj);
  return reloj;
}

/**
 * Reloj HH:mm:ss + DD/MM/YYYY · Costa Rica. Avanza cada segundo solo con la pestaña visible
 * y se resincroniza al volver a ella (REQ-UI-02). Cada tic avisa al store para «Transcurrido».
 * @param {HTMLElement} contenedor
 * @param {Store} store
 * @param {() => Date} [reloj]
 */
export function montarReloj(contenedor, store, reloj = () => new Date()) {
  const hora = crear('div', { class: 'reloj-hora' });
  const fecha = crear('div', { class: 'reloj-fecha' });
  contenedor.replaceChildren(crear('time', { 'aria-label': 'Hora de Costa Rica' }, [hora]), fecha);

  function tic() {
    if (document.visibilityState !== 'visible') return;
    const ahora = ahoraCostaRica(reloj());
    fijarTexto(hora, `${ahora.fechaHora.slice(11, 16)}:${ahora.segundos}`);
    fijarTexto(fecha, `${formatoFecha(ahora.fecha)} · Costa Rica`);
    store.tic();
  }
  tic();
  const intervalo = setInterval(tic, 1000);
  document.addEventListener('visibilitychange', tic);
  return () => {
    clearInterval(intervalo);
    document.removeEventListener('visibilitychange', tic);
  };
}

/**
 * Avisos generales (aria-live="polite"): datos dañados, solo lectura, almacenamiento, reloj.
 * El aviso de otra pestaña ofrece «Continuar en esta pestaña» (REQ-VAL-32).
 * @param {HTMLElement} contenedor
 * @param {Store} store
 */
export function montarZonaAvisos(contenedor, store) {
  /** @type {string[]} */
  let mostrados = [];
  /** @type {string|null} */
  let errorMostrado = null;

  /** @param {EstadoApp} estado */
  function actualizar(estado) {
    // El error de guardado se muestra aquí cuando no hay un formulario de lote abierto (REQ-PER-12).
    const error = estado.formularioLote ? null : estado.errorGuardado;
    if (error === errorMostrado && estado.avisos.length === mostrados.length && estado.avisos.every((a, i) => a === mostrados[i])) return;
    mostrados = estado.avisos;
    errorMostrado = error;
    /** @type {HTMLElement[]} */
    const alerta = [];
    if (error) {
      const cerrar = crear('button', { type: 'button', class: 'boton boton-enlace', text: 'Cerrar aviso' });
      cerrar.addEventListener('click', () => store.descartarError());
      alerta.push(crear('div', { class: 'aviso aviso-error', role: 'alert' }, [crear('p', { class: 'aviso-texto', text: error }), cerrar]));
    }
    contenedor.replaceChildren(
      ...alerta,
      ...estado.avisos.map((texto) => {
        const persistente =
          texto === MENSAJES.otraPestana || texto === MENSAJES.loteDanadoEnCurso || texto === MENSAJES.almacenamientoNoDisponible;
        const aviso = crear('div', { class: persistente ? 'aviso aviso-error' : 'aviso' }, [crear('p', { class: 'aviso-texto', text: texto })]);
        if (texto === MENSAJES.otraPestana) {
          const continuar = crear('button', { type: 'button', class: 'boton boton-primario', text: 'Continuar en esta pestaña' });
          continuar.addEventListener('click', () => store.continuarEnEstaPestana());
          aviso.append(continuar);
        } else if (!persistente) {
          const cerrar = crear('button', { type: 'button', class: 'boton boton-enlace', text: 'Cerrar aviso' });
          cerrar.addEventListener('click', () => store.descartarAviso(texto));
          aviso.append(cerrar);
        }
        return aviso;
      })
    );
  }
  actualizar(store.obtenerEstado());
  return store.suscribir(actualizar);
}
