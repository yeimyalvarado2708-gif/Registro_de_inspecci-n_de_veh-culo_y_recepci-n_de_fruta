// @ts-check
// Utilidades de la interfaz: creación de DOM, diálogo de confirmación (RNF-05),
// acción protegida contra doble clic (REQ-VAL-23) y errores junto al campo (RNF-06).

/**
 * Crea un elemento. Los textos se insertan siempre con textContent, nunca como HTML.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} etiqueta
 * @param {Record<string, string|number|boolean|null|undefined>} [atributos] `class`, `text` y atributos HTML
 * @param {(Node|string|null|undefined|false)[]} [hijos]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function crear(etiqueta, atributos = {}, hijos = []) {
  const el = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nombre === 'text') el.textContent = String(valor);
    else if (nombre === 'class') el.className = String(valor);
    else el.setAttribute(nombre, valor === true ? '' : String(valor));
  }
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(typeof hijo === 'string' ? document.createTextNode(hijo) : hijo);
  }
  return el;
}

/**
 * Icono SVG estático (marcado fijo, nunca datos del inspector).
 * @param {'check'|'registro'|'buscar'|'tabla'|'ojo'|'mas'} nombre
 */
export function icono(nombre) {
  const trazos = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    registro: '<rect x="4" y="4" width="16" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 3v3h6V3M8.5 13l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    buscar: '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    tabla: '<rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 9.5h17M9.5 9.5v10" stroke="currentColor" stroke-width="1.8"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    mas: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  };
  const span = document.createElement('span');
  span.setAttribute('aria-hidden', 'true');
  span.style.display = 'inline-flex';
  span.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${trazos[nombre]}</svg>`;
  return span;
}

/**
 * Cambia el texto solo si es distinto (evita trabajo y parpadeos del lector de pantalla).
 * @param {Element} el
 * @param {string} texto
 */
export function fijarTexto(el, texto) {
  if (el.textContent !== texto) el.textContent = texto;
}

/**
 * Refleja el valor del estado en un campo, sin reescribir el que tiene el foco (design §4.4).
 * @param {HTMLInputElement|HTMLTextAreaElement} campo
 * @param {string} valor
 */
export function sincronizarValor(campo, valor) {
  if (document.activeElement === campo) return;
  if (campo.value !== valor) campo.value = valor;
}

/**
 * Habilita o deshabilita un botón respetando una acción protegida en curso.
 * @param {HTMLButtonElement|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} control
 * @param {boolean} habilitado
 */
export function fijarHabilitado(control, habilitado) {
  control.dataset.habilitado = habilitado ? '1' : '0';
  control.disabled = !habilitado || control.dataset.procesando === '1';
}

/**
 * Protege un botón contra el doble clic: lo deshabilita mientras la acción se procesa
 * e ignora pulsaciones repetidas (REQ-VAL-23, CT-05).
 * @param {HTMLButtonElement} boton
 * @param {(evento: MouseEvent) => unknown} accion
 */
export function accionProtegida(boton, accion) {
  boton.addEventListener('click', async (evento) => {
    if (boton.dataset.procesando === '1') return;
    boton.dataset.procesando = '1';
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    try {
      await accion(evento);
    } finally {
      delete boton.dataset.procesando;
      boton.removeAttribute('aria-busy');
      boton.disabled = boton.dataset.habilitado === '0';
    }
  });
}

/**
 * Muestra u oculta el error junto a un campo (RNF-06): aria-invalid y aria-describedby.
 * @param {HTMLElement} campo control o fieldset
 * @param {HTMLElement} contenedor elemento con el texto del error (tiene id)
 * @param {string|null|undefined} mensaje
 */
export function mostrarError(campo, contenedor, mensaje) {
  fijarTexto(contenedor, mensaje ?? '');
  if (mensaje) {
    campo.setAttribute('aria-invalid', 'true');
    const ids = new Set((campo.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean));
    ids.add(contenedor.id);
    campo.setAttribute('aria-describedby', [...ids].join(' '));
  } else {
    campo.removeAttribute('aria-invalid');
  }
}

let contadorIds = 0;
/** Identificador único para enlazar etiquetas y errores. @param {string} prefijo */
export function nuevoId(prefijo) {
  contadorIds += 1;
  return `${prefijo}-${contadorIds}`;
}

/**
 * Diálogo de confirmación con <dialog>.showModal(). El foco inicial va al botón seguro
 * y Esc equivale a «No» (REQ-INS-12, REQ-REG-08, RNF-05).
 * @param {{ titulo: string, mensaje: string, aceptar: string, cancelar: string }} textos
 * @returns {Promise<boolean>}
 */
export function confirmar({ titulo, mensaje, aceptar, cancelar }) {
  const dialogo = /** @type {HTMLDialogElement} */ (document.getElementById('dialogo'));
  const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const botonNo = crear('button', { type: 'button', class: 'boton', text: cancelar });
  const botonSi = crear('button', { type: 'button', class: 'boton boton-primario', text: aceptar });
  dialogo.replaceChildren(
    crear('div', { class: 'dialogo-cuerpo' }, [
      crear('h2', { id: 'dialogo-titulo', text: titulo }),
      crear('p', { id: 'dialogo-mensaje', text: mensaje }),
    ]),
    crear('div', { class: 'dialogo-acciones' }, [botonNo, botonSi])
  );

  return new Promise((resolver) => {
    /** @param {boolean} respuesta */
    const terminar = (respuesta) => {
      dialogo.removeEventListener('cancel', alCancelar);
      if (dialogo.open) dialogo.close();
      anterior?.focus();
      resolver(respuesta);
    };
    /** @param {Event} e */
    const alCancelar = (e) => {
      e.preventDefault();
      terminar(false);
    };
    dialogo.addEventListener('cancel', alCancelar);
    botonNo.addEventListener('click', () => terminar(false), { once: true });
    botonSi.addEventListener('click', () => terminar(true), { once: true });
    dialogo.showModal();
    botonNo.focus();
  });
}

/**
 * Número con un decimal para mostrar parámetros (Brix 8.0, 26.0 °C, 1235.0 g/pieza).
 * @param {number} n
 */
export function unDecimal(n) {
  return n.toFixed(1);
}
