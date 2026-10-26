# Checklist de verificación manual por wireframe (T-8.3)

## Aplicación web «Registro de inspección de vehículo y recepción de fruta» · FO-AS-07 v13

| Elemento | Detalle |
| :---- | :---- |
| Documento | `docs/checklist-ui.md` |
| Fecha | 26 de octubre de 2026 |
| Cómo ejecutarla | `node scripts/serve.js` y abrir `http://localhost:3000`. Para empezar de cero, borrar las claves `foas07.v1.*` desde la consola del navegador. |
| Alcance | REQ-UNC-18, RNF-01, RNF-04, RNF-07, RNF-08; design §11 «UI». |

**Leyenda:** ✅ verificado por el Sous Chef en el navegador integrado (motor Chromium, 1280 px y 1024 px) · ⬜ pendiente de verificar por el Head Chef.

| Navegador | Estado |
| :---- | :---- |
| Chrome (dos últimas versiones estables) | ⬜ El recorrido se hizo en el navegador integrado de la app (Chromium); falta repetirlo en Chrome estable. |
| Edge (dos últimas versiones estables) | ⬜ Pendiente. |
| Firefox (dos últimas versiones estables) | ⬜ Pendiente. Revisar en especial el código de error 1014 de cuota y el estilo de los radios segmentados (`:has()`). |
| Sin conexión tras abrir la página (RNF-04) | ⬜ Pendiente: abrir la página, desconectar la red y repetir un guardado y una consulta. |

---

## WF-00 · Logotipo e identidad (REQ-UNC-18)

- [x] ✅ Logotipo de Alimentos Bermúdez en la cabecera del menú lateral, con texto alternativo.
- [x] ✅ Menú lateral mostaza con las secciones «Operación» (Registro de recepción, Consultas) y «Referencia» (Criterios de aceptación).
- [x] ✅ Colores de producto: Banano amarillo, Plátano verde, Yuca café claro, Malanga morado; siempre junto al nombre.

## WF-01 · Registro de recepción · Inspección del vehículo

- [x] ✅ Encabezado FO-AS-07 con Código, Versión, Elaborado por, Válido desde, Última revisión y Próxima revisión en DD/MM/YYYY (REQ-UI-01). WF-01 no dibuja «Última revisión»; se muestra porque REQ-UI-01 la exige.
- [x] ✅ Reloj HH:mm:ss y DD/MM/YYYY · Costa Rica (REQ-UI-02).
- [x] ✅ Rótulo FO-AS-07, título y subtítulo de WF-01 (Q-04).
- [x] ✅ Pantalla vacía: fecha y hora de inicio «—», hora de fin «Al finalizar», sección de lotes bloqueada y contadores en cero (REQ-REG-10).
- [x] ✅ El primer dato crea la inspección, asigna fecha y hora de inicio y muestra «Guardado en este equipo · HH:mm» (REQ-INS-01, 16).
- [x] ✅ La placa se guarda en mayúsculas y sin espacios al inicio o al final; el campo se actualiza al salir (REQ-INS-04).
- [x] ✅ Insignia «En curso» en el menú y en el panel mientras hay un registro en curso (REQ-UI-04).
- [x] ✅ Leyenda «Los registros se guardan solo en este equipo y navegador» (REQ-UI-06).
- [x] ✅ Recargar la página retoma el registro con su hora de inicio original (REQ-REG-09).

## WF-02 · Inspección del vehículo (detalle)

- [x] ✅ Fecha, hora de inicio y hora de fin son `<output>` con la etiqueta «Sistema», sin control editable (REQ-INS-02).
- [x] ✅ Inspector como lista sin opción inicial, con los tres nombres de `src/config/inspectores.js` (REQ-INS-06).
- [x] ✅ Chequeo «Cumple / No cumple» sin opción marcada al inicio (REQ-INS-08) y texto de ayuda de WF-02.
- [x] ✅ Check verde en la tarjeta y en el panel al completar la inspección (REQ-INS-14).
- [x] ✅ Productor con `<datalist>` de productores ya registrados (REQ-INS-05). Falta ver el desplegable nativo en Edge y Firefox.

## WF-03 · Lotes de materia prima · Lote nuevo

- [x] ✅ «+ Lote» abre «Lote nuevo» con estado «Sin producto» y sin parámetros (REQ-LOT-02, 03).
- [x] ✅ Al elegir producto se muestran solo sus parámetros y la leyenda de rangos (REQ-LOT-04, 05).
- [x] ✅ Error «Use punto decimal (por ejemplo, 4.5).» junto al campo al escribir `26,0` (REQ-VAL-11).
- [x] ✅ Motivo del rechazo como campo «lo escribe el sistema», con «—» si está vacío (REQ-LOT-17).
- [x] ✅ Motivo exacto: `No cumple: Brix 6.2 (rango 2 a 5); Temperatura 31.0 °C (rango 24 a 30); Fuera de calibre` (REQ-LOT-15).
- [x] ✅ Encabezado del formulario con «Rechazado · No se recibe» (REQ-LOT-20, 21).
- [x] ✅ Aviso de revisar observaciones al pasar de Rechazado a Aprobado (REQ-LOT-19, DD-12).
- [x] ✅ «Cerrar sin guardar» sin cambios cierra directo; con cambios pide confirmación y «No, seguir editando» conserva el formulario (REQ-LOT-30, 31, 34).

