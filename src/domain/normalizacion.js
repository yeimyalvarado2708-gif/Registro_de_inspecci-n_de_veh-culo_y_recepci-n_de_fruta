// @ts-check
// Normalización de textos (REQ-VAL-17, 18, 19; REQ-INS-04; REQ-LOT-35; INV-17, INV-18).

/**
 * Quita espacios al inicio y al final; vacío o solo espacios → null.
 * Nunca devuelve undefined ni "" (INV-17).
 * @param {unknown} texto
 * @returns {string|null}
 */
export function limpiarTexto(texto) {
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim();
  return limpio === '' ? null : limpio;
}

/**
 * Texto limpio y en mayúsculas, para placa y número de lote (CT-08).
 * @param {unknown} texto
 * @returns {string|null}
 */
export function textoMayusculas(texto) {
  const limpio = limpiarTexto(texto);
  return limpio === null ? null : limpio.toUpperCase();
}

/**
 * Valor normalizado: sin espacios ni guiones y en mayúsculas (RN-16, CT-08).
 * Se usa solo para comparar placa y número de lote.
 * @param {unknown} texto
 * @returns {string|null}
 */
export function valorNormalizado(texto) {
  if (typeof texto !== 'string') return null;
  const normalizado = texto.replace(/[\s-]+/g, '').toUpperCase();
  return normalizado === '' ? null : normalizado;
}
