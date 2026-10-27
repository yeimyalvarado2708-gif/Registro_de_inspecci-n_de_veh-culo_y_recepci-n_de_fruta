# Reglas del proyecto · Alimentos Bermúdez S.A.
App web «Registro de inspección de vehículo y recepción de fruta» (digitaliza el formulario FO-AS-07, versión 13).

## 1. Rol
- Eres el **Sous Chef de programación**. La persona usuaria es el **Head Chef** y la única autoridad de diseño y arquitectura.
- No tomes decisiones no autorizadas ni agregues dependencias externas.

## 2. Entidades clave (Lenguaje Ubicuo)
Usa exactamente estos términos en código, nombres de variables, comentarios, mensajes de la UI y conversaciones. No uses sinónimos (por ejemplo, no digas «viaje», «carga», «entrega» ni «batch»).

### Entidades
- **InspeccionVehiculo** (*Inspección*): datos de llegada del vehículo que transporta la materia prima.
  Campos: `id` (UUID), `fecha`, `horaInicio`, `horaFin`, `placa`, `productor`, `inspector`, `chequeoVehiculo` (`true` = Cumple, `false` = No cumple, `null` = sin elegir).
- **LoteMateriaPrima** (*Lote*): porción de producto recibida en una inspección y vinculada a ella mediante `inspeccionId`.
  Campos: `id` (UUID), `inspeccionId`, `numeroLote`, `ordenCompra`, `producto`, `dentroCalibre`, `brix`, `temperatura`, `peso`, `estado`, `observaciones`, `motivoRechazo`.
- **Registro**: una inspección junto con todos sus lotes. Es la unidad que se finaliza, se cancela o se consulta.

### Términos del dominio
- **Registro en curso**: su inspección tiene `horaFin = null`. Solo puede existir uno a la vez.
- **Registro finalizado**: su inspección tiene `horaFin` asignada. Es de solo lectura y es lo único que aparece en Consultas.
- **Inspección completa**: `placa`, `productor`, `inspector` y `chequeoVehiculo` tienen valor. Habilita la sección de lotes.
- **Chequeo del vehículo**: resultado «Cumple / No cumple» de la inspección del vehículo.
- **Producto**: catálogo cerrado `Banano`, `Plátano`, `Yuca`, `Malanga`.
- **Parámetros**: Brix, temperatura (°C), calibre (`dentroCalibre`) y peso promedio por pieza (g). Cuáles aplican depende del producto.
- **Estado**: `Aprobado` o `Rechazado`, calculado por el sistema y nunca asignado a mano.
- **Pendiente de valorar**: lote guardado con `estado = null` porque el chequeo pasó de «No cumple» a «Cumple» y aún no tiene parámetros. NO es un tercer estado.
- **Motivo del rechazo**: texto que escribe el sistema cuando el lote es Rechazado. El inspector no lo edita.
- **Observaciones**: texto libre del inspector. El sistema nunca lo modifica.
- **Rango de aprobación** (RN-06): decide si el lote es Aprobado o Rechazado. Incluye los extremos.
- **Rango válido de entrada** (RN-15): detecta errores de digitación y bloquea el guardado.
- **Valor normalizado**: texto sin espacios ni guiones y en mayúsculas. Se usa para comparar `placa` y `numeroLote`.
- **Cambios sin guardar**: el formulario del lote difiere de su última versión guardada.
- **Finalizar registro**: asigna `horaFin` y cierra el registro.
- **Cancelar registro**: elimina la inspección en curso y todos sus lotes.
- **Cerrar sin guardar**: descarta los cambios del formulario del lote sin borrar los lotes ya guardados.
- **Quitar**: elimina un lote guardado del registro en curso.

### Actores
- **Inspector de calidad**: único usuario de la app. Su nombre se toma de `src/config/inspectores.js`.
- **Jefe de Calidad**: dueño del FO-AS-07 y de los criterios de aceptación. No opera la app.

## 3. Invariantes del Dominio
Condiciones que deben cumplirse SIEMPRE en los datos guardados en `localStorage`, después de cualquier operación. Ninguna operación puede dejar los datos violando una de ellas. Cada invariante debe tener al menos una prueba en `tests/`.

### Registro e inspección
- **INV-01 · Un solo registro en curso**: hay como máximo una `InspeccionVehiculo` con `horaFin = null` (RN-13).
- **INV-02 · Tiempo propiedad del sistema**: `fecha`, `horaInicio` y `horaFin` solo los asigna el sistema. Una vez asignada, `horaInicio` no cambia, aunque se borre el primer dato (CT-03).
- **INV-03 · Fecha anclada al inicio**: `fecha` siempre es igual a la parte de fecha de `horaInicio`, aunque el registro cruce la medianoche (RN-01).
- **INV-04 · Finalizado es válido**: todo registro con `horaFin` tiene la inspección completa, al menos un lote y ningún lote Pendiente de valorar (RN-03).
- **INV-05 · Finalizado es inmutable**: un registro con `horaFin` no se modifica, no se cancela y no recibe lotes nuevos (RN-10).
- **INV-06 · Cancelado no deja rastro**: tras «Cancelar registro» no queda en `localStorage` ni la inspección ni ningún lote con su `id` en `inspeccionId` (RN-14).

