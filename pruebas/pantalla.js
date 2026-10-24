// Prueba de extremo a extremo de la interfaz real (en un iframe), como la usaría un estudiante.
const lineas = []; let pasan = 0, total = 0;
const ok = (c, t) => { total++; if (c) pasan++; lineas.push((c ? 'PASA  ' : 'FALLA ') + t) };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const f = document.getElementById('app');
localStorage.removeItem('laboratorio-mas-v1');
f.src = '../index.html';
await new Promise(r => f.onload = r); await dormir(300);
const W = f.contentWindow, D = f.contentDocument, $ = id => D.getElementById(id), q = s => D.querySelector(s), qa = s => [...D.querySelectorAll(s)];
const errores = []; W.addEventListener('error', e => errores.push(e.message)); W.addEventListener('unhandledrejection', e => errores.push(String(e.reason)));
W.confirm = () => true;
const descargas = []; W.HTMLAnchorElement.prototype.click = function () { descargas.push(this.download) };
const clic = async el => { if (typeof el === 'string') el = $(el) || q(el); if (!el) throw new Error('no existe ' + el); el.click(); await dormir(60) };
// teclea como una persona: enfoca el campo, lo vacía y escribe carácter a carácter (el bloqueo de inserciones grandes lo exige)
const escribe = async (el, v) => {
  el = typeof el === 'string' ? ($(el) || q(el)) : el;
  if (el.type === 'range') { el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); await dormir(20); return }
  el.focus(); el.dispatchEvent(new W.FocusEvent('focusin', { bubbles: true })); el.value = ''; el.dispatchEvent(new W.Event('input', { bubbles: true }));
  for (const ch of String(v)) { el.value += ch; el.dispatchEvent(new W.InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' })) }
  await dormir(20)
};
const pega = async (el, texto) => { const dt = new W.DataTransfer(); dt.setData('text/plain', texto); const ev = new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }); el.dispatchEvent(ev); await dormir(40); return ev.defaultPrevented };
try {
  ok(!!$('bNueva'), 'inicio sin sesión: formulario de nueva investigación');
  ok(await pega($('alias'), 'Ana Pérez') && $('alias').value === '', 'pegar también está bloqueado en el alias (en toda la app)');
  await escribe('alias', 'Prueba E2E'); await clic('bNueva');
  ok(/MAS-[A-Z0-9]{4}-[A-Z0-9]{4}/.test($('cabSesion').textContent), 'se crea un identificador: ' + $('cabSesion').textContent);
  ok(qa('[data-letra]').length === 6, 'seis experimentos A, B, C, D, E, I');
  ok(!$('marcaAgua') || $('marcaAgua').hidden, 'sin marca de agua en la pantalla de inicio');
  await clic(q('[data-letra="C"]'));
  ok(!$('p-laboratorio').hidden && !!$('escena'), 'laboratorio con animación');
  const ma = $('marcaAgua'), idSes = $('cabSesion').textContent.match(/MAS-\w{4}-\w{4}/)[0];
  ok(ma && !ma.hidden && decodeURIComponent(ma.style.backgroundImage).includes(idSes) && W.getComputedStyle(ma).pointerEvents === 'none', 'marca de agua con el identificador, sin bloquear los toques');
  ok(!!$('bAvisoInt') && /registra/.test($('p-laboratorio').textContent), 'aviso visible del registro de integridad al entrar al experimento');
  await clic('bAvisoInt'); ok(!$('bAvisoInt'), 'el aviso se confirma con «Entendido» (queda registrado)');
  await clic('bPlay'); await dormir(400); await clic('bPlay');
  ok(/t = [1-9]|t = 0,[1-9]/.test($('relojT').textContent), 'la animación avanza: ' + $('relojT').textContent);
  await escribe('tSlider', '2.5'); await clic('bMedirAqui');
  ok(!$('p-instrumentos').hidden, 'pasa a Instrumentos con el instante elegido');
  ok(q('[data-param="t"]').value === '2,5', 'el instante llega al formulario: ' + q('[data-param="t"]').value);
  await clic('bSolicitar');
  ok(!!$('predValor'), 'antes de medir pide la predicción');
  // integridad: pegar está bloqueado y se registra; salir de la app con la predicción abierta se registra
  ok(await pega($('predJust'), 'Respuesta copiada de una IA') && $('predJust').value === '' && /no se puede pegar/.test($('toast') ? $('toast').textContent : ''), 'pegar en la justificación está bloqueado y se avisa (sin redibujar)');
  await escribe('predJust', 'x = A cos(ωt) con ω = √(k/m)');
  // inserción de golpe (como el portapapeles del teclado del móvil): se deshace
  { const el = $('predJust'), antes = el.value; el.value = antes + ' y además esto vino de golpe desde el portapapeles'; el.dispatchEvent(new W.InputEvent('input', { bubbles: true, inputType: 'insertText' })); await dormir(40);
    ok(el.value === antes, 'un bloque de texto insertado de golpe se deshace') }
  W.dispatchEvent(new W.Event('blur')); await dormir(400); W.dispatchEvent(new W.Event('focus')); await dormir(200);
  ok(!$('avisoEtico') || $('avisoEtico').hidden, 'una pérdida de foco de menos de 1 s no cuenta');
  W.dispatchEvent(new W.Event('blur')); await dormir(1300); W.dispatchEvent(new W.Event('focus')); await dormir(300);
  ok($('avisoEtico') && !$('avisoEtico').hidden && /Has salido de la app/.test($('avisoEtico').textContent) && /reglas éticas/.test($('avisoEtico').textContent) && /predicción/.test($('avisoEtico').textContent), 'al volver a la app aparece el mensaje emergente con las reglas éticas');
  ok($('predJust') && $('predJust').value === 'x = A cos(ωt) con ω = √(k/m)', 'el mensaje emergente no borra lo que estaba escribiendo');
  await clic('bCerrarEtico'); ok($('avisoEtico').hidden, 'el mensaje se cierra con «Entendido»');
  await escribe('predValor', '0,05'); await escribe('predJust', 'x = A cos(ωt) con ω = √(k/m)'); await clic('bConfirmarPred');
  ok(!!$('bEjecutar'), 'predicción confirmada; queda el botón de medir');
  await clic('bEjecutar');
  ok(/Medición #1/.test($('p-instrumentos').textContent) && /Tu predicción/.test($('p-instrumentos').textContent), 'resultado con comparación frente a la predicción');
  ok(/31 \/ 32/.test($('cabCreditos').textContent), 'descuenta 1 crédito');
  await clic(q('[data-repetir="1"]'));
  ok(/Medición #2/.test($('p-instrumentos').textContent), 'repetir no pide predicción y crea la medición #2');
  // período con 10 oscilaciones
  await clic(q('[data-instr="periodo"]')); D.querySelector('[data-param="N"]').value = '10'; await clic('bSolicitar'); await escribe('predValor', '1'); await escribe('predJust', 'T = 2π√(m/k) con los nominales'); await clic('bConfirmarPred'); await clic('bEjecutar');
  ok(/Período/.test($('p-instrumentos').textContent) && /26 \/ 32/.test($('cabCreditos').textContent), 'período de 10 oscilaciones (4 créditos)');
  ok(!!q('#lienzo'), 'gráfica con los datos medidos');
  // investigación
  await clic(q('nav [data-p="investigacion"]'));
  const preg = q('.pregunta'); ok(!!preg, 'hay una pregunta adaptativa: ' + (preg ? preg.textContent.slice(0, 90) : ''));
  W.getSelection().selectAllChildren(preg); D.dispatchEvent(new W.ClipboardEvent('copy', { bubbles: true })); W.getSelection().removeAllRanges(); await dormir(500);
  { const s = JSON.parse(W.localStorage.getItem('laboratorio-mas-v1')), I = s.sesiones[s.actual].investigaciones.C, R = I.integridad || {};
    ok(R.pegados && R.pegados.length === 1 && R.pegados[0].contexto === 'prediccion', 'el intento de pegar queda registrado con su contexto: ' + JSON.stringify(R.pegados));
    ok(R.salidas && R.salidas.length === 1 && R.salidas[0].contexto === 'prediccion' && R.salidas[0].segundos >= 1, 'la salida de la app durante la predicción queda registrada: ' + JSON.stringify(R.salidas));
    ok(R.inserciones && R.inserciones.length === 1 && R.inserciones[0].bloqueada, 'la inserción de golpe queda registrada');
    ok(R.copias && R.copias.length === 1 && /^pregunta:/.test(R.copias[0].contexto), 'copiar el enunciado queda registrado: ' + JSON.stringify(R.copias && R.copias[0] && R.copias[0].contexto));
    ok(I.predicciones[0].escritura && I.predicciones[0].escritura.caracteres > 0, 'se mide cómo se escribió la justificación') }
  for (let i = 0; i < 6 && q('.pregunta'); i++) {
    const num = $('respNum'); if (num) await escribe(num, '3'); const op = q('input[name="resp"]'); if (op) { op.checked = true } const tx = $('respTxt'); if (tx) await escribe(tx, 'Lo justifico con mis mediciones.');
    await clic('bResponder'); if ($('bSeguir')) await clic('bSeguir')
  }
  ok(/Preguntas respondidas \(\d+\)/.test($('p-investigacion').textContent), 'las respuestas quedan en el historial');
  const sel = q('[data-hestado="H_AMORT"]'); sel.value = 'indecidible'; sel.dispatchEvent(new W.Event('change', { bubbles: true })); await dormir(30);
  await escribe(q('[data-hnota="H_AMORT"]'), 'No comparé la energía en instantes separados'); await clic(q('[data-hguardar="H_AMORT"]'));
  ok(/Historial de cambios/.test($('p-investigacion').textContent), 'cambio de hipótesis registrado');
  // informe
  await clic(q('nav [data-p="informe"]'));
  q('input[name="concl"][value="insuficiente"]').checked = true; await clic('bProponer');
  ok(!!$('bEntregar'), 'tras proponer aparece la entrega final');
  q('[data-clim]').checked = true; await escribe('cjust', 'Solo medí posición y período; no comparé energía ni amplitudes, así que no puedo decidir.'); await clic('bEntregar');
  ok(/Calificación provisional/.test($('p-informe').textContent), 'entregado: calificación provisional visible');
  await clic('bHtml'); await clic('bJson');
  ok(descargas.length === 2 && descargas[0].endsWith('.html') && descargas[1].endsWith('.json'), 'descarga informe HTML y JSON: ' + descargas.join(', '));
  // persistencia: recargar conserva todo
  f.contentWindow.location.reload(); await new Promise(r => f.onload = r); await dormir(300);
  const D2 = f.contentDocument;
  ok(/entregado/.test(D2.getElementById('cabExp').textContent) && !D2.getElementById('p-informe').hidden && /Calificación provisional/.test(D2.getElementById('p-informe').textContent), 'tras recargar, vuelve a la misma pantalla con la investigación guardada y entregada');
  // salir fuera de una pregunta también cuenta, y si la página se cierra estando fuera, la salida se recupera al reabrir
  D2.querySelector('nav [data-p="inicio"]').click(); await dormir(80); D2.querySelector('[data-letra="D"]').click(); await dormir(120);
  const W2 = f.contentWindow; W2.dispatchEvent(new W2.Event('blur')); await dormir(1300);
  W2.location.reload(); await new Promise(r => f.onload = r); await dormir(400);
  const D3 = f.contentDocument, em = D3.getElementById('avisoEtico'), s3 = JSON.parse(f.contentWindow.localStorage.getItem('laboratorio-mas-v1')), R3 = s3.sesiones[s3.actual].investigaciones.D.integridad || {};
  ok(em && !em.hidden && /Has salido de la app/.test(em.textContent), 'si la app se cierra estando fuera, al reabrirla aparece el mensaje emergente');
  ok(R3.salidas && R3.salidas.length === 1 && R3.salidas[0].segundos >= 1 && /se cerró/.test(R3.salidas[0].motivo), 'y la salida queda registrada: ' + JSON.stringify(R3.salidas));
  ok(!errores.length, 'sin errores de JavaScript: ' + errores.join(' | '));
} catch (e) { ok(false, 'ERROR ' + (e.stack || e)) }
await fetch('/resultado', { method: 'POST', body: JSON.stringify({ fin: true, lineas, pasan, total }) });
