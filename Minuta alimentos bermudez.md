# Minuta de levantamiento de requerimientos

## Aplicación web Registro de inspección de vehículo y recepción de fruta · Alimentos Bermúdez S.A.

# Datos de la sesión

La sesión con el cliente tuvo como fin extraer los requerimientos para digitalizar el formulario de recepción de materia prima, resolver los vacíos del proceso actual y definir las reglas de negocio e invariantes del dominio.

| Elemento | Detalle |
| :---- | :---- |
| Cliente | Alimentos Bermúdez S.A. |
| Proyecto | Aplicación web para digitalizar el formulario FO-AS-07, Registro de inspección de vehículo y recepción de fruta |
| Tipo de sesión | Extracción de requerimientos con el cliente |
| Fecha | 16 de octubre de 2026  |
| Participantes | Lic. Jackeline Pérez, Ing. Yeimy Alvarado. |

# Contexto

Alimentos Bermúdez S.A. lleva en papel el registro de recepción de la fruta que utiliza para fabricar chips de banano, plátano, yuca y malanga. La empresa requiere una aplicación web que digitalice ese registro y que lleve el nombre del formulario actual: Registro de inspección de vehículo y recepción de fruta.

El proceso consta de tres partes: la inspección del vehículo que transporta la materia prima, la valoración de cada lote de producto recibido y la consulta de los registros guardados.

## Formulario de referencia

La aplicación toma como base el formulario físico vigente. El boceto de pantalla conserva su encabezado:

* **Código:** FO-AS-07, Registro de inspección de vehículo y recepción de fruta.  
* **Elaborado por:** Jefe de Calidad.  
* **Versión:** 13\.  
* **Válido desde:** 8/07/2025.  
* **Última revisión:** 8/07/2025.  
* **Próxima revisión:** 8/07/2027.

# Alcance funcional

## Inspección del vehículo

El inspector registra estos datos de llegada del vehículo, en este orden; la fecha y las horas las asigna el sistema:

* **Fecha de entrada:** la asigna el sistema y es la misma fecha de la hora de inicio; el inspector no la modifica.  
* **Hora de inicio:** la asigna el sistema, con fecha y hora, cuando el inspector ingresa el primer dato de la inspección; el inspector no la ingresa.  
* **Número de placa:** placa del vehículo que transporta la materia prima.  
* **Productor:** nombre del productor que entrega la fruta.  
* **Nombre del inspector:** lista de selección con Melquisedec GP, Aurora V y Margarita C. Los nombres se cargan desde un archivo de configuración de la aplicación (RF-02).  
* **Chequeo del vehículo:** selección única entre Cumple y No cumple, obligatoria y sin valor por defecto, para anotar la valoración visual del vehículo y hacer constar si cumple los requisitos de transporte de la materia prima.  
* **Hora de fin:** la asigna el sistema, con fecha y hora, al presionar el botón Finalizar registro; el inspector no la ingresa.

## Recepción y valoración de lotes

Por cada lote que llega en el vehículo, el inspector registra estos datos; los parámetros de valoración se piden solo si aplican al producto (RN-06) y el vehículo cumple con el chequeo (RN-07):

* **Número de lote:** opcional; identificador del lote recibido. No puede repetirse dentro de la misma inspección (RN-16).  
* **Orden de compra:** opcional; orden de compra asociada al lote.  
* **Producto:** obligatorio; lista de selección con banano, plátano, yuca y malanga.  
* **Brix:** un único indicador de grados Brix por lote, con un decimal; aplica a banano, plátano y malanga.  
* **Temperatura:** temperatura interna del producto en grados Celsius, con un decimal; aplica a todos los productos.  
* **Calibre:** selección única entre Dentro de calibre y Fuera de calibre, obligatoria y sin valor por defecto; aplica a banano y plátano.  
* **Peso:** peso promedio por pieza, en gramos, de una muestra de piezas del lote, con un decimal; el inspector calcula el promedio y lo digita. Aplica solo a malanga. El tamaño de la muestra lo define el procedimiento de calidad y el sistema no lo registra; que el sistema calcule el promedio queda para la siguiente versión.  
* **Observaciones:** opcionales en todo lote, para comentarios del inspector; el sistema nunca las modifica.  
* **Motivo del rechazo:** lo escribe el sistema cuando el lote es rechazado: que el vehículo no cumple con el chequeo, o los parámetros que fallaron, con su valor y su rango. El inspector no lo edita (RN-08).

