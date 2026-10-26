// @ts-check
// Fechas y horas en la zona America/Costa_Rica (REQ-TEC-07, REQ-INS-01, REQ-UI-02, REQ-UI-07, RNF-09).
// Se construyen a partir de los componentes locales de la zona; nunca se convierte a UTC.

const FORMATO_CR = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Costa_Rica',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Fecha y hora de Costa Rica para un instante.
 * @param {Date} instante
 * @returns {{ fecha: string, fechaHora: string, segundos: string }}
 *   fecha: YYYY-MM-DD · fechaHora: YYYY-MM-DDTHH:mm · segundos: ss
 */
export function ahoraCostaRica(instante) {
  /** @type {Record<string, string>} */
  const p = {};
  for (const parte of FORMATO_CR.formatToParts(instante)) p[parte.type] = parte.value;
  const hora = p.hour === '24' ? '00' : p.hour; // por si un motor ignora hourCycle
  const fecha = `${p.year}-${p.month}-${p.day}`;
  return { fecha, fechaHora: `${fecha}T${hora}:${p.minute}`, segundos: p.second };
}

/**
 * YYYY-MM-DD (o YYYY-MM-DDTHH:mm) → DD/MM/YYYY. Solo para mostrar.
 * @param {string} fecha
 */
export function formatoFecha(fecha) {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * YYYY-MM-DDTHH:mm → HH:mm (24 h). Solo para mostrar.
 * @param {string} fechaHora
 */
export function formatoHora(fechaHora) {
  return fechaHora.slice(11, 16);
}

/**
 * YYYY-MM-DDTHH:mm → DD/MM/YYYY HH:mm. Solo para mostrar.
 * @param {string} fechaHora
 */
export function formatoFechaHora(fechaHora) {
  return `${formatoFecha(fechaHora)} ${formatoHora(fechaHora)}`;
}

/**
 * Minutos completos entre dos fechas-hora de Costa Rica (nunca negativo).
 * @param {string} desde YYYY-MM-DDTHH:mm
 * @param {string} hasta YYYY-MM-DDTHH:mm
 */
export function minutosTranscurridos(desde, hasta) {
  const diferencia = (minutosDesdeEpoca(hasta) - minutosDesdeEpoca(desde));
  return Math.max(0, diferencia);
}

/**
 * Los textos YYYY-MM-DDTHH:mm se comparan como texto (REQ-VAL-21).
 * @param {string} horaFin
 * @param {string} horaInicio
 */
export function esAnterior(horaFin, horaInicio) {
  return horaFin < horaInicio;
}

/** @param {string} fechaHora */
function minutosDesdeEpoca(fechaHora) {
  const [fecha, hora] = fechaHora.split('T');
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return Date.UTC(anio, mes - 1, dia, hh, mm) / 60000;
}
