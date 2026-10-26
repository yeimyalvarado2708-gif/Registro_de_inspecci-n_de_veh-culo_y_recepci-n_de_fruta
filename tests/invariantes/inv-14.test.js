// @ts-check
// INV-14 · Estado cerrado (RN-05, RN-12).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-14: estado = «Pendiente» se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.lotes[0].estado = /** @type {any} */ ('Pendiente');
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-14');
});

test('INV-14: estado null con chequeo false se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ inspeccion: { chequeoVehiculo: false }, lotes: [{ brix: null, temperatura: null, peso: null }] });
  const n = copia(enCurso);
  n.lotes[0].estado = null;
  n.lotes[0].motivoRechazo = null;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-14');
});