Con estos datos y el resultado del chequeo del vehículo, el sistema marca el lote como Aprobado o Rechazado; un lote Pendiente de valorar (RN-12) aún no tiene estado. Si el vehículo No cumple con el chequeo, el sistema pide confirmación y marca automáticamente como Rechazados los lotes ya registrados en la inspección (RN-07), y todo lote nuevo nace Rechazado: sus parámetros quedan deshabilitados y solo se registra el producto. Si el lote es rechazado, el producto no se recibe, pero el reporte del lote se conserva solo si el registro se finaliza. El sistema escribe el motivo del rechazo, y el inspector puede agregar sus comentarios en observaciones. El inspector guarda el lote con el botón Guardar lote, que lo almacena de inmediato en localStorage, y con el botón \+ Lote puede añadir más lotes del mismo vehículo. Si ya no desea ingresar el lote que está registrando, presiona el botón Cerrar sin guardar, que cierra el formulario del lote y descarta los cambios que no se han guardado (RF-15). Al terminar, presiona el botón Finalizar registro, que asigna la hora de fin, cierra el registro completo y limpia la página para la siguiente inspección. Si decide no proceder, presiona el botón Cancelar registro, que borra el registro en curso con todos sus lotes, incluidos los rechazados.

## Consulta de registros

* **Por número de placa:** muestra el historial de entregas finalizadas que ha hecho ese vehículo, solo para consulta y sin posibilidad de edición.  
* **Por número de lote:** muestra la lista de lotes de registros finalizados que tienen ese número, con la fecha, la placa y el productor de cada uno. Al elegir uno, muestra todos los datos del lote y los de la inspección relacionada mediante la clave foránea, para consulta y sin posibilidad de edición. La búsqueda no distingue mayúsculas, espacios ni guiones.

# Flujo de uso

Pasos que sigue el inspector para registrar la recepción de un vehículo:

1. **Registrar la inspección.** El inspector completa el número de placa, el productor, el inspector y el chequeo del vehículo (Cumple o No cumple). El sistema asigna la hora de inicio, con fecha y hora, cuando el inspector ingresa el primer dato, y toma como fecha de entrada la fecha de esa hora de inicio. Si existe un registro sin finalizar, el sistema lo retoma en lugar de abrir uno nuevo (RN-13).  
2. **Habilitar los lotes.** La sección de lotes se habilita solo cuando la inspección está completa (RN-11). La inspección ya está guardada en localStorage desde el primer dato (RF-09). Sin una inspección no se puede registrar ningún lote.  
3. **Registrar el lote.** El inspector selecciona el producto, que es obligatorio; el número de lote y la orden de compra son opcionales, y el número de lote no puede repetirse dentro de la inspección (RN-16). El sistema genera el id del lote y lo vincula con la inspección en curso mediante inspeccionId.  
4. **Ingresar los parámetros.** El sistema muestra solo los parámetros que aplican al producto seleccionado (RN-06) y el inspector los completa; un valor vacío, negativo, con más de un decimal o fuera del rango válido de entrada muestra un error (RN-15). Si el chequeo del vehículo es No cumple, los parámetros quedan deshabilitados, el lote nace Rechazado y el sistema solo pide el producto (RN-07).  
5. **Obtener el estado del lote.** El sistema marca el lote como Aprobado o Rechazado (RN-05). Si es Rechazado, el sistema escribe el motivo del rechazo y el inspector puede agregar comentarios en observaciones (RN-08). El lote solo se guarda si cumple RN-02, y el registro solo puede finalizarse si cumple RN-03.  
6. **Agregar más lotes.** El inspector guarda el lote con el botón Guardar lote, que lo almacena de inmediato en localStorage, y con el botón \+ Lote puede registrar otro lote del mismo vehículo repitiendo los pasos 3 a 5\. Si ya no desea ingresar el lote, presiona Cerrar sin guardar y el sistema descarta los cambios que no se han guardado (RF-15). Antes de finalizar, puede editar la inspección o cualquier lote, o quitar un lote ya agregado (RN-12).  
7. **Finalizar el registro.** El inspector presiona Finalizar registro. El sistema asigna la hora de fin, cierra el registro de la inspección y sus lotes y limpia la página para registrar una nueva inspección. En cualquier momento antes de finalizar, el inspector puede presionar Cancelar registro para no proceder; el sistema avisa cuántos lotes rechazados se perderán (RN-14).

