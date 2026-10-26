// @ts-check
// Tipos del dominio, equivalentes a data-contract.json v1.0.0 (REQ-TEC-02, INV-20).
// Este módulo solo declara tipos; no exporta valores.

/** @typedef {'Banano' | 'Plátano' | 'Yuca' | 'Malanga'} Producto */

/** @typedef {'Aprobado' | 'Rechazado' | null} EstadoLote  null = Pendiente de valorar (no es un tercer estado) */

/** @typedef {'brix' | 'temperatura' | 'dentroCalibre' | 'peso'} Parametro */

/** @typedef {'brix' | 'temperatura' | 'peso'} ParametroNumerico */

/**
 * Datos de llegada del vehículo (8 claves).
 * @typedef {Object} InspeccionVehiculo
 * @property {string} id                     UUID v4, lo asigna el sistema
 * @property {string} fecha                  YYYY-MM-DD, sistema, = fecha de horaInicio (INV-03)
 * @property {string} horaInicio             YYYY-MM-DDTHH:mm, sistema (INV-02)
 * @property {string|null} placa             mayúsculas, sin espacios al inicio o al final (INV-18)
 * @property {string|null} productor
 * @property {string|null} inspector
 * @property {string|null} horaFin           null = registro en curso
 * @property {boolean|null} chequeoVehiculo  true = Cumple, false = No cumple, null = sin elegir
 */

/**
 * Porción de producto recibida en una inspección (12 claves).
 * @typedef {Object} LoteMateriaPrima
 * @property {string} id                     UUID v4, sistema
 * @property {string} inspeccionId           = InspeccionVehiculo.id (INV-07)
 * @property {string|null} numeroLote        mayúsculas, único normalizado por inspección (INV-09)
 * @property {string|null} ordenCompra
 * @property {Producto} producto
 * @property {boolean|null} dentroCalibre
 * @property {number|null} brix
 * @property {number|null} temperatura
 * @property {number|null} peso
 * @property {EstadoLote} estado             calculado por el sistema (INV-13)
 * @property {string|null} observaciones     del inspector; el sistema no las altera (INV-16)
 * @property {string|null} motivoRechazo     del sistema; texto solo si estado = Rechazado (INV-15)
 */

/**
 * Raíz del contrato: una inspección junto con todos sus lotes.
 * @typedef {Object} Registro
 * @property {InspeccionVehiculo} inspeccion
 * @property {LoteMateriaPrima[]} lotes
 */

/**
 * Contenido en memoria del formulario de un lote antes de «Guardar lote».
 * Los parámetros numéricos se guardan como TEXTO para validar formato y decimales
 * antes de convertirlos (REQ-TEC-08). Nunca se persiste (REQ-PER-03).
 * @typedef {Object} Borrador
 * @property {Producto|null} producto
 * @property {string} numeroLote
 * @property {string} ordenCompra
 * @property {string} observaciones
 * @property {string} brix
 * @property {string} temperatura
 * @property {string} peso
 * @property {boolean|null} dentroCalibre
 */

/**
 * Estado del formulario del lote abierto (solo memoria).
 * @typedef {Object} FormularioLote
 * @property {'nuevo'|'edicion'} modo
 * @property {string|null} loteId                 id del lote editado; null si es nuevo
 * @property {Borrador} borrador
 * @property {LoteMateriaPrima|null} original      última versión guardada (null si es nuevo)
 * @property {Record<string, string>} errores      mensaje por campo
 * @property {string|null} avisoObservaciones      REQ-LOT-19
 * @property {EstadoLote} ultimoEstadoCalculado    último Aprobado / Rechazado del lote (DD-12)
 */

export {};
