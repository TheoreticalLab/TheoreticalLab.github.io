// LÓGICA DE LA INVESTIGACIÓN · estado de cada experimento y sus operaciones. Sin interfaz (la usan la app y las pruebas).
// Principio: el registro solo crece. Una predicción confirmada no se puede cambiar; una interpretación se puede revisar
// añadiendo una revisión con fecha (la original se conserva).
import { experimento, CREDITOS, claveMontaje, LETRAS } from './sesion.js';
import { INSTRUMENTOS, COSTE_MONTAJE, medir, prediccionIdeal, validarParametros } from './mediciones.js';
import { HIPOTESIS, ESTADOS_H, siguientePregunta, evaluarRespuesta } from './pedagogia.js';
import { montaje } from './sesion.js';

export const VERSION_DATOS = 1;
const ahora = () => new Date().toISOString();

export function nuevaSesion(id, alias) {
  return { app: 'laboratorio-mas', version: VERSION_DATOS, id, alias: String(alias || '').slice(0, 60), creada: ahora(), investigaciones: {}, actual: null }
}
export function nuevaInvestigacion(letra) {
  return {
    letra, iniciada: ahora(), creditos: CREDITOS, montajes: [claveMontaje(1, 1)], montaje: claveMontaje(1, 1),
    mediciones: [], predicciones: [], pendiente: null, respuestas: [], omitidas: [], marcas: {},
    hipotesis: Object.fromEntries(Object.keys(HIPOTESIS).map(h => [h, { estado: 'sin evaluar', nota: '' }])), histHip: [],
    interpretaciones: [], eventos: [{ hora: ahora(), tipo: 'inicio' }], borrador: null, conclusion: null
  }
}
export function abrirInvestigacion(ses, letra) {
  if (!LETRAS.includes(letra)) throw new Error('letra');
  if (!ses.investigaciones[letra]) ses.investigaciones[letra] = nuevaInvestigacion(letra);
  ses.actual = letra; return ses.investigaciones[letra]
}
const exp = (ses, inv) => experimento(ses.id, inv.letra);
const ev = (inv, tipo, x = {}) => inv.eventos.push({ hora: ahora(), tipo, ...x });
const cerrada = inv => !!inv.conclusion;

/** Cambiar el montaje (masa ×fm, amplitud ×fa). Montar una configuración nueva cuesta COSTE_MONTAJE (una vez). */
export function cambiarMontaje(ses, inv, fm, fa) {
  if (cerrada(inv)) return { error: 'La investigación ya está entregada.' };
  if (![1, 2, 0.5].includes(fm) || ![1, 2, 0.5].includes(fa)) return { error: 'Montaje no disponible' };
  const k = claveMontaje(fm, fa);
  if (!inv.montajes.includes(k)) {
    if (inv.creditos < COSTE_MONTAJE) return { error: `Montar esta configuración cuesta ${COSTE_MONTAJE} créditos y te quedan ${inv.creditos}.` };
    inv.creditos -= COSTE_MONTAJE; inv.montajes.push(k); ev(inv, 'montaje', { fm, fa, coste: COSTE_MONTAJE })
  }
  inv.montaje = k; return { ok: true }
}
export const montajeActual = inv => { const [fm, fa] = inv.montaje.split('|').map(Number); return { fm, fa } };

/** ¿Es una repetición exacta de algo ya medido? (mismo instrumento, parámetros y montaje → no se pide predicción) */
export function esRepeticion(inv, instr, p, fm, fa) { return inv.mediciones.some(d => d.instr === instr && d.fm === fm && d.fa === fa && JSON.stringify(d.p) === JSON.stringify(p)) }

