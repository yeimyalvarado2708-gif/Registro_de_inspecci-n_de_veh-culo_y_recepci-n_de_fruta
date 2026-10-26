// @ts-check
// Única fuente de los números del dominio (RNF-11, REQ-UNC-01, 02, 03; DD-03).
// Copia literal de data-contract.json › x-reglas y x-formulario. Una prueba compara
// estas constantes con el contrato para detectar cualquier desalineación.

/** @typedef {import('./tipos.js').Producto} Producto */
/** @typedef {{ min: number, max: number, unidad?: string }} Rango */
/**
 * @typedef {Object} CriterioProducto
 * @property {Rango|null} brix
 * @property {Rango|null} temperatura
 * @property {true|null} dentroCalibre
 * @property {Rango|null} peso
 */

/** Catálogo cerrado de productos, con tilde en Plátano (REQ-UNC-02, REQ-PER-06). */
export const PRODUCTOS = /** @type {readonly Producto[]} */ (Object.freeze(['Banano', 'Plátano', 'Yuca', 'Malanga']));

/** Rango de aprobación por producto (RN-06, tabla 3.3). null = no aplica. Incluye extremos. */
export const CRITERIOS_APROBACION = /** @type {Readonly<Record<Producto, Readonly<CriterioProducto>>>} */ (
  Object.freeze({
    Banano: Object.freeze({ brix: Object.freeze({ min: 2, max: 5 }), temperatura: Object.freeze({ min: 24, max: 30 }), dentroCalibre: true, peso: null }),
    Plátano: Object.freeze({ brix: Object.freeze({ min: 2, max: 8 }), temperatura: Object.freeze({ min: 24, max: 30 }), dentroCalibre: true, peso: null }),
    Yuca: Object.freeze({ brix: null, temperatura: Object.freeze({ min: 24, max: 30 }), dentroCalibre: null, peso: null }),
    Malanga: Object.freeze({ brix: Object.freeze({ min: 4, max: 12 }), temperatura: Object.freeze({ min: 24, max: 30 }), dentroCalibre: null, peso: Object.freeze({ min: 400, max: 2000, unidad: 'g' }) }),
  })
);

/** Rango válido de entrada (RN-15, tabla 3.4). Detecta errores de digitación. */
export const RANGOS_ENTRADA = Object.freeze({
  brix: Object.freeze({ min: 0.0, max: 30.0 }),
  temperatura: Object.freeze({ min: 0.0, max: 50.0, unidad: '°C' }),
  peso: Object.freeze({ min: 1.0, max: 5000.0, unidad: 'g' }),
});

/** Máximo un decimal, validado sobre el texto digitado (REQ-VAL-03, REQ-TEC-08). */
export const PATRON_UN_DECIMAL = /^\d+(\.\d)?$/;

/** Campos que deben tener valor para que la inspección esté completa (RN-01). */
export const CAMPOS_INSPECCION_COMPLETA = Object.freeze(['placa', 'productor', 'inspector', 'chequeoVehiculo']);

/** Metadatos del formulario FO-AS-07 versión 13 (REQ-UI-01, REQ-UNC-01). */
export const FORMULARIO = Object.freeze({
  codigo: 'FO-AS-07',
  nombre: 'Registro de inspección de vehículo y recepción de fruta',
  elaboradoPor: 'Jefe de Calidad',
  version: 13,
  validoDesde: '2025-07-08',
  ultimaRevision: '2025-07-08',
  proximaRevision: '2027-07-08',
});

/** Motivo del rechazo cuando el vehículo no cumple con el chequeo (RN-07, DD-03). */
export const MOTIVO_VEHICULO_NO_CUMPLE = 'No cumple: el vehículo no cumple con el chequeo';

/** Orden de los parámetros en pantalla y en el motivo del rechazo (DD-04). */
export const ORDEN_PARAMETROS = /** @type {readonly import('./tipos.js').Parametro[]} */ (
  Object.freeze(['brix', 'temperatura', 'dentroCalibre', 'peso'])
);

/** Nombre de cada parámetro en pantalla y en el motivo del rechazo. */
export const NOMBRES_PARAMETRO = Object.freeze({
  brix: 'Brix',
  temperatura: 'Temperatura',
  dentroCalibre: 'Calibre',
  peso: 'Peso promedio por pieza',
});
