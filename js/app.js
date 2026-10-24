// INTERFAZ · cinco pantallas. No contiene física ni pedagogía: solo llama a los módulos y pinta.
import { nuevoIdentificador, normalizarIdentificador } from './azar.js';
import { experimento, montaje, LETRAS, T_MAX, CREDITOS } from './sesion.js';
import { INSTRUMENTOS, COSTE_MONTAJE, conIncertidumbre, formatear } from './mediciones.js';
import * as INV from './investigacion.js';
import { HIPOTESIS, ESTADOS_H, sugerencias, calcularEvidencia } from './pedagogia.js';
import { evaluar } from './evaluacion.js';
import { informeHTML, informeJSON, descargar, NOMBRE_CONCLUSION, LIMITACIONES } from './informe.js';
import { guardarSesion, sesionActual, cargarSesion, listarSesiones, activarSesion, cerrarSesion } from './almacen.js';
import { dibujarEscena } from './animacion.js';
import { dibujarGrafica } from './graficas.js';
import { aplicarMarca } from './marca.js';
import { CONFIG } from './config.js';
import { envioActivo, enviarAlProfesor } from './envio.js';
import { instalarIntegridad, configurarIntegridad, fijarContexto, silenciar, medirEscritura, alCambiar, alVolverApp } from './integridad.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x, d = 3) => Number.isFinite(+x) ? String(+(+x).toFixed(d)).replace('.', ',') : '—';
const vu = (v, s, u) => conIncertidumbre(v, s, u);

let ses = sesionActual(), pantalla = 'inicio';
const ui = { instr: null, params: {}, ultimo: null, retro: null, graf: null, tAnim: 0, play: false, vel: 1, mensaje: null, revisar: null };
const inv = () => ses && ses.actual ? ses.investigaciones[ses.actual] : null;
const exp = () => experimento(ses.id, inv().letra);
const guardar = () => { if (ses && !guardarSesion(ses)) aviso('No se pudo guardar en este navegador (¿modo privado o sin espacio?). Descarga el JSON para no perder tu trabajo.', 'mal') };
const aviso = (txt, tipo = 'info') => { ui.mensaje = { txt, tipo }; pintar() };
// diálogos propios: la pérdida de foco que provocan no cuenta como «salir de la app»
const confirmar = t => { silenciar(); const r = confirm(t); silenciar(); return r };
// notificación flotante que NO redibuja la pantalla (no se pierde lo que se estaba escribiendo)
const toast = t => { let el = $('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el) } el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true }, 4500) };
instalarIntegridad(); configurarIntegridad({ aviso: toast });
let tGuardar = null; alCambiar(() => { clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 400) });
const AVISO_INTEGRIDAD = 'Esta actividad registra, y tu profesor lo verá, cada vez que sales de la app (y si estabas respondiendo), si copias enunciados y cómo escribes tus respuestas. Pegar texto está desactivado en toda la app.';
/* Mensaje emergente al volver a la app (ventana superpuesta: no redibuja la pantalla, así no se pierde lo que se escribía). */
const CONTEXTO_TXT = c => c === 'prediccion' ? ' mientras escribías tu predicción' : c === 'conclusion' ? ' mientras redactabas tu conclusión' : c ? ' mientras respondías una pregunta' : '';
let focoAntes = null;
alVolverApp(x => {
  let el = $('avisoEtico');
  if (!el) { el = document.createElement('div'); el.id = 'avisoEtico'; el.className = 'emergente'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tEtico'); document.body.appendChild(el) }
  el.innerHTML = `<div class="emergente-caja"><h2 id="tEtico">Has salido de la app y has vuelto a entrar</h2>
    <p>Nuestro sistema lo ha detectado y lo ha registrado para tu profesor: ${n(x.segundos, 0)} s fuera${CONTEXTO_TXT(x.contexto)}${x.veces > 1 ? ` · ${x.veces}.ª vez` : ''}.</p>
    <p><b>Te recordamos las reglas éticas:</b></p><ul><li>El trabajo es <b>individual</b>.</li><li>Responde <b>sin IA ni ayuda externa</b>.</li><li>Razona con <b>tus propias mediciones</b>: reconocer lo que no sabes también cuenta en la nota.</li></ul>
    <p><button type="button" class="btn prim" id="bCerrarEtico">Entendido, sigo con mi trabajo</button></p></div>`;
  focoAntes = document.activeElement; el.hidden = false; silenciar(); $('bCerrarEtico').focus()
});
document.addEventListener('click', e => { if (e.target.id === 'bCerrarEtico') { $('avisoEtico').hidden = true; if (focoAntes && focoAntes.focus) try { focoAntes.focus() } catch (x) { } } });
const msg = () => { if (!ui.mensaje) return ''; const m = ui.mensaje; ui.mensaje = null; return `<div class="aviso ${m.tipo}" role="status">${esc(m.txt)}</div>` };

/* ---------------- navegación y cabecera ---------------- */
function ir(p) {
  if (p !== 'inicio' && !inv()) { pantalla = 'inicio'; aviso('Primero elige o crea una investigación y un experimento.', 'am'); return }
  pantalla = p; try { history.replaceState(null, '', '#' + p) } catch (e) { } window.scrollTo({ top: 0 }); pintar()
}
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== pantalla && ['inicio', 'laboratorio', 'instrumentos', 'investigacion', 'informe'].includes(h)) ir(h) });
document.querySelector('nav.pest').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) ir(b.dataset.p) });
function cabecera() {
  const I = inv();
  $('cabSesion').hidden = !ses; if (ses) $('cabSesion').innerHTML = `<b>${esc(ses.id)}</b>${ses.alias ? ' · ' + esc(ses.alias) : ''}`;
  $('cabExp').hidden = !I; if (I) $('cabExp').innerHTML = `Experimento <b>${I.letra}</b>${I.conclusion ? ' · entregado' : ''}`;
  $('cabCreditos').hidden = !I; if (I) $('cabCreditos').innerHTML = `<span class="barra" aria-hidden="true"><i style="width:${100 * I.creditos / CREDITOS}%"></i></span><span><b>${I.creditos}</b> / ${CREDITOS} créditos</span>`;
  document.querySelectorAll('nav.pest button').forEach(b => { b.setAttribute('aria-current', b.dataset.p === pantalla ? 'page' : 'false'); b.disabled = b.dataset.p !== 'inicio' && !I })
}
function pintar() {
  cabecera(); aplicarMarca(ses, pantalla !== 'inicio' && !!inv());
  { // contexto sensible para el registro de integridad
    const I = inv(); let c = null;
    if (I && !I.conclusion) {
      if (pantalla === 'investigacion' && !ui.retro) { const q = INV.preguntaActual(ses, I); if (q) c = 'pregunta:' + q.id }
      else if (pantalla === 'instrumentos' && I.pendiente && I.pendiente.requiere) c = 'prediccion';
      else if (pantalla === 'informe' && I.borrador) c = 'conclusion'
    }
    fijarContexto(I, c, pantalla, I ? ses.id + '|' + I.letra : '')
  }
  for (const p of ['inicio', 'laboratorio', 'instrumentos', 'investigacion', 'informe']) $('p-' + p).hidden = p !== pantalla;
  ({ inicio: pInicio, laboratorio: pLab, instrumentos: pInstr, investigacion: pInv, informe: pInforme })[pantalla]();
  if (pantalla === 'laboratorio') animar(); else ui.play = false
}

