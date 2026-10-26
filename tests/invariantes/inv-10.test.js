// @ts-check
// INV-10 · Vehículo que no cumple (RN-07).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test('INV-10: chequeo false con un lote Aprobado se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.chequeoVehiculo = false;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-10');
});

test('INV-10: chequeo false con un lote Rechazado que conserva brix se rechaza', () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.chequeoVehiculo = false;
  n.lotes[0].estado = 'Rechazado';
  n.lotes[0].motivoRechazo = 'No cumple: el vehículo no cumple con el chequeo';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-10');
});
