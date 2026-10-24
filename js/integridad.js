// REGISTRO DE INTEGRIDAD · transparente (el estudiante lo ve anunciado). No detecta IA ni ve otras apps: el navegador no lo
// permite. Registra señales que el docente interpreta y bloquea el pegado de texto en TODOS los campos:
//   · salidas de la app (cambio de app o pestaña, pérdida de foco): cada una se registra con su pantalla y, si había una
//     pregunta, predicción o conclusión abierta, ese contexto. Al volver se muestra un mensaje emergente.
//     Si el sistema cierra la página mientras está fuera (Android lo hace), la salida se recupera al reabrirla.
//   · copias de texto; intentos de pegar o arrastrar (bloqueados); bloques de texto insertados de golpe (portapapeles del
//     teclado del móvil, dictado): se deshacen y se registran; y cómo se escribió cada respuesta.
// Nada de esto cambia la nota automática.

let inv = null, idInv = '', contexto = null, pantalla = '', salida = null, silencioHasta = 0, aviso = () => { }, interactuo = false;
const REAPERTURA_S = 30 * 60;      // más de 30 min fuera con la página cerrada = la cerró y la volvió a abrir otro rato (no es una salida durante el trabajo)
const escritura = new Map(), previo = new WeakMap();
const ahoraISO = () => new Date().toISOString();
const CLAVE_SALIDA = 'laboratorio-mas-salida';
const MIN_SALIDA_S = 1;            // pérdidas de foco más breves no cuentan (parpadeos del sistema)
const BLOQUE = 12;                 // caracteres insertados de una vez a partir de los cuales no es tecleo (si llevan espacio)
const reg = () => { if (!inv) return null; inv.integridad = inv.integridad || { salidas: [], copias: [], pegados: [], inserciones: [], salidasOtras: 0 }; return inv.integridad };
let onCambio = () => { }, alVolver = () => { };

export function configurarIntegridad(o) { if (o.aviso) aviso = o.aviso }
export function alCambiar(f) { onCambio = f }
/** Al volver a la app (mensaje emergente): recibe {segundos, contexto, pantalla, veces, motivo}. */
export function alVolverApp(f) { alVolver = f }
/** Investigación activa (y su identificador), contexto sensible ('pregunta:<id>', 'prediccion', 'conclusion' o null) y pantalla. */
export function fijarContexto(i, c, p = '', id = '') {
  const nueva = id && id !== idInv; inv = i; contexto = c; pantalla = p; idInv = id || idInv;
  if (nueva) recuperarSalidaPendiente()
}
/** Ignorar la pérdida de foco que provocan los diálogos propios (confirmar). */
export function silenciar(ms = 800) { silencioHasta = Date.now() + ms }
/** El estudiante abre la guía (PDF en otra pestaña): la salida se registra igual, pero con ese motivo. */
let haciaGuia = 0;
export function vaAGuia() { haciaGuia = Date.now() + 3000 }
export const MOTIVO_GUIA = 'abrió la guía del estudiante';

const guardaPendiente = s => { try { if (s) localStorage.setItem(CLAVE_SALIDA, JSON.stringify({ ...s, id: idInv })); else localStorage.removeItem(CLAVE_SALIDA) } catch (e) { } };
function empiezaSalida(motivo) {
  // solo cuenta después de que el estudiante haya interactuado en esta carga de la página (abrir y cerrar sin tocar nada no es trabajar)
  if (salida || !interactuo || Date.now() < silencioHasta || !inv || inv.conclusion) return;
  if (Date.now() < haciaGuia) { motivo = MOTIVO_GUIA; haciaGuia = 0 }
  salida = { inicio: Date.now(), contexto, pantalla, motivo }; guardaPendiente(salida)
}
function terminaSalida(s = salida) {
  if (!s) return; salida = null; guardaPendiente(null); const R = reg(); if (!R) return;
  const dur = Math.round((Date.now() - s.inicio) / 100) / 10; if (dur < MIN_SALIDA_S) return;
  R.salidas.push({ hora: new Date(s.inicio).toISOString(), segundos: dur, contexto: s.contexto || null, pantalla: s.pantalla || '', motivo: s.motivo, sensible: !!s.contexto });
  onCambio();
  alVolver({ segundos: dur, contexto: s.contexto, pantalla: s.pantalla, veces: R.salidas.length, motivo: s.motivo })
}
// la página se cerró (o el sistema la descartó) estando fuera: se cierra la salida al reabrir la misma investigación
function recuperarSalidaPendiente() {
  let s = null; try { s = JSON.parse(localStorage.getItem(CLAVE_SALIDA) || 'null') } catch (e) { }
  if (s && s.id === idInv && inv && !inv.conclusion) {
    const fuera = (Date.now() - s.inicio) / 1000;
    if (fuera > REAPERTURA_S) { const R = reg(); guardaPendiente(null); if (R) { R.reaperturas = (R.reaperturas || []).concat([{ hora: new Date(s.inicio).toISOString(), horasFuera: Math.round(fuera / 360) / 10, contexto: s.contexto || null }]); onCambio() } return }
    terminaSalida({ ...s, motivo: (s.motivo || 'salida') + ' · la app se cerró mientras estaba fuera' })
  } else guardaPendiente(null)
}