# Modelo de datos

Se definieron dos entidades. Una inspección de vehículo agrupa uno o más lotes de materia prima, y cada lote se vincula con su inspección mediante una clave foránea.

## InspeccionVehiculo

Datos generales de la llegada del vehículo.

| Campo | Tipo | Descripción | Obligatoriedad |
| :---- | :---- | :---- | :---- |
| id | UUID | Identificador de la inspección; UUID generado por el sistema | Generado por el sistema |
| fecha | `string (YYYY-MM-DD)`  | Fecha de entrada del vehículo; la asigna el sistema con la fecha de horaInicio y no se edita | Generado por el sistema |
| horaInicio | `string (YYYY-MM-DDTHH:mm, 24 h)` | Fecha y hora de inicio; la asigna el sistema cuando el inspector ingresa el primer dato de la inspección. En pantalla puede mostrarse solo HH:mm | Generado por el sistema |
| placa | string | Número de placa del vehículo | obligatorio |
| productor | string | Nombre del productor | obligatorio |
| inspector | string (nombre tomado de la lista de inspectores del archivo de configuración) | Inspector que realiza la recepción; los registros antiguos conservan el nombre guardado aunque ya no esté en la lista | obligatorio |
| horaFin | `string (YYYY-MM-DDTHH:mm, 24 h)` | Fecha y hora de fin; la asigna el sistema al presionar Finalizar registro | Generado por el sistema al finalizar; vacío mientras el registro está en curso |
| chequeoVehiculo | boolean (sin valor hasta que el inspector elige) | Resultado del chequeo visual del vehículo: true \= Cumple, false \= No cumple; sin valor por defecto hasta que el inspector elige | obligatorio |

## LoteMateriaPrima

Datos de cada lote recibido en una inspección.

| Campo | Tipo | Descripción | Obligatoriedad |
| :---- | :---- | :---- | :---- |
| id | UUID | Identificador del lote; UUID generado por el sistema | Generado por el sistema |
| inspeccionId | UUID (clave foránea a InspeccionVehiculo.id) | UUID de la inspección en curso, asignado por el sistema | Generado por el sistema |
| numeroLote | string | Número de lote; único dentro de la inspección, comparado sin distinguir mayúsculas, espacios ni guiones (RN-16) | opcional |
| ordenCompra | string | Orden de compra | opcional |
| producto | 'Banano' \| 'Plátano' \| 'Yuca' \| 'Malanga' (enumeración cerrada) | Producto del lote; los literales se guardan exactamente así, con tilde en Plátano | obligatorio |
| dentroCalibre | boolean (sin valor hasta que el inspector elige) | true \= Dentro de calibre, false \= Fuera de calibre; se elige en una selección única sin valor por defecto | Condicional: obligatorio solo si aplica al producto (RN-06) y el vehículo cumple (RN-07) |
| brix | number (un decimal) | Grados Brix; rango válido de entrada 0.0 a 30.0 (RN-15) | Condicional: obligatorio solo si aplica al producto (RN-06) y el vehículo cumple (RN-07) |
| temperatura | number (un decimal) | Temperatura interna en °C; rango válido de entrada 0.0 a 50.0 (RN-15) | Condicional: obligatorio solo si aplica al producto (RN-06) y el vehículo cumple (RN-07) |
| peso | number (un decimal) | Peso promedio por pieza de una muestra, en gramos; rango válido de entrada 1.0 a 5000.0 (RN-15) | Condicional: obligatorio solo si aplica al producto (RN-06) y el vehículo cumple (RN-07) |
| estado | 'Aprobado' \| 'Rechazado' (enumeración cerrada, calculada por el sistema) | Resultado de la valoración del lote. Un lote Pendiente de valorar (RN-12) no tiene estado | Generado por el sistema; vacío mientras el lote está pendiente de valorar |
| observaciones | string | Comentarios del inspector; el sistema nunca los modifica | opcional |
| motivoRechazo | string | Motivo del rechazo que escribe el sistema: el vehículo no cumple con el chequeo, o los parámetros que fallaron con su valor y su rango. El inspector no lo edita (RN-08) | Generado por el sistema cuando estado es Rechazado; vacío si es Aprobado o está pendiente de valorar |

# Requerimientos funcionales

