// @ts-check
// Datos de demostración para la defensa: registra 110 registros finalizados y 1 en curso usando
// el store real de la app (las mismas acciones que los botones), sobre un almacén en memoria y con
// un reloj simulado. Así cada registro pasa por todas las validaciones e invariantes.
// No forma parte de la app: no se importa desde src/ ni se sirve al navegador.
//
// Uso: node scripts/sembrar-demo.js [archivo de salida]   (por defecto: datos-demo.js)
// Después se pega el contenido del archivo en la consola del navegador, en http://localhost:3000.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { crearStore } from '../src/state/store.js';
import { CLAVE_PESTANA_ACTIVA, PREFIJO, crearStorage } from '../src/state/storage.js';
import { validarRegistro } from '../src/domain/validacionRegistro.js';
import { crearLocalStorageMemoria } from '../tests/helpers/localStorageMemoria.js';

const salida = resolve(process.argv[2] ?? 'datos-demo.js');

const memoria = crearLocalStorageMemoria();
let ahora = new Date();
const storage = crearStorage(memoria, { eventos: null, reloj: () => ahora });
const store = crearStore({ storage, reloj: () => ahora });
store.iniciar();

// ---------------------------------------------------------------- utilidades

/** Fija el reloj a una hora local de Costa Rica (UTC-6). */
function reloj(fecha, hhmm) {
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  ahora = new Date(Date.UTC(y, m - 1, d, h + 6, mi));
}
function avanzar(minutos) {
  ahora = new Date(ahora.getTime() + minutos * 60000);
}

let semilla = 20261026;
function azar() {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
}
const elegir = (arr) => arr[Math.floor(azar() * arr.length)];
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));

function ok(resultado, que) {
  if (resultado === true || resultado?.ok === true) return;
  const e = store.obtenerEstado();
  throw new Error(`Falló «${que}»: ${JSON.stringify(resultado)} ${e.errorGuardado ?? ''} ${JSON.stringify(e.formularioLote?.errores ?? {})}`);
}
function falla(resultado, que) {
  if (resultado === true || resultado?.ok === true) throw new Error(`Se esperaba que «${que}» fuera rechazado`);
  return store.obtenerEstado().formularioLote?.errores ?? {};
}

const escenarios = [];
const nota = (t) => escenarios.push(t);

function inspeccion({ placa, productor, inspector, chequeo }) {
  ok(store.actualizarCampoInspeccion('placa', placa), 'placa');
  avanzar(1);
  ok(store.actualizarCampoInspeccion('productor', productor), 'productor');
  ok(store.actualizarCampoInspeccion('inspector', inspector), 'inspector');
  ok(store.cambiarChequeo(chequeo), 'chequeo');
}

/** Llena el formulario abierto como lo haría el inspector. */
function llenar(l) {
  if (l.producto) store.actualizarBorrador('producto', l.producto);
  for (const campo of ['numeroLote', 'ordenCompra', 'brix', 'temperatura', 'peso', 'observaciones']) {
    if (l[campo] !== undefined) store.actualizarBorrador(campo, l[campo]);
  }
  if (l.dentroCalibre !== undefined) store.actualizarBorrador('dentroCalibre', l.dentroCalibre);
}

function agregarLote(l) {
  ok(store.abrirLoteNuevo(), '+ Lote');
  llenar(l);
  ok(store.guardarLote(), `Guardar lote ${l.numeroLote ?? ''}`);
  avanzar(entre(3, 9));
}

const loteDe = (numeroLote) => store.obtenerEstado().registroEnCurso.lotes.find((x) => x.numeroLote === numeroLote);

// ---------------------------------------------------------------- catálogos

