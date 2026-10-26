// @ts-check
// INV-04 · Finalizado es válido (RN-03).
import { test } from 'node:test';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { finalizar } from '../../src/domain/registro.js';

const fin = { fechaHora: '2026-10-25T18:00' };

test('INV-04: finalizar sin lotes se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [] });
  debeRechazarse(ls, () => storage.guardarRegistroFinalizado(finalizar(enCurso, fin)), 'INV-04');
});

test('INV-04: finalizar con la inspección incompleta se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ inspeccion: { productor: null } });
  debeRechazarse(ls, () => storage.guardarRegistroFinalizado(finalizar(enCurso, fin)), 'INV-04');
});

test('INV-04: finalizar con un lote Pendiente de valorar se rechaza', () => {
  const { ls, storage, enCurso } = preparar({ lotes: [{}, { peso: null }] });
  debeRechazarse(ls, () => storage.guardarRegistroFinalizado(finalizar(enCurso, fin)), 'INV-04');
});
