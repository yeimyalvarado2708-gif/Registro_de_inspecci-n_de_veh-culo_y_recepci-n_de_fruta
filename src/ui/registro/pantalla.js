// @ts-check
// PantallaRegistro: rótulo, título, subtítulo (Q-04) y las tres zonas de WF-01.

import { FORMULARIO } from '../../domain/criterios.js';
import { crear } from '../comunes.js';
import { montarTarjetaInspeccion } from './inspeccion.js';
import { montarSeccionLotes } from './lotes.js';
import { montarPanelEstado } from './panelEstado.js';

/**
 * @param {HTMLElement} contenedor
 * @param {import('../../state/store.js').Store} store
 * @returns {() => void}
 */
export function montarPantallaRegistro(contenedor, store) {
  const zonaInspeccion = crear('div');
  const zonaLotes = crear('div');
  const zonaEstado = crear('aside', { class: 'panel-estado', 'aria-labelledby': 'titulo-estado' });

  contenedor.replaceChildren(
    crear('p', { class: 'rotulo', text: FORMULARIO.codigo }),
    crear('h1', { class: 'titulo-pantalla', text: FORMULARIO.nombre }),
    crear('p', {
      class: 'texto-pantalla',
      text: 'Complete la inspección del vehículo para habilitar los lotes. Cada cambio de la inspección se guarda al instante.',
    }),
    crear('div', { class: 'rejilla-registro' }, [crear('div', { class: 'columna' }, [zonaInspeccion, zonaLotes]), zonaEstado])
  );

  const desmontajes = [
    montarTarjetaInspeccion(zonaInspeccion, store),
    montarSeccionLotes(zonaLotes, store),
    montarPanelEstado(zonaEstado, store),
  ];
  return () => {
    for (const d of desmontajes) d();
  };
}
