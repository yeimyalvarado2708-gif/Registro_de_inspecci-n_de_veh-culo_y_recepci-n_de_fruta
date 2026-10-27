# Especificación de Requerimientos

## Aplicación web «Registro de inspección de vehículo y recepción de fruta» · Alimentos Bermúdez S.A.

| Elemento | Detalle |
| :---- | :---- |
| Documento | requirements.md |
| Versión | 1.1.0 |
| Fecha | 25 de octubre de 2026 |
| Cliente | Alimentos Bermúdez S.A. |
| Formulario digitalizado | FO-AS-07, versión 13 (válido desde 08/07/2025, última revisión 08/07/2025, próxima revisión 08/07/2027) |
| Fuentes | `Minuta alimentos bermudez.md` (sesión del 16/10/2026), `data-contract.json` v1.0.0, carpeta `docs/wireframes/` (00 a 07), decisión técnica D-01 (stack) |
| Elaborado por | Analista de Requerimientos Senior |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica de forma formal, verificable y trazable los requerimientos de la aplicación web que digitaliza el formulario en papel FO-AS-07 de Alimentos Bermúdez S.A. Sirve como base para el diseño, la construcción, las pruebas y la aceptación del producto.

### 1.2 Alcance

La aplicación cubre tres procesos:

1. **Inspección del vehículo** que transporta la materia prima.
2. **Recepción y valoración de lotes** de banano, plátano, yuca y malanga, con aprobación o rechazo automático.
3. **Consulta de registros finalizados** por número de placa o por número de lote, en modo solo lectura.

Toda la información se almacena en el `localStorage` del navegador del equipo de recepción. No hay servidor, autenticación ni sincronización entre equipos.

### 1.3 Convención de redacción (EARS)

Todos los requerimientos funcionales de las secciones 4 a 8 están redactados en estricta sintaxis EARS con la plantilla obligatoria:

> **WHEN** [evento] **IF** [condición] **THEN the system SHALL** [respuesta]

- **WHEN** describe el disparador observable (acción del usuario, carga de página, cambio de dato o evento del sistema).
- **IF** describe la condición de estado que debe cumplirse para que aplique la respuesta.
- Cuando la respuesta solo debe aplicarse a un registro en curso, la condición es `IF el registro está en curso`. Es la guarda de RN-10: impide que la respuesta se aplique a un registro finalizado (INV-05).
- **THEN the system SHALL** describe la respuesta obligatoria y verificable del sistema.
- Cada requerimiento tiene un identificador único y una línea de **Origen** con su trazabilidad hacia la minuta (RF, RN, CT), el contrato de datos o los wireframes (WF).
- Los requerimientos marcados como **[Propuesto]** no están explícitos en las fuentes; el analista los agrega para cerrar un vacío y deben validarse con el cliente (ver sección 13).

### 1.4 Prefijos de identificadores

| Prefijo | Sección |
| :---- | :---- |
| REQ-INS | Inspección del vehículo |
| REQ-LOT | Recepción y valoración de lotes |
| REQ-REG | Ciclo de vida del registro (finalizar, cancelar, retomar) |
| REQ-CON | Consulta de registros |
| REQ-UI | Interfaz, navegación y pantallas de referencia |
| REQ-VAL | Validaciones de borde |
| REQ-PER | Persistencia de datos local |
| REQ-UNC | Restricciones de diseño (Unchanged Behavior) |
| RNF | Requerimientos no funcionales |
| REQ-TEC | Restricciones técnicas y stack (D-01) |

---

## 2. Glosario

| Término | Definición |
| :---- | :---- |
| Inspección | Instancia de `InspeccionVehiculo`: datos de llegada del vehículo. |
| Lote | Instancia de `LoteMateriaPrima` vinculada a una inspección mediante `inspeccionId`. |
| Registro | La inspección junto con todos sus lotes. |
| Registro en curso | Registro cuya inspección tiene `horaFin = null`. Solo puede existir uno a la vez. |
| Registro finalizado | Registro cuya inspección tiene `horaFin` asignada. Es de solo lectura. |
| Inspección completa | Inspección con `placa`, `productor`, `inspector` y `chequeoVehiculo` con valor (RN-01). |
| Pendiente de valorar | Lote guardado con `estado = null` porque el chequeo cambió de No cumple a Cumple y aún no tiene parámetros (RN-12). No es un tercer estado. |
| Parámetros | Brix, temperatura, calibre (`dentroCalibre`) y peso promedio por pieza. |
| Rango de aprobación | Rango de RN-06 que decide Aprobado o Rechazado. Incluye extremos. |
| Rango válido de entrada | Rango de RN-15 que detecta errores de digitación. |
| Valor normalizado | Texto sin espacios ni guiones y en mayúsculas, usado para comparar placa y número de lote (CT-08, RN-16). |
| Cambios sin guardar | Un lote tiene cambios sin guardar cuando el inspector ingresó o modificó algún campo y sus datos difieren de la última versión guardada (CT-06). |
| Pestaña activa | Entre varias pestañas abiertas de la aplicación, la última que el inspector usó para editar. Es la única editable; las demás quedan en solo lectura (CT-07). |

---

## 3. Actores, contexto y modelo de datos

### 3.1 Actores

| Actor | Descripción |
| :---- | :---- |
| Inspector de calidad | Usuario único de la aplicación. Registra inspecciones y lotes, finaliza o cancela registros y consulta el historial. Los nombres válidos se leen del archivo de configuración: Melquisedec GP, Aurora V, Margarita C. |
| Jefe de Calidad | Dueño del formulario FO-AS-07 y de los criterios de aceptación. No opera la aplicación en esta versión. |

### 3.2 Entidades (resumen de `data-contract.json`)

**InspeccionVehiculo**: `id` (UUID, sistema), `fecha` (YYYY-MM-DD, sistema), `horaInicio` (YYYY-MM-DDTHH:mm, sistema), `placa` (mayúsculas, obligatorio), `productor` (obligatorio), `inspector` (obligatorio, de la configuración), `horaFin` (sistema, `null` en curso), `chequeoVehiculo` (boolean, `null` hasta que se elige, obligatorio).

**LoteMateriaPrima**: `id` (UUID, sistema), `inspeccionId` (FK, sistema), `numeroLote` (opcional, mayúsculas, único por inspección), `ordenCompra` (opcional), `producto` (`Banano` | `Plátano` | `Yuca` | `Malanga`), `dentroCalibre`, `brix`, `temperatura`, `peso` (condicionales), `estado` (`Aprobado` | `Rechazado` | `null`), `observaciones` (opcional), `motivoRechazo` (sistema).

### 3.3 Criterios de aprobación por producto (RN-06)

| Producto | Brix | Temperatura | Calibre | Peso promedio por pieza |
| :---- | :---- | :---- | :---- | :---- |
| Banano | 2 a 5 | 24 a 30 °C | Dentro de calibre | No aplica |
| Plátano | 2 a 8 | 24 a 30 °C | Dentro de calibre | No aplica |
| Yuca | No aplica | 24 a 30 °C | No aplica | No aplica |
| Malanga | 4 a 12 | 24 a 30 °C | No aplica | 400 g a 2000 g |

### 3.4 Rango válido de entrada (RN-15)

| Parámetro | Mínimo | Máximo | Decimales |
| :---- | :---- | :---- | :---- |
| Brix | 0.0 | 30.0 | Máximo 1 |
| Temperatura | 0.0 °C | 50.0 °C | Máximo 1 |
| Peso | 1.0 g | 5000.0 g | Máximo 1 |

---

## 4. Requerimientos funcionales · Inspección del vehículo

**REQ-INS-01. Asignación de hora de inicio y fecha.**
WHEN el inspector ingresa el primer dato de la inspección (placa, productor, inspector o chequeo) IF no existe un registro en curso THEN the system SHALL crear la inspección con un `id` UUID, asignar `horaInicio` con la fecha y hora del reloj del equipo convertidas a la zona America/Costa_Rica en formato `YYYY-MM-DDTHH:mm`, y asignar `fecha` igual a la parte de fecha de `horaInicio`.
*Origen: RF-01, RN-01, RN-09, CT-04; WF-01.*

**REQ-INS-02. Inmutabilidad de fecha y horas.**
WHEN se muestra la sección «Inspección del vehículo» en «Registro de recepción» IF todavía no se ha ingresado el primer dato o el registro está en curso THEN the system SHALL mostrar la fecha de entrada, la hora de inicio y la hora de fin como campos de solo lectura con la etiqueta «Sistema», sin ningún control que permita modificarlos.
*Origen: RF-01, RN-01; WF-01.*

**REQ-INS-03. Hora de inicio estable.**
WHEN el inspector borra el primer dato que ingresó IF la inspección ya tiene `horaInicio` asignada THEN the system SHALL conservar sin cambios `horaInicio` y `fecha`.
*Origen: CT-03.*

**REQ-INS-04. Registro de la placa.**
WHEN el inspector ingresa o modifica el número de placa IF el texto tiene al menos un carácter distinto de espacio THEN the system SHALL guardar la placa sin espacios al inicio o al final y convertida a mayúsculas (por ejemplo, « abc-123 » se guarda como «ABC-123»).
*Origen: RF-01, CT-08, CT-14.*

**REQ-INS-05. Registro del productor con sugerencias.**
WHEN el inspector escribe en el campo productor IF existen productores registrados previamente en el equipo cuyo nombre coincide con el texto ingresado THEN the system SHALL sugerir esos nombres en una lista desplegable seleccionable.
*Origen: RF-01, CT-10.*

**REQ-INS-06. Lista de inspectores configurable.**
WHEN se carga la pantalla de registro IF el archivo de configuración de la aplicación contiene una lista de inspectores THEN the system SHALL poblar la lista de selección «Nombre del inspector» únicamente con los nombres de esa lista, en el orden en que aparecen.
*Origen: RF-02; contrato `x-configuracion.inspectores`; WF-01.*