**RF-01. Registro de la inspección del vehículo.** El sistema debe permitir registrar el número de placa, el productor, el inspector y el chequeo visual de los requisitos de transporte (Cumple o No cumple) de cada vehículo que ingresa. La fecha de entrada, la hora de inicio y la hora de fin las asigna el sistema; las horas, con fecha y hora (RN-01).

**RF-02. Selección del inspector.** El nombre del inspector se elige de una lista con los inspectores Melquisedec GP, Aurora V y Margarita C. La lista se lee de un archivo de configuración de la aplicación, de modo que agregar o quitar un inspector no requiere cambiar la lógica. Los registros guardados conservan el nombre del inspector aunque ya no esté en la lista.

**RF-03. Registro de lotes.** El sistema debe permitir registrar uno o más lotes asociados a una misma inspección, cada uno con producto (obligatorio), número de lote y orden de compra (opcionales), observaciones (opcionales) y solo los parámetros de valoración (Brix, temperatura, calibre o peso) que aplican a su producto según RN-06, siempre que el vehículo cumpla con el chequeo (RN-07).

**RF-04. Selección del producto.** Al seleccionar el producto, el sistema debe mostrar al inspector una leyenda con los rangos de los criterios que se evalúan para ese producto, según la tabla de RN-06.

**RF-05. Aprobación o rechazo automático del lote.** El sistema debe marcar el lote como Aprobado o Rechazado a partir de los criterios del producto seleccionado (RN-06) y del resultado del chequeo del vehículo (RN-07). El inspector no marca ninguno de los dos estados manualmente. Si el lote es rechazado, el sistema debe indicar que el producto no se recibe y guardar el reporte del lote. El reporte se conserva solo si el registro se finaliza; si el registro se cancela, se borra (RN-14).

**RF-06. Motivo del rechazo y observaciones.** El sistema debe ofrecer en cada lote un campo de motivo del rechazo y un campo de observaciones. Si el lote es rechazado, el sistema escribe el motivo: que el vehículo no cumple con el chequeo, o cuáles parámetros fallaron, con su valor y su rango (por ejemplo, Brix 6.2, rango 2 a 5). El motivo se recalcula cuando cambian los parámetros o el chequeo, y el inspector no lo edita. El campo de observaciones es opcional en todo lote y el inspector lo usa para sus comentarios.

**RF-07. Guardar lote y añadir otro.** Al guardar un lote, el sistema debe ofrecer la opción de seguir añadiendo lotes que pertenezcan al mismo vehículo.

**RF-08. Botón Finalizar registro.** El sistema debe ofrecer un botón Finalizar registro que cierre la inspección del vehículo y sus lotes. Al presionarlo, y una vez cumplidas las condiciones de RN-03, el sistema asigna la horaFin de InspeccionVehiculo, cierra el registro completo y limpia la página para registrar la siguiente inspección.

**RF-09. Almacenamiento local.** El sistema debe almacenar la información de inspecciones y lotes en el localStorage del navegador. El sistema guarda la inspección en localStorage desde el primer dato ingresado, con todos los campos que tenga en ese momento, y la actualiza con cada cambio, aunque aún no esté completa (CT-03). Cada lote se guarda de inmediato al presionar Guardar lote, vinculado a la inspección en curso. Finalizar registro asigna la hora de fin, la guarda en localStorage y cierra el registro.

**RF-10. Consulta por placa.** Al buscar por número de placa, el sistema debe mostrar el historial de entregas finalizadas del vehículo en modo de solo lectura (RN-10).

**RF-11. Consulta por número de lote.** Al buscar por número de lote, el sistema debe mostrar la lista de lotes que tienen ese número, con la fecha, la placa y el productor de cada uno. Al elegir uno, muestra todos los datos del lote y los de la inspección, relacionada mediante la clave foránea, en modo de solo lectura. La búsqueda no distingue mayúsculas, espacios ni guiones (RN-16). Como el número de lote es opcional, los lotes sin número no aparecen en esta búsqueda; solo se consultan desde el historial por placa (RF-10). Solo se muestran lotes de registros finalizados (RN-10).

**RF-12. Edición antes de finalizar.** Antes de presionar Finalizar registro, el sistema debe permitir editar los datos de la inspección y de los lotes guardados, y quitar un lote ya agregado (RN-12).

**RF-13. Retomar registro sin finalizar.** Al abrir la página, el sistema debe retomar el registro que quedó en localStorage sin hora de fin, con su inspección y sus lotes (RN-13).