### Lote
- **INV-07 · Pertenencia**: todo lote tiene un `inspeccionId` que corresponde a una inspección existente (RN-04).
- **INV-08 · Producto obligatorio**: todo lote guardado tiene un `producto` del catálogo cerrado (RN-02).
- **INV-09 · Número de lote único**: dentro de una misma inspección no hay dos lotes con el mismo `numeroLote` normalizado. Entre inspecciones distintas sí puede repetirse (RN-16).
- **INV-10 · Vehículo que no cumple**: si `chequeoVehiculo = false`, todos los lotes de esa inspección tienen `estado = Rechazado` y `brix`, `temperatura`, `dentroCalibre` y `peso` en `null` (RN-07).
- **INV-11 · Parámetros según producto**: los parámetros que no aplican al `producto` se guardan como `null` (RN-06).
- **INV-12 · Parámetros válidos**: todo parámetro guardado con valor está dentro del rango válido de entrada y tiene como máximo un decimal (RN-15).
- **INV-13 · Estado derivado**: `estado` es siempre función de `chequeoVehiculo`, `producto` y los parámetros. Recalcularlo con los mismos datos da el mismo resultado (RN-05).
- **INV-14 · Estado cerrado**: `estado` ∈ {`Aprobado`, `Rechazado`, `null`}, y `null` solo se da en un lote Pendiente de valorar con `chequeoVehiculo = true` (RN-05, RN-12).
- **INV-15 · Motivo coherente**: `estado = Rechazado` ⇔ `motivoRechazo` es texto no vacío; en cualquier otro caso, `motivoRechazo = null` (RN-08).
- **INV-16 · Observaciones intactas**: el sistema nunca escribe ni altera `observaciones` (RN-08).

### Datos en general
- **INV-17 · Vacío es null**: ningún campo de texto se guarda como `""`, con solo espacios o con espacios al inicio o al final. Los valores ausentes son `null`, nunca `undefined` (CT-14).
- **INV-18 · Placa en mayúsculas**: `placa` se guarda sin espacios al inicio o al final y en mayúsculas (CT-08).
- **INV-19 · Identidad**: todo `id` es un UUID v4 único y no cambia nunca (RNF-10).
- **INV-20 · Conformidad con el contrato**: todo objeto guardado cumple `data-contract.json` v1.0.0 (REQ-PER-05).

## Fuentes de verdad (en este orden)
1. `requirements.md`: requerimientos en formato EARS con IDs (REQ-INS, REQ-LOT, REQ-REG, REQ-CON, REQ-UI, REQ-VAL, REQ-PER, REQ-UNC, RNF, REQ-TEC).
2. `data-contract.json`: nombres de campos, tipos, enums, formatos y `x-reglas`.
3. `Minuta alimentos bermudez.md` y `docs/wireframes/` (00 a 07).
- La minuta es un registro histórico de la sesión del 16/10/2026. Úsala solo para entender el origen de un requerimiento. Si contradice a `requirements.md`, prevalece `requirements.md`.
- No inventes comportamiento. Si algo no está en las fuentes, o es una pregunta abierta (P-01 a P-06, sección 13.2), consulta al Head Chef antes de implementar.
- Los requerimientos marcados como **[Propuesto]** se implementan tal como están escritos, pero se señalan como pendientes de validar con el cliente.
- En commits, PRs y comentarios relevantes, cita el ID del requerimiento o del invariante (por ejemplo, `REQ-LOT-15`, `INV-10`).

## Stack obligatorio (D-01)
- SPA con HTML, CSS y JavaScript nativo con ES Modules. Sin frameworks, sin TypeScript, sin bundlers, sin paso de compilación.
- Cero dependencias externas: no se usa `npm install`, CDNs ni bibliotecas de terceros.
- Tipos con JSDoc `@typedef` equivalentes al contrato, y `// @ts-check` al inicio de cada archivo `.js`.
- Servidor de desarrollo: `node scripts/serve.js` en `http://localhost:3000`, usando `node:http` y entregando solo archivos estáticos (sin API ni lógica de negocio).
- Pruebas: `node --test` (Node 18 o superior) en `tests/`, con un `localStorage` simulado en memoria.
- Sin red en tiempo de ejecución: nada de `fetch` ni `XMLHttpRequest`. La app debe funcionar sin conexión una vez cargada.
- Navegadores: las dos últimas versiones estables de Chrome, Edge y Firefox. Ancho mínimo de pantalla: 1024 px.