**REQ-INS-07. Conservación de inspectores retirados.**
WHEN el sistema muestra un registro guardado IF el nombre de su inspector ya no está en el archivo de configuración THEN the system SHALL mostrar el nombre tal como fue guardado, sin alterarlo ni marcarlo como inválido.
*Origen: RF-02.*

**REQ-INS-08. Chequeo del vehículo sin valor por defecto.**
WHEN se crea una nueva inspección IF el inspector aún no ha elegido un resultado de chequeo THEN the system SHALL mostrar la selección única «Cumple / No cumple» sin ninguna opción marcada y guardar `chequeoVehiculo = null`.
*Origen: RF-01, RN-07, RN-09; WF-01.*

**REQ-INS-09. Selección del chequeo.**
WHEN el inspector elige «Cumple» o «No cumple» IF no hay lotes guardados en el registro en curso THEN the system SHALL guardar `chequeoVehiculo = true` para Cumple o `false` para No cumple sin pedir confirmación.
*Origen: RN-07, RN-09.*

**REQ-INS-10. Cambio de chequeo de Cumple a No cumple con lotes.**
WHEN el inspector cambia el chequeo de «Cumple» a «No cumple» IF existe al menos un lote guardado en el registro en curso THEN the system SHALL mostrar un mensaje de confirmación que indique cuántos lotes se rechazarán y que se borrarán sus parámetros.
*Origen: RN-07, RN-12.*

**REQ-INS-11. Confirmación del cambio a No cumple.**
WHEN el inspector confirma el cambio de chequeo a «No cumple» IF existen lotes guardados THEN the system SHALL guardar `chequeoVehiculo = false`, poner en `null` `brix`, `temperatura`, `dentroCalibre` y `peso` de cada lote, asignar `estado = Rechazado`, escribir en `motivoRechazo` que el vehículo no cumple con el chequeo y persistir esos cambios de inmediato.
*Origen: RN-07, RN-12.*

**REQ-INS-12. Rechazo de la confirmación del cambio a No cumple.**
WHEN el inspector rechaza o cierra el mensaje de confirmación del cambio a «No cumple» IF el chequeo estaba en «Cumple» THEN the system SHALL mantener el chequeo en «Cumple» y dejar todos los lotes sin cambios.
*Origen: RN-07.*

**REQ-INS-13. Cambio de chequeo de No cumple a Cumple con lotes.**
WHEN el inspector cambia el chequeo de «No cumple» a «Cumple» IF existe al menos un lote guardado THEN the system SHALL guardar `chequeoVehiculo = true`, poner `motivoRechazo = null` y `estado = null` en cada lote, habilitar sus parámetros, mostrarlos como «Pendiente de valorar» y persistir esos cambios de inmediato.
*Origen: RN-12, RN-02.*

**REQ-INS-14. Indicador de inspección completa.**
WHEN cambia cualquier campo de la inspección IF `placa`, `productor`, `inspector` y `chequeoVehiculo` tienen valor THEN the system SHALL marcar la inspección como completa, mostrar el indicador de verificación en la tarjeta «Inspección del vehículo» y en la lista de condiciones del panel «Estado del registro», y habilitar la sección de lotes.
*Origen: RN-01, RN-11; WF-01, WF-05.*

**REQ-INS-15. Edición de la inspección antes de finalizar.**
WHEN el inspector modifica placa, productor, inspector o chequeo IF el registro está en curso THEN the system SHALL permitir la edición y persistir el cambio de inmediato en `localStorage`.
*Origen: RF-12, RN-12, RF-09.*

**REQ-INS-16. Indicador de guardado de la inspección.**
WHEN el sistema persiste un cambio de la inspección IF la escritura en `localStorage` fue exitosa THEN the system SHALL mostrar el indicador «Guardado en este equipo · HH:mm» con la hora del último guardado.
*Origen: RF-09; WF-01.*

---

## 5. Requerimientos funcionales · Recepción y valoración de lotes

### 5.1 Habilitación y alta de lotes

**REQ-LOT-01. Sección de lotes deshabilitada.**
WHEN se muestra la pantalla de registro IF la inspección no está completa THEN the system SHALL deshabilitar la sección «Lotes de materia prima», incluidos los botones «+ Lote», «Guardar lote», «Editar» y «Quitar».
*Origen: RN-11, CT-02; WF-01.*

**REQ-LOT-02. Abrir un lote nuevo.**
WHEN el inspector presiona «+ Lote» IF la inspección está completa y no hay un formulario de lote con cambios sin guardar THEN the system SHALL abrir un formulario «Lote nuevo» vacío con producto, número de lote, orden de compra, motivo del rechazo (solo lectura) y observaciones.
*Origen: RF-03, RF-07; WF-03.*

**REQ-LOT-03. Selección obligatoria del producto.**
WHEN se abre un formulario de lote nuevo IF el inspector aún no ha seleccionado un producto THEN the system SHALL mostrar las opciones Banano, Plátano, Yuca y Malanga sin ninguna seleccionada, el estado «Sin producto» y ningún parámetro de valoración.
*Origen: RF-03, RN-02; WF-03.*

**REQ-LOT-04. Parámetros visibles según el producto.**
WHEN el inspector selecciona un producto IF el chequeo del vehículo es «Cumple» THEN the system SHALL mostrar únicamente los parámetros que aplican al producto según la tabla 3.3: Banano y Plátano (Brix, temperatura, calibre), Yuca (temperatura), Malanga (Brix, temperatura, peso promedio por pieza).
*Origen: RN-06, RF-03; WF-02, WF-04.*

**REQ-LOT-05. Leyenda de rangos del producto.**
WHEN el inspector selecciona un producto IF el chequeo del vehículo es «Cumple» THEN the system SHALL mostrar una leyenda con los rangos de aprobación de cada parámetro que aplica a ese producto.
*Origen: RF-04, RN-06, RN-07 (con No cumple no se valoran parámetros, así que la leyenda no aplica).*

**REQ-LOT-06. Lote nuevo con vehículo que no cumple.**
WHEN el inspector selecciona un producto en un lote nuevo IF el chequeo del vehículo es «No cumple» THEN the system SHALL deshabilitar todos los parámetros, dejarlos en `null`, asignar `estado = Rechazado` y escribir en `motivoRechazo` que el vehículo no cumple con el chequeo.
*Origen: RN-07, RN-03.*

**REQ-LOT-07. Calibre sin valor por defecto.**
WHEN se muestra el parámetro calibre IF el inspector aún no ha elegido una opción THEN the system SHALL mostrar la selección única «Dentro de calibre / Fuera de calibre» sin ninguna opción marcada y mantener `dentroCalibre = null`.
*Origen: RN-09, acuerdo «Calibre».*

**REQ-LOT-08. Campos opcionales del lote.**
WHEN el inspector deja vacíos el número de lote, la orden de compra o las observaciones IF el resto del lote cumple las condiciones de guardado THEN the system SHALL permitir guardar el lote y almacenar esos campos como `null`.
*Origen: RF-03, RN-02, CT-14.*

**REQ-LOT-09. Vinculación del lote con la inspección.**
WHEN el inspector guarda un lote nuevo IF el lote cumple las condiciones de guardado THEN the system SHALL generar un `id` UUID para el lote y asignar `inspeccionId` igual al `id` de la inspección en curso.
*Origen: RN-04, RN-09; WF-03.*

**REQ-LOT-10. Cambio de producto en un lote.**
WHEN el inspector cambia el producto de un lote IF el lote ya tenía valores en algún parámetro THEN the system SHALL borrar los valores de los parámetros que no aplican al nuevo producto, conservar los que sí aplican (por ejemplo, la temperatura) y recalcular el estado y el motivo del rechazo.
*Origen: CT-01.*

**REQ-LOT-35. Registro del número de lote.**
WHEN el inspector presiona «Guardar lote» IF el número de lote tiene al menos un carácter distinto de espacio THEN the system SHALL guardar `numeroLote` sin espacios al inicio o al final y convertido a mayúsculas (por ejemplo, « lt-25 » se guarda como «LT-25»).
*Origen: RF-03, CT-08, CT-14; contrato `LoteMateriaPrima.numeroLote`.*

### 5.2 Valoración automática

**REQ-LOT-11. Cálculo del estado Aprobado.**
WHEN el inspector completa o modifica un parámetro del lote IF el chequeo es «Cumple», todos los parámetros que aplican tienen un valor dentro del rango válido de entrada y todos cumplen su rango de aprobación THEN the system SHALL asignar `estado = Aprobado` y `motivoRechazo = null`.
*Origen: RF-05, RN-05, RN-06.*

**REQ-LOT-12. Cálculo del estado Rechazado por parámetros.**
WHEN el inspector completa o modifica un parámetro del lote IF el chequeo es «Cumple», todos los parámetros que aplican tienen un valor dentro del rango válido de entrada y al menos uno incumple su rango de aprobación THEN the system SHALL asignar `estado = Rechazado`.
*Origen: RF-05, RN-05, RN-06.*

**REQ-LOT-13. Comparación sin redondeo e inclusión de extremos.**
WHEN el sistema compara un parámetro con su rango de aprobación IF el valor tiene un decimal THEN the system SHALL compararlo tal como fue ingresado, sin redondear, y considerar que cumple cuando es mayor o igual que el mínimo y menor o igual que el máximo (por ejemplo, Brix 5.0 en Banano cumple y Brix 5.1 no cumple).
*Origen: RN-05, RN-06.*

**REQ-LOT-14. Calibre fuera de rango.**
WHEN el inspector elige «Fuera de calibre» IF el producto es Banano o Plátano y el chequeo es «Cumple» THEN the system SHALL considerar incumplido el criterio de calibre.
*Origen: RN-06.*