**RF-14. Botón Cancelar registro.** El sistema debe ofrecer un botón Cancelar registro para que el inspector no proceda con el registro en curso (RN-14).

**RF-15. Botón Cerrar sin guardar.** El sistema debe ofrecer en el formulario del lote un botón Cerrar sin guardar para que el inspector cierre el lote si ya no desea ingresarlo. Si hay cambios sin guardar, el sistema pide confirmación antes de descartarlos (CT-06); si el inspector no confirma, el formulario sigue abierto con sus datos. Si el lote es nuevo, el sistema lo descarta y no queda nada en localStorage, ni siquiera como reporte de rechazo cuando el vehículo no cumple con el chequeo (RN-02, RN-07). Si es un lote ya guardado que se está editando, el sistema descarta solo los cambios del inspector y el lote conserva su última versión guardada, incluidos los cambios que el sistema aplicó por un cambio en el chequeo (RN-12). Cerrar sin guardar nunca borra un lote guardado; para eso está Quitar (RF-12), y para borrar el registro completo, Cancelar registro (RF-14). Después de cerrar, el inspector puede abrir un lote nuevo con el botón \+ Lote.

# Reglas de negocio e invariantes del dominio

**RN-01. Campos obligatorios de la inspección.** El inspector debe completar placa, productor, inspector y chequeoVehiculo. El sistema asigna la fecha, que es la misma de horaInicio, y el inspector no la edita. El sistema asigna horaInicio, con fecha y hora, cuando el inspector ingresa el primer dato de la inspección, y horaFin, también con fecha y hora, al presionar Finalizar registro; el inspector no ingresa ninguna de las dos. Así, un registro que cruza la medianoche o se retoma otro día conserva su duración real. Los campos del lote se rigen por RN-02 y RN-06.

**RN-02. Condición para guardar un lote.** Un lote solo puede guardarse si la inspección está completa (RN-01) y el lote tiene producto, un número de lote que no se repite en la inspección cuando se ingresa (RN-16), los parámetros que aplican a su producto dentro del rango válido de entrada cuando el vehículo cumple con el chequeo (RN-06, RN-07 y RN-15) y un estado calculado (Aprobado o Rechazado). Un lote rechazado también se guarda como reporte, con el motivo del rechazo que escribe el sistema (RN-08); el producto de ese lote no se recibe. La única excepción al estado calculado son los lotes que quedan Pendientes de valorar al cambiar el chequeo de No cumple a Cumple (RN-12): siguen guardados sin estado hasta que el inspector completa sus parámetros.

**RN-03. Condición para finalizar el registro.** El registro solo puede finalizarse si tiene al menos un lote y todos sus lotes tienen un estado calculado (Aprobado o Rechazado); un lote Pendiente de valorar impide finalizar. Si el vehículo no cumple, igualmente se registra al menos un lote, que nace Rechazado y solo pide el producto. Si el inspector presiona Finalizar registro sin cumplir estas condiciones, el sistema muestra un mensaje que indica qué falta y no cierra el registro. Al presionar Finalizar registro con las condiciones cumplidas, el sistema asigna la hora de fin y cierra el registro.

**RN-04. Relación entre inspección y lote.** Todo lote pertenece a una única inspección, identificada por inspeccionId. Una inspección puede tener uno o más lotes.

**RN-05. Estado del lote calculado.** El campo estado lo calcula el sistema y solo puede tener uno de dos valores: Aprobado o Rechazado. Un lote Pendiente de valorar (RN-12) aún no tiene estado; no es un tercer valor. El sistema asigna Aprobado cuando el lote cumple todos los criterios de su producto y el vehículo cumple con el chequeo; asigna Rechazado cuando el producto incumple alguno de esos criterios, o cuando el vehículo no cumple con el chequeo, en cuyo caso no se valoran los parámetros del producto (RN-07). Los valores se comparan tal como se registran, con su decimal, sin redondear.

**RN-06. Criterios de aprobación por producto.** El formulario contempla cuatro parámetros de valoración: Brix, temperatura, calibre y peso. Cada producto se evalúa solo con los parámetros que le aplican; los que no aplican no se solicitan. Los rangos siguen la tabla de especificaciones del formulario FO-AS-07; la temperatura acordada es de 24 a 30 °C para todos los productos. Los rangos incluyen sus extremos: por ejemplo, un banano con Brix 5.0 o una malanga con un peso promedio por pieza de 2000.0 g cumplen el criterio, y un banano con Brix 5.1 no lo cumple.