/** Paso 1: preparar una medición. Si requiere predicción, queda pendiente hasta que el estudiante la confirme. */
export function prepararMedicion(ses, inv, instr, params) {
  if (cerrada(inv)) return { error: 'La investigación ya está entregada.' };
  const { fm, fa } = montajeActual(inv), e = exp(ses, inv), M = montaje(e, fm, fa), v = validarParametros(instr, params, M);
  if (v.error) return v;
  const I = INSTRUMENTOS[instr], coste = I.coste(v.p);
  if (coste > inv.creditos) return { error: `Esta medición cuesta ${coste} créditos y te quedan ${inv.creditos}. Puedes elegir otra más barata o entregar tu conclusión (siempre puedes declarar que la evidencia es insuficiente).` };
  if (I.viable && !I.viable(e, M, v.p)) return { error: instr === 'aEnX' ? 'El bloque no pasa por esa posición en su primera media oscilación (prueba con |x| ≤ A).' : 'Parámetros no válidos.' };
  const rep = esRepeticion(inv, instr, v.p, fm, fa), requiere = !I.sinPrediccion && !rep;
  inv.pendiente = { instr, p: v.p, fm, fa, coste, requiere, repeticion: rep, hora: ahora() };
  return { ok: true, requierePrediccion: requiere, coste }
}

/** Paso 2: registrar la predicción (queda bloqueada; no se puede alterar después). */
export function registrarPrediccion(ses, inv, valor, justificacion) {
  const P = inv.pendiente; if (!P || !P.requiere) return { error: 'No hay ninguna medición esperando predicción.' };
  const v = Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(v)) return { error: 'Escribe tu predicción como número (en las unidades indicadas).' };
  const j = String(justificacion || '').trim();
  if (j.length < 8) return { error: 'Escribe una breve justificación (qué fórmula o razonamiento usas).' };
  const id = inv.predicciones.length + 1;
  inv.predicciones.push({ id, hora: ahora(), instr: P.instr, p: P.p, fm: P.fm, fa: P.fa, valor: v, justificacion: j.slice(0, 600), ideal: prediccionIdeal(exp(ses, inv), P.instr, P.p, P.fm, P.fa), medicion: null, bloqueada: true });
  P.prediccion = id; P.requiere = false; ev(inv, 'prediccion', { id });
  return { ok: true, id }
}

/** Paso 3: ejecutar la medición pendiente (descuenta créditos y la registra). */
export function ejecutarMedicion(ses, inv) {
  const P = inv.pendiente; if (!P) return { error: 'No hay medición pendiente.' };
  if (P.requiere) return { error: 'Primero registra tu predicción.' };
  if (P.coste > inv.creditos) { inv.pendiente = null; return { error: 'Créditos insuficientes.' } }
  const n = inv.mediciones.length + 1, r = medir(exp(ses, inv), n, P.instr, P.p, P.fm, P.fa);
  if (r.error) { inv.pendiente = null; return r }
  const d = { n, hora: ahora(), instr: P.instr, p: P.p, fm: P.fm, fa: P.fa, valores: r.valores, principal: r.principal, extra: r.extra || null, ideal: r.ideal, escala: r.escala, coste: P.coste, prediccion: P.prediccion || null, repeticion: !!P.repeticion };
  inv.mediciones.push(d); inv.creditos -= P.coste; inv.pendiente = null;
  if (d.prediccion) inv.predicciones.find(p => p.id === d.prediccion).medicion = n;
  ev(inv, 'medicion', { n, coste: P.coste });
  return { ok: true, medicion: d }
}
export const cancelarPendiente = inv => { if (inv.pendiente && !inv.pendiente.prediccion) inv.pendiente = null; else if (inv.pendiente) return { error: 'Ya registraste la predicción: la medición se hará igualmente.' }; return { ok: true } };

/** Revisar la interpretación de una medición o predicción (se añade; la original no cambia). */
export function revisarInterpretacion(inv, ref, texto) {
  const t = String(texto || '').trim(); if (t.length < 5) return { error: 'Escribe tu nueva interpretación.' };
  inv.interpretaciones.push({ hora: ahora(), ref, texto: t.slice(0, 800) }); ev(inv, 'interpretacion', { ref }); return { ok: true }
}

/** Cambiar la valoración de una hipótesis (queda en el historial con las mediciones que la apoyan). */
export function valorarHipotesis(inv, h, estado, nota = '', evidencia = [], motivo = '') {
  if (!HIPOTESIS[h] || !ESTADOS_H.includes(estado)) return { error: 'Hipótesis o estado no válidos' };
  const de = inv.hipotesis[h].estado; if (de === estado && !nota) return { ok: true };
  inv.hipotesis[h] = { estado, nota: String(nota || inv.hipotesis[h].nota || '').slice(0, 400) };
  inv.histHip.push({ hora: ahora(), h, de, a: estado, nota: String(nota || '').slice(0, 400), evidencia: evidencia.slice(0, 20), motivo, nMediciones: inv.mediciones.length });
  return { ok: true }
}