**REQ-LOT-15. Motivo del rechazo por parámetros.**
WHEN el sistema asigna `estado = Rechazado` por parámetros IF uno o más parámetros incumplen su rango de aprobación THEN the system SHALL escribir en `motivoRechazo` el texto «No cumple: » seguido de cada parámetro fallido con su valor y su rango, separados por «; » (por ejemplo, «No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)»).
*Origen: RF-06, RN-08; contrato `x-reglas.motivoRechazo`.*

**REQ-LOT-16. Recalcular el motivo del rechazo.**
WHEN cambia un parámetro del lote o el chequeo del vehículo IF el lote tiene un estado calculado THEN the system SHALL recalcular `estado` y `motivoRechazo`, y borrar `motivoRechazo` si el lote pasa a Aprobado.
*Origen: RF-06, RN-08.*

**REQ-LOT-17. Motivo del rechazo no editable.**
WHEN el inspector intenta escribir en el campo «Motivo del rechazo» IF el formulario del lote pertenece a un registro en curso THEN the system SHALL impedir la edición y mostrar el campo como de solo lectura con la leyenda «lo escribe el sistema».
*Origen: RF-06, RN-08; WF-03.*

**REQ-LOT-18. Observaciones del inspector intactas.**
WHEN el sistema recalcula el estado o el motivo del rechazo de un lote IF el lote tiene observaciones THEN the system SHALL conservar las observaciones exactamente como las escribió el inspector.
*Origen: RF-06, RN-08.*

**REQ-LOT-19. Aviso de revisión de observaciones.**
WHEN el estado de un lote cambia directamente de Rechazado a Aprobado IF el lote tiene observaciones y no pasó por «Pendiente de valorar» THEN the system SHALL mostrar un aviso para que el inspector revise las observaciones, porque pueden referirse al rechazo.
*Origen: RN-08.*

**REQ-LOT-20. Indicación de producto no recibido.**
WHEN el sistema muestra un lote en el formulario o en la tabla de lotes IF el lote tiene `estado = Rechazado` THEN the system SHALL indicar visualmente que el producto de ese lote no se recibe.
*Origen: RF-05.*

**REQ-LOT-21. Estado del lote en pantalla.**
WHEN el formulario de lote se actualiza IF el lote aún no tiene producto, le faltan parámetros, quedó «Pendiente de valorar» por un cambio de chequeo de No cumple a Cumple, o tiene estado calculado THEN the system SHALL mostrar en el encabezado del formulario «Sin producto», «Faltan parámetros», «Pendiente de valorar», «Aprobado» o «Rechazado», respectivamente.
*Origen: RN-05, RN-12; REQ-INS-13; WF-01, WF-03, WF-04.*

### 5.3 Guardado, edición y retiro de lotes

**REQ-LOT-22. Guardar lote.**
WHEN el inspector presiona «Guardar lote» IF la inspección está completa, el lote tiene producto, su número de lote no se repite en la inspección, sus parámetros aplicables están dentro del rango válido de entrada (cuando el chequeo es «Cumple») y tiene estado calculado THEN the system SHALL guardar el lote de inmediato en `localStorage`, agregarlo a la tabla de lotes y cerrar el formulario.
*Origen: RF-07, RF-09, RN-02.*

**REQ-LOT-23. Bloqueo de guardado inválido.**
WHEN el inspector presiona «Guardar lote» IF el lote no cumple alguna condición de REQ-LOT-22 THEN the system SHALL no guardar el lote, mantener el formulario abierto con sus datos y mostrar el error junto a cada campo que lo causa.
*Origen: RN-02, RN-15, RN-16.*

**REQ-LOT-24. Añadir otro lote del mismo vehículo.**
WHEN el sistema termina de guardar un lote IF el registro sigue en curso THEN the system SHALL ofrecer el botón «+ Lote» para registrar otro lote vinculado a la misma inspección.
*Origen: RF-07.*

**REQ-LOT-25. Tabla de lotes registrados.**
WHEN existe al menos un lote guardado IF el registro está en curso THEN the system SHALL mostrar una tabla con columnas Lote / OC, Producto, Parámetros (con unidades), Estado y las acciones «Editar» y «Quitar», junto con el contador «N lote(s) registrados».
*Origen: RF-12; WF-03, WF-04.*

**REQ-LOT-26. Editar un lote guardado.**
WHEN el inspector presiona «Editar» en un lote IF el registro está en curso THEN the system SHALL abrir el formulario del lote con su última versión guardada y permitir modificar todos los campos que ingresa el inspector.
*Origen: RF-12, RN-12.*

**REQ-LOT-27. Quitar un lote guardado.**
WHEN el inspector presiona «Quitar» en un lote IF el registro está en curso THEN the system SHALL eliminar ese lote de `localStorage` y de la tabla, y actualizar los contadores del panel «Estado del registro».
*Origen: RF-12, RN-12; WF-03.*

**REQ-LOT-28. Confirmación al quitar un lote.**
WHEN el inspector presiona «Quitar» en un lote IF el lote está guardado THEN the system SHALL pedir confirmación indicando el producto y el número de lote antes de eliminarlo.
*Origen: RF-12, RNF-05; pregunta P-02, decisión técnica del Head Chef del 25/10/2026 (Quitar siempre pide confirmación).*

**REQ-LOT-29. Completar un lote Pendiente de valorar.**
WHEN el inspector completa los parámetros de un lote «Pendiente de valorar» y presiona «Guardar lote» IF los parámetros aplicables están dentro del rango válido de entrada THEN the system SHALL calcular su estado según REQ-LOT-11 o REQ-LOT-12 y guardarlo.
*Origen: RN-12, RN-02.*

### 5.4 Cerrar sin guardar

**REQ-LOT-30. Cerrar un lote sin cambios.**
WHEN el inspector presiona «Cerrar sin guardar» IF el formulario del lote no tiene cambios sin guardar THEN the system SHALL cerrar el formulario sin pedir confirmación.
*Origen: RF-15, CT-06.*

**REQ-LOT-31. Cerrar un lote con cambios.**
WHEN el inspector presiona «Cerrar sin guardar» IF el formulario del lote tiene cambios sin guardar THEN the system SHALL pedir confirmación antes de descartar los cambios.
*Origen: RF-15, CT-06.*

**REQ-LOT-32. Descartar un lote nuevo.**
WHEN el inspector confirma «Cerrar sin guardar» IF el lote es nuevo THEN the system SHALL descartar el lote sin dejar ningún dato en `localStorage`, incluso cuando el vehículo no cumple con el chequeo y el lote habría nacido Rechazado.
*Origen: RF-15, RN-02, RN-07.*

**REQ-LOT-33. Descartar cambios de un lote guardado.**
WHEN el inspector confirma «Cerrar sin guardar» IF el lote ya estaba guardado y se estaba editando THEN the system SHALL descartar solo los cambios del inspector y conservar la última versión guardada, incluidos los cambios que el sistema aplicó por un cambio en el chequeo.
*Origen: RF-15, RN-12.*

**REQ-LOT-34. Cancelar el cierre.**
WHEN el inspector rechaza la confirmación de «Cerrar sin guardar» IF el formulario tenía cambios sin guardar THEN the system SHALL mantener el formulario abierto con todos sus datos.
*Origen: RF-15.*

---

## 6. Requerimientos funcionales · Ciclo de vida del registro

**REQ-REG-01. Panel «Estado del registro».**
WHEN cambia la inspección o cualquier lote IF hay un registro en curso THEN the system SHALL actualizar el panel lateral con la placa, la fecha y hora de inicio, el tiempo transcurrido, los contadores de lotes Aprobados, Rechazados y Pendientes, la insignia «En curso» y la lista de condiciones «Inspección del vehículo completa», «Al menos un lote registrado» y «Todos los lotes valorados».
*Origen: RN-03; WF-01, WF-05.*

**REQ-REG-02. Finalizar registro.**
WHEN el inspector presiona «Finalizar registro» IF la inspección está completa, el registro tiene al menos un lote guardado, ningún lote está «Pendiente de valorar» y no hay un formulario de lote con cambios sin guardar THEN the system SHALL asignar `horaFin` con la fecha y hora del reloj del equipo convertidas a la zona America/Costa_Rica, persistirla en `localStorage`, cerrar el registro y limpiar la página para una nueva inspección.
*Origen: RF-08, RF-09, RN-03, CT-04.*

**REQ-REG-03. Finalización bloqueada.**
WHEN el inspector presiona «Finalizar registro» IF la inspección no está completa, no hay lotes guardados o algún lote está «Pendiente de valorar» THEN the system SHALL no cerrar el registro y mostrar un mensaje que indique cada condición que falta.
*Origen: RN-03, CT-02.*

**REQ-REG-04. Finalizar con un lote sin guardar.**
WHEN el inspector presiona «Finalizar registro» IF hay un formulario de lote con cambios sin guardar THEN the system SHALL avisar que esos cambios se perderán y pedir confirmación antes de continuar con la finalización.
*Origen: CT-06.*

**REQ-REG-05. Registro finalizado de solo lectura.**
WHEN el inspector intenta modificar, cancelar o agregar lotes a un registro IF el registro tiene `horaFin` asignada THEN the system SHALL impedir la acción y mostrar el registro solo en modo consulta.
*Origen: RN-10, RN-12, RN-14.*

**REQ-REG-06. Cancelar registro: confirmación.**
WHEN el inspector presiona «Cancelar registro» IF el registro está en curso THEN the system SHALL pedir confirmación antes de borrar y, si hay lotes rechazados, indicar en el mensaje cuántos son y que su reporte se perderá.
*Origen: RF-14, RN-14.*

