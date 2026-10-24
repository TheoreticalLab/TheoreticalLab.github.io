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
const escribe = async (el, v) => { el = typeof el === 'string' ? ($(el) || q(el)) : el; el.value = v; el.dispatchEvent(new W.Event('input', { bubbles: true })); await dormir(20) };
try {
  ok(!!$('bNueva'), 'inicio sin sesión: formulario de nueva investigación');
  await escribe('alias', 'Prueba E2E'); await clic('bNueva');
  ok(/MAS-[A-Z0-9]{4}-[A-Z0-9]{4}/.test($('cabSesion').textContent), 'se crea un identificador: ' + $('cabSesion').textContent);
  ok(qa('[data-letra]').length === 6, 'seis experimentos A, B, C, D, E, I');
  await clic(q('[data-letra="C"]'));
  ok(!$('p-laboratorio').hidden && !!$('escena'), 'laboratorio con animación');
  await clic('bPlay'); await dormir(400); await clic('bPlay');
  ok(/t = [1-9]|t = 0,[1-9]/.test($('relojT').textContent), 'la animación avanza: ' + $('relojT').textContent);
  await escribe('tSlider', '2.5'); await clic('bMedirAqui');
  ok(!$('p-instrumentos').hidden, 'pasa a Instrumentos con el instante elegido');
  ok(q('[data-param="t"]').value === '2,5', 'el instante llega al formulario: ' + q('[data-param="t"]').value);
  await clic('bSolicitar');
  ok(!!$('predValor'), 'antes de medir pide la predicción');
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
  ok(!errores.length, 'sin errores de JavaScript: ' + errores.join(' | '));
} catch (e) { ok(false, 'ERROR ' + (e.stack || e)) }
await fetch('/resultado', { method: 'POST', body: JSON.stringify({ fin: true, lineas, pasan, total }) });