/* ---------------- 1. INICIO ---------------- */
function pInicio() {
  const el = $('p-inicio'), guardadas = listarSesiones();
  const mision = `<div class="tarjeta"><h1>¿Es un movimiento armónico simple?</h1>
    <p>Tienes seis experimentos (A, B, C, D, E, I) con un bloque unido a un resorte horizontal. El bloque se suelta desde x = A sin velocidad. Tu misión en cada uno: <b>decidir, con mediciones y razonamiento, si su movimiento es compatible con el MAS ideal</b> que predicen los parámetros nominales.</p>
    <ul class="suave"><li>Tienes <b>${CREDITOS} créditos</b> por experimento: cada medición cuesta; elige las que más informan.</li>
    <li>Antes de cada medición nueva, <b>registras tu predicción</b> según el MAS ideal. Queda fijada.</li>
    <li>Las preguntas de la investigación dependen de lo que midas y respondas.</li>
    <li><b>Registro de integridad:</b> se anota si sales de la app mientras respondes y si copias enunciados; pegar texto en las respuestas está desactivado.</li>
    <li>Terminarás con una de tres conclusiones: <b>compatible</b>, <b>incompatible</b> o <b>evidencia insuficiente</b>. Reconocer los límites de tus datos es parte de la nota.</li></ul>
    <p class="suave peq">Tu progreso se guarda solo en este navegador. Al final descarga el informe y entrégalo a tu profesor.</p></div>`;
  if (!ses) {
    el.innerHTML = msg() + mision + `<div class="rejilla"><div class="tarjeta"><h2>Nueva investigación</h2>
      <label class="campo"><span>Tu nombre o alias (aparecerá en el informe)</span><input id="alias" maxlength="60" autocomplete="nickname"></label>
      <p><button class="btn prim" id="bNueva">Empezar investigación</button></p><p class="suave peq">Se generará un identificador único: tus experimentos serán distintos de los de tus compañeros.</p></div>
      <div class="tarjeta"><h2>Continuar o reproducir</h2><label class="campo"><span>Identificador (p. ej. MAS-7F3K-29QD)</span><input id="idRep" autocapitalize="characters" spellcheck="false"></label>
      <p><button class="btn" id="bReproducir">Abrir</button></p>
      ${guardadas.length ? `<h3>Guardadas en este navegador</h3>${guardadas.map(s => `<p><button class="btn chico" data-abrir="${esc(s.id)}">${esc(s.id)}</button> <span class="suave peq">${esc(s.alias || '')} · ${s.letras.length} experimentos</span></p>`).join('')}` : ''}</div></div>`;
    return
  }
  const L = LETRAS.map(l => { const I = ses.investigaciones[l], est = !I ? 'Sin empezar' : I.conclusion ? `Entregado: ${NOMBRE_CONCLUSION[I.conclusion.tipo].toLowerCase()}` : `En curso · ${I.creditos} créditos`;
    return `<button class="letra" data-letra="${l}" aria-current="${ses.actual === l}"><span class="L">${l}</span><span class="peq">${esc(est)}</span>${I ? `<span class="suave peq">${I.mediciones.length} mediciones</span>` : ''}</button>` }).join('');
  el.innerHTML = msg() + `<div class="tarjeta"><h2>Elige un experimento</h2><p class="suave peq">Cada letra es un sistema distinto. Puedes investigar varios; cada uno tiene sus propios ${CREDITOS} créditos.</p><div class="letras">${L}</div></div>` + mision +
    `<div class="tarjeta"><h2>Tu sesión</h2><dl class="param"><dt>Identificador</dt><dd>${esc(ses.id)}</dd><dt>Alias</dt><dd>${esc(ses.alias || '—')}</dd><dt>Creada</dt><dd>${esc(new Date(ses.creada).toLocaleString('es'))}</dd></dl>
    <p class="suave peq">Anota el identificador: con él tu profesor puede reproducir exactamente tus experimentos.</p><p class="fila"><button class="btn chico" id="bCambiar">Cambiar de sesión</button></p></div>`
}
document.addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'bNueva') { const id = nuevoIdentificador(); ses = INV.nuevaSesion(id, $('alias').value.trim()); guardar(); pintar(); return }
  if (t.id === 'bReproducir') { const id = normalizarIdentificador($('idRep').value); if (!id) return aviso('Ese identificador no tiene el formato MAS-XXXX-XXXX.', 'mal'); ses = cargarSesion(id) || INV.nuevaSesion(id, ($('alias') && $('alias').value) || ''); activarSesion(id); guardar(); pintar(); return }
  if (t.dataset.abrir) { ses = cargarSesion(t.dataset.abrir); activarSesion(ses.id); pintar(); return }
  if (t.id === 'bCambiar') { cerrarSesion(); ses = null; pantalla = 'inicio'; pintar(); return }
  const L = t.closest('[data-letra]'); if (L) { INV.abrirInvestigacion(ses, L.dataset.letra); ui.ultimo = null; ui.instr = null; ui.retro = null; ui.tAnim = 0; guardar(); ir('laboratorio'); return }
});