**REQ-REG-07. Cancelar registro: confirmado.**
WHEN el inspector confirma «Cancelar registro» IF el registro está en curso THEN the system SHALL eliminar de `localStorage` la inspección en curso y todos sus lotes, incluidos los rechazados, y limpiar la página para una nueva inspección.
*Origen: RF-14, RN-14, RF-05.*

**REQ-REG-08. Cancelar registro: no confirmado.**
WHEN el inspector rechaza la confirmación de «Cancelar registro» IF el registro está en curso THEN the system SHALL mantener el registro, sus lotes y cualquier formulario abierto sin cambios.
*Origen: RN-14.*

**REQ-REG-09. Retomar registro sin finalizar.**
WHEN se abre o recarga la página de registro IF existe en `localStorage` una inspección con `horaFin = null` THEN the system SHALL cargar esa inspección con sus lotes y su `horaInicio` original, en lugar de abrir un registro nuevo.
*Origen: RF-13, RN-13.*

**REQ-REG-10. Registro nuevo tras finalizar o cancelar.**
WHEN el sistema termina de finalizar o cancelar un registro IF no queda ninguna inspección con `horaFin = null` THEN the system SHALL mostrar la pantalla de registro vacía, sin `horaInicio`, con la sección de lotes deshabilitada y los contadores en cero.
*Origen: RF-08, RN-14; WF-01.*

**REQ-REG-11. Acciones del registro sin registro en curso.**
WHEN se muestra el panel «Estado del registro» IF no hay un registro en curso THEN the system SHALL mostrar los botones «Finalizar registro» y «Cancelar registro» deshabilitados.
*Origen: RN-03, RN-14; WF-01, WF-05.*

---

## 7. Requerimientos funcionales · Consulta de registros

**REQ-CON-01. Modo de búsqueda.**
WHEN el inspector abre la pantalla «Consultas» IF el inspector aún no ha ejecutado ninguna búsqueda THEN the system SHALL ofrecer un selector «Por placa / Por número de lote», un campo de búsqueda vacío y el botón «Buscar» deshabilitado (REQ-CON-02), con el rótulo «Registros finalizados · Solo lectura».
*Origen: RF-10, RF-11; WF-06.*

**REQ-CON-02. Botón Buscar deshabilitado.**
WHEN el contenido del campo de búsqueda cambia IF el campo está vacío o contiene solo espacios THEN the system SHALL deshabilitar el botón «Buscar».
*Origen: CT-09, CT-14.*

**REQ-CON-03. Consulta por placa.**
WHEN el inspector busca en modo «Por placa» IF existen registros finalizados cuya placa normalizada coincide con el texto normalizado THEN the system SHALL listar esos registros ordenados del más reciente al más antiguo, con fecha y rango de horas, placa, productor e inspector, chequeo, cantidad de lotes con su desglose de aprobados y rechazados, y la acción «Ver».
*Origen: RF-10, CT-08, CT-09; WF-06.*

**REQ-CON-04. Detalle de una inspección consultada.**
WHEN el inspector presiona «Ver» en un registro del historial IF el registro está finalizado THEN the system SHALL mostrar todos los datos de la inspección y de todos sus lotes, incluidos los lotes sin número de lote, en modo solo lectura.
*Origen: RF-10, RF-11, RN-10.*

**REQ-CON-05. Consulta por número de lote.**
WHEN el inspector busca en modo «Por número de lote» IF existen lotes de registros finalizados cuyo número normalizado coincide con el texto normalizado THEN the system SHALL listar todas las coincidencias con la fecha, la placa y el productor de la inspección de cada una.
*Origen: RF-11, RN-16, CT-08.*

**REQ-CON-06. Detalle de un lote consultado.**
WHEN el inspector elige un lote de los resultados por número de lote IF el lote pertenece a un registro finalizado THEN the system SHALL mostrar todos los datos del lote y los de su inspección, obtenida mediante `inspeccionId`, en modo solo lectura.
*Origen: RF-11, RN-04, RN-10.*

**REQ-CON-07. Exclusión de registros en curso.**
WHEN el inspector ejecuta cualquier búsqueda IF existe un registro con `horaFin = null` THEN the system SHALL excluir ese registro y sus lotes de los resultados.
*Origen: RN-10, RF-11.*

**REQ-CON-08. Lotes sin número.**
WHEN el inspector busca en modo «Por número de lote» IF un lote finalizado tiene `numeroLote = null` THEN the system SHALL excluir ese lote de los resultados.
*Origen: RF-11.*

**REQ-CON-09. Sin resultados.**
WHEN el inspector ejecuta una búsqueda IF no existe ningún registro finalizado que coincida THEN the system SHALL mostrar un mensaje que indique que no hay registros finalizados para esa placa o ese número de lote.
*Origen: CT-09.*

**REQ-CON-10. Consulta sin edición.**
WHEN el sistema muestra resultados o detalles de una consulta IF el registro mostrado tiene `horaFin` asignada THEN the system SHALL no ofrecer controles de edición, eliminación ni cancelación.
*Origen: RN-10.*

**REQ-CON-11. Últimas inspecciones finalizadas. [Propuesto]**
WHEN el inspector está en la pantalla «Consultas» IF no ha ejecutado ninguna búsqueda en el modo seleccionado y no hay un detalle abierto THEN the system SHALL mostrar debajo de la búsqueda las últimas 10 inspecciones de registros finalizados, ordenadas por `horaInicio` de la más reciente a la más antigua, con las mismas columnas y la acción «Ver» de REQ-CON-03, en modo solo lectura; y, si no existe ningún registro finalizado, un mensaje que lo indique.
*Origen: decisión del Head Chef del 26/10/2026; WF-06; RN-10. Pendiente de validar con el cliente (P-08).*

---

## 8. Requerimientos funcionales · Interfaz, navegación y pantallas de referencia

**REQ-UI-01. Encabezado del formulario.**
WHEN se muestra una pantalla de la aplicación IF la pantalla es «Registro de recepción», «Consultas» o «Criterios de aceptación» THEN the system SHALL mostrar en el encabezado los metadatos del FO-AS-07 versión 13 (Código, Versión, Elaborado por, Válido desde, Última revisión y Próxima revisión, con fechas en DD/MM/YYYY) junto al reloj de Costa Rica (REQ-UI-02).
*Origen: Minuta «Formulario de referencia»; contrato `x-formulario`; WF-01, WF-06, WF-07; REQ-UNC-01.*

**REQ-UI-02. Reloj de Costa Rica.**
WHEN transcurre cada segundo IF la pestaña de la aplicación está visible (`document.visibilityState = 'visible'`) THEN the system SHALL actualizar el reloj del encabezado con la hora (HH:mm:ss) y la fecha (DD/MM/YYYY) del reloj del equipo convertidas a la zona America/Costa_Rica, con la leyenda «Costa Rica».
*Origen: CT-04; WF-01.*

**REQ-UI-03. Navegación lateral.**
WHEN el inspector selecciona una opción del menú lateral IF la opción es «Registro de recepción», «Consultas» o «Criterios de aceptación» THEN the system SHALL mostrar la pantalla correspondiente y resaltar la opción activa.
*Origen: WF-01, WF-06, WF-07.*

**REQ-UI-04. Indicador de registro en curso en el menú.**
WHEN se muestra el menú lateral IF existe un registro con `horaFin = null` THEN the system SHALL mostrar la insignia «En curso» junto a «Registro de recepción».
*Origen: WF-01.*

**REQ-UI-05. Pantalla de criterios de aceptación.**
WHEN el inspector abre «Criterios de aceptación» IF la opción está seleccionada en el menú lateral THEN the system SHALL mostrar, en solo lectura, la tabla de la sección 3.3 con la nota de que los rangos incluyen sus extremos y se comparan sin redondear.
*Origen: RN-06, RN-15; WF-07.*

**REQ-UI-06. Aviso de almacenamiento local.**
WHEN se muestra el menú lateral IF `localStorage` está disponible THEN the system SHALL mostrar la leyenda «Los registros se guardan solo en este equipo y navegador».
*Origen: CT-13; WF-01.*

**REQ-UI-07. Formato de visualización de fechas.**
WHEN el sistema muestra una fecha o una hora IF el valor proviene de `fecha`, `horaInicio` u `horaFin` THEN the system SHALL mostrar la fecha como DD/MM/YYYY y la hora como HH:mm en formato de 24 h, sin modificar el formato almacenado.
*Origen: RN-09; contrato `FechaHora`; WF-01, WF-06.*

**REQ-UI-08. Registro en curso al navegar.**
WHEN el inspector vuelve a «Registro de recepción» desde «Criterios de aceptación» IF existe un registro en curso THEN the system SHALL mostrarlo sin cambios para retomarlo.
*Origen: RN-13; WF-07.*

---

## 9. Validaciones de borde

**REQ-VAL-01. Parámetro vacío.**
WHEN el inspector intenta guardar un lote IF un parámetro que aplica está vacío y el chequeo es «Cumple» THEN the system SHALL mostrar un error en ese campo y no guardar el lote.
*Origen: RN-15.*

**REQ-VAL-02. Parámetro negativo.**
WHEN el inspector ingresa un valor en Brix, temperatura o peso IF el valor es negativo THEN the system SHALL mostrar un error en el campo y bloquear el guardado del lote.
*Origen: RN-15.*

**REQ-VAL-03. Más de un decimal.**
WHEN el inspector ingresa un valor en Brix, temperatura o peso IF el texto ingresado no cumple el patrón `^\d+(\.\d)?$` THEN the system SHALL mostrar un error que indique que se admite como máximo un decimal y bloquear el guardado del lote.
*Origen: RN-09, RN-15; contrato `x-reglas.rangosEntrada.patronUnDecimal`.*

**REQ-VAL-04. Brix fuera del rango de entrada.**
WHEN el inspector ingresa un valor de Brix IF el valor es menor que 0.0 o mayor que 30.0 THEN the system SHALL mostrar un error de rango válido de entrada, no evaluar el criterio de aprobación y bloquear el guardado del lote.
*Origen: RN-15.*

