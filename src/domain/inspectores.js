// @ts-check
// Depuración de la lista de inspectores configurada (REQ-INS-06, REQ-VAL-30, REQ-VAL-31; P-06 resuelta).

/**
 * Omite nombres vacíos o con solo espacios y los repetidos (comparando sin espacios
 * al inicio o al final y sin distinguir mayúsculas). Conserva la primera aparición y el orden.
 * @param {readonly unknown[]} lista
 * @returns {string[]}
 */
export function depurarInspectores(lista) {
  /** @type {string[]} */
  const resultado = [];
  const vistos = new Set();
  for (const nombre of lista) {
    if (typeof nombre !== 'string') continue;
    const limpio = nombre.trim();
    if (limpio === '') continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(limpio);
  }
  return resultado;
}
