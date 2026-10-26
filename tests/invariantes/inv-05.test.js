// @ts-check
// INV-05 · Finalizado es inmutable (RN-10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debeRechazarse, preparar } from '../helpers/invariantes.js';
import { copia, lote } from '../helpers/fabrica.js';
import { finalizar } from '../../src/domain/registro.js';

function finalizado() {
  const datos = preparar();
  const f = finalizar(datos.enCurso, { fechaHora: '2026-10-25T18:00' });
  assert.deepEqual(datos.storage.guardarRegistroFinalizado(f), { ok: true });
  return { ...datos, f };
}

test('INV-05: reescribir un finalizado se rechaza', () => {
  const { ls, storage, f } = finalizado();
  const n = copia(f);
  n.lotes[0].ordenCompra = 'OC-1';
  debeRechazarse(ls, () => storage.guardarRegistroFinalizado(n), 'INV-05');
});

test('INV-05: agregarle un lote o volverlo a poner en curso se rechaza', () => {
  const { ls, storage, f } = finalizado();
  const conLote = copia(f);
  conLote.lotes.push(lote(f.inspeccion.id));
  debeRechazarse(ls, () => storage.guardarRegistroFinalizado(conLote), 'INV-05');
  const reabierto = copia(f);
  reabierto.inspeccion.horaFin = null;
  debeRechazarse(ls, () => storage.guardarRegistroEnCurso(reabierto), 'INV-05');
});

test('INV-05: un finalizado no se cancela', () => {
  const { ls, storage, f } = finalizado();
  debeRechazarse(ls, () => storage.eliminarRegistroEnCurso(f.inspeccion.id), 'INV-05');
  assert.equal(storage.leerRegistros().finalizados.length, 1);
});
