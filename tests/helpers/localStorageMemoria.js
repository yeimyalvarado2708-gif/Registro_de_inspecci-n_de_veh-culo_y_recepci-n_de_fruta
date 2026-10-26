// @ts-check
// Almacén en memoria con la misma interfaz que el almacenamiento web (REQ-TEC-10).
// Permite simular falta de espacio (REQ-PER-12) y almacenamiento no disponible (REQ-PER-14).

/**
 * @param {{ limiteBytes?: number, noDisponible?: boolean }} [opciones]
 *   limiteBytes: tamaño máximo (claves + valores, en caracteres UTF-16 × 2).
 *   noDisponible: si es true, cualquier acceso lanza un error de seguridad.
 */
export function crearLocalStorageMemoria(opciones = {}) {
  /** @type {Map<string, string>} */
  const datos = new Map();
  let limiteBytes = opciones.limiteBytes ?? Infinity;
  let noDisponible = opciones.noDisponible ?? false;

  function verificarAcceso() {
    if (noDisponible) throw new DOMException('El almacenamiento no está disponible.', 'SecurityError');
  }

  /** Bytes ocupados si la clave tuviera el valor indicado. */
  function bytesCon(clave, valor) {
    let total = 0;
    for (const [k, v] of datos) {
      if (k === clave) continue;
      total += (k.length + v.length) * 2;
    }
    return total + (clave.length + valor.length) * 2;
  }

  return {
    get length() {
      verificarAcceso();
      return datos.size;
    },
    /** @param {number} indice */
    key(indice) {
      verificarAcceso();
      return [...datos.keys()][indice] ?? null;
    },
    /** @param {string} clave */
    getItem(clave) {
      verificarAcceso();
      return datos.has(String(clave)) ? /** @type {string} */ (datos.get(String(clave))) : null;
    },
    /** @param {string} clave @param {string} valor */
    setItem(clave, valor) {
      verificarAcceso();
      const k = String(clave);
      const v = String(valor);
      if (bytesCon(k, v) > limiteBytes) {
        throw new DOMException('Se excedió la cuota de almacenamiento.', 'QuotaExceededError');
      }
      datos.set(k, v);
    },
    /** @param {string} clave */
    removeItem(clave) {
      verificarAcceso();
      datos.delete(String(clave));
    },
    clear() {
      verificarAcceso();
      datos.clear();
    },

    // --- Controles solo para pruebas ---
    /** @param {number} bytes */
    fijarLimiteBytes(bytes) {
      limiteBytes = bytes;
    },
    /** @param {boolean} valor */
    fijarNoDisponible(valor) {
      noDisponible = valor;
    },
    /** Copia de todo el contenido, para comparar antes y después. */
    instantanea() {
      return Object.fromEntries(datos);
    },
  };
}
