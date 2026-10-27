# **REFLECTION · Autoevaluación de alineación**

**Proyecto:** Registro de inspección de vehículo y recepción de fruta (FO-AS-07 v13) · Alimentos Bermúdez S.A.  
**Autora:** Ing. Yeimy Alvarado  
**Fecha:** 26/10/2026

## **A. Matriz de alineación de intención (visión vs. realidad)**

| Dimensión | Visión inicial (semana 1\) | Especificación entregada a la IA | Resultado real (semana 4\) | Satisfacción |
| :---- | :---- | :---- | :---- | :---- |
| **Lógica de negocio** | Digitalizar el formulario FO-AS-07 del Departamento de calidad de Alimentos Bermudez, donde se pudiera automatizar la evaluación del estado de cada lote de fruta recibida (Aprobado o Rechazado), según el producto y sus parámetros, y a su misma vez, evaluar que un vehículos que realizan las entregas cumplan con estándares de calidad y seguridad.  | Requirements.md con unos 158 requerimientos Reglas clave: REQ-INS-10 a 13 (datos de recepcion del vehiculo), REQ-LOT-11 a 15 (valoración), , REQ-VAL (bordes y rangos de entrada) y REQ-UNC (Unchanged Behavior). Además, 20 invariantes (INV-01 a INV-20) en CLAUDE.md. | Se logró una App web totalmente funcional donde se logra capturar los datos de las inspecciones de los vehículos documentando el cumplimiento tanto del medio de transporte como del Estado y la calidad de la fruta recibida para la empresa se hace valoración automática y se permite guardar los datos para un futuro acceso. | Muy Satisfecho  |
| **Experiencia de usuario (UI/UX)** | Una pantalla parecida al formulario en papel, que el inspector entienda sin capacitación, intuitiva y con aspecto empresarial | Wireframes 00 a 07, sección 8 (REQ-UI-01 a 08), RNF de accesibilidad (WCAG 2.1 AA) y regla de mensajes en español junto al campo que los causa. | Página tipo SPA con menú lateral (Operación / Referencia), reloj de Costa Rica, panel «Estado del registro» y errores en el campo, por ejemplo «El valor no puede ser negativo.» y «Use punto decimal.  |  Satisfecho  |
| **Persistencia de datos** |  una página que logrará retener los datos que ninguno se pierda y que se pudiera accesar nuevamente a los datos para conservar un historial. | data-contract.json v1.0.0 (JSON Schema con dos entidades, InspeccionVehiculo y LoteMateriaPrima, unidas por inspeccionId) y sección 10 (REQ-PER). | localStorage, al que solo accede src/state/storage.js. Valida el contrato antes de guardar, omite con un aviso los registros dañados (CT-12) y retoma el registro en curso al recargar. Cancelar no deja rastro (INV-06, comprobado en el navegador). | Muy Satisfecho |

## 

## 

## **B. Cuestionario de reflexión de cierre**

### **1\. Autonomía de la IA**

Momentos en los que la IA decidió algo que no le pedí:

Sí, en realidad hay varias cosas que siento que fueron decisiones que la IA tomó por su cuenta sin que yo se las hubiera solicitado directamente; sin embargo, derivan de la línea en la que venía trabajando y me parecieron propuestas bastante acertadas. Por ejemplo, la primera fue decidir incluir un reloj visible en la parte superior derecha de todas las páginas. Esto me pareció un acierto, pues uno de mis requisitos era que el sistema pudiera asignar la hora automáticamente una vez registrado el primer dato en la inspección. De este modo, al tenerlo siempre disponible, el inspector puede tomar en cuenta el tiempo en todas sus revisiones sin necesidad de registrarlo manualmente.

También me sugirió crear un archivo inspectores.js, lo cual resultó muy conveniente. Había que definir tres inspectores en el programa y mantenerlos directamente en el código principal resultaba incómodo e ineficiente si en el futuro se requería actualizar datos. Esta propuesta ofreció una solución práctica considerando que aún no se cuenta con una base de datos ni con una funcionalidad de usuario y contraseña para acceder al registro.  
Durante el diseño de la página, también me sugirió una navegación lateral. Yo sabía que quería incluir pestañas, pero dudaba entre colocarlas en una barra lateral o en una superior; la propuesta visual me pareció adecuada, por lo que decidí mantener esa recomendación.  
Finalmente, la selección de colores también fue una propuesta de la IA, aunque estuvo guiada por mí, ya que le suministré el logo de la empresa y le indiqué que deseaba una tonalidad amarilla similar. A pesar de ello, más adelante decidí cambiarlo porque el resultado visual no fue tan atractivo como esperaba.