| Producto | Brix | Temperatura | Calibre | Peso |
| :---- | :---- | :---- | :---- | :---- |
| Banano | 2 a 5 | 24 a 30 °C | Dentro de calibre | No aplica |
| Plátano | 2 a 8 | 24 a 30 °C | Dentro de calibre | No aplica |
| Yuca | No aplica | 24 a 30 °C | No aplica | No aplica |
| Malanga | 4 a 12 | 24 a 30 °C | No aplica | 400 g a 2000 g |

**RN-07. Chequeo del vehículo.** El chequeo del vehículo admite dos valores, Cumple o No cumple. Si el resultado es No cumple, no se valoran los parámetros del producto. Al cambiar el chequeo de Cumple a No cumple, el sistema avisa cuántos lotes se rechazarán y que se borrarán sus parámetros, y pide confirmación; si el inspector no confirma, el chequeo sigue en Cumple. Si confirma, el sistema borra los parámetros, marca como Rechazados los lotes ya registrados y escribe en su motivo del rechazo que el vehículo no cumple con el chequeo. Mientras el chequeo sea No cumple, todo lote nuevo nace Rechazado con ese mismo motivo: sus parámetros quedan deshabilitados y solo se registra el producto; las observaciones son opcionales.

**RN-08. Motivo del rechazo y observaciones.** Cuando un lote es rechazado, el sistema escribe el motivo en el campo motivoRechazo: que el vehículo no cumple con el chequeo, o los parámetros que no se cumplieron, cada uno con su valor y su rango (por ejemplo, "No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30)"). El motivo se recalcula cada vez que cambian los parámetros o el chequeo, y el inspector no lo edita; si el lote pasa a Aprobado, el motivo se borra. Las observaciones son un campo aparte, opcional en todo lote, donde el inspector escribe sus comentarios; el sistema nunca las modifica. Si un lote cambia directamente de Rechazado a Aprobado y tiene observaciones, el sistema muestra un aviso para que el inspector las revise, porque pueden referirse al rechazo; el aviso no aplica a un lote que pasa por Pendiente de valorar.

**RN-09. Tipos de datos.** Brix y temperatura (°C) se registran como números con un decimal, por ejemplo un Brix de 4.5 o una temperatura de 30.4 °C. El peso promedio por pieza se registra en gramos como número con un decimal, por ejemplo 850.5 g; el inspector lo calcula y lo digita. El calibre (dentroCalibre) y el chequeo del vehículo (chequeoVehiculo) se registran como boolean; ninguno de los dos tiene valor por defecto: dentroCalibre queda sin valor hasta que el inspector elige Dentro de calibre o Fuera de calibre, y chequeoVehiculo, hasta que elige Cumple o No cumple. Las horas de inicio y de fin se registran con fecha y hora. Los identificadores de inspección y lote son UUID generados por el sistema.

**RN-10. Consultas de solo lectura.** Los registros que se consultan por número de placa o por número de lote solo pueden verse; no pueden editarse. Las consultas solo muestran registros finalizados, es decir, con hora de fin; un registro en curso no aparece hasta que se finaliza.

**RN-11. Sección de lotes deshabilitada.** Si la inspección no está completa, la sección de lotes queda deshabilitada; no se puede registrar un lote sin una inspección.

**RN-12. Edición antes de finalizar.** Mientras el registro no se haya finalizado, todos los campos que ingresa el inspector en la inspección y en sus lotes son editables, y se puede quitar un lote ya agregado. Los cambios en la inspección se guardan en localStorage de inmediato; los cambios que hace el inspector en un lote se guardan al presionar Guardar lote (RF-09), y los cambios que el sistema aplica a los lotes por un cambio en el chequeo se guardan de inmediato. Si el chequeo del vehículo cambia de Cumple a No cumple, se aplica RN-07: el sistema pide confirmación, borra los parámetros y todos los lotes pasan a Rechazados. Si cambia de No cumple a Cumple, el sistema quita el motivo del rechazo de los lotes, habilita sus parámetros y los muestra como Pendientes de valorar hasta que el inspector los complete; entonces calcula su estado según RN-05. Una vez finalizado, el registro solo puede consultarse (RN-10).

**RN-13. Registro sin finalizar.** Si al abrir la página existe en localStorage un registro sin hora de fin, el sistema lo retoma con su inspección y sus lotes, conservando su hora de inicio, para que el inspector lo continúe.

