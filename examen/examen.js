// EXAMEN VIRTUAL (prototipo sin servidor). Flujo: entrada (nombre, matrícula, código) → reglas → examen con reloj → entrega.
// Integridad:
//   · salir de la app (otra app, pestaña, pérdida de foco) se mide; < toleranciaS solo avisa, más largo BLOQUEA el examen
//     hasta que el profesor dé una clave de 4 cifras (válida solo para ese estudiante y ese bloqueo);
//   · recargar o cerrar y volver a abrir la app también bloquea; el reloj nunca se detiene;
//   · el botón «atrás» no sale del examen; pantalla completa y pantalla siempre encendida; aviso con vibración al salir;
//   · permiso para salir: el profesor da una clave y esa salida queda marcada como autorizada (con su duración).
// En la versión real, la hora y las claves las pone el servidor (Apps Script); aquí todo vive en este navegador.
import { EXAMEN as C } from './config.js';
import { generarExamen, corregir, fmt } from './banco.js';
import { clave, codigoNuevo, normalizar } from './claves.js';
import { CIENTIFICO_SVG } from '../js/cientifico.js';

const ALMACEN = 'examen-prototipo-v1';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (t = Date.now()) => new Date(t).toISOString();
const hora = t => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const seg1 = ms => Math.round(ms / 100) / 10;
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` };
const sN = x => String(x).replace('.', ',');

let E = cargar(), P = E ? generarExamen(E.examen, E.matricula, C) : [];
function cargar() { try { return JSON.parse(localStorage.getItem(ALMACEN) || 'null') } catch (e) { return null } }
function guardar() { try { localStorage.setItem(ALMACEN, JSON.stringify(E)) } catch (e) { } }
const activo = () => !!(E && E.inicio && !E.entregado);
const permisoVigente = () => !!(E && E.permiso && E.permiso.concedido && Date.now() - E.permiso.concedido < C.permisoMin * 60000);

const toast = t => { let el = $('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el) } el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true }, 5000) };

/* ---------------- pantallas ---------------- */
function pintar() {
  $('pie').textContent = ['Examen virtual (prototipo)', C.profesor, C.titulo].filter(Boolean).join(' · ');
  $('cabAlumno').hidden = !E; if (E) $('cabAlumno').textContent = `${E.nombre} · ${E.matricula}`;
  $('reloj').hidden = !activo();
  if (!E) return pintarEntrada();
  if (E.entregado) return pintarEntregado();
  if (!E.inicio) return pintarReglas();
  pintarExamen(); pintarBloqueo()
}

const DEMO = `<div class="demo"><b>Prototipo de demostración.</b> Código del examen: <b class="mono">${esc(C.codigo)}</b>. Las claves del profesor se obtienen en <a href="docente.html" target="_blank" rel="noopener">el panel del profesor</a>.</div>`;

function pintarEntrada(err = '') {
  $('vista').innerHTML = `${DEMO}<div class="tarjeta"><h1>${esc(C.titulo)}</h1><p class="suave">Prof. ${esc(C.profesor)} · ${C.minutos} minutos</p>
    <label class="campo">Nombre y apellidos<input id="eNombre" autocomplete="name" maxlength="80"></label>
    <label class="campo">Matrícula<input id="eMatricula" autocomplete="off" maxlength="30" autocapitalize="characters"></label>
    <label class="campo">Código del examen (te lo da el profesor)<input id="eCodigo" autocomplete="off" maxlength="20" autocapitalize="characters"></label>
    ${err ? `<p class="error" role="alert">${esc(err)}</p>` : ''}
    <button type="button" class="btn prim" id="bEntrar">Entrar</button></div>`
}

function pintarReglas() {
  $('vista').innerHTML = `<div class="tarjeta"><h1>Antes de empezar</h1>
    <p>Hola, <b>${esc(E.nombre)}</b>. Tu examen tiene <b>${P.length} problemas</b> y dura <b>${C.minutos} minutos</b>. Tus números son distintos a los de tus compañeros.</p>
    <ul>
      <li><b>No salgas de la app.</b> Si sales, el examen se <b>bloquea</b> y solo tu profesor puede desbloquearlo con una clave. Él verá cuántos segundos estuviste fuera.</li>
      <li>Recargar la página o cerrarla también bloquea el examen.</li>
      <li><b>El reloj no se detiene</b>, ni siquiera mientras el examen está bloqueado.</li>
      <li>Si necesitas salir (una urgencia), pulsa <b>«Pedir permiso para salir»</b> y espera la clave del profesor.</li>
      <li>Pegar texto está desactivado. Calcula en tu hoja; aquí solo escribes el resultado.</li>
      <li>Al empezar, la app pasa a <b>pantalla completa</b> y te pedirá permiso para mostrar <b>avisos</b>: acéptalo, así el móvil vibrará si sales sin querer.</li>
    </ul>
    <button type="button" class="btn prim" id="bComenzar">Comenzar el examen</button></div>`
}

function pintarExamen() {
  const i = E.actual, p = P[i], r = E.respuestas[i];
  const nums = P.map((_, k) => `<button type="button" data-ir="${k}" class="${respondida(k) ? 'hecho' : ''}" aria-current="${k === i}" aria-label="Problema ${k + 1}">${k + 1}</button>`).join('');
  const campo = p.tipo === 'opcion'
    ? `<div class="opciones" role="radiogroup">${p.opciones.map((o, k) => `<label><input type="radio" name="op" value="${k}" ${r != null && +r === k ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`
    : `<label class="resp"><input id="resp" inputmode="decimal" autocomplete="off" value="${esc(r ?? '')}" aria-label="Resultado"><span class="mono">${esc(p.unidad)}</span></label><p class="suave peq">Escribe solo el número (usa coma o punto decimal). g = 9,8 m/s².</p>`;
  $('vista').innerHTML = `${permisoVigente() ? `<div class="permiso">✅ Permiso para salir concedido: una salida, hasta las ${hora(E.permiso.concedido + C.permisoMin * 60000).slice(0, 5)}. Al volver no se bloqueará (queda anotada).</div>` : ''}
    <nav class="nums" aria-label="Problemas">${nums}</nav>
    <div class="tarjeta"><p class="suave peq">Problema ${i + 1} de ${P.length} · ${esc(p.tema)}</p><p class="enun">${esc(p.enunciado)}</p>${campo}</div>
    <div class="entre"><button type="button" class="btn" id="bAnterior" ${i === 0 ? 'disabled' : ''}>← Anterior</button><button type="button" class="btn prim" id="bSiguiente" ${i === P.length - 1 ? 'disabled' : ''}>Siguiente →</button></div>
    <div class="tarjeta" style="margin-top:14px"><div class="entre"><button type="button" class="btn" id="bPermiso">Pedir permiso para salir</button><button type="button" class="btn peligro" id="bEntregar">Entregar examen</button></div></div>`;
  tick()
}
const respondida = k => E.respuestas[k] != null && String(E.respuestas[k]).trim() !== '';

function pintarEntregado() {
  const cor = corregir(P, E.respuestas, C), bien = cor.filter(x => x.ok).length;
  const filas = cor.map((x, k) => `<tr><td>${k + 1}</td><td>${esc(P[k].tema)}</td><td>${esc(x.dada || '—')}</td><td>${esc(x.correcta)}</td><td class="${x.ok ? 'bien' : 'mal'}">${x.ok ? '✓' : '✗'}</td></tr>`).join('');
  const sal = E.salidas.map(s => `<tr><td>${hora(Date.parse(s.hora))}</td><td>${sN(s.segundos)} s</td><td>${esc(s.resultado)}</td><td>${s.problema ? 'problema ' + s.problema : ''} · ${esc(s.motivo)}${s.desbloqueo ? ` · desbloqueado ${hora(Date.parse(s.desbloqueo))}` : ''}</td></tr>`).join('');
  $('vista').innerHTML = `<div class="tarjeta"><h1>Examen entregado</h1><p>${esc(E.nombre)} · <span class="mono">${esc(E.matricula)}</span> · ${hora(Date.parse(E.entregado.hora))} (${esc(E.entregado.motivo)})</p>
    <p class="suave">Tu profesor revisará el examen y te dará la nota.</p></div>
    <div class="tarjeta"><h2>Vista del profesor <span class="suave peq">(solo en el prototipo)</span></h2>
    <p class="nota">${bien} / ${P.length}</p>
    <table class="tabla"><thead><tr><th>#</th><th>Tema</th><th>Respuesta</th><th>Correcta</th><th></th></tr></thead><tbody>${filas}</tbody></table>
    <h3>Registro de integridad</h3>
    ${E.salidas.length ? `<table class="tabla"><thead><tr><th>Hora</th><th>Fuera</th><th>Resultado</th><th>Detalle</th></tr></thead><tbody>${sal}</tbody></table>` : '<p>Ninguna salida de la app.</p>'}
    <p class="suave peq">Botón «atrás»: ${E.atras || 0} · intentos de pegar: ${E.pegados || 0} · claves incorrectas: ${E.fallos || 0}${(E.eventos || []).length ? ' · ' + E.eventos.map(x => esc(x.tipo)).join(', ') : ''}</p>
    <button type="button" class="btn" id="bReiniciar">Empezar otra vez (demostración)</button></div>`
}

/* ventana del bloqueo: tapa el examen entero; solo se quita con la clave del profesor */
function pintarBloqueo() {
  let el = $('bloqueo'); const b = E && E.bloqueo && activo() ? E.bloqueo : null;
  if (!b) { if (el) el.hidden = true; return }
  if (!el) { el = document.createElement('div'); el.id = 'bloqueo'; el.className = 'emergente total'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tBloqueo'); document.body.appendChild(el) }
  el.hidden = false;
  el.innerHTML = `<div class="emergente-caja">${CIENTIFICO_SVG}<h2 id="tBloqueo">🔒 Examen bloqueado</h2>
    <p>Has salido de la app durante <b>${sN(b.segundos)} segundos</b> (salida n.º ${b.n}${b.recarga ? ', recargaste o cerraste la app' : ''}). <b>No puedes continuar hasta que tu profesor te dé una clave.</b> Levanta la mano y enséñale esta pantalla.</p>
    <div class="datos"><b>Estudiante</b><span>${esc(E.nombre)}</span><b>Matrícula</b><span class="mono">${esc(E.matricula)}</span><b>Salió a las</b><span>${hora(Date.parse(b.desde))}</span><b>Tiempo restante</b><span class="mono" id="relojBloqueo"></span></div>
    <p class="suave peq" style="text-align:center;margin:0">Código de bloqueo</p><div class="codigo" id="codBloqueo">${esc(b.codigo)}</div>
    <input class="clave-in" id="claveDesb" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····" aria-label="Clave del profesor">
    <p class="error" id="errDesb" role="alert"></p>
    <button type="button" class="btn prim" id="bDesbloquear">Desbloquear</button>
    <p class="suave peq">El reloj sigue corriendo. Cada clave sirve solo para ti y para este bloqueo.</p></div>`;
  tick()
}

/* ventana genérica (atrás, permiso, entregar) */
function modal(html) {
  let el = $('modal');
  if (!el) { el = document.createElement('div'); el.id = 'modal'; el.className = 'emergente'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el) }
  el.innerHTML = `<div class="emergente-caja">${html}</div>`; el.hidden = !html
}
const cerrarModal = () => { if ($('modal')) $('modal').hidden = true };

function modalPermiso() {
  if (!E.permiso || E.permiso.concedido) E.permiso = { codigo: codigoNuevo(), pedido: iso() }; guardar();
  modal(`<h2>Pedir permiso para salir</h2><p>Enseña este código a tu profesor. Si te autoriza, te dará una clave: podrás salir <b>una vez</b> (en los próximos ${C.permisoMin} minutos) y al volver no se bloqueará. La salida y su duración quedan anotadas.</p>
    <p class="suave peq" style="text-align:center;margin:0">Código de solicitud</p><div class="codigo" id="codPermiso">${esc(E.permiso.codigo)}</div>
    <input class="clave-in" id="clavePermiso" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="····" aria-label="Clave de permiso">
    <p class="error" id="errPermiso" role="alert"></p>
    <p><button type="button" class="btn prim" id="bConfirmarPermiso">Confirmar permiso</button></p><p><button type="button" class="btn" id="bCerrarModal">Cancelar</button></p>`)
}

/* ---------------- salidas de la app ---------------- */
function empiezaSalida(motivo) {
  if (!activo() || E.fuera) return;
  E.fuera = { inicio: Date.now(), motivo, problema: E.actual + 1, autorizada: permisoVigente() }; guardar()
}
function terminaSalida(recarga = false) {
  if (!E || !E.fuera) return;
  const s = E.fuera; E.fuera = null;
  const segundos = seg1(Date.now() - s.inicio);
  if (segundos < 1 && !recarga) { guardar(); return }       // parpadeos del sistema
  const r = { hora: iso(s.inicio), segundos, motivo: s.motivo + (recarga ? ' · recargó o volvió a abrir la app' : ''), problema: s.problema };
  if (s.autorizada) { r.resultado = 'autorizada'; r.permiso = E.permiso && E.permiso.codigo; E.permiso = null; toast(`Salida autorizada: ${sN(segundos)} s fuera. Queda anotada.`) }
  else if (E.bloqueo) r.resultado = 'salió estando bloqueado';
  else if (segundos < C.toleranciaS && !recarga) { r.resultado = 'aviso'; toast(`Has salido ${sN(segundos)} s. Queda registrado: si vuelve a pasar, el examen se bloqueará.`) }
  else { r.resultado = 'bloqueo'; E.bloqueo = { codigo: codigoNuevo(), desde: r.hora, segundos, n: E.salidas.length + 1, recarga, salida: E.salidas.length } }
  E.salidas.push(r); guardar();
  if (activo()) { pintar(); if (E.bloqueo) $('claveDesb') && $('claveDesb').focus() }
}

// aviso del sistema (vibración) al salir: solo al ocultarse la app (no al bajar un momento la barra de notificaciones)
function avisarFuera() {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
  navigator.serviceWorker.getRegistration().then(r => r && r.showNotification('⚠️ Has salido del examen', { body: 'Vuelve ya. Tu examen se bloqueará y tu profesor verá cuánto tiempo estuviste fuera.', tag: 'examen-fuera', renotify: true, requireInteraction: true, vibrate: [400, 150, 400, 150, 400] })).catch(() => { })
}
function quitarAvisos() { if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: 'examen-fuera' }).then(ns => ns.forEach(n => n.close()))).catch(() => { }) }