/* ---------------- 2. LABORATORIO ---------------- */
function pLab() {
  const I = inv(), e = exp(), { fm, fa } = INV.montajeActual(I), M = montaje(e, fm, fa);
  const seg = (q, val) => [0.5, 1, 2].map(f => `<button type="button" data-mont="${q}" data-f="${f}" aria-pressed="${val === f}">×${f === 0.5 ? '½' : f}</button>`).join('');
  const avisoInt = I.integridad && I.integridad.avisoVisto ? '' : `<div class="aviso am" role="note"><b>Antes de empezar.</b> ${esc(AVISO_INTEGRIDAD)} <button class="btn chico" id="bAvisoInt" style="margin-left:6px">Entendido</button></div>`;
  $('p-laboratorio').innerHTML = msg() + avisoInt + `<div class="tarjeta"><div class="fila" style="justify-content:space-between"><h2>Experimento ${I.letra}</h2><span class="reloj" id="relojT">t = ${n(ui.tAnim, 2)} s</span></div>
    <canvas class="escena" id="escena" aria-label="Animación del bloque y el resorte"></canvas>
    <div class="fila" style="margin-top:10px"><button class="btn" id="bPlay">${ui.play ? 'Pausar' : 'Observar'}</button>
      <div class="seg" role="group" aria-label="Velocidad">${[1, 0.5, 0.25].map(v => `<button type="button" data-vel="${v}" aria-pressed="${ui.vel === v}">×${String(v).replace('.', ',')}</button>`).join('')}</div>
      <button class="btn" id="bReiniciarAnim">t = 0</button></div>
    <label class="campo" style="margin-top:10px"><span>Elegir un instante (0–${T_MAX} s)</span><input type="range" id="tSlider" min="0" max="${T_MAX}" step="0.01" value="${ui.tAnim}"></label>
    <p class="fila"><button class="btn prim" id="bMedirAqui">Medir en t = ${n(ui.tAnim, 2)} s</button><span class="suave peq">La animación muestra el movimiento, no los valores: los números se obtienen midiendo.</span></p></div>
    <div class="rejilla"><div class="tarjeta"><h2>Montaje actual</h2><dl class="param"><dt>Masa del bloque m</dt><dd>${n(M.m)} kg</dd><dt>Constante nominal k</dt><dd>${n(M.k, 1)} N/m</dd><dt>Amplitud inicial A</dt><dd>${n(M.A)} m</dd><dt>Condiciones iniciales</dt><dd>x(0) = A, v(0) = 0</dd></dl>
      <h3>Cambiar el montaje</h3><p class="suave peq">Montar una configuración nueva cuesta ${COSTE_MONTAJE} créditos (una sola vez); volver a una ya montada es gratis. El resorte es siempre el mismo.</p>
      <div class="fila"><span class="peq">Masa</span><div class="seg">${seg('m', fm)}</div><span class="peq">Amplitud</span><div class="seg">${seg('a', fa)}</div></div>
      <p class="suave peq">Montadas: ${I.montajes.map(k => { const [a, b] = k.split('|'); return `masa ×${a.replace('0.5', '½')}, amplitud ×${b.replace('0.5', '½')}` }).join(' · ')}</p></div>
    <div class="tarjeta"><details class="formulario"><summary>Formulario del MAS ideal</summary><div class="formulas"><span>x(t) = A cos(ωt)</span><span>v(t) = −Aω sen(ωt)</span><span>a(t) = −ω² x</span><span>ω = √(k/m)</span><span>T = 2π√(m/k)</span><span>f = 1/T</span><span>v_max = Aω</span><span>a_max = Aω²</span><span>F = −k x</span><span>E = ½kA²</span><span>K = ½mv²</span><span>U = ½kx²</span></div>
      <p class="suave peq">Usa radianes en la calculadora. Incertidumbre de una media de n mediciones: σ/√n. Significación de una diferencia: z = (observado − esperado)/σ.</p></details></div></div>`;
}
document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t || pantalla !== 'laboratorio') return;
  if (t.id === 'bPlay') { ui.play = !ui.play; if (ui.tAnim >= T_MAX) ui.tAnim = 0; t.textContent = ui.play ? 'Pausar' : 'Observar'; animar(); return }
  if (t.id === 'bAvisoInt') { const I = inv(); I.integridad = I.integridad || { salidas: [], copias: [], pegados: [], inserciones: [], salidasOtras: 0 }; I.integridad.avisoVisto = new Date().toISOString(); guardar(); pLab(); dibujaAhora(); return }
  if (t.id === 'bReiniciarAnim') { ui.tAnim = 0; ui.play = false; pLab(); animar(); return }
  if (t.dataset.vel) { ui.vel = +t.dataset.vel; document.querySelectorAll('[data-vel]').forEach(b => b.setAttribute('aria-pressed', b === t)); return }
  if (t.id === 'bMedirAqui') { ui.params = { ...ui.params, t: Math.round(ui.tAnim * 100) / 100, x0: ui.params.x0 }; if (!ui.instr || !INSTRUMENTOS[ui.instr].params.some(p => p.id === 't')) ui.instr = 'posicion'; ir('instrumentos'); return }
  if (t.dataset.mont) {
    const I = inv(), cur = INV.montajeActual(I), fm = t.dataset.mont === 'm' ? +t.dataset.f : cur.fm, fa = t.dataset.mont === 'a' ? +t.dataset.f : cur.fa, k = fm + '|' + fa;
    if (!I.montajes.includes(k) && !confirmar(`Montar masa ×${fm} y amplitud ×${fa} cuesta ${COSTE_MONTAJE} créditos. ¿Continuar?`)) return;
    const r = INV.cambiarMontaje(ses, I, fm, fa); if (r.error) return aviso(r.error, 'mal'); guardar(); ui.tAnim = 0; pintar()
  }
});
document.addEventListener('input', e => { if (e.target.id === 'tSlider') { ui.tAnim = +e.target.value; ui.play = false; const b = $('bPlay'); if (b) b.textContent = 'Observar'; $('bMedirAqui').textContent = `Medir en t = ${n(ui.tAnim, 2)} s`; dibujaAhora() } });
let ultimoCuadro = 0, cuadroPedido = false;
function dibujaAhora() {
  const c = $('escena'); if (!c || !inv()) return; const e = exp(), { fm, fa } = INV.montajeActual(inv()), M = montaje(e, fm, fa);
  dibujarEscena(c, M.modelo.estado(ui.tAnim).x, M.A, Math.max(M.A, e.nominal.A * 2)); const r = $('relojT'); if (r) r.textContent = `t = ${n(ui.tAnim, 2)} s`
}
function animar() {
  dibujaAhora(); if (!ui.play || cuadroPedido) return; cuadroPedido = true; ultimoCuadro = performance.now();
  const paso = ahora => { cuadroPedido = false; if (!ui.play || pantalla !== 'laboratorio') return; ui.tAnim = Math.min(T_MAX, ui.tAnim + (ahora - ultimoCuadro) / 1000 * ui.vel); ultimoCuadro = ahora;
    if (ui.tAnim >= T_MAX) { ui.play = false; const b = $('bPlay'); if (b) b.textContent = 'Observar' } const s = $('tSlider'); if (s) s.value = ui.tAnim; const m = $('bMedirAqui'); if (m) m.textContent = `Medir en t = ${n(ui.tAnim, 2)} s`; dibujaAhora(); if (ui.play) { cuadroPedido = true; requestAnimationFrame(paso) } };
  requestAnimationFrame(paso)
}
window.addEventListener('resize', () => { if (pantalla === 'laboratorio') dibujaAhora(); if (pantalla === 'instrumentos') pintaGrafica() });