**REQ-VAL-05. Temperatura fuera del rango de entrada.**
WHEN el inspector ingresa una temperatura IF el valor es menor que 0.0 °C o mayor que 50.0 °C THEN the system SHALL mostrar un error de rango válido de entrada, no evaluar el criterio de aprobación y bloquear el guardado del lote.
*Origen: RN-15.*

**REQ-VAL-06. Peso fuera del rango de entrada.**
WHEN el inspector ingresa un peso promedio por pieza IF el valor es menor que 1.0 g o mayor que 5000.0 g THEN the system SHALL mostrar un error de rango válido de entrada, no evaluar el criterio de aprobación y bloquear el guardado del lote.
*Origen: RN-15.*

**REQ-VAL-07. Valores en los extremos del rango de entrada.**
WHEN el inspector ingresa un valor igual a un extremo del rango válido de entrada (por ejemplo, Brix 0.0 o 30.0, temperatura 50.0 o peso 1.0) IF el valor tiene como máximo un decimal THEN the system SHALL aceptarlo y evaluarlo contra el rango de aprobación.
*Origen: RN-15.*

**REQ-VAL-08. Valores en los extremos del rango de aprobación.**
WHEN el sistema evalúa un parámetro IF su valor es exactamente igual al mínimo o al máximo del rango de aprobación (por ejemplo, temperatura 24.0 o 30.0, peso 400.0 o 2000.0) THEN the system SHALL considerarlo dentro del criterio.
*Origen: RN-06, RN-05.*

**REQ-VAL-09. Valores inmediatamente fuera del rango de aprobación.**
WHEN el sistema evalúa un parámetro IF su valor excede el rango de aprobación por una décima (por ejemplo, temperatura 23.9 o 30.1, Brix 5.1 en Banano, peso 399.9 o 2000.1) THEN the system SHALL considerarlo incumplido e incluirlo en `motivoRechazo`.
*Origen: RN-05, RN-06, RN-08.*

**REQ-VAL-10. Caracteres no numéricos.**
WHEN el inspector escribe en un campo de Brix, temperatura o peso IF el texto contiene caracteres distintos de dígitos y un único punto decimal THEN the system SHALL mostrar un error de formato numérico y bloquear el guardado del lote.
*Origen: RN-09, RN-15.*

**REQ-VAL-11. Separador decimal coma no admitido.**
WHEN el inspector escribe un valor en Brix, temperatura o peso IF el texto usa coma como separador decimal (por ejemplo, 4,5) THEN the system SHALL mostrar un error que indique que se debe usar punto decimal (por ejemplo, 4.5) y bloquear el guardado del lote, sin convertir la coma automáticamente.
*Origen: RN-09, RN-15; pregunta P-03 resuelta por el equipo de desarrollo el 25/10/2026 (solo punto decimal).*

**REQ-VAL-12. Calibre sin elegir.**
WHEN el inspector intenta guardar un lote de Banano o Plátano IF el chequeo es «Cumple» y `dentroCalibre = null` THEN the system SHALL mostrar un error en el campo calibre y no guardar el lote.
*Origen: RN-02, RN-09.*

**REQ-VAL-13. Producto sin elegir.**
WHEN el inspector presiona «Guardar lote» IF el lote no tiene producto seleccionado THEN the system SHALL mostrar un error en el campo producto y no guardar el lote.
*Origen: RN-02.*

**REQ-VAL-14. Número de lote repetido.**
WHEN el inspector intenta guardar un lote con número de lote IF el número normalizado coincide con el de otro lote de la misma inspección THEN the system SHALL mostrar un error de número de lote repetido y no guardar el lote.
*Origen: RN-16, CT-08.*

**REQ-VAL-15. Número de lote repetido entre inspecciones.**
WHEN el inspector guarda un lote con número de lote IF el número normalizado coincide solo con lotes de otras inspecciones THEN the system SHALL permitir el guardado.
*Origen: RN-16.*

**REQ-VAL-16. Edición del propio número de lote.**
WHEN el inspector guarda un lote que estaba editando IF el número de lote coincide solo con la versión guardada del mismo lote THEN the system SHALL no considerarlo repetido.
*Origen: RN-16.*

**REQ-VAL-17. Textos con solo espacios.**
WHEN el inspector ingresa un campo de texto (placa, productor, número de lote, orden de compra, observaciones o búsqueda) IF el texto contiene solo espacios THEN the system SHALL tratarlo como vacío y guardarlo como `null`.
*Origen: CT-14; contrato `TextoNoVacio`.*

**REQ-VAL-18. Espacios al inicio o al final.**
WHEN el sistema guarda un campo de texto IF el texto tiene espacios al inicio o al final THEN the system SHALL eliminarlos antes de guardar.
*Origen: CT-14, CT-08.*

**REQ-VAL-19. Normalización de búsqueda.**
WHEN el sistema compara una placa o un número de lote IF los textos difieren solo en mayúsculas, espacios o guiones (por ejemplo, ABC-123, abc123 y ABC 123) THEN the system SHALL considerarlos equivalentes.
*Origen: CT-08, RN-16; contrato `x-reglas.normalizacionBusqueda`.*

**REQ-VAL-20. Inspección que vuelve a quedar incompleta.**
WHEN el inspector borra un campo obligatorio de la inspección IF ya existen lotes guardados THEN the system SHALL conservar los lotes, bloquear la sección de lotes y bloquear «Finalizar registro» hasta que la inspección vuelva a estar completa.
*Origen: CT-02.*

**REQ-VAL-21. Hora de fin anterior a la de inicio.**
WHEN el sistema asigna `horaFin` IF `horaFin` es anterior a `horaInicio` THEN the system SHALL mostrar un aviso para que el inspector revise la fecha y la hora del equipo.
*Origen: CT-04.*

**REQ-VAL-22. Registro que cruza la medianoche.**
WHEN el sistema asigna `horaFin` IF la fecha de `horaFin` es posterior a la fecha de `horaInicio` THEN the system SHALL conservar `fecha` igual a la fecha de `horaInicio` y guardar `horaFin` con su propia fecha.
*Origen: RN-01.*

**REQ-VAL-23. Doble clic en botones de acción.**
WHEN el inspector presiona «Guardar lote», «+ Lote», «Cerrar sin guardar», «Finalizar registro» o «Cancelar registro» IF la acción anterior del mismo botón aún se está procesando THEN the system SHALL ignorar la pulsación y mantener el botón deshabilitado hasta terminar.
*Origen: CT-05.*

**REQ-VAL-24. Abrir lote nuevo con cambios sin guardar.**
WHEN el inspector presiona «+ Lote» IF hay un formulario de lote con cambios sin guardar THEN the system SHALL avisar y pedir confirmación antes de descartar esos cambios.
*Origen: CT-06.*

**REQ-VAL-25. Cerrar o recargar la página con cambios sin guardar.**
WHEN el inspector intenta cerrar o recargar la pestaña IF hay un formulario de lote con cambios sin guardar THEN the system SHALL mostrar el aviso de salida del navegador para confirmar el descarte.
*Origen: CT-06.*

**REQ-VAL-26. Varias pestañas abiertas.**
WHEN el sistema detecta un cambio en `localStorage` hecho desde otra pestaña IF esta pestaña no es la pestaña activa THEN the system SHALL recargar los datos, dejar esta pestaña en solo lectura y mostrar un aviso que indique que el registro se está editando en otra pestaña.
*Origen: CT-07.*

**REQ-VAL-27. Un solo registro en curso.**
WHEN el sistema va a crear una inspección nueva IF ya existe en `localStorage` una inspección con `horaFin = null` THEN the system SHALL no crear una segunda inspección y retomar la existente.
*Origen: RN-13, CT-07.*

**REQ-VAL-28. Lote rechazado por vehículo sin parámetros.**
WHEN el inspector guarda un lote IF el chequeo es «No cumple» THEN the system SHALL guardar el lote con `brix`, `temperatura`, `dentroCalibre` y `peso` en `null` y no exigir ningún parámetro.
*Origen: RN-07, RN-02.*

**REQ-VAL-29. Pendiente de valorar con parámetros inválidos. [Propuesto]**
WHEN el inspector presiona «Guardar lote» sobre un lote «Pendiente de valorar» IF algún parámetro aplicable está vacío o fuera del rango válido de entrada THEN the system SHALL mostrar los errores, no guardar los cambios y conservar el lote guardado como «Pendiente de valorar».
*Origen: RN-02, RN-15; pregunta P-01, respuesta provisional del Head Chef del 25/10/2026 (se rechaza el guardado). Pendiente de validar con el cliente.*

**REQ-VAL-30. Lista de inspectores vacía.**
WHEN se carga la pantalla de registro IF el archivo de configuración no contiene ningún nombre de inspector válido THEN the system SHALL deshabilitar la lista «Nombre del inspector», mostrar un aviso que indique que no hay inspectores configurados e impedir que la inspección quede completa.
*Origen: RF-02, RN-01; pregunta P-06 resuelta por el Head Chef el 25/10/2026 (se bloquea el registro).*

**REQ-VAL-31. Nombres de inspector vacíos o repetidos.**
WHEN se carga la lista de inspectores IF el archivo de configuración contiene nombres vacíos, con solo espacios o repetidos (sin distinguir mayúsculas ni espacios al inicio o al final) THEN the system SHALL omitir los nombres vacíos, mostrar una sola vez cada nombre repetido y seguir funcionando con los nombres válidos.
*Origen: RF-02, CT-14; pregunta P-06 resuelta por el Head Chef el 25/10/2026 (se depura la lista sin avisar).*