let bloqueoPantalla = null;
async function pantallaEncendida() { try { if (activo() && 'wakeLock' in navigator && document.visibilityState === 'visible') bloqueoPantalla = await navigator.wakeLock.request('screen') } catch (e) { } }
function pantallaCompleta() { try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => { }) } catch (e) { } }
const trampaAtras = () => { try { history.pushState({ examen: 1 }, '') } catch (e) { } };

document.addEventListener('visibilitychange', () => {
  ref = null;
  if (document.visibilityState === 'hidden') { empiezaSalida('app oculta (otra app, pestaña o pantalla apagada)'); if (activo()) avisarFuera() }
  else { terminaSalida(); quitarAvisos(); pantallaEncendida() }
});
window.addEventListener('blur', () => empiezaSalida('la ventana perdió el foco'));
window.addEventListener('focus', () => terminaSalida());
window.addEventListener('pagehide', () => empiezaSalida('cerró o recargó la página'));
window.addEventListener('pageshow', e => { if (e.persisted) terminaSalida(true) });   // volvió desde la caché del navegador
window.addEventListener('popstate', () => {
  if (!activo()) return; trampaAtras(); E.atras = (E.atras || 0) + 1; guardar();
  modal(`<h2>No puedes salir con «atrás»</h2><p>Durante el examen el botón «atrás» no sale de la app (queda anotado). Si necesitas salir, usa <b>«Pedir permiso para salir»</b>.</p><p><button type="button" class="btn prim" id="bCerrarModal">Seguir con el examen</button></p>`)
});
// pegar y arrastrar texto: bloqueado
for (const t of ['paste', 'drop']) document.addEventListener(t, e => { if (!activo()) return; e.preventDefault(); E.pegados = (E.pegados || 0) + 1; guardar(); toast('En el examen no se puede pegar texto.') }, true);

