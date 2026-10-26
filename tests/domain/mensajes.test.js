// @ts-check
// T-1.2 · Textos aprobados (DD-11, Q-01).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MENSAJES } from '../../src/domain/mensajes.js';

test('textos de validación de design §8.2', () => {
  assert.equal(MENSAJES.parametroVacio('brix'), 'Ingrese el valor de Brix.');
  assert.equal(MENSAJES.usarPuntoDecimal, 'Use punto decimal (por ejemplo, 4.5).');
  assert.equal(MENSAJES.valorNegativo, 'El valor no puede ser negativo.');
  assert.equal(MENSAJES.soloNumeros, 'Ingrese solo números con punto decimal.');
  assert.equal(MENSAJES.maximoUnDecimal, 'Se admite como máximo un decimal.');
  assert.equal(MENSAJES.fueraRangoEntrada(0, 30), 'Valor fuera del rango válido de entrada (0.0 a 30.0). Revise la digitación.');
  assert.equal(MENSAJES.calibreSinElegir, 'Elija Dentro de calibre o Fuera de calibre.');
  assert.equal(MENSAJES.productoSinElegir, 'Seleccione un producto.');
  assert.equal(MENSAJES.loteRepetido('BN-0453'), 'El número de lote BN-0453 ya está registrado en esta inspección.');
});

test('sin resultados (REQ-CON-09)', () => {
  assert.equal(MENSAJES.sinResultadosPlaca('CL-1'), 'No hay registros finalizados para la placa CL-1.');
  assert.equal(MENSAJES.sinResultadosLote('BN-1'), 'No hay registros finalizados para el número de lote BN-1.');
});

test('persistencia (REQ-PER-12, DD-05)', () => {
  assert.equal(MENSAJES.sinEspacio, 'No se pudo guardar: el almacenamiento de este equipo está lleno. Los datos siguen en el formulario.');
  assert.equal(
    MENSAJES.loteDanadoEnCurso,
    'Un lote de este registro está dañado y no se puede mostrar. Para no perderlo, el registro quedó en solo lectura. Puede cancelar el registro o pedir revisión del equipo.'
  );
});

test('lote guardado con y sin número (Q-01)', () => {
  assert.equal(MENSAJES.loteGuardado('LT105490', 'Malanga'), 'Lote guardado como LT105490. ¿Llegó otro lote en este vehículo?');
  assert.equal(MENSAJES.loteGuardado(null, 'Malanga'), 'Lote de Malanga guardado. ¿Llegó otro lote en este vehículo?');
});

test('confirmaciones explican el efecto (RNF-05)', () => {
  assert.equal(MENSAJES.confirmarNoCumple.mensaje(3, false), 'Se rechazarán 3 lote(s) guardados y se borrarán sus parámetros.');
  assert.match(MENSAJES.confirmarNoCumple.mensaje(3, true), /El lote abierto en el formulario también perderá sus parámetros\.$/);
  assert.match(MENSAJES.confirmarCancelarRegistro.mensaje(2), /Hay 2 lote\(s\) rechazados: su reporte de rechazo se perderá\./);
  assert.doesNotMatch(MENSAJES.confirmarCancelarRegistro.mensaje(0), /rechazados/);
  assert.match(MENSAJES.confirmarQuitar.mensaje('Banano', 'BN-0453', false), /Banano BN-0453/);
  assert.match(MENSAJES.confirmarQuitar.mensaje('Yuca', null, true), /sin número de lote.*cambios sin guardar/);
  assert.ok(Object.isFrozen(MENSAJES));
});
