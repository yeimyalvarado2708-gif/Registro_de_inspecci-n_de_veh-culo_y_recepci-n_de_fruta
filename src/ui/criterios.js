// @ts-check
// Pantalla «Criterios de aceptación» (REQ-UI-05, RNF-11, WF-07).
// La tabla se genera desde CRITERIOS_APROBACION: no hay ningún número escrito aquí.

import { CRITERIOS_APROBACION, FORMULARIO, PRODUCTOS } from '../domain/criterios.js';
import { crear } from './comunes.js';

/** @param {{min: number, max: number}|null} rango @param {string} unidad */
const textoRango = (rango, unidad) => (rango === null ? null : `${rango.min} a ${rango.max}${unidad}`);

/** @param {string|null} texto */
const celda = (texto) => (texto === null ? crear('td', { class: 'secundario', text: 'No aplica' }) : crear('td', { class: 'mono', text: texto }));

/**
 * @param {HTMLElement} contenedor
 * @returns {() => void}
 */
export function montarPantallaCriterios(contenedor) {
  const filas = PRODUCTOS.map((producto) => {
    const c = CRITERIOS_APROBACION[producto];
    return crear('tr', {}, [
      crear('th', { scope: 'row' }, [crear('span', { class: 'producto-nombre' }, [crear('span', { class: `punto punto-${producto}`, 'aria-hidden': 'true' }), producto])]),
      celda(textoRango(c.brix, '')),
      celda(textoRango(c.temperatura, ' °C')),
      c.dentroCalibre === null ? celda(null) : crear('td', { text: 'Dentro de calibre' }),
      celda(textoRango(c.peso, ' g')),
    ]);
  });

  contenedor.replaceChildren(
    crear('h1', { class: 'titulo-pantalla', text: 'Criterios de aceptación' }),
    crear('p', {
      class: 'texto-pantalla',
      text: `Rangos de la tabla de especificaciones del ${FORMULARIO.codigo}.`,
    }),
    crear('section', { class: 'tarjeta', 'aria-labelledby': 'titulo-criterios' }, [
      crear('div', { class: 'tarjeta-cabecera' }, [crear('h2', { class: 'tarjeta-titulo', id: 'titulo-criterios', text: 'Criterios por producto' })]),
      crear('table', { class: 'tabla' }, [
        crear('thead', {}, [
          crear('tr', {}, ['Producto', 'Brix', 'Temperatura', 'Calibre', 'Peso por pieza'].map((t) => crear('th', { scope: 'col', text: t }))),
        ]),
        crear('tbody', {}, filas),
      ]),
    ])
  );
  return () => {};
}