/* ---------------- reloj ---------------- */
// Si el reloj del dispositivo salta (lo cambian a mano), se corrige con el reloj monótono del navegador y se anota.
let ref = null, ultimoLatido = 0;
function tick() {
  if (!activo()) return;
  const d = Date.now(), p = performance.now();
  if (ref && document.visibilityState === 'visible') {
    const salto = (d - ref.d) - (p - ref.p);
    if (Math.abs(salto) > 5000) { E.inicio += salto; E.fin += salto; if (E.fuera) E.fuera.inicio += salto; (E.eventos = E.eventos || []).push({ hora: iso(d), tipo: `cambio de hora del dispositivo (${Math.round(salto / 1000)} s)` }); guardar() }
  }
  ref = { d, p };
  const resta = E.fin - d;
  if (resta <= 0) return entregar('tiempo agotado');
  const txt = mmss(resta), poco = resta < 5 * 60000;
  $('reloj').textContent = '⏱ ' + txt; $('reloj').classList.toggle('poco', poco);
  if ($('relojBloqueo')) $('relojBloqueo').textContent = txt;
  if (d - ultimoLatido > 2000 && !E.fuera) { ultimoLatido = d; E.latido = d; guardar() }
}
setInterval(tick, 250);

function entregar(motivo) {
  if (!activo()) return;
  if (E.fuera) terminaSalida();
  E.entregado = { hora: iso(), motivo }; E.bloqueo = null; E.fuera = null; guardar();
  try { if (document.fullscreenElement) document.exitFullscreen().catch(() => { }) } catch (e) { }
  try { if (bloqueoPantalla) bloqueoPantalla.release() } catch (e) { }
  cerrarModal(); pintarBloqueo(); pintar(); window.scrollTo({ top: 0 })
}