/* ---------------- 3. INSTRUMENTOS ---------------- */
const zClase = z => Math.abs(z) < 2 ? 'ok' : Math.abs(z) < 3 ? 'am' : 'mal';
const zTexto = z => Math.abs(z) < 2 ? 'coincide dentro de la incertidumbre' : Math.abs(z) < 3 ? 'diferencia dudosa' : 'diferencia significativa';
function campoParam(d, val) {
  if (d.opciones) return `<label class="campo"><span>${esc(d.nombre)}</span><select data-param="${d.id}">${d.opciones.map(o => `<option value="${o}"${+val === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
  return `<label class="campo"><span>${esc(d.nombre)} (${esc(d.unidad)})</span><input data-param="${d.id}" inputmode="decimal" value="${val != null ? esc(String(val).replace('.', ',')) : ''}" placeholder="${d.min} a ${d.max}"></label>`
}
function descMed(d) { const I = INSTRUMENTOS[d.instr], P = Object.entries(d.p).map(([k, v]) => `${k} = ${n(v)}`).join(', '); return `${I.nombre}${P ? ' · ' + P : ''}${d.fm !== 1 || d.fa !== 1 ? ` · montaje m×${String(d.fm).replace('0.5', '½')} A×${String(d.fa).replace('0.5', '½')}` : ''}` }
function tarjetaResultado(d) {
  const I = inv(), p = d.prediccion ? I.predicciones.find(x => x.id === d.prediccion) : null, pr = d.valores[d.principal];
  const vals = Object.values(d.valores).map(x => `<div><span class="suave">${esc(x.n)} =</span> <span class="resultado">${esc(vu(x.v, x.s, x.u))}</span></div>`).join('');
  const extra = d.extra && d.extra.t != null ? `<p class="suave peq">El bloque pasó por esa posición en t = ${n(d.extra.t, 3)} s.</p>` : d.extra && d.extra.puntos ? `<div class="tw"><table class="tabla"><tr><th>t (s)</th>${d.extra.puntos.map(q => `<td>${n(q.t, 2)}</td>`).join('')}</tr><tr><th>x (m)</th>${d.extra.puntos.map(q => `<td>${formatear(q.x, d.extra.s).v}</td>`).join('')}</tr></table></div><p class="suave peq">Cada punto: ± ${formatear(d.extra.s, d.extra.s).s} m.</p>` : '';
  let cmp = '';
  if (p) { const z = (pr.v - p.valor) / pr.s; cmp = `<div class="aviso ${zClase(z) === 'ok' ? 'ok' : zClase(z) === 'am' ? 'am' : 'mal'}">Tu predicción: <b>${n(p.valor, 4)} ${esc(pr.u)}</b> · diferencia: ${n(pr.v - p.valor, 4)} ${esc(pr.u)} = <b>${n(z, 1)} σ</b> → ${zTexto(z)}.</div>` }
  const coste = INSTRUMENTOS[d.instr].coste(d.p);
  return `<div class="tarjeta"><h2>Medición #${d.n}</h2><p class="suave peq">${esc(descMed(d))}</p>${vals}${extra}${cmp}
    <div class="fila"><button class="btn" data-repetir="${d.n}" ${I.conclusion || coste > I.creditos ? 'disabled' : ''}>Repetir (${coste} créditos)</button><button class="btn" data-revisar="#${d.n}">Revisar mi interpretación</button></div>
    ${ui.revisar === '#' + d.n ? `<label class="campo" style="margin-top:8px"><span>Tu interpretación revisada (la original se conserva)</span><textarea id="txtRevision"></textarea></label><p><button class="btn prim chico" data-guardarrev="#${d.n}">Guardar revisión</button></p>` : ''}</div>`
}
function pInstr() {
  const I = inv(), e = exp(), { fm, fa } = INV.montajeActual(I), cerrado = !!I.conclusion, P = I.pendiente;
  const sug = sugerencias(I, e).map(s => `<li>${esc(s.txt)} <span class="suave peq">(${esc(s.motivo)})</span></li>`).join('');
  const lista = Object.entries(INSTRUMENTOS).map(([id, x]) => { const c = x.coste({ N: ui.params.N || 1 }); return `<button class="instr" data-instr="${id}" aria-pressed="${ui.instr === id}"><b>${esc(x.nombre)}</b><span class="peq suave">${esc(x.pregunta)}</span><span class="coste">${id === 'periodo' ? '2–4 créditos' : c === 1 ? '1 crédito' : c + ' créditos'}</span></button>` }).join('');
  let panel = '';
  if (P) {
    const X = INSTRUMENTOS[P.instr], desc = descMed({ ...P, instr: P.instr });
    panel = P.requiere ? `<div class="tarjeta"><h2>Antes de medir: tu predicción</h2><p>${esc(desc)} · cuesta <b>${P.coste}</b> créditos.</p>
        <p class="suave peq">Según el MAS ideal con los parámetros nominales del montaje, ¿qué valor esperas? Una vez confirmada, la predicción no se puede cambiar.</p>
        <div class="rejilla"><label class="campo"><span>Predicción de ${esc(X.simbolo)} (${esc(X.unidad)})</span><input id="predValor" inputmode="decimal"></label></div>
        <label class="campo"><span>Justificación breve (fórmula o razonamiento)</span><textarea id="predJust" maxlength="600"></textarea></label>
        <p class="fila"><button class="btn prim" id="bConfirmarPred">Confirmar predicción</button><button class="btn" id="bCancelarMed">Cancelar</button></p></div>`
      : `<div class="tarjeta"><h2>Predicción registrada</h2><p>${esc(desc)} · cuesta <b>${P.coste}</b> créditos.</p><p><button class="btn prim" id="bEjecutar">Realizar la medición</button></p></div>`
  } else if (ui.instr && !cerrado) {
    const X = INSTRUMENTOS[ui.instr], vals = { t: ui.params.t ?? 0, N: ui.params.N ?? 10, x0: ui.params.x0 ?? '', t1: ui.params.t1 ?? 0, t2: ui.params.t2 ?? 10 };
    panel = `<div class="tarjeta"><h2>${esc(X.nombre)}</h2><p>${esc(X.pregunta)}</p><div class="rejilla">${X.params.map(d => campoParam(d, vals[d.id])).join('') || '<p class="suave">Sin parámetros.</p>'}</div>
      <p class="suave peq">Montaje: masa ×${String(fm).replace('0.5', '½')}, amplitud ×${String(fa).replace('0.5', '½')} (cámbialo en Laboratorio).</p>
      <p class="fila"><button class="btn prim" id="bSolicitar">Solicitar · <span id="costeSel">${X.coste({ N: vals.N })}</span> créditos</button></p></div>`
  }
  const filas = [...I.mediciones].reverse().map(d => { const pr = d.valores[d.principal], p = d.prediccion ? I.predicciones.find(x => x.id === d.prediccion) : null, z = p ? (pr.v - p.valor) / pr.s : null;
    return `<li><span class="num">#${d.n}</span><span><span class="peq suave">${esc(descMed(d))} · ${d.coste} cr.</span><br><span class="mono">${esc(vu(pr.v, pr.s, pr.u))}</span>${p ? ` <span class="peq suave">predicción ${n(p.valor, 4)}</span> <span class="zchip ${zClase(z)}">${n(z, 1)}σ</span>` : ''}</span></li>` }).join('');
  $('p-instrumentos').innerHTML = msg() + (cerrado ? '<div class="aviso info">Investigación entregada: puedes consultar tus datos, pero no medir.</div>' : '') +
    (sug ? `<div class="tarjeta"><h2>Pruebas que tú mismo propusiste</h2><ul>${sug}</ul></div>` : '') +
    (ui.ultimo ? tarjetaResultado(I.mediciones.find(d => d.n === ui.ultimo)) : '') + panel +
    (cerrado ? '' : `<div class="tarjeta"><h2>Instrumentos</h2><div class="instrumentos">${lista}</div></div>`) +
    `<div class="tarjeta"><h2>Registro de mediciones</h2>${filas ? `<ul class="registro">${filas}</ul><p class="suave peq">σ junto a la predicción: diferencia entre medición y predicción en incertidumbres.</p>` : '<p class="suave">Aún no has medido nada.</p>'}</div>` +
    `<div class="tarjeta" id="tGraf"></div>`;
  pintaGrafica()
}
function pintaGrafica() {
  const el = $('tGraf'); if (!el) return; const I = inv(), { fm, fa } = INV.montajeActual(I), M = I.mediciones.filter(d => d.fm === fm && d.fa === fa);
  const mags = { x: { n: 'Posición x(t)', u: 'm' }, v: { n: 'Velocidad v(t)', u: 'm/s' }, a: { n: 'Aceleración a(t)', u: 'm/s²' }, F: { n: 'Fuerza F(t)', u: 'N' }, E: { n: 'Energía E(t)', u: 'J' } };
  const datos = {};
  for (const d of M) {
    const t = d.p.t, pr = d.prediccion ? I.predicciones.find(p => p.id === d.prediccion) : null;
    if (d.instr === 'serie') for (const q of d.extra.puntos) (datos.x = datos.x || { m: [], p: [] }).m.push({ t: q.t, v: q.x, s: d.extra.s });
    const key = { posicion: 'x', velocidad: 'v', aceleracion: 'a', fuerza: 'F', energia: 'E' }[d.instr]; if (!key) continue;
    const o = datos[key] = datos[key] || { m: [], p: [] }; o.m.push({ t, v: d.valores[d.principal].v, s: d.valores[d.principal].s }); if (pr) o.p.push({ t, v: pr.valor })
  }
  const ks = Object.keys(datos); if (!ks.length) { el.innerHTML = '<h2>Gráficas</h2><p class="suave">Las gráficas aparecen cuando mides posición, velocidad, aceleración, fuerza o energía en varios instantes.</p>'; return }
  if (!ks.includes(ui.graf)) ui.graf = ks[0];
  el.innerHTML = `<h2>Gráficas de tus datos</h2><div class="pestanitas">${ks.map(k => `<button class="btn chico" data-graf="${k}" aria-pressed="${k === ui.graf}">${mags[k].n}</button>`).join('')}</div><canvas class="grafica" id="lienzo"></canvas><p class="suave peq">Puntos: tus mediciones con ±1σ (montaje actual). Círculos huecos: tus predicciones.</p>`;
  dibujarGrafica($('lienzo'), [{ tipo: 'medida', puntos: datos[ui.graf].m }, { tipo: 'prediccion', puntos: datos[ui.graf].p }], { x: 't (s)', y: `${ui.graf} (${mags[ui.graf].u})` })
}
const leerParams = () => { const o = {}; document.querySelectorAll('[data-param]').forEach(i => { o[i.dataset.param] = i.value }); return o };
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.param && pantalla === 'instrumentos') { ui.params = { ...ui.params, ...leerParams() }; const c = $('costeSel'); if (c && ui.instr) c.textContent = INSTRUMENTOS[ui.instr].coste({ N: +ui.params.N || 1 }) } });
document.addEventListener('click', e => {
  if (pantalla !== 'instrumentos') return; const b = e.target.closest('button'); if (!b) return; const I = inv();
  if (b.dataset.instr) { ui.instr = b.dataset.instr; ui.ultimo = null; pInstr(); return }
  if (b.dataset.graf) { ui.graf = b.dataset.graf; pintaGrafica(); return }
  if (b.id === 'bSolicitar') { ui.params = { ...ui.params, ...leerParams() }; const r = INV.prepararMedicion(ses, I, ui.instr, ui.params); if (r.error) return aviso(r.error, 'mal'); guardar(); if (!r.requierePrediccion) return ejecutar(); pintar(); setTimeout(() => $('predValor') && $('predValor').focus(), 50); return }
  if (b.id === 'bConfirmarPred') { const v = $('predValor').value, j = $('predJust').value, r = INV.registrarPrediccion(ses, I, v, j); if (r.error) return aviso(r.error, 'mal');
    I.predicciones[I.predicciones.length - 1].escritura = medirEscritura('predJust', j); guardar(); pintar(); return }
  if (b.id === 'bEjecutar') return ejecutar();
  if (b.id === 'bCancelarMed') { INV.cancelarPendiente(I); guardar(); pintar(); return }
  if (b.dataset.repetir) { const d = I.mediciones.find(x => x.n === +b.dataset.repetir); const cur = INV.montajeActual(I); if (d.fm !== cur.fm || d.fa !== cur.fa) INV.cambiarMontaje(ses, I, d.fm, d.fa); const r = INV.prepararMedicion(ses, I, d.instr, d.p); if (r.error) return aviso(r.error, 'mal'); if (r.requierePrediccion) { guardar(); pintar(); return } return ejecutar() }
  if (b.dataset.revisar) { ui.revisar = ui.revisar === b.dataset.revisar ? null : b.dataset.revisar; pintar(); return }
  if (b.dataset.guardarrev) { const r = INV.revisarInterpretacion(I, b.dataset.guardarrev, $('txtRevision').value); if (r.error) return aviso(r.error, 'mal'); ui.revisar = null; guardar(); aviso('Revisión guardada (la interpretación original se conserva).', 'ok') }
});
function ejecutar() { const r = INV.ejecutarMedicion(ses, inv()); if (r.error) { guardar(); return aviso(r.error, 'mal') } ui.ultimo = r.medicion.n; guardar(); const q = INV.preguntaActual(ses, inv()); if (q) ui.mensaje = { txt: 'Hay una pregunta nueva en Investigación sobre lo que acabas de medir.', tipo: 'info' }; pintar() }

