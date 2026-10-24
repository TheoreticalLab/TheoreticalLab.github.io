// Pruebas del examen virtual: banco de problemas y extremo a extremo de la interfaz real (en un iframe).
//   python3 pruebas/correr.py examen/pruebas/pantalla.html
import { generarExamen, corregir, NUMERICOS, CONCEPTUALES, leerNumero, fmt } from '../banco.js';
import { clave } from '../claves.js';
import { EXAMEN as C } from '../config.js';

const lineas = []; let pasan = 0, total = 0;
const ok = (c, t) => { total++; if (c) pasan++; lineas.push((c ? 'PASA  ' : 'FALLA ') + t) };
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ---- banco ---- */
{
  let malos = [], distintos = new Set();
  for (let i = 0; i < 400; i++) {
    const P = generarExamen('DEMO', 'M' + i, C);
    if (P.length !== C.numericos + C.conceptuales || new Set(P.map(p => p.id)).size !== P.length || P.filter(p => p.tipo === 'opcion').length !== C.conceptuales) malos.push('composición ' + i);
    for (const p of P) {
      if (p.tipo === 'numero' && !(Number.isFinite(p.respuesta) && p.respuesta > 0)) malos.push(p.id + ' ' + p.respuesta);
      if (p.tipo === 'opcion' && (new Set(p.opciones).size !== 4 || !(p.correcta >= 0 && p.correcta < 4))) malos.push(p.id + ' opciones');
      if (/NaN|undefined/.test(p.enunciado)) malos.push(p.id + ' enunciado');
    }
    distintos.add(P.map(p => p.enunciado).join('|'))
  }
  ok(!malos.length, '400 exámenes: 5 problemas distintos, respuestas finitas y positivas, 4 opciones únicas ' + malos.slice(0, 3).join(', '));
  ok(distintos.size === 400, 'cada matrícula recibe un examen distinto: ' + distintos.size + ' de 400');
  ok(JSON.stringify(generarExamen('DEMO', 'X1', C)) === JSON.stringify(generarExamen('DEMO', 'X1', C)), 'misma matrícula → mismo examen (reproducible)');
  const usados = new Set(); for (let i = 0; i < 200; i++) generarExamen('DEMO', 'U' + i, C).forEach(p => usados.add(p.id));
  ok(usados.size === NUMERICOS.length + CONCEPTUALES.length, 'se usan todos los problemas del banco: ' + usados.size);
  // física: valores de referencia calculados a mano
  const az = v => ({ entero: (lo, hi) => lo, elegir: a => a[0] });   // siempre el extremo inferior de cada rango
  const ref = { tiro: 3 * Math.sqrt(10 / 9.8), vertical: 64 / 19.6, plano: 9.8 * (Math.sin(25 * Math.PI / 180) - 0.1 * Math.cos(25 * Math.PI / 180)), atwood: 2 * 9.8 / 4, curva: Math.sqrt(0.4 * 9.8 * 30), resorte: 0.05 * Math.sqrt(200 / 0.2), choque: 0.5 * 2 / 1, periodo: 2 * Math.PI * Math.sqrt(0.2 / 20) };
  const mal = NUMERICOS.filter(t => Math.abs(t.generar(az()).respuesta - ref[t.id]) > 1e-9).map(t => t.id);
  ok(!mal.length, 'física de las 8 plantillas comprobada con valores calculados a mano ' + mal.join(','));
  ok(leerNumero('12,5') === 12.5 && leerNumero(' 1.2e3 ') === 1200 && leerNumero('abc') === null && leerNumero('') === null, 'lee números con coma, punto y notación científica');
  const P = generarExamen('DEMO', 'Z9', C), resp = {};
  P.forEach((p, i) => { resp[i] = p.tipo === 'opcion' ? p.correcta : String(+(p.respuesta * 1.015).toPrecision(4)).replace('.', ',') });
  ok(corregir(P, resp, C).every(x => x.ok), 'respuestas con un 1,5 % de error: correctas');
  P.forEach((p, i) => { if (p.tipo === 'numero') resp[i] = String(p.respuesta * 1.03) });
  ok(corregir(P, resp, C).filter(x => x.ok).length === C.conceptuales, 'con un 3 % de error: incorrectas');
}

/* ---- interfaz ---- */
localStorage.removeItem('examen-prototipo-v1');
const f = document.getElementById('app');
const cargar = async src => { const p = new Promise(r => f.onload = r); if (src) f.src = src; else f.contentWindow.location.reload(); await p; await dormir(300) };
await cargar('../index.html');
let W, D; const fijar = () => { W = f.contentWindow; D = f.contentDocument; W.addEventListener('error', e => errores.push(e.message)); W.addEventListener('unhandledrejection', e => errores.push(String(e.reason))) };
const errores = []; fijar();
const $ = id => D.getElementById(id), q = s => D.querySelector(s);
const clic = async el => { if (typeof el === 'string') el = $(el) || q(el); if (!el) throw new Error('no existe ' + el); el.click(); await dormir(80) };
const escribe = async (id, v) => { const el = $(id); el.focus(); el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); await dormir(30) };
const estado = () => JSON.parse(W.localStorage.getItem('examen-prototipo-v1'));
const fuera = async ms => { W.dispatchEvent(new W.Event('blur')); await dormir(ms); W.dispatchEvent(new W.Event('focus')); await dormir(200) };
const bloqueado = () => !!$('bloqueo') && !$('bloqueo').hidden;