const INSPECTORES = store.obtenerInspectores();
const PRODUCTORES = [
  'Gerald García', 'Finca La Esperanza', 'Cooperativa Agrícola Sarapiquí', 'Hermanos Solano Rojas',
  'María Fernanda Quesada', 'Agroindustrial San Carlos', 'Luis Diego Arias', 'Finca El Roble',
  'Productores Unidos de Upala', 'Carlos Mora Vargas', 'Finca Los Chiles', 'Ana Lucía Jiménez',
];
// Placas que se repiten (con distinta forma de escribirlas) para probar el buscador.
const PLACAS_FRECUENTES = [
  ['CL-276543', 'cl 276543', 'CL276543'],
  ['C-145872', 'c145872'],
  ['SJB-012345', 'sjb 012345'],
  ['CL-301122'],
  ['HDP-998'],
  ['TSJ-4521', 'tsj 4521'],
];
function placaAzar() {
  if (azar() < 0.55) return elegir(elegir(PLACAS_FRECUENTES));
  return `${elegir(['CL', 'C', 'HDP', 'ADC'])}-${entre(100000, 999999)}`;
}
// Números de lote que se repiten entre inspecciones distintas (RN-16 lo permite).
const LOTES_FRECUENTES = ['L-2610-01', 'L-2610-02', 'B-001', 'PL-045', 'YU-12', 'MA-300'];

/** Parámetros por producto: aprobados, en el borde y rechazados (valores de borde de la sección 9). */
const CASOS = {
  Banano: {
    ok: [
      { brix: '3.5', temperatura: '26.0', dentroCalibre: true },
      { brix: '2.0', temperatura: '24.0', dentroCalibre: true },
      { brix: '5.0', temperatura: '30.0', dentroCalibre: true },
      { brix: '4.2', temperatura: '27.5', dentroCalibre: true },
    ],
    mal: [
      { brix: '5.1', temperatura: '26.0', dentroCalibre: true },
      { brix: '1.9', temperatura: '25.0', dentroCalibre: true },
      { brix: '3.0', temperatura: '23.9', dentroCalibre: true },
      { brix: '3.0', temperatura: '30.1', dentroCalibre: true },
      { brix: '4.0', temperatura: '26.0', dentroCalibre: false },
      { brix: '6.2', temperatura: '31.0', dentroCalibre: false },
    ],
  },
  Plátano: {
    ok: [
      { brix: '6.0', temperatura: '25.0', dentroCalibre: true },
      { brix: '8.0', temperatura: '24.0', dentroCalibre: true },
      { brix: '2.0', temperatura: '30.0', dentroCalibre: true },
    ],
    mal: [
      { brix: '8.1', temperatura: '26.0', dentroCalibre: true },
      { brix: '5.0', temperatura: '22.5', dentroCalibre: true },
      { brix: '5.0', temperatura: '27.0', dentroCalibre: false },
      { brix: '9.5', temperatura: '32.0', dentroCalibre: true },
    ],
  },
  Yuca: {
    ok: [{ temperatura: '24.0' }, { temperatura: '30.0' }, { temperatura: '27.3' }],
    mal: [{ temperatura: '23.9' }, { temperatura: '30.1' }, { temperatura: '35.0' }],
  },
  Malanga: {
    ok: [
      { brix: '8.0', temperatura: '26.0', peso: '1235.0' },
      { brix: '4.0', temperatura: '24.0', peso: '400.0' },
      { brix: '12.0', temperatura: '30.0', peso: '2000.0' },
    ],
    mal: [
      { brix: '8.0', temperatura: '26.0', peso: '399.9' },
      { brix: '8.0', temperatura: '26.0', peso: '2000.1' },
      { brix: '3.9', temperatura: '26.0', peso: '900' },
      { brix: '12.1', temperatura: '31.5', peso: '2500' },
    ],
  },
};
const OBSERVACIONES = [
  'Fruta con buen color', 'Cajas húmedas', 'Leve daño mecánico en algunas piezas',
  'Producto limpio', 'Se tomó muestra adicional', 'Llegó con retraso',
];

function loteAzar(numeroLote, chequeo) {
  const producto = elegir(['Banano', 'Plátano', 'Yuca', 'Malanga']);
  const params = chequeo ? (azar() < 0.65 ? elegir(CASOS[producto].ok) : elegir(CASOS[producto].mal)) : {};
  return {
    producto,
    numeroLote,
    ordenCompra: azar() < 0.7 ? `OC-${entre(20000, 20999)}` : undefined,
    observaciones: azar() < 0.3 ? elegir(OBSERVACIONES) : undefined,
    ...params,
  };
}

// ---------------------------------------------------------------- registros