/* ---------------- 4. INVESTIGACIÓN ---------------- */
function pInv() {
  const I = inv(), q = I.conclusion ? null : INV.preguntaActual(ses, I);
  let card;
  if (ui.retro) {
    const r = ui.retro; card = `<div class="tarjeta"><h2>Tu respuesta quedó registrada</h2>${r.correcta === true ? '<div class="aviso ok">Coherente con tus datos.</div>' : r.correcta === false ? '<div class="aviso mal">Revisa este razonamiento.</div>' : r.correcta != null ? `<div class="aviso am">Parcialmente: ${Math.round(r.correcta * 100)} %.</div>` : '<div class="aviso info">La revisará tu profesor.</div>'}
      ${r.cat === 'calculo' && r.esperado != null && r.correcta === false ? `<p>Valor esperado con tus datos: <b class="mono">${n(r.esperado, 4)}</b></p>` : ''}${r.retro ? `<p>${esc(r.retro)}</p>` : ''}<p><button class="btn prim" id="bSeguir">Continuar</button></p></div>`
  } else if (q) {
    const op = q.opciones || [], tipoIn = q.tipo === 'multi' ? 'checkbox' : 'radio';
    card = `<div class="tarjeta"><p class="suave peq">${{ calculo: 'Cálculo', razonamiento: 'Razonamiento', reflexion: 'Reflexión' }[q.cat]}</p><p class="pregunta">${esc(q.texto)}</p>
      ${q.tipo === 'numero' ? `<div class="rejilla"><label class="campo"><span>Tu resultado${q.unidad ? ` (${esc(q.unidad)})` : ''}</span><input id="respNum" inputmode="decimal"></label></div>` : ''}
      ${op.length ? `<div class="opciones">${op.map(o => `<label><input type="${tipoIn}" name="resp" value="${esc(o.id)}"><span>${esc(o.txt)}</span></label>`).join('')}</div>` : ''}
      ${q.tipo === 'opcion+texto' ? '<label class="campo"><span>Explica tu elección</span><textarea id="respTxt" maxlength="1500"></textarea></label>' : ''}
      <p class="fila"><button class="btn prim" id="bResponder">Responder</button><button class="btn" id="bOmitir">Ahora no</button></p></div>`
  } else card = `<div class="tarjeta"><h2>Sin preguntas pendientes</h2><p class="suave">${I.conclusion ? 'Investigación entregada.' : 'Mide algo nuevo, revisa tus hipótesis o propón una conclusión en Informe: aparecerán preguntas según lo que hagas.'}</p></div>`;
  const hips = Object.entries(HIPOTESIS).map(([h, t]) => { const x = I.hipotesis[h]; return `<div class="hip"><div><b>${esc(t)}</b>${x.nota ? `<div class="suave peq">${esc(x.nota)}</div>` : ''}
      <details><summary class="peq">Cambiar valoración</summary><label class="campo"><span>Nota (por qué)</span><input data-hnota="${h}" maxlength="400"></label>
      ${I.mediciones.length ? `<div class="peq suave" style="margin-top:6px">Mediciones en que te apoyas:</div><div class="evid">${I.mediciones.map(d => `<label><input type="checkbox" data-hev="${h}" value="${d.n}">#${d.n}</label>`).join('')}</div>` : ''}
      <p><button class="btn chico" data-hguardar="${h}" ${I.conclusion ? 'disabled' : ''}>Guardar cambio</button></p></details></div>
      <select data-hestado="${h}" ${I.conclusion ? 'disabled' : ''}>${ESTADOS_H.map(s => `<option${s === x.estado ? ' selected' : ''}>${s}</option>`).join('')}</select></div>` }).join('');
  const hist = I.respuestas.slice().reverse().map(r => `<li><span class="suave peq">${esc(new Date(r.hora).toLocaleTimeString('es'))}</span> ${esc(r.pregunta)} → <b>${esc(r.respuesta.numero ?? (r.respuesta.opciones ? r.respuesta.opciones.map(o => (r.opciones || []).find(x => x.id === o)?.txt || o).join('; ') : (r.opciones || []).find(x => x.id === r.respuesta.opcion)?.txt || ''))}</b></li>`).join('');
  const cambios = I.histHip.slice().reverse().map(x => `<li>${esc(HIPOTESIS[x.h])}: ${esc(x.de)} → <b>${esc(x.a)}</b>${x.nota ? ' — ' + esc(x.nota) : ''} <span class="suave peq">(${esc(new Date(x.hora).toLocaleTimeString('es'))})</span></li>`).join('');
  $('p-investigacion').innerHTML = msg() + card + `<div class="tarjeta"><h2>Tus hipótesis</h2><p class="suave peq">Valóralas según tu evidencia. Cada cambio queda registrado con su fecha.</p>${hips}${cambios ? `<details><summary class="peq">Historial de cambios (${I.histHip.length})</summary><ul>${cambios}</ul></details>` : ''}</div>` +
    (hist ? `<div class="tarjeta"><details><summary><b>Preguntas respondidas (${I.respuestas.length})</b></summary><ul>${hist}</ul></details></div>` : '')
}
document.addEventListener('click', e => {
  if (pantalla !== 'investigacion') return; const b = e.target.closest('button'); if (!b) return; const I = inv();
  if (b.id === 'bSeguir') { ui.retro = null; pintar(); return }
  if (b.id === 'bResponder') {
    const q = INV.preguntaActual(ses, I); if (!q) return; const sel = [...document.querySelectorAll('input[name="resp"]:checked')].map(i => i.value);
    const r = INV.responder(ses, I, q, { numero: $('respNum') ? $('respNum').value : undefined, opcion: sel[0], opciones: q.tipo === 'multi' ? sel : undefined, texto: $('respTxt') ? $('respTxt').value : undefined });
    if (r.error) return aviso(r.error, 'mal');
    I.respuestas[I.respuestas.length - 1].escritura = $('respTxt') ? medirEscritura('respTxt', $('respTxt').value) : medirEscritura('respNum', $('respNum') ? $('respNum').value : '');
    ui.retro = r; guardar(); pintar(); return
  }
  if (b.id === 'bOmitir') { const q = INV.preguntaActual(ses, I); if (q) INV.omitirPregunta(I, q); guardar(); pintar(); return }
  if (b.dataset.hguardar) { const h = b.dataset.hguardar, est = document.querySelector(`[data-hestado="${h}"]`).value, nota = document.querySelector(`[data-hnota="${h}"]`).value, ev = [...document.querySelectorAll(`[data-hev="${h}"]:checked`)].map(i => +i.value);
    const r = INV.valorarHipotesis(I, h, est, nota, ev, 'decisión del estudiante'); if (r.error) return aviso(r.error, 'mal'); guardar(); aviso('Valoración guardada.', 'ok') }
});
document.addEventListener('change', e => { if (pantalla === 'investigacion' && e.target.dataset && e.target.dataset.hestado) { const d = e.target.closest('.hip').querySelector('details'); if (d) d.open = true } });