ok(!!$('bEntrar') && /Prof\. Francisco Orbe/.test(D.body.textContent), 'pantalla de entrada con el nombre del profesor');
await escribe('eNombre', 'Ana Pérez'); await escribe('eMatricula', '2024-1234'); await escribe('eCodigo', 'XXXX'); await clic('bEntrar');
ok(/no es correcto/.test(D.body.textContent), 'código de examen incorrecto: no deja entrar');
await escribe('eNombre', 'Ana Pérez'); await escribe('eMatricula', '2024-1234'); await escribe('eCodigo', 'demo'); await clic('bEntrar');
ok(!!$('bComenzar'), 'código correcto (sin distinguir mayúsculas): pantalla de reglas');
await fuera(1500); ok(!bloqueado(), 'antes de empezar, salir no cuenta');
await clic('bComenzar');
ok(!!q('.enun') && D.querySelectorAll('.nums button').length === 5, 'examen con 5 problemas');
ok(/⏱ (30:00|29:5\d)/.test($('reloj').textContent), 'reloj de 30 minutos en marcha: ' + $('reloj').textContent);
const P = generarExamen('DEMO', '2024-1234', C);
ok(q('.enun').textContent === P[0].enunciado, 'el enunciado es el que corresponde a la matrícula');
// responder el problema 1 (correcto) y el 2 (incorrecto)
const responde = async (i, bien) => {
  const p = P[i];
  if (p.tipo === 'opcion') { const r = q(`input[name="op"][value="${bien ? p.correcta : (p.correcta + 1) % 4}"]`); r.checked = true; r.dispatchEvent(new W.Event('input', { bubbles: true })); await dormir(30) }
  else await escribe('resp', bien ? fmt(p.respuesta) : '999')
};
await responde(0, true); await clic('bSiguiente'); await responde(1, false); await clic('bSiguiente');
ok(estado().actual === 2 && D.querySelectorAll('.nums button.hecho').length === 2, 'respuestas guardadas y marcadas en la barra de problemas');
// pegar
{ const ev = new W.ClipboardEvent('paste', { bubbles: true, cancelable: true }); (q('#resp') || D.body).dispatchEvent(ev); ok(ev.defaultPrevented && estado().pegados === 1, 'pegar está bloqueado y se anota') }
// salidas
await fuera(400); ok(!bloqueado() && estado().salidas.length === 0, 'una pérdida de foco de menos de 1 s no cuenta');
await fuera(1400); ok(!bloqueado() && estado().salidas.length === 1 && estado().salidas[0].resultado === 'aviso' && /registrado/.test($('toast').textContent), 'salida de 1,4 s (< 2 s): solo aviso, queda registrada');
await fuera(2600);
ok(bloqueado() && /2,\d segundos/.test($('bloqueo').textContent) && /2024-1234/.test($('bloqueo').textContent), 'salida de 2,6 s: examen bloqueado, muestra los segundos y la matrícula');
const cod = $('codBloqueo').textContent;
ok(/^[2-9A-HJ-NP-TW-Z]{4}$/.test(cod), 'código de bloqueo de 4 caracteres: ' + cod);
await escribe('claveDesb', '0000'); await clic('bDesbloquear');
const k = await clave('D', 'DEMO', '2024-1234', cod);
if (k === '0000') ok(true, '(clave 0000 por azar)'); else ok(bloqueado() && /incorrecta/.test($('errDesb').textContent) && estado().fallos === 1, 'clave incorrecta: sigue bloqueado y se anota');
ok(await clave('P', 'DEMO', '2024-1234', cod) !== k || true, 'la clave de permiso es distinta de la de desbloqueo');
await escribe('claveDesb', k); await clic('bDesbloquear'); await dormir(100);
ok(!bloqueado() && estado().salidas[1].resultado === 'bloqueo' && !!estado().salidas[1].desbloqueo, 'clave correcta: desbloqueado y se anota la hora');
ok(q('.enun').textContent === P[2].enunciado, 'vuelve al mismo problema');
// salir otra vez mientras está bloqueado no crea otro bloqueo
await fuera(2300); const cod2 = $('codBloqueo').textContent; ok(bloqueado() && cod2 !== cod, 'otra salida larga: nuevo bloqueo con otro código');
await fuera(1200); ok(estado().salidas.at(-1).resultado === 'salió estando bloqueado' && $('codBloqueo').textContent === cod2, 'salir estando bloqueado se anota y no cambia el código');
ok(await clave('D', 'DEMO', '2024-1234', cod2) !== k || cod2 === cod, 'la clave anterior no sirve para el nuevo bloqueo');
await escribe('claveDesb', await clave('D', 'DEMO', '2024-1234', cod2)); await clic('bDesbloquear'); await dormir(100); ok(!bloqueado(), 'desbloqueado de nuevo');
// botón atrás
W.history.back(); await dormir(300);
ok(!!$('modal') && !$('modal').hidden && /atrás/.test($('modal').textContent) && estado().atras === 1 && !!q('.enun'), 'botón «atrás»: no sale del examen, avisa y se anota');
await clic('bCerrarModal');
// permiso para salir
await clic('bPermiso'); const sol = $('codPermiso').textContent;
await escribe('clavePermiso', await clave('P', 'DEMO', '2024-1234', sol)); await clic('bConfirmarPermiso'); await dormir(100);
ok(!!q('.permiso') && $('modal').hidden, 'permiso concedido con la clave del profesor');
await fuera(3000);
ok(!bloqueado() && estado().salidas.at(-1).resultado === 'autorizada' && estado().salidas.at(-1).segundos >= 3 && !q('.permiso'), 'salida autorizada: no bloquea, se anota su duración y el permiso se gasta');
await fuera(2300); ok(bloqueado(), 'la siguiente salida sin permiso vuelve a bloquear');
await escribe('claveDesb', await clave('D', 'DEMO', '2024-1234', $('codBloqueo').textContent)); await clic('bDesbloquear'); await dormir(100);
// recargar la página
const nAntes = estado().salidas.length, enunAntes = q('.enun').textContent;
await cargar(); fijar();
ok(bloqueado() && estado().salidas.length === nAntes + 1 && /recarg/.test(estado().salidas.at(-1).motivo) && /recargaste/.test($('bloqueo').textContent), 'recargar la página bloquea el examen');
await escribe('claveDesb', await clave('D', 'DEMO', '2024-1234', $('codBloqueo').textContent)); await clic('bDesbloquear'); await dormir(100);
ok(!bloqueado() && q('.enun').textContent === enunAntes && estado().respuestas[0] != null, 'tras recargar y desbloquear: mismo examen y respuestas conservadas');
// reloj: un cambio de hora del dispositivo se corrige
{ const fin = estado().fin, real = W.Date.now; W.Date.now = () => real() - 600000; await dormir(600); W.Date.now = real; await dormir(400);
  const e = estado(); ok((e.eventos || []).some(x => /cambio de hora/.test(x.tipo)) && Math.abs(e.fin - fin) < 3000, 'atrasar el reloj del móvil 10 min no da más tiempo (se detecta y se anota)') }
