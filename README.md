# Registro de inspección de vehículo y recepción de fruta
**Alimentos Bermúdez S.A.** · Digitalización del formulario FO-AS-07, versión 13

Aplicación web que usa el inspector de calidad para registrar la inspección del vehículo que llega con materia prima y valorar cada lote recibido (Banano, Plátano, Yuca y Malanga). El sistema calcula si cada lote queda **Aprobado** o **Rechazado** según los criterios del Jefe de Calidad.

> Proyecto final del curso *Programación Intencional con IA Generativa*: desarrollo guiado por especificaciones (Spec-Driven Development), con la IA como Sous Chef y la autora como Head Chef.

---

## Funcionalidades principales
- **Inspección del vehículo:** placa, productor, inspector y chequeo «Cumple / No cumple». La fecha y las horas las asigna el sistema con la zona America/Costa_Rica.
- **Lotes de materia prima:** el estado se calcula automáticamente según el producto y sus parámetros (Brix, temperatura, calibre y peso). Cuando un lote es Rechazado, el sistema escribe el motivo del rechazo.
- **Ciclo de vida del registro:** se retoma al recargar la página, se puede finalizar o cancelar, y solo puede haber un registro en curso a la vez.
- **Consultas:** búsqueda de registros finalizados, que son de solo lectura.
- **Criterios de aceptación:** pantalla de referencia con los rangos de aprobación por producto.
- **Funcionamiento sin conexión:** los datos se guardan en el `localStorage` del equipo.

## Requisitos
- Node.js 18 o superior (solo para el servidor de desarrollo y las pruebas).
- Las dos últimas versiones de Chrome, Edge o Firefox, con un ancho de pantalla mínimo de 1024 px.
- No hace falta `npm install`, porque el proyecto no tiene dependencias externas.

## Cómo ejecutar
```bash
node scripts/serve.js
```
Luego abra http://localhost:3000.

## Cómo correr las pruebas
```bash
node --test
```
Las pruebas usan un `localStorage` simulado en memoria y cubren:
- las reglas del dominio con sus valores de borde;
- los invariantes INV-01 a INV-20;
- la persistencia y la robustez ante datos dañados;
- la arquitectura por capas;
- el rendimiento con 5 000 lotes.

## Stack (decisión D-01)
- HTML, CSS y JavaScript nativo con ES Modules.
- Sin frameworks, sin bundlers, sin TypeScript y sin paso de compilación.
- Los tipos se documentan con JSDoc `@typedef` y `// @ts-check`.
- Sin red en tiempo de ejecución: la app no usa `fetch` ni `XMLHttpRequest`.

## Estructura del proyecto
```
├── index.html
├── tasks.md         Plan de tareas de implementación
├── src/
│   ├── domain/      Reglas puras: valoración, validación, normalización y tiempo
│   ├── state/       Estado y persistencia (storage.js es el único que toca localStorage)
│   ├── ui/          Vistas: registro, consultas y criterios
│   └── config/      inspectores.js (lista configurable de inspectores)
├── styles/          tokens, base y componentes
├── tests/           domain/, state/, invariantes/, arquitectura, rendimiento
├── scripts/         serve.js (servidor estático) y sembrar-demo.js (datos de demostración)
└── docs/            requirements.md, data-contract.json, minuta, design.md, checklist-ui.md y REFLECTION.md
    └── wireframes/  Bocetos 00 a 07
```

## Documentación y fuentes de verdad
Si dos documentos se contradicen, prevalece el que aparece primero en esta lista.

1. [`docs/requirements.md`](docs/requirements.md): requerimientos en sintaxis EARS (`WHEN … IF … THEN the system SHALL …`), con IDs y una matriz de trazabilidad.
2. [`docs/data-contract.json`](docs/data-contract.json): JSON Schema de `InspeccionVehiculo` y `LoteMateriaPrima`, que se vinculan por `inspeccionId`.
3. [`docs/Minuta alimentos bermudez.md`](docs/Minuta%20alimentos%20bermudez.md) y [`docs/wireframes/`](docs/wireframes/): origen de los requerimientos.

## Gobierno de la IA
- [`CLAUDE.md`](CLAUDE.md) es el archivo de reglas de contexto, equivalente a `.cursorrules` o `system_prompt.md`. Define:
  - el rol de la IA como Sous Chef;
  - el lenguaje ubicuo;
  - los invariantes del dominio;
  - el stack obligatorio;
  - la prohibición de implementar comportamiento que no esté en la especificación.
- `tests/arquitectura.test.js` verifica automáticamente que el código respete esas reglas.
- La autoevaluación está en [`docs/REFLECTION.md`](docs/REFLECTION.md).

## Fuera de alcance (v1.0)
- Servidor, autenticación o sincronización entre equipos.
- Exportar, imprimir o generar reportes.
- Productos adicionales.
- Editar o borrar registros finalizados.

> ⚠️ Los datos viven solo en el navegador de este equipo. Si se borran los datos del sitio, se pierden los registros.

## Autoría
Yeimy Alvarado, Head Chef del proyecto · Octubre de 2026
