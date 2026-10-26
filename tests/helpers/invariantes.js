// @ts-check
// Ayudas para las pruebas de invariantes: intentan violar un invariante escribiendo con
// storage y verifican que la escritura se rechaza y el almacenamiento queda idéntico.

import assert from 'node:assert/strict';
import { crearStorage } from '../../src/state/storage.js';
import { crearLocalStorageMemoria } from './localStorageMemoria.js';
import { copia, registro } from './fabrica.js';

/** @typedef {import('../../src/domain/tipos.js').Registro} Registro */

/**
 * Almacén con un registro en curso ya guardado (y opcionalmente uno finalizado).
 * @param {Parameters<typeof registro>[0]} [datos]
 */
export function preparar(datos) {
  const ls = crearLocalStorageMemoria();
  const storage = crearStorage(ls, { pestanaId: 'pestana-prueba', eventos: null });
  const enCurso = registro(datos);
  const resultado = storage.guardarRegistroEnCurso(enCurso);
  assert.deepEqual(resultado, { ok: true }, 'el registro de partida debe ser válido');
  return { ls, storage, enCurso: copia(enCurso) };
}

/**
 * Ejecuta la escritura y verifica que se rechaza por invariante sin cambiar nada.
 * @param {ReturnType<typeof crearLocalStorageMemoria>} ls
 * @param {() => import('../../src/state/storage.js').ResultadoEscritura} escritura
 * @param {string} [invariante] ID que debe aparecer en el detalle del rechazo
 */
export function debeRechazarse(ls, escritura, invariante) {
  const antes = ls.instantanea();
  const resultado = escritura();
  assert.equal(resultado.ok, false, 'la escritura debió rechazarse');
  if (!resultado.ok) {
    assert.equal(resultado.motivo, 'invariante');
    if (invariante) assert.match(resultado.detalle, new RegExp(invariante), `el rechazo debió citar ${invariante}: ${resultado.detalle}`);
  }
  assert.deepEqual(ls.instantanea(), antes, 'el almacenamiento debió quedar idéntico');
}