/** Resumen de cómo se escribió un campo (se adjunta a la respuesta guardada) y lo reinicia. */
export function medirEscritura(id, texto) {
  const e = escritura.get(id); escritura.delete(id); const n = String(texto || '').length;
  if (!e) return { caracteres: n, segundos: 0, insertadoDeGolpe: 0 };
  return { caracteres: n, segundos: Math.round((Date.now() - e.inicio) / 100) / 10, insertadoDeGolpe: e.insertado, cambios: e.eventos }
}

export function instalarIntegridad(doc = document, win = window) {
  for (const t of ['pointerdown', 'keydown', 'touchstart', 'click']) doc.addEventListener(t, () => { interactuo = true }, { capture: true, passive: true });
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') empiezaSalida('app oculta (otra app o pestaña)'); else terminaSalida() });
  win.addEventListener('blur', () => empiezaSalida('la ventana perdió el foco'));
  win.addEventListener('focus', () => terminaSalida());
  win.addEventListener('pageshow', () => { if (doc.visibilityState === 'visible') terminaSalida() });
  doc.addEventListener('copy', () => {
    const R = reg(); if (!R) return; const t = String(win.getSelection ? win.getSelection() : '').trim(); if (!t) return;
    R.copias.push({ hora: ahoraISO(), contexto, pantalla, caracteres: t.length, inicio: t.slice(0, 80) }); onCambio()
  });
  const campo = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'file', 'button', 'submit'].includes(el.type)));
  const nombre = el => el.id || (el.dataset && (el.dataset.param || el.dataset.hnota)) || 'campo';
  const anota = (el, como, n) => { const R = reg(); if (R) { R.pegados.push({ hora: ahoraISO(), contexto, pantalla, campo: nombre(el), caracteres: n, como }); onCambio() } aviso('En esta actividad no se puede pegar texto: escríbelo tú.') };
  // 1) pegar y arrastrar texto: bloqueado en TODOS los campos
  const bloquea = (e, como) => { const el = e.target; if (!campo(el)) return; e.preventDefault(); const d = e.clipboardData || e.dataTransfer; anota(el, como, d ? (d.getData('text') || '').length : 0) };
  doc.addEventListener('paste', e => bloquea(e, 'pegar'), true);
  doc.addEventListener('drop', e => bloquea(e, 'arrastrar'), true);
  doc.addEventListener('beforeinput', e => {
    const el = e.target; if (!campo(el)) return;
    if (/^insertFrom(Paste|Drop|PasteAsQuotation)$/.test(e.inputType)) { e.preventDefault(); anota(el, 'pegar', (e.data || '').length); return }
    const id = nombre(el), est = escritura.get(id) || { inicio: Date.now(), insertado: 0, eventos: 0 }; est.eventos++; escritura.set(id, est)
  }, true);
  // 2) bloques insertados de golpe (el portapapeles del teclado del móvil a veces no avisa como «pegar»): se deshacen
  doc.addEventListener('focusin', e => { if (campo(e.target)) previo.set(e.target, e.target.value) }, true);
  doc.addEventListener('input', e => {
    const el = e.target; if (!campo(el)) return;
    const antes = previo.has(el) ? previo.get(el) : '', ahora = el.value, n = ahora.length - antes.length;
    let i = 0; while (i < antes.length && antes[i] === ahora[i]) i++;
    const metido = ahora.slice(i, i + Math.max(0, n));
    if (n >= BLOQUE && (/\s/.test(metido) || n >= 25)) {
      el.value = antes; try { el.setSelectionRange(i, i) } catch (x) { }
      e.stopImmediatePropagation();
      const R = reg(); if (R) { R.inserciones.push({ hora: ahoraISO(), contexto, pantalla, campo: nombre(el), caracteres: n, bloqueada: true }); onCambio() }
      aviso('En esta actividad no se puede pegar ni insertar bloques de texto: escríbelo tú.');
      return
    }
    previo.set(el, ahora)
  }, true)
}

/** Resumen para el informe y la herramienta docente. Solo describe: no juzga. */
export function resumenIntegridad(inv) {
  const R = inv.integridad || { salidas: [], copias: [], pegados: [], inserciones: [], salidasOtras: 0 };
  const sens = R.salidas.filter(s => s.sensible !== false && s.contexto), seg = R.salidas.reduce((a, s) => a + s.segundos, 0);
  const rapidas = [...inv.predicciones.map(p => p.escritura), ...inv.respuestas.map(r => r.escritura), inv.conclusion && inv.conclusion.escritura].filter(e => e && e.caracteres >= 80 && e.segundos > 0 && e.caracteres / e.segundos > 8).length;
  return {
    salidas: R.salidas.length + (R.salidasOtras || 0), salidasDurantePreguntas: sens.length, segundosFuera: Math.round(seg), salidaMasLarga: R.salidas.reduce((a, s) => Math.max(a, s.segundos), 0),
    salidasEnOtrosMomentos: R.salidas.length - sens.length + (R.salidasOtras || 0), copiasDeTexto: R.copias.length, copiasDeEnunciados: R.copias.filter(c => c.contexto && c.contexto.startsWith('pregunta')).length,
    intentosDePegar: R.pegados.length, insercionesGrandes: R.inserciones.length, respuestasEscritasMuyRapido: rapidas, reaperturas: (R.reaperturas || []).length
  }
}
