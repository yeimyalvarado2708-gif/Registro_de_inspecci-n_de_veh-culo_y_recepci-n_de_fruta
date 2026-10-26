// @ts-check
// Reglas de arquitectura verificables (REQ-TEC-02, 04, 05, 07, 09; design §3.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} carpeta
 * @returns {string[]} rutas relativas a la raíz, con «/»
 */
function listarJs(carpeta) {
  /** @type {string[]} */
  const salida = [];
  for (const entrada of readdirSync(join(RAIZ, carpeta), { withFileTypes: true })) {
    const ruta = posix.join(carpeta, entrada.name);
    if (entrada.isDirectory()) salida.push(...listarJs(ruta));
    else if (entrada.name.endsWith('.js')) salida.push(ruta);
  }
  return salida;
}

/** @param {string} rutaRelativa */
function leer(rutaRelativa) {
  return { ruta: rutaRelativa, contenido: readFileSync(join(RAIZ, ...rutaRelativa.split('/')), 'utf8') };
}

/**
 * Rutas que un archivo importa, resueltas a rutas relativas a la raíz.
 * @param {string} ruta
 * @param {string} contenido
 */
function importaciones(ruta, contenido) {
  const patron = /(?:^|\s)(?:import|export)\b[^'"`;]*?from\s*['"]([^'"]+)['"]|(?:^|\s)import\s*\(?\s*['"]([^'"]+)['"]/gm;
  /** @type {string[]} */
  const rutas = [];
  for (const m of contenido.matchAll(patron)) {
    const destino = m[1] ?? m[2];
    if (destino.startsWith('.')) rutas.push(posix.normalize(posix.join(posix.dirname(ruta), destino)));
    else rutas.push(destino);
  }
  return rutas;
}

/**
 * Revisa una lista de archivos de src/ y devuelve las violaciones encontradas.
 * @param {{ruta: string, contenido: string}[]} archivos
 * @returns {string[]}
 */
export function buscarViolaciones(archivos) {
  /** @type {string[]} */
  const violaciones = [];
  for (const { ruta, contenido } of archivos) {
    if (!contenido.startsWith('// @ts-check')) violaciones.push(`${ruta}: no empieza con // @ts-check (REQ-TEC-02)`);
    if (!ruta.startsWith('src/')) continue;

    if (ruta !== 'src/state/storage.js' && /localStorage/.test(contenido)) {
      violaciones.push(`${ruta}: menciona localStorage fuera de src/state/storage.js (REQ-TEC-05)`);
    }
    if (/\bfetch\s*\(|XMLHttpRequest/.test(contenido)) violaciones.push(`${ruta}: usa red (REQ-TEC-04)`);
    if (/toISOString/.test(contenido)) violaciones.push(`${ruta}: usa la conversión a UTC prohibida (REQ-TEC-07)`);

    const rutasImportadas = importaciones(ruta, contenido);
    if (ruta.startsWith('src/domain/')) {
      for (const destino of rutasImportadas) {
        if (!destino.startsWith('src/domain/')) violaciones.push(`${ruta}: importa ${destino} fuera de src/domain/ (REQ-TEC-09)`);
      }
      if (/\b(document|window)\b/.test(contenido)) violaciones.push(`${ruta}: usa el DOM (REQ-TEC-09)`);
    }
    if (ruta.startsWith('src/ui/') && rutasImportadas.includes('src/state/storage.js')) {
      violaciones.push(`${ruta}: importa state/storage.js (design §3.2)`);
    }
    if (ruta.startsWith('src/state/') && rutasImportadas.some((d) => d.startsWith('src/ui/'))) {
      violaciones.push(`${ruta}: importa src/ui/ (design §3.2)`);
    }
  }
  return violaciones;
}

test('el código del proyecto cumple las reglas de arquitectura', () => {
  const archivos = [...listarJs('src'), ...listarJs('scripts'), ...listarJs('tests')].map(leer);
  assert.ok(archivos.length > 0);
  assert.deepEqual(buscarViolaciones(archivos), []);
});

test('no hay package.json con dependencias ni node_modules (REQ-TEC-01)', () => {
  const entradas = readdirSync(RAIZ);
  assert.ok(!entradas.includes('node_modules'));
  if (entradas.includes('package.json')) {
    const paquete = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(paquete.dependencies ?? {}), []);
    assert.deepEqual(Object.keys(paquete.devDependencies ?? {}), []);
  }
});

test('la revisión detecta violaciones introducidas a propósito', () => {
  const ls = 'local' + 'Storage';
  const casos = [
    { ruta: 'src/ui/x.js', contenido: `// @ts-check\n${ls}.getItem('a');` },
    { ruta: 'src/ui/x.js', contenido: `// @ts-check\n${'fe' + 'tch'}('/api');` },
    { ruta: 'src/domain/x.js', contenido: `// @ts-check\nnew Date().${'toISO' + 'String'}();` },
    { ruta: 'src/domain/x.js', contenido: 'const a = 1;' },
    { ruta: 'src/domain/x.js', contenido: "// @ts-check\nimport { store } from '../state/store.js';" },
    { ruta: 'src/domain/x.js', contenido: `// @ts-check\n${'docu' + 'ment'}.body;` },
    { ruta: 'src/ui/x.js', contenido: "// @ts-check\nimport { storage } from '../state/storage.js';" },
    { ruta: 'src/state/x.js', contenido: "// @ts-check\nimport { montar } from '../ui/app.js';" },
  ];
  for (const caso of casos) {
    assert.equal(buscarViolaciones([caso]).length, 1, `debió detectar: ${caso.contenido}`);
  }
  assert.deepEqual(buscarViolaciones([{ ruta: 'src/domain/x.js', contenido: "// @ts-check\nimport { a } from './y.js';" }]), []);
});
