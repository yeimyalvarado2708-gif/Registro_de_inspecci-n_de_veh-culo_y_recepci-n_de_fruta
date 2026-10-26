// @ts-check
// Arranque y enrutador por hash (REQ-UI-03, 08; DD-09; Q-03).
//   #/registro (por defecto) · #/consultas · #/consultas/<inspeccionId>
//   #/consultas/<inspeccionId>/lote/<loteId> · #/criterios

import { crearStore, seleccionarCambiosSinGuardar } from '../state/store.js';
import { montarPantallaConsultas } from './consultas.js';
import { montarPantallaCriterios } from './criterios.js';
import { montarEncabezado, montarMenuLateral, montarReloj, montarZonaAvisos } from './layout.js';
import { montarPantallaRegistro } from './registro/pantalla.js';

/** @typedef {import('../state/store.js').Pantalla} Pantalla */

/**
 * Traduce el hash a pantalla y, en Consultas, al detalle elegido.
 * @param {string} hash
 * @returns {{ pantalla: Pantalla, inspeccionId: string|null, loteId: string|null }}
 */
export function interpretarRuta(hash) {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] === 'consultas') {
    const inspeccionId = partes[1] ?? null;
    const loteId = partes[2] === 'lote' ? partes[3] ?? null : null;
    return { pantalla: 'consultas', inspeccionId, loteId };
  }
  if (partes[0] === 'criterios') return { pantalla: 'criterios', inspeccionId: null, loteId: null };
  return { pantalla: 'registro', inspeccionId: null, loteId: null };
}

function arrancar() {
  const store = crearStore();
  store.iniciar();

  const principal = /** @type {HTMLElement} */ (document.getElementById('principal'));
  montarMenuLateral(/** @type {HTMLElement} */ (document.getElementById('menu-lateral')), store);
  const reloj = montarEncabezado(/** @type {HTMLElement} */ (document.getElementById('encabezado')));
  montarReloj(reloj, store);
  montarZonaAvisos(/** @type {HTMLElement} */ (document.getElementById('zona-avisos')), store);

  /** @type {Pantalla|null} */
  let pantallaMontada = null;
  let desmontar = () => {};

  function alCambiarRuta() {
    const ruta = interpretarRuta(location.hash);
    store.navegar(ruta.pantalla);
    if (ruta.pantalla === 'consultas') {
      if (ruta.inspeccionId && ruta.loteId) store.verLote(ruta.inspeccionId, ruta.loteId);
      else if (ruta.inspeccionId) store.verRegistro(ruta.inspeccionId);
      else store.cerrarDetalle();
    }
    if (pantallaMontada !== ruta.pantalla) {
      desmontar();
      pantallaMontada = ruta.pantalla;
      if (ruta.pantalla === 'registro') desmontar = montarPantallaRegistro(principal, store);
      else if (ruta.pantalla === 'consultas') desmontar = montarPantallaConsultas(principal, store);
      else desmontar = montarPantallaCriterios(principal);
    }
  }

  // REQ-VAL-25: aviso del navegador al cerrar o recargar con cambios sin guardar en el lote.
  window.addEventListener('beforeunload', (evento) => {
    if (!seleccionarCambiosSinGuardar(store.obtenerEstado())) return;
    evento.preventDefault();
    evento.returnValue = '';
  });

  // REQ-VAL-26, REQ-PER-15: otra pestaña cambió los datos → relee y queda en solo lectura (DD-02).
  store.alCambiarEnOtraPestana(() => store.recargarDesdeOtraPestana());

  window.addEventListener('hashchange', alCambiarRuta);
  if (!location.hash) history.replaceState(null, '', '#/registro');
  alCambiarRuta();
  return store;
}

if (typeof document !== 'undefined') arrancar();