**REQ-VAL-32. Retomar la edición en otra pestaña.**
WHEN el inspector presiona «Continuar en esta pestaña» en el aviso de solo lectura IF esta pestaña no es la pestaña activa THEN the system SHALL recargar los datos desde `localStorage`, convertir esta pestaña en la activa y dejar las demás en solo lectura.
*Origen: CT-07; pregunta P-07 resuelta por el Head Chef el 25/10/2026 (botón «Continuar en esta pestaña»).*

---

## 10. Persistencia de datos local

**REQ-PER-01. Medio de almacenamiento.**
WHEN el sistema guarda inspecciones o lotes IF el navegador ofrece `localStorage` THEN the system SHALL almacenarlos exclusivamente en el `localStorage` del navegador, sin enviarlos a ningún servidor.
*Origen: RF-09, CT-13; contrato `x-almacenamiento.medio`.*

**REQ-PER-02. Guardado de la inspección desde el primer dato.**
WHEN el inspector ingresa o modifica cualquier campo de la inspección IF el dato es el primero de la inspección (REQ-INS-01) o el registro ya está en curso THEN the system SHALL persistir la inspección completa en `localStorage` de inmediato, aunque todavía no esté completa, con los campos sin valor en `null`.
*Origen: RF-09, CT-03; contrato `InspeccionVehiculo`.*

**REQ-PER-03. Guardado del lote al presionar Guardar lote.**
WHEN el inspector presiona «Guardar lote» IF el lote cumple las condiciones de guardado THEN the system SHALL persistir el lote en `localStorage` de inmediato, y no antes.
*Origen: RF-09, RN-12.*

**REQ-PER-04. Cambios aplicados por el sistema.**
WHEN el sistema modifica lotes por un cambio en el chequeo del vehículo IF el cambio fue confirmado o no requiere confirmación THEN the system SHALL persistir de inmediato todos los lotes afectados.
*Origen: RN-12; contrato `x-almacenamiento.reglas`.*

**REQ-PER-05. Conformidad con el contrato de datos.**
WHEN el sistema escribe una inspección o un lote en `localStorage` IF un campo del contrato no tiene valor THEN the system SHALL escribirlo como `null`, sin omitirlo ni usar una cadena vacía, y respetar los nombres de campo, tipos, enumeraciones, formatos y reglas condicionales de `data-contract.json`.
*Origen: contrato de datos completo.*

**REQ-PER-06. Literales del producto.**
WHEN el sistema guarda el producto de un lote IF el inspector seleccionó un producto THEN the system SHALL guardar exactamente uno de los literales `Banano`, `Plátano` (con tilde), `Yuca` o `Malanga`.
*Origen: contrato `Producto`.*

**REQ-PER-07. Parámetros que no aplican.**
WHEN el sistema guarda un lote IF un parámetro no aplica al producto o el chequeo es «No cumple» THEN the system SHALL guardar ese parámetro como `null`.
*Origen: RN-06, RN-07; contrato `LoteMateriaPrima.allOf`.*

**REQ-PER-08. Coherencia de estado y motivo.**
WHEN el sistema guarda un lote IF `estado = Rechazado` THEN the system SHALL guardar `motivoRechazo` como texto no vacío, y en cualquier otro caso guardarlo como `null`.
*Origen: RN-08; contrato `LoteMateriaPrima.allOf`.*

**REQ-PER-09. Persistencia de la hora de fin.**
WHEN el inspector finaliza el registro IF se cumplen las condiciones de finalización THEN the system SHALL persistir `horaFin` en `localStorage` antes de limpiar la página.
*Origen: RF-09, RF-08.*

**REQ-PER-10. Eliminación por cancelación.**
WHEN el inspector confirma «Cancelar registro» IF el registro está en curso THEN the system SHALL eliminar de `localStorage` la inspección y todos los lotes cuyo `inspeccionId` coincide con su `id`.
*Origen: RN-14.*

**REQ-PER-11. Integridad referencial.**
WHEN el sistema guarda o carga lotes IF el `inspeccionId` de un lote no corresponde a ninguna inspección almacenada THEN the system SHALL omitir ese lote y mostrar un aviso de datos inconsistentes.
*Origen: RN-04, CT-12.*

**REQ-PER-12. Espacio insuficiente.**
WHEN el sistema intenta escribir en `localStorage` IF el navegador rechaza la escritura por falta de espacio THEN the system SHALL mostrar un error, no dar por guardado el lote o el cambio y conservar los datos en el formulario.
*Origen: CT-11.*

**REQ-PER-13. Datos dañados.**
WHEN el sistema lee registros de `localStorage` IF un registro no se puede interpretar o no cumple el contrato de datos THEN the system SHALL omitir ese registro, mostrar un aviso y seguir funcionando con los demás registros.
*Origen: CT-12.*

**REQ-PER-14. Almacenamiento no disponible.**
WHEN se carga la aplicación IF `localStorage` no está disponible o lanza un error de acceso (por ejemplo, almacenamiento bloqueado por el navegador) THEN the system SHALL mostrar un aviso que indique que los registros no se podrán guardar y deshabilitar el registro de inspecciones.
*Origen: CT-11, CT-13; pregunta P-04 resuelta por el Head Chef el 25/10/2026 (avisar y deshabilitar el registro).*

**REQ-PER-15. Sincronización entre pestañas.**
WHEN otra pestaña modifica las claves de la aplicación en `localStorage` IF esta pestaña no es la pestaña activa THEN the system SHALL recargar los datos desde `localStorage` y bloquear en el módulo de almacenamiento cualquier escritura desde esta pestaña (REQ-VAL-26).
*Origen: CT-07.*

**REQ-PER-16. Datos solo en el equipo.**
WHEN el inspector abre la aplicación en otro equipo, otro navegador, en modo incógnito o tras borrar los datos del navegador IF los registros fueron capturados en otro contexto THEN the system SHALL mostrar únicamente los registros presentes en el `localStorage` actual, sin intentar recuperarlos de otra fuente.
*Origen: CT-13.*

---

## 11. Restricciones de diseño (Unchanged Behavior)

Esta sección define el comportamiento que **debe permanecer invariable** en esta versión y en cualquier cambio futuro, salvo una decisión explícita del cliente que actualice este documento. Sirve como base para pruebas de regresión.

**REQ-UNC-01. Nombre y encabezado del formulario.**
WHEN se muestra la aplicación IF no hay una nueva versión aprobada del FO-AS-07 THEN the system SHALL CONTINUE TO usar el nombre «Registro de inspección de vehículo y recepción de fruta» y los metadatos del formulario versión 13.
*Origen: Minuta «Contexto» y «Formulario de referencia».*

**REQ-UNC-02. Catálogo cerrado de productos.**
WHEN el inspector selecciona un producto IF no hay una decisión del cliente que amplíe el catálogo THEN the system SHALL CONTINUE TO ofrecer solo Banano, Plátano, Yuca y Malanga, sin camote, papa ni pulpas.
*Origen: acuerdo «Catálogo de productos».*

**REQ-UNC-03. Criterios de aprobación fijos.**
WHEN el sistema valora un lote IF no hay una nueva tabla de especificaciones aprobada THEN the system SHALL CONTINUE TO aplicar los rangos de la sección 3.3, con extremos incluidos y sin redondeo.
*Origen: RN-05, RN-06; acuerdos «Límites de los rangos» y «Temperatura».*

**REQ-UNC-04. Estado calculado, nunca manual.**
WHEN se muestra un lote IF no hay una decisión del cliente que autorice marcar el estado manualmente THEN the system SHALL CONTINUE TO calcular `estado` automáticamente y no ofrecer ningún control para marcar Aprobado o Rechazado manualmente.
*Origen: RF-05, RN-05.*

**REQ-UNC-05. Solo dos estados.**
WHEN el sistema asigna un estado IF el lote está valorado THEN the system SHALL CONTINUE TO usar únicamente «Aprobado» o «Rechazado», y representar «Pendiente de valorar» con `estado = null`, nunca como tercer valor.
*Origen: RN-05; contrato `EstadoLote`.*

**REQ-UNC-06. Motivo del rechazo propiedad del sistema.**
WHEN se muestra o guarda un lote IF el lote está Rechazado THEN the system SHALL CONTINUE TO escribir el motivo del rechazo y no permitir que el inspector lo edite.
*Origen: RN-08; acuerdo «Origen del motivo de rechazo».*

**REQ-UNC-07. Observaciones propiedad del inspector.**
WHEN el sistema procesa un lote IF el lote tiene observaciones THEN the system SHALL CONTINUE TO no modificarlas bajo ninguna circunstancia.
*Origen: RN-08.*

**REQ-UNC-08. Fecha y horas asignadas por el sistema.**
WHEN se registra una inspección IF no hay una decisión del cliente que autorice ingresar la fecha o las horas manualmente THEN the system SHALL CONTINUE TO asignar `fecha`, `horaInicio` y `horaFin` automáticamente desde el reloj del equipo convertido a la zona America/Costa_Rica, sin entrada manual.
*Origen: RN-01, CT-04; acuerdo «Fecha y horas».*

**REQ-UNC-09. Inspectores desde configuración.**
WHEN se agrega o quita un inspector IF el cambio se hace en el archivo de configuración THEN the system SHALL CONTINUE TO reflejar la nueva lista sin cambios en la lógica de la aplicación.
*Origen: RF-02; acuerdo «Inspectores».*

**REQ-UNC-10. Una sola orden de compra por lote.**
WHEN se registra un lote IF no hay una decisión del cliente en contrario THEN the system SHALL CONTINUE TO ofrecer un único campo de orden de compra, sin los campos «1 Orden compra calidad» ni «2 Orden compra calidad».
*Origen: acuerdo «Órdenes de compra de calidad».*

**REQ-UNC-11. Peso promedio digitado.**
WHEN el inspector registra el peso de un lote de Malanga IF la versión vigente es la 1.0 THEN the system SHALL CONTINUE TO aceptar solo el peso promedio por pieza digitado, sin registrar el tamaño de la muestra ni calcular el promedio.
*Origen: Minuta «Pendiente para la siguiente versión».*