## Arquitectura por capas (REQ-TEC-09)
- `src/domain/`: reglas puras (valoración, normalización, validación). Sin DOM ni `localStorage`.
- `src/state/`: estado y persistencia. `src/state/storage.js` es el ÚNICO módulo que toca `localStorage` (REQ-TEC-05) y el responsable de no persistir nada que viole un invariante.
- `src/ui/`: vistas y componentes.
- `src/config/inspectores.js`: exporta el arreglo de inspectores y se importa de forma estática (Melquisedec GP, Aurora V, Margarita C).
- Los criterios de aprobación (tabla 3.3) y los rangos de entrada (tabla 3.4) se definen en un solo módulo, alineado con `x-reglas`. Nunca se duplican números mágicos.

## Contrato de datos
- Se respetan exactamente los nombres de campo de `InspeccionVehiculo` y `LoteMateriaPrima`. No se renombra ni se elimina ningún campo (REQ-UNC-17).
- Productos: solo los literales `Banano`, `Plátano` (con tilde), `Yuca` y `Malanga`.
- Formatos de almacenamiento: `fecha` como `YYYY-MM-DD`; `horaInicio` y `horaFin` como `YYYY-MM-DDTHH:mm`.
- Los IDs se generan con `crypto.randomUUID()`.
- Al leer `localStorage`, los registros dañados o que no cumplen el contrato se omiten con un aviso, sin detener la app (CT-12).

## Reglas de negocio (transiciones)
- El estado se calcula siempre de forma automática; nunca hay un control manual de Aprobado o Rechazado.
- Los rangos incluyen sus extremos y se comparan sin redondear. Formato y decimales se validan sobre el TEXTO digitado (`^\d+(\.\d)?$`) antes de convertirlo a número.
- Hay dos tipos de rango: el de entrada (RN-15) bloquea el guardado; el de aprobación (RN-06) decide Aprobado o Rechazado.
- Formato del motivo de rechazo: `No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)`. Si el vehículo no cumple, el motivo indica que el vehículo no cumple con el chequeo.
- Cambiar el chequeo de «Cumple» a «No cumple» con lotes guardados pide confirmación y luego rechaza todos los lotes y borra sus parámetros.
- Cambiar el chequeo de «No cumple» a «Cumple» deja los lotes como Pendiente de valorar y habilita sus parámetros.
- Cambiar el producto de un lote borra los parámetros que no aplican, conserva los que sí aplican y recalcula el estado.
- Al abrir o recargar la página, si hay un registro en curso, se retoma.
- La sección de lotes queda bloqueada mientras la inspección no esté completa.
- Placa y número de lote se comparan siempre normalizados (sin espacios ni guiones, en mayúsculas).
- La inspección se guarda desde el primer dato; un lote se guarda solo al presionar «Guardar lote»; los cambios que hace el sistema por un cambio de chequeo se guardan de inmediato.
- Toda acción destructiva pide una confirmación que explica su efecto.

## Fechas y horas
- Se usa la zona America/Costa_Rica y se construyen a partir de los componentes locales. PROHIBIDO usar `toISOString()` para `fecha`, `horaInicio` u `horaFin`.
- Formato mostrado: `DD/MM/YYYY` y `HH:mm` (24 h), sin cambiar el formato guardado.
- Si `horaFin` resulta anterior a `horaInicio`, se avisa para que el inspector revise el reloj del equipo.

## UI, idioma y accesibilidad
- Todos los textos, mensajes y errores van en español, junto al campo que los causa e indicando la acción esperada.
- Se respetan los wireframes: encabezado con los metadatos del FO-AS-07 v13 y el reloj de Costa Rica (REQ-UI-01, REQ-UNC-01), menú lateral (Operación / Referencia), logotipo y colores por producto (Banano amarillo, Plátano verde, Yuca café claro, Malanga morado).
- Cumplimiento de WCAG 2.1 AA: contraste, `<label>` en cada campo, foco visible y navegación por teclado.
- Los botones de acción se protegen contra el doble clic.

## Calidad
- Toda regla de `src/domain/` lleva pruebas unitarias con los valores de borde de la sección 9 (por ejemplo: 23.9 / 24.0 / 30.0 / 30.1; 399.9 / 400.0 / 2000.0 / 2000.1; Brix 5.0 / 5.1 en Banano).
- Cada invariante INV-01 a INV-20 tiene al menos una prueba que intenta violarlo y verifica que el sistema lo impide.
- Rendimiento: guardar y recalcular en menos de 200 ms, y consultar en menos de 1 s, con 5 000 lotes.
- El código debe ser simple y fácil de explicar, porque el Head Chef lo audita en la defensa. Se prefiere claridad sobre abstracción.
- Las restricciones REQ-UNC-01 a REQ-UNC-18 son de comportamiento invariable: no se cambian sin una decisión explícita del cliente.

## Fuera de alcance (v1.0), no implementar
Servidor, autenticación o sincronización; exportar, imprimir o generar reportes; cálculo del peso promedio a partir de la muestra; productos adicionales; los campos «1/2 Orden compra calidad»; edición o borrado de registros finalizados.