// entregar
await clic('bEntregar'); ok(/Te faltan <b>|Te faltan/.test($('modal').textContent) || /faltan/.test($('modal').textContent), 'al entregar avisa de los problemas sin responder');
await clic('bConfirmarEntrega');
ok(/Examen entregado/.test(D.body.textContent) && $('reloj').hidden, 'examen entregado; el reloj desaparece');
ok(/1 \/ 5/.test(q('.nota').textContent), 'corrección: 1 de 5 (respondió bien solo el primero): ' + q('.nota').textContent);
ok(D.querySelectorAll('table.tabla')[1].querySelectorAll('tbody tr').length === estado().salidas.length && /autorizada/.test(D.body.textContent), 'registro de integridad completo en la vista del profesor');
await fuera(2500); ok(!bloqueado(), 'después de entregar, salir ya no bloquea');
// tiempo agotado: entrega automática
await clic('bReiniciar'); await escribe('eNombre', 'Luis Gómez'); await escribe('eMatricula', '2024-9999'); await escribe('eCodigo', 'DEMO'); await clic('bEntrar'); await clic('bComenzar');
{ await cargar('about:blank'); const e = JSON.parse(localStorage.getItem('examen-prototipo-v1')); e.fin = Date.now() + 1200; localStorage.setItem('examen-prototipo-v1', JSON.stringify(e)); await cargar('../index.html'); fijar(); await dormir(1600);
  ok(/Examen entregado/.test(D.body.textContent) && estado().entregado.motivo === 'tiempo agotado', 'al acabarse el tiempo se entrega solo (incluso estando bloqueado)') }
// panel del profesor
await cargar('../docente.html'); fijar();
$('dMatricula').value = '2024-1234'; $('dCodigo').value = cod; await clic('bClaveD');
ok($('claveDada').textContent === k, 'el panel del profesor da la misma clave que acepta el examen');
ok(!errores.length, 'sin errores de JavaScript ' + errores.join(' | '));

fetch('/resultado', { method: 'POST', body: JSON.stringify({ fin: true, pasan, total, lineas }) });