**RN-14. Cancelación del registro.** Mientras el registro no se haya finalizado, el inspector puede presionar Cancelar registro. Antes de borrar, el sistema pide confirmación; si hay lotes rechazados, el mensaje indica cuántos son y que su reporte se perderá. Si el inspector no confirma, el registro sigue igual. Si confirma, el sistema elimina de localStorage la inspección en curso y todos sus lotes, incluidos los rechazados, y limpia la página para una nueva inspección. El reporte de un lote rechazado solo se conserva en registros finalizados (RF-05). Un registro finalizado no se puede cancelar.

**RN-15. Rango válido de entrada.** Además de los rangos de aprobación de RN-06, cada parámetro tiene un rango válido de entrada para detectar errores de digitación: Brix de 0.0 a 30.0, temperatura de 0.0 a 50.0 °C y peso de 1.0 a 5000.0 g. Ningún parámetro que aplica se acepta vacío, con un número negativo ni con más de un decimal. Un valor vacío, negativo, con más de un decimal o fuera de ese rango muestra un error en el campo y el lote no se guarda, salvo los lotes Pendientes de valorar (RN-02); un valor dentro de él se evalúa con RN-06.

**RN-16. Número de lote único por inspección.** Si se ingresa, el número de lote no puede repetirse dentro de la misma inspección; si se repite, el sistema muestra un error y el lote no se guarda. Sí puede repetirse entre inspecciones distintas. La comparación no distingue mayúsculas, espacios ni guiones. La consulta por número de lote muestra todas las coincidencias (RF-11).

# Criterios técnicos

Criterios que define el equipo de desarrollo para los casos borde técnicos. No cambian las reglas de negocio, pero la aplicación debe cumplirlos.

**CT-01. Cambio de producto.** Al cambiar el producto de un lote, el sistema borra los valores de los parámetros que no aplican al nuevo producto y conserva los que sí aplican, como la temperatura. Después recalcula el estado y el motivo del rechazo.

**CT-02. Inspección que vuelve a quedar incompleta.** Si el inspector borra un campo obligatorio de la inspección cuando ya hay lotes guardados, los lotes se conservan, pero la sección de lotes se bloquea y Finalizar registro no procede hasta que la inspección vuelva a estar completa.

**CT-03. Hora de inicio persistente.** El sistema guarda el registro en curso en localStorage desde el primer dato ingresado, aunque la inspección aún no esté completa, para que la hora de inicio no se pierda si la página se recarga. La hora de inicio no cambia aunque el inspector borre ese primer dato.

**CT-04. Reloj del equipo.** Las horas se toman del reloj del equipo en la hora de Costa Rica (UTC-6). Si la hora de fin resulta anterior a la hora de inicio, el sistema muestra un aviso para revisar la fecha y la hora del equipo.

**CT-05. Doble clic.** Los botones Guardar lote, \+ Lote, Cerrar sin guardar, Finalizar registro y Cancelar registro se deshabilitan mientras procesan la acción, para evitar lotes duplicados o una hora de fin asignada dos veces.

**CT-06. Lote sin guardar.** Si hay un lote con cambios sin guardar y el inspector presiona \+ Lote, Cerrar sin guardar, Finalizar registro o Cancelar registro, o intenta cerrar o recargar la página, el sistema avisa y pide confirmación antes de descartar esos cambios. Un lote tiene cambios sin guardar cuando el inspector ingresó o modificó algún campo y sus datos difieren de la última versión guardada; un lote nuevo vacío o sin cambios se cierra sin pedir confirmación.

**CT-07. Un solo registro en curso.** Si la aplicación está abierta en varias pestañas, el sistema detecta los cambios hechos en otra pestaña y deja editable solo la última que se usó; las demás muestran un aviso y quedan en solo lectura. Solo puede existir un registro sin hora de fin a la vez (RN-13).

**CT-08. Formato de placa y número de lote.** La placa y el número de lote se guardan en mayúsculas y sin espacios al inicio o al final. Las búsquedas por placa y por número de lote no distinguen mayúsculas, espacios ni guiones: ABC-123, abc123 y ABC 123 encuentran el mismo vehículo.

**CT-09. Resultados de las consultas.** El botón de búsqueda se deshabilita mientras el campo esté vacío. Si no hay resultados, el sistema muestra un mensaje que indica que no hay registros finalizados para esa placa o ese número de lote. El historial por placa se ordena del registro más reciente al más antiguo.

