// @ts-check
// T-1.12 · Guardia de contrato e invariantes (REQ-PER-05, DD-13).
// Cada caso parte de un registro válido, lo daña y espera ver el invariante violado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspeccionCumpleContrato, loteCumpleContrato, validarRegistro } from '../../src/domain/validacionRegistro.js';
import { aplicarChequeo } from '../../src/domain/registro.js';
import { copia, registro, uuid } from '../helpers/fabrica.js';

/** @typedef {import('../../src/domain/tipos.js').Registro} Registro */

const base = () =>
  registro({
    lotes: [
      { numeroLote: 'BN-0453', producto: 'Banano', brix: 3, temperatura: 26, peso: null, dentroCalibre: true, observaciones: 'Obs' },
      { producto: 'Yuca', brix: null, peso: null, temperatura: 31 },
    ],
  });

test('un registro válido no viola nada', () => {
  const r = base();
  assert.deepEqual(validarRegistro(r, null), []);
  assert.deepEqual(validarRegistro(r, copia(r)), []);
  assert.ok(inspeccionCumpleContrato(r.inspeccion));
  assert.ok(r.lotes.every(loteCumpleContrato));
});

/**
 * @type {Array<[string, string, (r: Registro) => unknown, ((r: Registro) => Registro|null)?]>}
 * [invariante, descripción, daño, anterior]
 */
const casos = [
  ['INV-02', 'reescribir horaInicio', (r) => { r.inspeccion.horaInicio = '2026-10-25T17:00'; r.inspeccion.fecha = '2026-10-25'; }, (r) => copia(r)],
  ['INV-03', 'fecha distinta de la de horaInicio', (r) => { r.inspeccion.fecha = '2026-10-24'; }],
  ['INV-04', 'finalizar sin lotes', (r) => { r.lotes = []; r.inspeccion.horaFin = '2026-10-25T18:00'; }],
  ['INV-04', 'finalizar con inspección incompleta', (r) => { r.inspeccion.productor = null; r.inspeccion.horaFin = '2026-10-25T18:00'; }],
  ['INV-05', 'reescribir un finalizado', (r) => { r.lotes[0].ordenCompra = 'OC1'; }, (r) => { const f = copia(r); f.inspeccion.horaFin = '2026-10-25T18:00'; return f; }],
  ['INV-07', 'lote con inspeccionId ajeno', (r) => { r.lotes[0].inspeccionId = uuid(); }],
  ['INV-08', '«Platano» sin tilde', (r) => { r.lotes[0].producto = /** @type {any} */ ('Platano'); }],
  ['INV-08', 'producto null', (r) => { r.lotes[0].producto = /** @type {any} */ (null); }],
  ['INV-09', 'BN-0453 y bn 0453 en la misma inspección', (r) => { r.lotes[1].numeroLote = 'BN 0453'; }],
  ['INV-10', 'chequeo false con un lote Aprobado', (r) => { r.inspeccion.chequeoVehiculo = false; }],
  ['INV-11', 'Yuca con brix', (r) => { r.lotes[1].brix = 4; }],
  ['INV-11', 'Banano con peso', (r) => { r.lotes[0].peso = 100; }],
  ['INV-12', 'brix = 30.1', (r) => { r.lotes[0].brix = 30.1; }],
  ['INV-12', 'temperatura = -1', (r) => { r.lotes[0].temperatura = -1; }],
  ['INV-12', 'brix con dos decimales', (r) => { r.lotes[0].brix = 4.25; }],
  ['INV-13', 'Aprobado con Brix 6.2 en Banano', (r) => { r.lotes[0].brix = 6.2; }],
  ['INV-14', 'estado = «Pendiente»', (r) => { r.lotes[0].estado = /** @type {any} */ ('Pendiente'); }],
  ['INV-14', 'estado null con chequeo false', (r) => { const n = aplicarChequeo(r, false); n.lotes[0].estado = null; n.lotes[0].motivoRechazo = null; Object.assign(r, n); }],
  ['INV-15', 'Rechazado sin motivo', (r) => { r.lotes[1].motivoRechazo = null; }],
  ['INV-15', 'Aprobado con motivo', (r) => { r.lotes[0].motivoRechazo = 'No cumple: algo'; }],
  ['INV-16', 'observaciones alteradas en un lote no editado', (r) => { r.lotes[0].observaciones = 'Otra'; }, (r) => copia(r)],
  ['INV-17', 'productor con solo espacios', (r) => { r.inspeccion.productor = '  '; }],
  ['INV-17', 'ordenCompra vacía', (r) => { r.lotes[0].ordenCompra = ''; }],
  ['INV-17', 'campo undefined', (r) => { /** @type {any} */ (r.lotes[0]).observaciones = undefined; }],
  ['INV-18', 'placa «cl76543 »', (r) => { r.inspeccion.placa = 'cl76543 '; }],
  ['INV-18', 'placa en minúsculas', (r) => { r.inspeccion.placa = 'cl76543'; }],
  ['INV-19', 'id no v4', (r) => { r.lotes[0].id = '00000000-0000-1000-8000-000000000001'; }],
  ['INV-19', 'id de la inspección cambiado', (r) => { r.inspeccion.id = uuid(); for (const l of r.lotes) l.inspeccionId = r.inspeccion.id; }, (r) => copia(r)],
  ['INV-20', 'campo extra', (r) => { /** @type {any} */ (r.lotes[0]).extra = 1; }],
  ['INV-20', 'campo renombrado', (r) => { const l = /** @type {any} */ (r.lotes[0]); l.numero = l.numeroLote; delete l.numeroLote; }],
];

for (const [invariante, descripcion, danar, anteriorDe] of casos) {
  test(`${invariante}: ${descripcion}`, () => {
    const r = base();
    const anterior = anteriorDe ? anteriorDe(r) : null;
    danar(r);
    assert.ok(validarRegistro(r, anterior).includes(invariante), `esperaba ${invariante}, obtuvo ${validarRegistro(r, anterior)}`);
  });
}

test('INV-16: el lote que se guarda con «Guardar lote» sí puede cambiar sus observaciones', () => {
  const r = base();
  const anterior = copia(r);
  r.lotes[0].observaciones = 'Nueva';
  assert.deepEqual(validarRegistro(r, anterior, { loteEditadoId: r.lotes[0].id }), []);
});

test('INV-09: el mismo número en otra inspección y dos lotes sin número sí se permiten', () => {
  const r = base();
  r.lotes[0].numeroLote = null;
  assert.deepEqual(validarRegistro(r, null), []);
});

test('raíz que no es un registro', () => {
  assert.deepEqual(validarRegistro(null, null), ['INV-20']);
  assert.ok(validarRegistro({ inspeccion: {} }, null).includes('INV-20'));
});