**REQ-UNC-12. Consultas de solo lectura y solo finalizados.**
WHEN el inspector usa la pantalla «Consultas» IF no hay una decisión del cliente que permita consultar registros en curso o editar registros finalizados THEN the system SHALL CONTINUE TO mostrar únicamente registros finalizados y en modo solo lectura.
*Origen: RN-10.*

**REQ-UNC-13. Lotes condicionados a la inspección.**
WHEN el inspector intenta registrar un lote IF la inspección no está completa THEN the system SHALL CONTINUE TO impedir el registro de lotes.
*Origen: RN-11.*

**REQ-UNC-14. Persistencia exclusivamente local.**
WHEN el sistema guarda datos IF no hay una decisión del cliente de incorporar un servidor THEN the system SHALL CONTINUE TO usar solo `localStorage`, sin servidor, autenticación ni sincronización.
*Origen: RF-09, CT-13.*

**REQ-UNC-15. Cerrar sin guardar no borra lotes guardados.**
WHEN el inspector presiona «Cerrar sin guardar» IF el lote ya estaba guardado THEN the system SHALL CONTINUE TO conservar el lote, reservando su eliminación a «Quitar» y la del registro completo a «Cancelar registro».
*Origen: RF-15.*

**REQ-UNC-16. Reporte de rechazo solo en registros finalizados.**
WHEN un registro deja de estar en curso IF fue cancelado THEN the system SHALL CONTINUE TO eliminar también los lotes rechazados, conservando su reporte únicamente cuando el registro se finaliza.
*Origen: RF-05, RN-14; acuerdo «Cancelación».*

**REQ-UNC-17. Compatibilidad del contrato de datos.**
WHEN se modifique la aplicación IF existen datos guardados con el contrato v1.0.0 THEN the system SHALL CONTINUE TO leer esos datos sin pérdida, sin renombrar ni eliminar campos existentes.
*Origen: contrato de datos v1.0.0; CT-12.*

**REQ-UNC-18. Identidad visual.**
WHEN se muestra cualquier pantalla IF no hay un nuevo diseño aprobado THEN the system SHALL CONTINUE TO usar el logotipo de Alimentos Bermúdez S.A., el menú lateral con las secciones Operación y Referencia, y los colores de producto de los wireframes (Banano amarillo, Plátano verde, Yuca café claro, Malanga morado).
*Origen: WF-00 a WF-07.*

---

## 12. Requerimientos no funcionales

### 12.1 Atributos de calidad

| ID | Categoría | Requerimiento |
| :---- | :---- | :---- |
| RNF-01 | Plataforma | La aplicación SHALL ejecutarse como aplicación web del lado del cliente (HTML, CSS y JavaScript), sin servidor de aplicaciones, en las dos últimas versiones estables de Chrome, Edge y Firefox. El stack concreto se define en la sección 12.2. |
| RNF-02 | Configuración | La lista de inspectores SHALL residir en un archivo de configuración separado de la lógica (`src/config/inspectores.js`, ver REQ-TEC-06), editable sin modificar el código de la aplicación. |
| RNF-03 | Rendimiento | Guardar una inspección o un lote y recalcular el estado SHALL completarse en menos de 200 ms con hasta 5 000 lotes almacenados. Una consulta SHALL responder en menos de 1 s con ese mismo volumen. |
| RNF-04 | Disponibilidad | La aplicación SHALL funcionar sin conexión a Internet una vez cargada. |
| RNF-05 | Usabilidad | Toda acción destructiva (cambiar el chequeo a No cumple con lotes, Cancelar registro, Cerrar sin guardar con cambios, Quitar) SHALL pedir confirmación explícita con un mensaje que indique su efecto. |
| RNF-06 | Usabilidad | Los mensajes de error SHALL mostrarse junto al campo que los causa, en español y con la acción esperada. |
| RNF-07 | Responsividad | La interfaz SHALL ser utilizable en pantallas desde 1024 px de ancho (tableta horizontal y escritorio). |
| RNF-08 | Accesibilidad | La interfaz SHALL cumplir WCAG 2.1 nivel AA en contraste, etiquetas de formulario, foco visible y navegación por teclado. |
| RNF-09 | Idioma y región | Los textos SHALL estar en español; las fechas SHALL mostrarse como DD/MM/YYYY y las horas en formato de 24 h, zona America/Costa_Rica (UTC-6). |
| RNF-10 | Identificadores | Los `id` de inspección y lote SHALL ser UUID v4 generados con `crypto.randomUUID()` o equivalente criptográficamente seguro. |
| RNF-11 | Mantenibilidad | Las reglas de valoración (tabla 3.3 y 3.4) SHALL concentrarse en un único módulo o estructura de datos, alineada con `x-reglas` del contrato de datos. |
| RNF-12 | Calidad | Las reglas de valoración, normalización y validación SHALL tener pruebas unitarias automatizadas que cubran todos los valores de borde de la sección 9. |

### 12.2 Restricciones técnicas y stack (D-01)

**Decisión D-01 · Stack técnico (aprobada por el equipo de desarrollo).** La aplicación es una SPA en HTML, CSS y JavaScript nativo con ES Modules, sin framework, sin TypeScript y sin paso de compilación. Los tipos se declaran con JSON Schema (`data-contract.json`) y JSDoc `@typedef` verificados con `// @ts-check`. Las pruebas se ejecutan con `node --test` (Node.js 18 o superior) y la aplicación se sirve en desarrollo con un servidor estático propio (`scripts/serve.js`, módulo `node:http`). No se usan dependencias externas ni `npm install`.

**Justificación.** El alcance (un formulario de inspección con lotes y dos consultas de solo lectura) no requiere un framework. Un stack sin dependencias permite que todo el código fuente sea explicable y auditable por el Head Chef durante la defensa. Los ES Modules y `crypto.randomUUID()` (RNF-10) no funcionan al abrir `index.html` desde `file://`, por lo que se requiere un servidor local que solo entrega archivos estáticos; esto es compatible con RNF-01, porque no hay servidor de aplicaciones.

**REQ-TEC-01. Tecnología de la interfaz.**
WHEN se construye o modifica la aplicación IF no hay una nueva decisión técnica que reemplace D-01 THEN the system SHALL implementarse con HTML, CSS y JavaScript nativo (ES Modules), sin frameworks, bibliotecas de terceros ni paso de compilación.
*Origen: D-01; RNF-01.*

**REQ-TEC-02. Tipos del dominio.**
WHEN se declara una estructura de `InspeccionVehiculo` o `LoteMateriaPrima` en el código IF la estructura proviene de `data-contract.json` THEN the system SHALL declararla con JSDoc `@typedef` equivalente al contrato y verificarla con `// @ts-check`, sin usar TypeScript.
*Origen: D-01; REQ-PER-05.*

**REQ-TEC-03. Servidor local de desarrollo.**
WHEN se ejecuta la aplicación en el equipo IF se inicia con `node scripts/serve.js` THEN the system SHALL servirse en `http://localhost:3000`, y el servidor SHALL limitarse a entregar archivos estáticos, sin lógica de negocio ni API.
*Origen: D-01; RNF-01.*

**REQ-TEC-04. Sin comunicación de red.**
WHEN el inspector realiza cualquier operación IF el equipo no tiene conexión a Internet THEN the system SHALL completarla igual que con conexión, porque no realiza solicitudes de red (`fetch`, `XMLHttpRequest`) en tiempo de ejecución.
*Origen: D-01; RNF-04, REQ-PER-01, REQ-UNC-14.*

**REQ-TEC-05. Acceso único a `localStorage`.**
WHEN un módulo necesita leer o escribir inspecciones o lotes IF el módulo no es `src/state/storage.js` THEN the system SHALL hacerlo mediante las funciones que exporta `src/state/storage.js`, sin acceder a `localStorage` directamente.
*Origen: D-01; REQ-PER-01, REQ-PER-12, REQ-PER-13.*

**REQ-TEC-06. Archivo de configuración de inspectores.**
WHEN se carga la aplicación IF existe el módulo `src/config/inspectores.js` THEN the system SHALL leer la lista de inspectores mediante un `import` estático del arreglo que ese módulo exporta, sin `fetch`, de modo que agregar o quitar un inspector solo requiera editar ese archivo.
*Origen: RF-02, D-01; contrato `x-configuracion.inspectores`; REQ-INS-06, REQ-UNC-09, RNF-02.*

**REQ-TEC-07. Fechas y horas en zona America/Costa_Rica.**
WHEN el sistema genera `fecha`, `horaInicio` u `horaFin` IF la zona horaria configurada en el equipo es distinta de America/Costa_Rica THEN the system SHALL igualmente convertir el instante a la zona America/Costa_Rica con `Intl.DateTimeFormat` (`timeZone: 'America/Costa_Rica'`), sin depender de la zona configurada en el equipo ni usar `toISOString()`, que devuelve UTC y puede cambiar la fecha de entrada.
*Origen: RN-01, RN-09, CT-04; REQ-INS-01, REQ-UNC-08.*

**REQ-TEC-08. Validación numérica sobre el texto ingresado.**
WHEN el sistema valida Brix, temperatura o peso IF el inspector ingresó un valor THEN the system SHALL validar el formato y la cantidad de decimales sobre el texto digitado, antes de convertirlo a número, y comparar el número resultante con los rangos sin redondear.
*Origen: RN-05, RN-15; REQ-VAL-03, REQ-LOT-13.*

**REQ-TEC-09. Separación por capas.**
WHEN se agrega o modifica un módulo en `src/` IF el módulo contiene reglas de negocio o validaciones THEN the system SHALL ubicarlo en `src/domain/` sin acceso al DOM ni a `localStorage`; el estado y la persistencia van en `src/state/`, los componentes y vistas en `src/ui/` y la configuración en `src/config/`.
*Origen: D-01; RNF-11.*