### **2\. Calidad de la especificación**

Analizando tu [requirements.md](http://requirements.md) ¿Dónde fuiste ambiguo y causaste "alucinaciones" o parches frágiles por parte de la IA?

**Definición insuficiente de escenarios límite y flujos de interacción:**  
Existieron situaciones operativas que no fueron delimitadas desde el inicio, requiriendo decisiones sobre la marcha. Un caso crítico fue omitir el comportamiento del sistema cuando un inspector cambia el estado del vehículo a «No cumple» tras haber registrado varios lotes asociados. No definí explícitamente si los lotes debían mantener su estado previo o reevaluarse automáticamente, ni si la aplicación debía desplegar un diálogo de confirmación para prevenir cambios accidentales.

**Imprecisión en formatos de entrada y precisión numérica:**  
Inicialmente no especifiqué si se permitiría el uso de comas o puntos para la separación decimal al digitar cantidades. Finalmente, se optó por estandarizar el uso del punto decimal para alinearse con los teclados numéricos habituales. Asimismo, actualmente el sistema trabaja con un solo decimal; sin embargo, reconozco que sería prudente extender la precisión a dos decimales para facilitar análisis posteriores por parte de la Jefatura de Control de Calidad.

**Aspectos funcionales y de alcance pendientes de definir:**  
Omití definir si era conveniente permitir la apertura de múltiples pestañas de trabajo para gestionar inspecciones en paralelo, una funcionalidad que deberá evaluarse con la jefatura para futuras iteraciones.

**Conservación de elementos formales en la interfaz:**  
Existió duda sobre incluir todo el texto del encabezado original del formulario físico en la pantalla principal por considerarlo extenso. Sin embargo, opté por mantenerlo como un recordatorio visible de que el sistema forma parte de un documento normado por estándares ISO de calidad, garantizando además un entorno familiar para los inspectores durante la transición digital.

### **3\. Rol de Head Chef**

¿Te sientes 100% dueño y responsable del código fuente generado o existen  
componentes que consideras "caja negra"?

Me siento 100% dueña y responsable del código fuente generado, ya que apliqué la metodología de desarrollo Spec-Driven Development. Este proceso me permitió comprender cómo utilizar la IA como un «sous-chef» en la programación. Inicialmente, me aseguré de construir un levantamiento de requerimientos sólido directamente con el cliente; para ello, realicé una visita técnica a la planta y me reuní con la ingeniera encargada de calidad. Durante el recorrido por las instalaciones observamos el proceso de fabricación de snacks y chips, identificando que el área de calidad es un eje fundamental que requiere un sistema para capturar datos, generar reportes, realizar mediciones y proyectar mejoras continuas.  
Con base en esta recolección de información, diseñé el contrato de datos ajustándolo a los requerimientos mínimos y dependencias. Aunque el alcance original podía extenderse aún más, realicé una reestructuración deliberada para delimitar una aplicación funcional y acotada a las necesidades de evaluación del curso. Desarrollé los componentes en Visual Studio Code utilizando Claude Code, lo cual facilitó una interacción fluida y eficiente. Definir las reglas operativas en el archivo CLAUDE.md me brindó la confianza de mantener el control total sobre la arquitectura, asegurando que cualquier decisión sobre nuevas funcionalidades o cambios pasara estrictamente por mi aprobación.  
Como oportunidad de mejora, reconozco que el manejo del control de versiones con Git y GitHub no se reflejó en un historial continuo de commits durante el desarrollo, debido a que no dominaba del todo el flujo de trabajo incremental al inicio y prioricé la subida del proyecto terminado. No obstante, dispongo de la evidencia de cada etapa del proceso constructivo, logrando entregar una solución de software plenamente operativa y sobre la cual tuve la máxima responsabilidad y control técnico.

4\. Satisfacción del cliente  
Si el docente fuera un cliente que pagó, ¿qué tan alineado está el producto con la visión original?

Considerando el alcance definido para la evaluación de este proyecto, confío en que el cliente se sentiría satisfecho con el resultado entregado, ya que el sistema cumple cabalmente con los objetivos planteados desde el inicio. Reconozco con humildad que existen áreas de oportunidad e imprecisiones menores que pueden optimizarse en futuras iteraciones; sin embargo, la solución desarrollada ofrece una plataforma intuitiva, accesible y de fácil adopción que no requiere procesos complejos de capacitación. En definitiva, la aplicación logra resguardar e interactuar con la información de forma consistente, aportando un valor significativo al control de calidad de Alimentos Bermúdez.