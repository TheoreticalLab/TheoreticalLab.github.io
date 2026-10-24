// REGISTRO DE INTEGRIDAD · transparente (el estudiante lo ve anunciado). No detecta IA ni ve otras apps: el navegador no lo
// permite. Registra señales que el docente interpreta: salidas de la app mientras hay una pregunta, predicción o conclusión
// abierta; copias del enunciado; intentos de pegar (bloqueados); inserciones grandes de golpe; y cómo se escribió cada respuesta.
// Nada de esto cambia la nota automática.

let inv = null, contexto = null, salida = null, silencioHasta = 0, aviso = () => { };
const escritura = new Map();   // campo → {inicio, insertado, eventos}
const ahoraISO = () => new Date().toISOString();
// campos donde SÍ se puede pegar (datos administrativos, no razonamiento)
const PERMITIDOS = new Set(['alias', 'idRep', 'codClase', 'repId', 'gUrl', 'gClave']);
const reg = () => { if (!inv) return null; inv.integridad = inv.integridad || { salidas: [], copias: [], pegados: [], inserciones: [], salidasOtras: 0 }; return inv.integridad };

export function configurarIntegridad(o) { if (o.aviso) aviso = o.aviso }
/** La investigación activa y el contexto sensible actual ('pregunta:<id>', 'prediccion', 'conclusion' o null). */
export function fijarContexto(i, c) { inv = i; contexto = c }
/** Ignorar la pérdida de foco que provocan los diálogos propios (confirmar). */
export function silenciar(ms = 800) { silencioHasta = Date.now() + ms }

function empiezaSalida(motivo) {
  if (salida || Date.now() < silencioHasta || !inv || inv.conclusion) return;
  salida = { inicio: Date.now(), contexto, motivo }
}
function terminaSalida() {
  if (!salida) return; const R = reg(), s = salida; salida = null; if (!R) return;
  const dur = Math.round((Date.now() - s.inicio) / 100) / 10; if (dur < 1) return;   // parpadeos de foco de menos de 1 s no cuentan
  if (s.contexto) R.salidas.push({ hora: new Date(s.inicio).toISOString(), segundos: dur, contexto: s.contexto, motivo: s.motivo });
  else R.salidasOtras++;
  onCambio();
  if (s.contexto && dur >= 3) alVolver({ segundos: dur, contexto: s.contexto, veces: R.salidas.length })
}
let onCambio = () => { }, alVolver = () => { };
export function alCambiar(f) { onCambio = f }
/** Al volver a la app tras salir ≥ 3 s con una pregunta, predicción o conclusión abierta. */
export function alVolverApp(f) { alVolver = f }

/** Resumen de cómo se escribió un campo (se adjunta a la respuesta guardada) y lo reinicia. */
export function medirEscritura(id, texto) {
  const e = escritura.get(id); escritura.delete(id); const n = String(texto || '').length;
  if (!e) return { caracteres: n, segundos: 0, insertadoDeGolpe: 0 };
  return { caracteres: n, segundos: Math.round((Date.now() - e.inicio) / 100) / 10, insertadoDeGolpe: e.insertado, cambios: e.eventos }
}

export function instalarIntegridad(doc = document, win = window) {
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') empiezaSalida('app oculta'); else terminaSalida() });
  win.addEventListener('blur', () => empiezaSalida('foco en otra ventana'));
  win.addEventListener('focus', terminaSalida);
  win.addEventListener('pagehide', terminaSalida);
  // copiar: interesa sobre todo copiar enunciados (típico de pegarlos en una IA)
  doc.addEventListener('copy', () => {
    const R = reg(); if (!R) return; const t = String(win.getSelection ? win.getSelection() : '').trim(); if (!t) return;
    R.copias.push({ hora: ahoraISO(), contexto, caracteres: t.length, inicio: t.slice(0, 80) }); onCambio()
  });
  // pegar y arrastrar texto: bloqueado en los campos de razonamiento
  const campo = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'file', 'password'].includes(el.type)));
  const bloquea = (e, como) => {
    const el = e.target; if (!campo(el) || PERMITIDOS.has(el.id)) return;
    e.preventDefault(); const t = (e.clipboardData || e.dataTransfer) ? (e.clipboardData || e.dataTransfer).getData('text') : '';
    const R = reg(); if (R) { R.pegados.push({ hora: ahoraISO(), contexto, campo: el.id || el.dataset.param || el.dataset.hnota || 'campo', caracteres: t.length, como }); onCambio() }
    aviso('En esta actividad no se puede pegar texto en las respuestas: escríbelo tú.')
  };
  doc.addEventListener('paste', e => bloquea(e, 'pegar'), true);
  doc.addEventListener('drop', e => bloquea(e, 'arrastrar'), true);
  // inserciones grandes de golpe (portapapeles del teclado del móvil, dictado, autocompletar): se registran
  doc.addEventListener('beforeinput', e => {
    const el = e.target; if (!campo(el) || PERMITIDOS.has(el.id)) return;
    if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') { bloquea(e, e.inputType === 'insertFromDrop' ? 'arrastrar' : 'pegar'); return }
    const id = el.id || el.dataset.param || el.dataset.hnota || 'campo', est = escritura.get(id) || { inicio: Date.now(), insertado: 0, eventos: 0 };
    est.eventos++; const n = (e.data || '').length;
    if (n >= 20) { est.insertado += n; const R = reg(); if (R) { R.inserciones.push({ hora: ahoraISO(), contexto, campo: id, caracteres: n, tipo: e.inputType }); onCambio() } }
    escritura.set(id, est)
  }, true)
}

/** Resumen para el informe y la herramienta docente. Solo describe: no juzga. */
export function resumenIntegridad(inv) {
  const R = inv.integridad || { salidas: [], copias: [], pegados: [], inserciones: [], salidasOtras: 0 };
  const seg = R.salidas.reduce((a, s) => a + s.segundos, 0);
  const rapidas = [...inv.predicciones.map(p => p.escritura), ...inv.respuestas.map(r => r.escritura), inv.conclusion && inv.conclusion.escritura].filter(e => e && e.caracteres >= 80 && e.segundos > 0 && e.caracteres / e.segundos > 8).length;
  return {
    salidasDurantePreguntas: R.salidas.length, segundosFuera: Math.round(seg), salidaMasLarga: R.salidas.reduce((a, s) => Math.max(a, s.segundos), 0),
    salidasEnOtrosMomentos: R.salidasOtras, copiasDeTexto: R.copias.length, copiasDeEnunciados: R.copias.filter(c => c.contexto && c.contexto.startsWith('pregunta')).length,
    intentosDePegar: R.pegados.length, insercionesGrandes: R.inserciones.length, respuestasEscritasMuyRapido: rapidas
  }
}