// Días hábiles (lunes a sábado) del 21/09/2026 al 25/10/2026, como texto YYYY-MM-DD.
/** @type {string[]} */
const fechas = [];
for (let d = new Date(Date.UTC(2026, 8, 21)); d <= new Date(Date.UTC(2026, 9, 25)); d = new Date(d.getTime() + 86400000)) {
  const dos = (/** @type {number} */ n) => String(n).padStart(2, '0');
  if (d.getUTCDay() !== 0) fechas.push(`${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`);
}
let consecutivoLote = 1;

/** Escenarios especiales, cada uno en su propio registro. */
const ESPECIALES = [
  // 1. Vehículo que no cumple: todos los lotes Rechazados sin parámetros (RN-07, INV-10).
  () => {
    inspeccion({ placa: 'CL-276543', productor: 'Finca El Roble', inspector: INSPECTORES[0], chequeo: false });
    agregarLote({ producto: 'Banano', numeroLote: 'L-2610-01', ordenCompra: 'OC-20100', observaciones: 'Furgón sucio, restos de químicos' });
    agregarLote({ producto: 'Malanga', numeroLote: 'MA-300' });
    nota('Vehículo «No cumple»: 2 lotes rechazados sin parámetros (placa CL-276543).');
  },
  // 2. Cumple → No cumple con lotes guardados → Cumple: lotes Pendientes de valorar que se valoran después.
  () => {
    inspeccion({ placa: 'C-145872', productor: 'Cooperativa Agrícola Sarapiquí', inspector: INSPECTORES[1], chequeo: true });
    agregarLote({ producto: 'Plátano', numeroLote: 'PL-045', brix: '6.0', temperatura: '25.0', dentroCalibre: true });
    agregarLote({ producto: 'Yuca', numeroLote: 'YU-12', temperatura: '27.0' });
    ok(store.cambiarChequeo(false), 'chequeo a No cumple');
    ok(store.cambiarChequeo(true), 'chequeo a Cumple');
    const r1 = store.finalizarRegistro();
    if (r1.ok) throw new Error('No debía finalizar con lotes Pendientes de valorar');
    for (const [num, p] of [['PL-045', { brix: '7.0', temperatura: '26.0', dentroCalibre: true }], ['YU-12', { temperatura: '31.0' }]]) {
      ok(store.editarLote(loteDe(num).id), 'Editar');
      llenar(p);
      ok(store.guardarLote(), 'Guardar lote editado');
    }
    nota('Chequeo Cumple → No cumple → Cumple: lotes quedaron Pendientes de valorar, Finalizar fue bloqueado y luego se valoraron (PL-045 Aprobado, YU-12 Rechazado).');
  },
  // 3. Errores de digitación bloqueados por el rango válido de entrada y el formato (RN-15).
  () => {
    inspeccion({ placa: 'sjb 012345', productor: 'Ana Lucía Jiménez', inspector: INSPECTORES[2], chequeo: true });
    ok(store.abrirLoteNuevo(), '+ Lote');
    llenar({ producto: 'Malanga', numeroLote: 'MA-301', brix: '31', temperatura: '26.55', peso: '5000.1' });
    const errores = falla(store.guardarLote(), 'lote con valores fuera del rango de entrada');
    llenar({ brix: '9.0', temperatura: '26.5', peso: '1500' });
    ok(store.guardarLote(), 'lote corregido');
    nota(`Rango válido de entrada: Brix 31, temperatura 26.55 y peso 5000.1 se bloquearon (${Object.keys(errores).join(', ')}) y luego se corrigieron.`);
  },
  // 4. Número de lote repetido en la misma inspección, escrito distinto (RN-16, INV-09).
  () => {
    inspeccion({ placa: 'TSJ-4521', productor: 'Hermanos Solano Rojas', inspector: INSPECTORES[0], chequeo: true });
    agregarLote({ producto: 'Banano', numeroLote: 'B-001', brix: '3.5', temperatura: '26.0', dentroCalibre: true });
    ok(store.abrirLoteNuevo(), '+ Lote');
    llenar({ producto: 'Banano', numeroLote: 'b 001', brix: '4.0', temperatura: '27.0', dentroCalibre: true });
    falla(store.guardarLote(), 'número de lote duplicado');
    llenar({ numeroLote: 'B-002' });
    ok(store.guardarLote(), 'lote con número corregido');
    nota('Número de lote duplicado «b 001» = «B-001» en la misma inspección: bloqueado y corregido a B-002.');
  },
  // 5. Cambio de producto en un lote ya guardado: se borran parámetros que no aplican y se recalcula.
  () => {
    inspeccion({ placa: 'HDP-998', productor: 'Finca La Esperanza', inspector: INSPECTORES[1], chequeo: true });
    agregarLote({ producto: 'Malanga', numeroLote: 'L-2610-02', brix: '8.0', temperatura: '26.0', peso: '1200' });
    ok(store.editarLote(loteDe('L-2610-02').id), 'Editar');
    llenar({ producto: 'Yuca' });
    ok(store.guardarLote(), 'Guardar con producto cambiado');
    nota('Producto cambiado de Malanga a Yuca: Brix y peso pasaron a null, se conservó la temperatura (L-2610-02).');
  },
  // 6. «Quitar» un lote antes de finalizar.
  () => {
    inspeccion({ placa: 'CL-301122', productor: 'Luis Diego Arias', inspector: INSPECTORES[2], chequeo: true });
    agregarLote({ producto: 'Yuca', numeroLote: 'YU-90', temperatura: '25.0' });
    agregarLote({ producto: 'Yuca', numeroLote: 'YU-91', temperatura: '26.0' });
    ok(store.quitarLote(loteDe('YU-91').id), 'Quitar');
    nota('Lote YU-91 quitado antes de finalizar; el registro quedó con YU-90.');
  },
  // 7. Rechazo con varios parámetros a la vez (formato del motivo del rechazo).
  () => {
    inspeccion({ placa: 'cl 276543', productor: 'Gerald García', inspector: INSPECTORES[0], chequeo: true });
    agregarLote({ producto: 'Banano', numeroLote: 'L-2610-01', brix: '6.2', temperatura: '31.0', dentroCalibre: false, observaciones: 'Fruta sobremadura' });
    agregarLote({ producto: 'Malanga', numeroLote: 'MA-300', brix: '12.1', temperatura: '31.5', peso: '2500' });
    nota('Rechazo con varios parámetros fuera de rango: Brix, temperatura, calibre y peso.');
  },
  // 8. «Cerrar sin guardar» un borrador; no deja lote.
  () => {
    inspeccion({ placa: 'ADC-555123', productor: 'Carlos Mora Vargas', inspector: INSPECTORES[1], chequeo: true });
    agregarLote({ producto: 'Plátano', numeroLote: 'PL-100', brix: '7.5', temperatura: '28.0', dentroCalibre: true });
    ok(store.abrirLoteNuevo(), '+ Lote');
    llenar({ producto: 'Plátano', numeroLote: 'PL-101', brix: '7.0' });
    store.cerrarLote();
    nota('Borrador PL-101 cerrado sin guardar: el registro solo tiene PL-100.');
  },
];

