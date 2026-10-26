// @ts-check
// INV-18 · Placa en mayúsculas (CT-08).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia } from '../helpers/fabrica.js';

test("INV-18: placa = 'cl76543 ' se rechaza", () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.placa = 'cl76543 ';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-18');
});

test("INV-18: placa = 'cl76543' se rechaza", () => {
  const { ls, storage, enCurso } = preparar();
  const n = copia(enCurso);
  n.inspeccion.placa = 'cl76543';
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(n), 'INV-18');
});