## WF-04 · Registro de recepción · Lote aprobado

- [x] ✅ Tabla Lote / OC, Producto, Parámetros (`Brix 8.0`, `26.0 °C`, `1235.0 g/pieza`), Estado, Editar y Quitar (REQ-LOT-25).
- [x] ✅ «Lote guardado como LT105490. ¿Llegó otro lote en este vehículo?» con «+ Lote» (REQ-LOT-24, Q-01).
- [x] ✅ Contador «1 lote(s) registrados».
- [x] ✅ Cambio a «No cumple» con lotes: confirmación con foco en «No, mantener Cumple»; `Esc` deja «Cumple» (REQ-INS-10, 12).
- [x] ✅ Al confirmar: lote «Rechazado · No se recibe», «Sin parámetros» y motivo del vehículo (REQ-INS-11).
- [x] ✅ Vuelta a «Cumple»: el lote queda «Pendiente de valorar» y su formulario lo muestra así (REQ-INS-13, REQ-LOT-21).
- [x] ✅ «Quitar» pide confirmación con producto y número de lote: «Se eliminará del registro el lote de Yuca BN-0453.» (REQ-LOT-28).

## WF-05 · Estado del registro

- [x] ✅ Placa, inicio DD/MM/YYYY HH:mm, transcurrido en minutos, contadores y tres condiciones con check (REQ-REG-01).
- [x] ✅ «Finalizar registro» con un lote pendiente muestra «No se puede finalizar. Falta: Todos los lotes valorados.» (REQ-REG-03).
- [x] ✅ Finalizar asigna la hora de fin, mueve el registro a Consultas y limpia la pantalla (REQ-REG-02, 10).
- [x] ✅ «Cancelar registro» indica cuántos rechazados se perderán; «No» conserva todo y «Sí» no deja rastro del `id` (REQ-REG-06, 07, 08).
- [x] ✅ Tres clics seguidos en «Guardar lote» guardan un solo lote (REQ-VAL-23). Falta probarlo con el mouse en «Finalizar registro» y «Cancelar registro».

## WF-06 · Consultas

- [x] ✅ Rótulo «Registros finalizados · Solo lectura», selector «Por placa / Por número de lote», «Buscar» deshabilitado con el campo vacío (REQ-CON-01, 02).
- [x] ✅ `cl-76543` y `CL 76543` encuentran `CL 76543`; `Enter` busca (REQ-CON-03, REQ-VAL-19).
- [x] ✅ Columnas Fecha y hora (`26/10/2026 00:13–00:15`), Placa, Productor / Inspector, Chequeo, Lotes con aprobados y rechazados y «Ver».
- [x] ✅ «Ver» abre el detalle en su propia ruta; recargar lo conserva; «Volver a los resultados» regresa (Q-03).
- [x] ✅ Un identificador que no es de un registro finalizado muestra «No hay un registro finalizado con ese identificador.» (REQ-CON-07).
- [x] ✅ El detalle no tiene controles de edición, eliminación ni cancelación (REQ-CON-10).
- [x] ✅ Búsqueda por número de lote (`BN 0453`) y detalle del lote con su inspección; «Volver a los resultados» regresa a la lista (REQ-CON-05, 06).
- [ ] Antes de buscar se ven las últimas 10 inspecciones finalizadas, la más reciente primero, con «Ver»; el registro en curso no aparece; sin finalizados se ve «Aún no hay registros finalizados…» (REQ-CON-11 [Propuesto]).

## WF-07 · Criterios de aceptación

- [x] ✅ Rótulo «RN-06 · RN-15», título y texto de extremos incluidos sin redondear (REQ-UI-05).
- [x] ✅ Tabla generada desde `CRITERIOS_APROBACION`, con «No aplica» y punto de color por producto.

## Robustez (fase 7)

- [x] ✅ Dos pestañas: abrir la segunda deja la primera en solo lectura con «Continuar en esta pestaña»; al usarlo se invierten los papeles (REQ-VAL-26, 32).
- [x] ✅ Datos dañados (JSON roto y un lote inválido en el registro en curso): avisos, solo lectura y «Cancelar registro» como única acción (REQ-PER-13, DD-05).
- [ ] ⬜ Almacenamiento bloqueado por el navegador (por ejemplo, cookies bloqueadas en Firefox): aviso, registro deshabilitado y Consultas con el mismo aviso (REQ-PER-14).
- [ ] ⬜ Cerrar la pestaña con un lote modificado muestra el aviso del navegador (REQ-VAL-25).

## Accesibilidad (T-8.2, RNF-08)

- [x] ✅ Cada control tiene `<label for>`; chequeo, producto, calibre y modo de consulta son `fieldset` + `legend` con radios.
- [x] ✅ Foco visible de 3 px; diálogos con foco inicial en el botón seguro y `Esc` = «No».
- [x] ✅ Contraste ≥ 4.5:1 de cada par de colores de texto, verificado por `tests/contraste.test.js`.
- [x] ✅ Estados no comunicados solo por color: insignias con texto y condiciones con texto oculto «(cumple)» / «(falta)».
- [ ] ⬜ Recorrido completo solo con teclado y lector de pantalla (NVDA o VoiceOver).