let total = 0;
function registrar(fecha, hhmm, cuerpo) {
  reloj(fecha, hhmm);
  cuerpo();
  avanzar(entre(4, 15));
  ok(store.finalizarRegistro(), 'Finalizar registro');
  total++;
}

let iFecha = 0;
for (const especial of ESPECIALES) registrar(fechas[iFecha++ % fechas.length], `0${entre(6, 9)}:${entre(10, 50)}`, especial);

// Registro que cruza la medianoche: fecha anclada a horaInicio (RN-01, INV-03).
registrar('2026-10-17', '23:48', () => {
  inspeccion({ placa: 'C-145872', productor: 'Productores Unidos de Upala', inspector: INSPECTORES[2], chequeo: true });
  agregarLote({ producto: 'Yuca', numeroLote: 'YU-12', temperatura: '25.5' });
  avanzar(25);
  agregarLote({ producto: 'Malanga', numeroLote: 'MA-302', brix: '10.0', temperatura: '27.0', peso: '1800' });
});
nota('Registro que cruza la medianoche: inicia 17/10/2026 23:48 y termina el 18/10; la fecha queda 17/10/2026.');

// Registro cancelado: no deja rastro (RN-14, INV-06).
reloj('2026-10-20', '10:05');
inspeccion({ placa: 'CL-999000', productor: 'Finca Los Chiles', inspector: INSPECTORES[0], chequeo: true });
agregarLote({ producto: 'Banano', numeroLote: 'CANCELADO-1', brix: '3.0', temperatura: '26.0', dentroCalibre: true });
ok(store.cancelarRegistro(), 'Cancelar registro');
nota('Registro con placa CL-999000 cancelado: no aparece en Consultas.');