/* ---------------- 5. INFORME ---------------- */
function pInforme() {
  const I = inv(), E = calcularEvidencia(I, exp()), C = I.conclusion;
  const hechas = [['periodo', 'Mediste el período'], ['energiaTiempo', 'Comparaste la energía (o la amplitud) en instantes muy separados'], ['amplitud', 'Cambiaste la amplitud y mediste el período'], ['masa', 'Cambiaste la masa y mediste el período'], ['posicionFuerza', 'Comparaste a/x en dos posiciones'], ['repeticiones', 'Repetiste una medición al menos 3 veces']].filter(([k]) => E.familias[k]).map(([, t]) => `<li>${t}</li>`).join('');
  const resumen = `<div class="tarjeta"><h2>Tu investigación hasta ahora</h2><dl class="param"><dt>Créditos usados</dt><dd>${CREDITOS - I.creditos} de ${CREDITOS}</dd><dt>Mediciones</dt><dd>${I.mediciones.length}</dd><dt>Predicciones</dt><dd>${I.predicciones.length}</dd><dt>Preguntas respondidas</dt><dd>${I.respuestas.length}</dd><dt>Cambios de hipótesis</dt><dd>${I.histHip.length}</dd></dl>${hechas ? `<h3>Pruebas que has hecho</h3><ul>${hechas}</ul>` : ''}</div>`;
  if (!C) {
    const opc = ['compatible', 'incompatible', 'insuficiente'].map(t => `<label><input type="radio" name="concl" value="${t}"${I.borrador && I.borrador.tipo === t ? ' checked' : ''}><span><b>${NOMBRE_CONCLUSION[t]}</b></span></label>`).join('');
    const meds = I.mediciones.map(d => `<label><input type="checkbox" data-cev value="${d.n}">#${d.n} ${esc(INSTRUMENTOS[d.instr].nombre)}</label>`).join('');
    $('p-informe').innerHTML = msg() + resumen + `<div class="tarjeta"><h2>Conclusión</h2><p class="suave peq">Primero propón una conclusión: aparecerá una pregunta de desafío en Investigación. Puedes cambiarla hasta entregar. Siempre puedes declarar que la evidencia es insuficiente.</p>
      <div class="opciones">${opc}</div><p><button class="btn" id="bProponer">Proponer esta conclusión</button>${I.borrador ? ` <span class="suave peq">Propuesta actual: ${esc(NOMBRE_CONCLUSION[I.borrador.tipo])}</span>` : ''}</p>
      ${I.borrador ? `<h3>Entrega final</h3><div class="peq suave">Mediciones que sostienen tu conclusión:</div><div class="evid">${meds || '<span class="suave">ninguna</span>'}</div>
      <div class="rejilla" style="margin-top:8px"><label class="campo"><span>Significación de tu evidencia principal, z (opcional)</span><input id="cz" inputmode="decimal" placeholder="p. ej. 4,2"></label></div>
      <div class="peq suave" style="margin-top:8px">Limitaciones que reconoces:</div><div class="evid">${Object.entries(LIMITACIONES).map(([k, t]) => `<label><input type="checkbox" data-clim value="${k}">${esc(t)}</label>`).join('')}</div>
      <label class="campo" style="margin-top:8px"><span>Justificación (qué mediste, qué esperabas, qué observaste y con qué significación)</span><textarea id="cjust" maxlength="3000" style="min-height:140px"></textarea></label>
      <p><button class="btn prim" id="bEntregar">Entregar (definitivo)</button></p>` : ''}</div>`;
    return
  }
  const ev = evaluar(ses, I), cats = [['predicciones', 'Calidad de las predicciones'], ['seleccion', 'Selección de experimentos'], ['calculos', 'Cálculos y comparaciones'], ['razonamiento', 'Razonamiento e hipótesis'], ['conclusion', 'Conclusión e incertidumbre']];
  $('p-informe').innerHTML = msg() + `<div class="tarjeta"><h2>Conclusión entregada</h2><p><b>${esc(NOMBRE_CONCLUSION[C.tipo])}</b> · ${esc(new Date(C.hora).toLocaleString('es'))}</p><p>${esc(C.justificacion)}</p></div>` + resumen +
    `<div class="tarjeta"><h2>Calificación provisional</h2><p class="nota">${ev.total}<span class="suave" style="font-size:18px"> / 100</span></p><div class="cats">${cats.map(([k, t]) => `<div>${t}</div><div>${ev.categorias[k]} / 20</div>`).join('')}</div>
      <p class="suave peq">Automática y provisional: tu profesor revisará ${ev.pendienteDocente.length} textos razonados. La nota no interpreta el contenido de lo que escribiste.</p></div>
    ${tarjetaEnvio(I)}
    <div class="tarjeta"><h2>Descargar</h2><p class="fila"><button class="btn${envioActivo() ? '' : ' prim'}" id="bHtml">Descargar informe (HTML)</button><button class="btn" id="bJson">Descargar datos (JSON)</button></p><p class="suave peq">${envioActivo() ? 'Guarda una copia para ti. Si el envío falla, entrega estos dos archivos a tu profesor.' : 'Entrega los dos archivos a tu profesor. El JSON permite reproducir exactamente tu investigación.'}</p></div>`
}
function tarjetaEnvio(I) {
  if (!envioActivo()) return '';
  const env = (I.envios || []).map(x => `<li>Recibo <b class="mono">${esc(x.recibo)}</b> · ${esc(new Date(x.hora).toLocaleString('es'))}${x.codigo ? ' · clase ' + esc(x.codigo) : ''}</li>`).join('');
  return `<div class="tarjeta"><h2>Enviar al profesor</h2>${env ? `<div class="aviso ok">Enviado. Guarda tu recibo:<ul>${env}</ul></div>` : '<p>Envía tu investigación directamente a tu profesor. Se envía tu nombre o alias, tu identificador y todo tu registro (mediciones, predicciones, respuestas y conclusión).</p>'}
    ${CONFIG.pedirCodigoClase ? `<label class="campo" style="max-width:260px"><span>Código de clase</span><input id="codClase" autocapitalize="characters" spellcheck="false" maxlength="30" value="${esc(ses.codigoClase || '')}"></label>` : ''}
    <p><button class="btn prim" id="bEnviar">${env ? 'Volver a enviar' : 'Enviar al profesor'}</button></p></div>`
}
document.addEventListener('click', e => {
  if (pantalla !== 'informe') return; const b = e.target.closest('button'); if (!b) return; const I = inv();
  if (b.id === 'bProponer') { const t = document.querySelector('input[name="concl"]:checked'); if (!t) return aviso('Elige una de las tres conclusiones.', 'mal'); INV.proponerConclusion(I, t.value); guardar(); const q = INV.preguntaActual(ses, I); ui.mensaje = q ? { txt: 'Tienes una pregunta de desafío en Investigación sobre tu conclusión.', tipo: 'info' } : null; pintar(); return }
  if (b.id === 'bEntregar') {
    const t = document.querySelector('input[name="concl"]:checked'); if (!t) return aviso('Elige una conclusión.', 'mal');
    if (!confirmar('La entrega es definitiva: ya no podrás medir ni cambiar respuestas. ¿Entregar?')) return;
    const r = INV.entregarConclusion(I, { tipo: t.value, evidencias: [...document.querySelectorAll('[data-cev]:checked')].map(i => +i.value), z: $('cz').value, limitaciones: [...document.querySelectorAll('[data-clim]:checked')].map(i => i.value), justificacion: $('cjust').value });
    if (r.error) return aviso(r.error, 'mal'); I.conclusion.escritura = medirEscritura('cjust', $('cjust').value); guardar(); pintar(); return
  }
  if (b.id === 'bEnviar') {
    const cod = $('codClase') ? $('codClase').value : ''; b.disabled = true; b.textContent = 'Enviando…';
    enviarAlProfesor(ses, I.letra, cod).then(r => { if (cod) ses.codigoClase = cod.trim().toUpperCase(); guardar(); if (r.error) aviso(r.error, 'mal'); else aviso(`Enviado. Tu recibo es ${r.recibo}.`, 'ok') });
    return
  }
  const base = `informe-${ses.id}-${I.letra}`;
  if (b.id === 'bHtml') descargar(base + '.html', informeHTML(ses, I.letra), 'text/html');
  if (b.id === 'bJson') descargar(base + '.json', JSON.stringify(informeJSON(ses, I.letra), null, 1), 'application/json')
});

{ const h = location.hash.slice(1); if (inv() && ['laboratorio', 'instrumentos', 'investigacion', 'informe'].includes(h)) pantalla = h }
pintar();