**CT-10. Nombre del productor.** El campo productor sugiere los nombres ya registrados en el equipo mientras el inspector escribe, para reducir variantes del mismo productor.

**CT-11. Espacio de almacenamiento.** Si localStorage no tiene espacio para guardar, el sistema muestra un error y no da por guardado el lote ni el cambio.

**CT-12. Datos dañados.** Si un registro guardado en localStorage no se puede leer, el sistema lo omite, muestra un aviso y sigue funcionando con los demás registros.

**CT-13. Datos solo en el equipo.** Los registros existen solo en el navegador y el equipo donde se capturaron. Si se borran los datos del navegador, se usa el modo incógnito u otro equipo, los registros no aparecen. Es una limitación aceptada del alcance actual; se recomienda usar siempre el mismo equipo y navegador para la recepción.

**CT-14. Textos vacíos.** Los campos de texto se guardan sin espacios al inicio o al final; un campo que solo tiene espacios cuenta como vacío.

# Acuerdos sobre los puntos pendientes

Las diferencias entre los apuntes de la sesión, el borrador y el formulario físico se resolvieron con el cliente. Prevalecen los criterios de la tabla de especificaciones del formulario FO-AS-07, con los siguientes acuerdos:

* **Calibre de la yuca:** no aplica.  
* **Peso de la malanga:** de 400 g a 2000 g, según la tabla de especificaciones, medido como peso promedio por pieza de una muestra; el inspector calcula el promedio por aparte y solo lo ingresa al sistema.  
* **Temperatura:** para todos los productos se acordó un rango de 24 a 30 °C.  
* **Catálogo de productos:** el sistema maneja solo banano, plátano, yuca y malanga; no se incluyen camote, papa ni pulpas.  
* **Órdenes de compra de calidad:** se mantiene una sola orden de compra por lote; no se incluyen los campos 1 Orden compra calidad y 2 Orden compra calidad.  
* **Origen del motivo de rechazo:** el sistema escribe el motivo en un campo propio (motivoRechazo), con los parámetros que fallaron o el incumplimiento del chequeo; el inspector agrega sus comentarios en observaciones.  
* **Límites de los rangos:** los rangos de la tabla de criterios incluyen sus extremos.  
* **Vehículo que no cumple:** no se valoran los parámetros del producto. Al cambiar el chequeo a No cumple, el sistema pide confirmación, borra los parámetros y marca como Rechazados los lotes ya registrados; mientras el chequeo sea No cumple, todo lote nuevo nace Rechazado con solo el producto.  
* **Decimales:** el Brix, la temperatura y el peso se registran con un decimal y se comparan tal cual con los rangos.  
* **Rango válido de entrada:** Brix de 0.0 a 30.0, temperatura de 0.0 a 50.0 °C y peso de 1.0 a 5000.0 g; no se aceptan valores vacíos, negativos ni con más de un decimal (RN-15).  
* **Calibre:** selección única entre Dentro de calibre y Fuera de calibre, sin valor por defecto.  
* **Fecha y horas:** la fecha de entrada la asigna el sistema, es la misma de la hora de inicio y no se edita; las horas de inicio y de fin guardan fecha y hora.  
* **Cambios en el chequeo:** al volver a Cumple, los lotes quedan Pendientes de valorar hasta completar sus parámetros; si un lote pasa directamente de Rechazado a Aprobado, el sistema avisa para revisar sus observaciones.  
* **Cancelación:** Cancelar registro borra todo el registro en curso, incluidos los lotes rechazados; su reporte solo se conserva si el registro se finaliza.  
* **Cerrar sin guardar:** el inspector puede cerrar el formulario de un lote si ya no desea ingresarlo; el sistema pide confirmación si hay cambios sin guardar. Nunca borra un lote ya guardado (RF-15).  
* **Número de lote:** único dentro de cada inspección; puede repetirse entre inspecciones.  
* **Inspectores:** la lista se mantiene en un archivo de configuración de la aplicación.

## Pendiente para la siguiente versión

* **Cálculo del peso de la malanga:** el inspector digitará el peso de cada pieza de la muestra, y el sistema calculará el promedio y revisará que se pesó la cantidad de piezas definida. Para esa versión hay que definir con el cliente cuántas piezas se pesan. En esta versión, el inspector calcula el promedio por aparte y solo lo ingresa.