/** Pregunta actual del motor pedagógico. */
export const preguntaActual = (ses, inv) => siguientePregunta(inv, exp(ses, inv));

/** Responder a la pregunta planteada (se guarda la pregunta tal como se mostró, con sus datos). */
export function responder(ses, inv, preg, r) {
  if (!preg) return { error: 'No hay pregunta.' };
  if (preg.tipo === 'numero' && !Number.isFinite(Number(String(r.numero).replace(',', '.')))) return { error: 'Escribe un número.' };
  if ((preg.tipo === 'opcion' || preg.tipo === 'opcion+texto') && !r.opcion) return { error: 'Elige una opción.' };
  if (preg.tipo === 'multi' && !(r.opciones || []).length) return { error: 'Marca al menos una opción.' };
  if (preg.tipo === 'opcion+texto' && String(r.texto || '').trim().length < 8) return { error: 'Explica brevemente tu elección.' };
  const e = evaluarRespuesta(inv, exp(ses, inv), preg.id, preg.clave, r);
  const reg = { hora: ahora(), nodo: preg.id, clave: preg.clave, cat: e.cat, tipo: preg.tipo, pregunta: preg.texto, opciones: preg.opciones, respuesta: r, correcta: e.correcta, esperado: e.esperado, efecto: e.efecto, nMediciones: inv.mediciones.length };
  inv.respuestas.push(reg);
  const f = e.efecto || {};
  if (f.marca) inv.marcas[f.marca] = (inv.marcas[f.marca] || 0) + 1;
  if (f.corrige && inv.marcas[f.corrige]) inv.marcas['corregida:' + f.corrige] = true;
  if (f.hipotesis) for (const [h, est] of Object.entries(f.hipotesis)) valorarHipotesis(inv, h, est, r.texto || '', [], f.motivo || 'respuesta a ' + preg.id);
  ev(inv, 'respuesta', { nodo: preg.id });
  return { ok: true, correcta: e.correcta, esperado: e.esperado, retro: e.retro, cat: e.cat }
}
export function omitirPregunta(inv, preg) { inv.omitidas.push({ nodo: preg.id, clave: preg.clave, hora: ahora() }); ev(inv, 'omitida', { nodo: preg.id }); return { ok: true } }

/** Borrador de conclusión: activa las preguntas de desafío. Se puede cambiar libremente hasta entregar. */
export function proponerConclusion(inv, tipo) {
  if (!['compatible', 'incompatible', 'insuficiente'].includes(tipo)) return { error: 'Conclusión no válida' };
  if (cerrada(inv)) return { error: 'Ya entregaste.' };
  inv.borrador = { tipo, hora: ahora() }; ev(inv, 'borrador', { conclusion: tipo }); return { ok: true }
}
/** Entrega final (siempre posible, incluso sin créditos ni mediciones). */
export function entregarConclusion(inv, c) {
  if (cerrada(inv)) return { error: 'Ya entregaste.' };
  if (!['compatible', 'incompatible', 'insuficiente'].includes(c.tipo)) return { error: 'Elige una de las tres conclusiones.' };
  const j = String(c.justificacion || '').trim(); if (j.length < 20) return { error: 'Escribe una justificación de al menos un par de frases.' };
  const z = c.z === '' || c.z == null ? null : Number(String(c.z).replace(',', '.'));
  inv.conclusion = { hora: ahora(), tipo: c.tipo, evidencias: (c.evidencias || []).map(Number).filter(n => inv.mediciones.some(d => d.n === n)), z: Number.isFinite(z) ? z : null, limitaciones: (c.limitaciones || []).slice(0, 10), justificacion: j.slice(0, 3000) };
  ev(inv, 'conclusion', { conclusion: c.tipo }); return { ok: true }
}
