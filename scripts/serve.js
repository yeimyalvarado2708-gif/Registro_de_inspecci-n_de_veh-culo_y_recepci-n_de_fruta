// @ts-check
// Servidor de desarrollo: solo entrega archivos estáticos (REQ-TEC-03, RNF-01).
// Sin API ni lógica de negocio. Uso: node scripts/serve.js → http://localhost:3000

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUERTO = 3000;
const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Tipo MIME por extensión. Lo que no esté aquí responde 404. */
const TIPOS_MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
});

/**
 * Traduce la ruta pedida a un archivo dentro de la raíz del proyecto.
 * Devuelve null si la ruta intenta salir de la raíz o tiene una extensión no permitida.
 * @param {string} urlPedida
 * @returns {string|null}
 */
export function resolverArchivo(urlPedida) {
  let ruta;
  try {
    ruta = decodeURIComponent(urlPedida.split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (ruta.includes('..') || ruta.includes('\0')) return null;
  if (ruta === '/' || ruta === '') ruta = '/index.html';
  const absoluta = normalize(join(RAIZ, ruta));
  if (absoluta !== RAIZ && !absoluta.startsWith(RAIZ + sep)) return null;
  if (!(extname(absoluta).toLowerCase() in TIPOS_MIME)) return null;
  return absoluta;
}

const servidor = createServer(async (peticion, respuesta) => {
  const archivo = resolverArchivo(peticion.url ?? '/');
  if (archivo === null || (peticion.method !== 'GET' && peticion.method !== 'HEAD')) {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
    return;
  }
  try {
    const info = await stat(archivo);
    if (!info.isFile()) throw new Error('No es un archivo');
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      'Content-Type': TIPOS_MIME[/** @type {keyof typeof TIPOS_MIME} */ (extname(archivo).toLowerCase())],
      'Cache-Control': 'no-cache',
    });
    respuesta.end(peticion.method === 'HEAD' ? undefined : contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
});

// Solo arranca el servidor cuando se ejecuta directamente (no al importarlo en pruebas).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  servidor.listen(PUERTO, () => {
    console.log(`Servidor estático en http://localhost:${PUERTO}`);
  });
}