// Registros generales hasta superar los 100.
while (total < 110) {
  const fecha = fechas[iFecha++ % fechas.length];
  registrar(fecha, `${String(entre(5, 16)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}`, () => {
    const chequeo = azar() < 0.88;
    inspeccion({ placa: placaAzar(), productor: elegir(PRODUCTORES), inspector: elegir(INSPECTORES), chequeo });
    const cantidad = elegir([1, 1, 2, 2, 3, 4, 5]);
    const usados = new Set();
    for (let i = 0; i < cantidad; i++) {
      let numero = azar() < 0.35 ? elegir(LOTES_FRECUENTES) : `L-${String(consecutivoLote++).padStart(4, '0')}`;
      if (usados.has(numero)) numero = `L-${String(consecutivoLote++).padStart(4, '0')}`;
      usados.add(numero);
      agregarLote(loteAzar(azar() < 0.05 ? undefined : numero, chequeo));
    }
  });
}

// Un registro queda en curso, para mostrar que se retoma al abrir la página (REQ-REG-09).
reloj('2026-10-26', '07:40');
inspeccion({ placa: 'CL-276543', productor: 'Finca El Roble', inspector: INSPECTORES[1], chequeo: true });
agregarLote({ producto: 'Banano', numeroLote: 'L-2610-01', brix: '4.5', temperatura: '25.0', dentroCalibre: true });
nota('Queda un registro en curso (placa CL-276543, 26/10/2026 07:40) con 1 lote, para comprobar que se retoma.');

// ---------------------------------------------------------------- resumen y salida

// Verificación: la app relee todo sin avisos y ningún registro viola un invariante.
const lectura = storage.leerRegistros();
if (lectura.avisos.length) throw new Error(`Avisos al releer: ${lectura.avisos}`);
for (const r of [...lectura.finalizados, ...(lectura.enCurso ? [lectura.enCurso] : [])]) {
  const violaciones = validarRegistro(r, null);
  if (violaciones.length) throw new Error(`El registro ${r.inspeccion.placa} viola ${violaciones.join(', ')}`);
}
const lotes = lectura.finalizados.flatMap((r) => r.lotes);
const cuenta = (f) => lotes.filter(f).length;
const porProducto = Object.fromEntries(['Banano', 'Plátano', 'Yuca', 'Malanga'].map((p) => [p, cuenta((l) => l.producto === p)]));
const resumen = {
  registrosFinalizados: lectura.finalizados.length,
  registroEnCurso: lectura.enCurso ? 1 : 0,
  lotes: lotes.length,
  aprobados: cuenta((l) => l.estado === 'Aprobado'),
  rechazados: cuenta((l) => l.estado === 'Rechazado'),
  vehiculosNoCumple: lectura.finalizados.filter((r) => r.inspeccion.chequeoVehiculo === false).length,
  porProducto,
};

const datos = memoria.instantanea();
delete datos[CLAVE_PESTANA_ACTIVA];
// Fragmento para la consola del navegador: borra los datos foas07.v1.* y carga los de demostración.
const fragmento = `// Datos de demostración FO-AS-07 (${resumen.registrosFinalizados} registros finalizados).
(() => {
  const datos = ${JSON.stringify(datos)};
  for (const clave of Object.keys(localStorage)) if (clave.startsWith('${PREFIJO}')) localStorage.removeItem(clave);
  for (const [clave, valor] of Object.entries(datos)) localStorage.setItem(clave, valor);
  location.reload();
})();
`;
writeFileSync(salida, fragmento);
console.log(JSON.stringify(resumen, null, 2));
console.log(escenarios.map((e) => `- ${e}`).join('\n'));
console.log(`Sin violaciones de invariantes. Archivo: ${salida} (${(fragmento.length / 1024).toFixed(0)} KB)`);