/* ---------------- acciones ---------------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'bEntrar') {
    const nombre = $('eNombre').value.trim().replace(/\s+/g, ' '), matricula = normalizar($('eMatricula').value), codigo = normalizar($('eCodigo').value);
    if (nombre.length < 3) return pintarEntrada('Escribe tu nombre completo.');
    if (matricula.length < 3) return pintarEntrada('Escribe tu matrícula.');
    if (codigo !== normalizar(C.codigo)) return pintarEntrada('El código del examen no es correcto. Pídeselo a tu profesor.');
    E = { v: 1, examen: codigo, nombre, matricula, creado: iso(), respuestas: {}, actual: 0, salidas: [] }; P = generarExamen(E.examen, E.matricula, C);
    guardar(); return pintar()
  }
  if (b.id === 'bComenzar') {
    pantallaCompleta();
    try { if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission() } catch (x) { }
    try { if (navigator.serviceWorker) navigator.serviceWorker.register('sw.js').catch(() => { }) } catch (x) { }
    E.inicio = Date.now(); E.fin = E.inicio + C.minutos * 60000; E.fuera = null; guardar();
    trampaAtras(); pantallaEncendida(); return pintar()
  }
  if (b.dataset.ir != null) { E.actual = +b.dataset.ir; guardar(); return pintarExamen() }
  if (b.id === 'bAnterior' && E.actual > 0) { E.actual--; guardar(); return pintarExamen() }
  if (b.id === 'bSiguiente' && E.actual < P.length - 1) { E.actual++; guardar(); return pintarExamen() }
  if (b.id === 'bPermiso') return modalPermiso();
  if (b.id === 'bCerrarModal') return cerrarModal();
  if (b.id === 'bEntregar') {
    const faltan = P.filter((_, k) => !respondida(k)).length;
    return modal(`<h2>¿Entregar el examen?</h2><p>${faltan ? `Te faltan <b>${faltan}</b> problema${faltan > 1 ? 's' : ''} sin responder.` : 'Has respondido todos los problemas.'} Después de entregar no podrás cambiar nada.</p><p><button type="button" class="btn peligro" id="bConfirmarEntrega">Sí, entregar</button></p><p><button type="button" class="btn" id="bCerrarModal">Seguir revisando</button></p>`)
  }
  if (b.id === 'bConfirmarEntrega') return entregar('entregado por el estudiante');
  if (b.id === 'bDesbloquear') return desbloquear();
  if (b.id === 'bConfirmarPermiso') return confirmarPermiso();
  if (b.id === 'bReiniciar') { localStorage.removeItem(ALMACEN); E = null; P = []; cerrarModal(); return pintar() }
});
document.addEventListener('input', e => {
  if (!activo()) return;
  if (e.target.id === 'resp') { E.respuestas[E.actual] = e.target.value; guardar(); marcar() }
  if (e.target.name === 'op') { E.respuestas[E.actual] = +e.target.value; guardar(); marcar() }
});
const marcar = () => { const n = document.querySelector(`.nums [data-ir="${E.actual}"]`); if (n) n.classList.toggle('hecho', respondida(E.actual)) };
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'claveDesb') desbloquear(); if (e.key === 'Enter' && e.target.id === 'clavePermiso') confirmarPermiso() });

// claves incorrectas: se anotan, y desde la 3.ª hay que esperar (no se puede probar las 10 000 combinaciones)
function esperaRestante() { return Math.max(0, (E.esperaHasta || 0) - Date.now()) }
function fallo(idErr) { E.fallos = (E.fallos || 0) + 1; if (E.fallos >= 3) E.esperaHasta = Date.now() + 30000 * (E.fallos - 2); guardar(); $(idErr).textContent = 'Clave incorrecta.' + (E.fallos >= 3 ? ` Espera ${Math.round(esperaRestante() / 1000)} s para volver a intentarlo.` : '') }
async function desbloquear() {
  if (!E || !E.bloqueo) return;
  if (esperaRestante()) return void ($('errDesb').textContent = `Espera ${Math.ceil(esperaRestante() / 1000)} s para volver a intentarlo.`);
  const v = $('claveDesb').value.trim();
  if (v !== await clave('D', E.examen, E.matricula, E.bloqueo.codigo)) return fallo('errDesb');
  const s = E.salidas[E.bloqueo.salida]; if (s) s.desbloqueo = iso();
  E.bloqueo = null; guardar(); pantallaCompleta(); pintar(); toast('Examen desbloqueado. El tiempo que estuviste bloqueado no se recupera.')
}
async function confirmarPermiso() {
  if (!E || !E.permiso) return;
  if (esperaRestante()) return void ($('errPermiso').textContent = `Espera ${Math.ceil(esperaRestante() / 1000)} s para volver a intentarlo.`);
  if ($('clavePermiso').value.trim() !== await clave('P', E.examen, E.matricula, E.permiso.codigo)) return fallo('errPermiso');
  E.permiso.concedido = Date.now(); guardar(); cerrarModal(); pintar(); toast('Permiso concedido: puedes salir una vez.')
}

/* ---------------- arranque ---------------- */
// abrir la app con un examen en curso = la recargó o la cerró y volvió: siempre bloquea (salvo permiso vigente)
if (activo()) {
  if (!E.fuera) E.fuera = { inicio: E.latido || Date.now(), motivo: 'la app se cerró', problema: E.actual + 1, autorizada: permisoVigente() };
  terminaSalida(true); trampaAtras(); pantallaEncendida()
}
pintar();