**REQ-TEC-10. Pruebas automatizadas sin dependencias.**
WHEN se ejecuta `node --test` IF el proyecto no tiene dependencias instaladas (sin `node_modules`) THEN the system SHALL verificar las reglas de `src/domain/` y el módulo de almacenamiento usando un `localStorage` simulado en memoria, sin instalar bibliotecas de pruebas.
*Origen: D-01; RNF-12.*

---

## 13. Supuestos, preguntas abiertas y fuera de alcance

### 13.1 Supuestos

- S-01. Un único equipo y navegador se usa para la recepción (CT-13).
- S-02. El reloj del equipo tiene la fecha y hora correctas. La aplicación siempre las muestra y registra en zona America/Costa_Rica, sin importar la zona configurada en el equipo; no corrige el reloj, solo avisa inconsistencias (CT-04).
- S-03. No existen roles ni permisos: cualquier persona con acceso al equipo puede operar la aplicación. La minuta no lo menciona; se deduce de RF-02 y RF-09. Pendiente de confirmar con el cliente (P-09).

### 13.2 Preguntas abiertas para validar con el cliente

Las preguntas tachadas están cerradas. Una **decisión técnica** la toma el equipo y no requiere al cliente. Una respuesta **provisional** se aplica en esta versión, pero su requerimiento queda marcado [Propuesto] hasta que el cliente la confirme.

| ID | Pregunta | Requerimiento afectado |
| :---- | :---- | :---- |
| P-01 | Si el inspector edita un lote «Pendiente de valorar» y presiona «Guardar lote» con parámetros incompletos, ¿se rechaza el guardado o se permite guardar los parámetros parciales manteniéndolo pendiente? **Provisional** (Head Chef, 25/10/2026), pendiente de confirmar con el cliente: se rechaza el guardado; el lote sigue Pendiente de valorar sin parámetros. | REQ-VAL-29 |
| ~~P-02~~ | ¿«Quitar» un lote requiere confirmación? **Decisión técnica** (Head Chef, 25/10/2026): sí; Quitar siempre pide confirmación, como toda acción destructiva (RNF-05). | REQ-LOT-28 |
| ~~P-03~~ | ¿Se acepta la coma como separador decimal? **Decisión técnica** (equipo de desarrollo, 25/10/2026): no; solo se admite punto decimal y la coma muestra error. | REQ-VAL-11 |
| ~~P-04~~ | ¿Qué debe ocurrir si el navegador bloquea `localStorage`? **Decisión técnica** (Head Chef, 25/10/2026): se muestra un aviso y se deshabilita el registro de inspecciones; Consultas y Criterios de aceptación siguen abriendo. | REQ-PER-14 |
| P-05 | ¿Se requiere exportar o respaldar los registros (por ejemplo, a CSV o JSON) para mitigar la limitación de CT-13? | Fuera de alcance actual |
| ~~P-06~~ | Si el archivo de configuración queda sin inspectores válidos o con nombres repetidos, ¿se bloquea el registro y se depura la lista como se propone? **Decisión técnica** (Head Chef, 25/10/2026): sí; sin nombres válidos se bloquea el registro con un aviso, y los nombres vacíos o repetidos se depuran sin avisar, conservando la primera aparición. | REQ-VAL-30, REQ-VAL-31 |
| ~~P-07~~ | Si la aplicación está abierta en varias pestañas, ¿la pestaña en solo lectura recupera la edición con el botón «Continuar en esta pestaña», como se propone? **Decisión técnica** (Head Chef, 25/10/2026): sí. | REQ-VAL-32 |
| P-08 | En «Consultas», antes de que el inspector haga una búsqueda, ¿se muestran las últimas 10 inspecciones de registros finalizados, como propone el Head Chef el 26/10/2026? | REQ-CON-11 |
| P-09 | ¿Basta con que el inspector elija su nombre de la lista, sin usuario ni contraseña, aunque cualquier persona con acceso al equipo pueda registrar a nombre de otro inspector? Si se requiere autenticación, queda fuera de esta versión porque necesita un servidor (REQ-UNC-14). | S-03; REQ-UNC-14 |

### 13.3 Fuera de alcance (versión 1.0)

- Cálculo del peso promedio a partir de las piezas de la muestra y control del tamaño de la muestra (siguiente versión).
- Servidor, base de datos central, sincronización entre equipos y autenticación de usuarios.
- Productos distintos de banano, plátano, yuca y malanga.
- Campos «1 Orden compra calidad» y «2 Orden compra calidad».
- Edición o eliminación de registros finalizados.
- Generación de reportes, impresión y exportación de registros. El reporte de un lote Rechazado que se conserva en el registro finalizado (RF-05, RN-14) sí está en alcance.

---

## 14. Matriz de trazabilidad

| Fuente | Requerimientos |
| :---- | :---- |
| RF-01 | REQ-INS-01, 02, 04, 05, 08 |
| RF-02 | REQ-INS-06, 07; REQ-VAL-30, 31; REQ-UNC-09; RNF-02; REQ-TEC-06 |
| RF-03 | REQ-LOT-02, 03, 04, 08, 35 |
| RF-04 | REQ-LOT-05 |
| RF-05 | REQ-LOT-11, 12, 20; REQ-REG-07; REQ-UNC-04, 16 |
| RF-06 | REQ-LOT-15, 16, 17, 18 |
| RF-07 | REQ-LOT-02, 22, 24 |
| RF-08 | REQ-REG-02, 10; REQ-PER-09 |
| RF-09 | REQ-INS-15, 16; REQ-LOT-22; REQ-REG-02; REQ-PER-01 a 03, 09; REQ-UNC-14 |
| RF-10 | REQ-CON-01, 03, 04, 11 |
| RF-11 | REQ-CON-01, 04 a 08 |
| RF-12 | REQ-INS-15; REQ-LOT-25, 26, 27, 28 |
| RF-13 | REQ-REG-09 |
| RF-14 | REQ-REG-06, 07 |
| RF-15 | REQ-LOT-30 a 34; REQ-UNC-15 |
| RN-01 | REQ-INS-01, 02, 14; REQ-VAL-22, 30; REQ-UNC-08; REQ-TEC-07 |
| RN-02 | REQ-INS-13; REQ-LOT-03, 08, 22, 23, 29, 32; REQ-VAL-12, 13, 28, 29 |
| RN-03 | REQ-LOT-06; REQ-REG-01 a 03, 11 |
| RN-04 | REQ-LOT-09; REQ-CON-06; REQ-PER-11 |
| RN-05 | REQ-LOT-11 a 13, 21; REQ-VAL-08, 09; REQ-UNC-03 a 05; REQ-TEC-08 |
| RN-06 | REQ-LOT-04, 05, 11 a 14; REQ-UI-05; REQ-VAL-08, 09; REQ-PER-07; REQ-UNC-03 |
| RN-07 | REQ-INS-08 a 12; REQ-LOT-05, 06, 32; REQ-VAL-28; REQ-PER-07 |
| RN-08 | REQ-LOT-15 a 19; REQ-VAL-09; REQ-PER-08; REQ-UNC-06, 07 |
| RN-09 | REQ-INS-01, 08, 09; REQ-LOT-07, 09; REQ-UI-07; REQ-VAL-03, 10 a 12; REQ-TEC-07 |
| RN-10 | REQ-REG-05; REQ-CON-04, 06, 07, 10, 11; REQ-UNC-12 |
| RN-11 | REQ-INS-14; REQ-LOT-01; REQ-UNC-13 |
| RN-12 | REQ-INS-10, 11, 13, 15; REQ-LOT-21, 26, 27, 29, 33; REQ-REG-05; REQ-PER-03, 04 |
| RN-13 | REQ-REG-09; REQ-VAL-27; REQ-UI-08 |
| RN-14 | REQ-REG-05 a 08, 10, 11; REQ-PER-10; REQ-UNC-16 |
| RN-15 | REQ-LOT-23; REQ-UI-05; REQ-VAL-01 a 07, 10, 11, 29; REQ-TEC-08 |
| RN-16 | REQ-LOT-23; REQ-CON-05; REQ-VAL-14 a 16, 19 |
| CT-01 | REQ-LOT-10 |
| CT-02 | REQ-LOT-01; REQ-REG-03; REQ-VAL-20 |
| CT-03 | REQ-INS-03; REQ-PER-02 |
| CT-04 | REQ-INS-01; REQ-REG-02; REQ-UI-02; REQ-VAL-21; REQ-UNC-08; REQ-TEC-07 |
| CT-05 | REQ-VAL-23 |
| CT-06 | REQ-LOT-30, 31; REQ-REG-04; REQ-VAL-24, 25 |
| CT-07 | REQ-VAL-26, 27, 32; REQ-PER-15 |
| CT-08 | REQ-INS-04; REQ-LOT-35; REQ-CON-03, 05; REQ-VAL-14, 18, 19 |
| CT-09 | REQ-CON-02, 03, 09 |
| CT-10 | REQ-INS-05 |
| CT-11 | REQ-PER-12, 14 |
| CT-12 | REQ-PER-11, 13; REQ-UNC-17 |
| CT-13 | REQ-UI-06; REQ-PER-01, 14, 16; REQ-UNC-14 |
| CT-14 | REQ-INS-04; REQ-LOT-08, 35; REQ-CON-02; REQ-VAL-17, 18, 31 |
| D-01 | REQ-TEC-01 a 10; RNF-01, 02 |
| Wireframes 00–07 | REQ-INS-14, 16; REQ-LOT-21, 25; REQ-REG-01, 11; REQ-CON-01, 03, 11; REQ-UI-01 a 08; REQ-UNC-18 |
