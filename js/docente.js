// HERRAMIENTA DOCENTE (no enlazada desde la app del estudiante). Carga informes JSON, regenera el modelo oculto desde la semilla,
// comprueba la integridad de cada medición, muestra cómo se llegó a la conclusión y permite calificar los textos razonados.
import { experimento, describirModelo, CONCLUSIONES_ADMISIBLES, asignacion, LETRAS } from './sesion.js';
import { medir, INSTRUMENTOS, conIncertidumbre } from './mediciones.js';
import { evaluar } from './evaluacion.js';
import { HIPOTESIS } from './pedagogia.js';
import { normalizarIdentificador } from './azar.js';
import { NOMBRE_CONCLUSION, LIMITACIONES, descargar } from './informe.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CLAVE = 'laboratorio-mas-docente-v1';
const CATS = [['predicciones', 'Predicciones'], ['seleccion', 'Selección'], ['calculos', 'Cálculos'], ['razonamiento', 'Razonamiento'], ['conclusion', 'Conclusión']];
let entregas = [];
const notas = (() => { try { return JSON.parse(localStorage.getItem(CLAVE) || '{}') } catch (e) { return {} } })();
const guardaNotas = () => { try { localStorage.setItem(CLAVE, JSON.stringify(notas)) } catch (e) { } };

export function analizar(d) {
  if (!d || d.app !== 'laboratorio-mas' || !d.reproduccion || !d.investigacion) throw new Error('no es un informe del Laboratorio MAS');
  const id = normalizarIdentificador(d.reproduccion.identificador), letra = d.reproduccion.experimento; if (!id || !LETRAS.includes(letra)) throw new Error('identificador o experimento no válidos');
  const exp = experimento(id, letra), inv = d.investigacion, problemas = [];
  // integridad: cada medición se regenera desde la semilla y debe coincidir
  for (const m of inv.mediciones) {
    const r = medir(exp, m.n, m.instr, m.p, m.fm, m.fa);
    if (r.error) { problemas.push(`#${m.n}: no se puede reproducir (${r.error})`); continue }
    for (const [k, v] of Object.entries(r.valores)) if (!m.valores[k] || Math.abs(m.valores[k].v - v.v) > 1e-9 * (1 + Math.abs(v.v))) problemas.push(`#${m.n}: ${k} no coincide con la semilla (¿datos editados?)`)
  }
  for (const p of inv.predicciones) { const m = inv.mediciones.find(x => x.n === p.medicion); if (m && p.hora > m.hora) problemas.push(`P${p.id} registrada después de su medición`) }
  if (JSON.stringify(exp.nominal) !== JSON.stringify(d.nominal)) problemas.push('los parámetros nominales del archivo no son los de la semilla');
  const ses = { id, alias: d.estudiante, investigaciones: { [letra]: inv } }, ev = evaluar(ses, inv);
  return { d, id, letra, exp, inv, ev, problemas, clave: id + '|' + letra, modelo: exp.ocultos.modelo }
}
function cargarArchivos(files) {
  const msgs = [];
  Promise.all([...files].map(f => f.text().then(t => { try { const a = analizar(JSON.parse(t)); entregas = entregas.filter(x => x.clave !== a.clave).concat([a]) } catch (e) { msgs.push(`${f.name}: ${e.message}`) } }))).then(() => { pintar(); if (msgs.length) $('aviso').innerHTML = `<div class="aviso mal">${msgs.map(esc).join('<br>')}</div>` })
}
const total = a => { const n = notas[a.clave] || {}; return Math.round(CATS.reduce((s, [k]) => s + (n[k] != null && n[k] !== '' ? +n[k] : a.ev.categorias[k]), 0) * 10) / 10 };
const fecha = s => { try { return new Date(s).toLocaleString('es') } catch (e) { return s } };

function lineaTiempo(a) {
  const inv = a.inv, it = [];
  for (const p of inv.predicciones) it.push({ h: p.hora, t: `<b>Predicción P${p.id}</b> (${esc(INSTRUMENTOS[p.instr].nombre)}): ${esc(String(p.valor))} ${esc(INSTRUMENTOS[p.instr].unidad)} — «${esc(p.justificacion)}» <span class="suave">(MAS ideal: ${esc(String(+p.ideal.toPrecision(4)))})</span>` });
  for (const m of inv.mediciones) { const pr = m.valores[m.principal]; it.push({ h: m.hora, t: `<b>Medición #${m.n}</b> ${esc(INSTRUMENTOS[m.instr].nombre)} ${esc(JSON.stringify(m.p))}${m.fm !== 1 || m.fa !== 1 ? ` [m×${m.fm}, A×${m.fa}]` : ''}: ${esc(conIncertidumbre(pr.v, pr.s, pr.u))} · ${m.coste} cr.` }) }
  for (const r of inv.respuestas) it.push({ h: r.hora, t: `<b>Pregunta</b> «${esc(r.pregunta)}» → ${esc(r.respuesta.numero ?? (r.respuesta.opciones ? r.respuesta.opciones.map(o => (r.opciones || []).find(x => x.id === o)?.txt || o).join('; ') : ((r.opciones || []).find(x => x.id === r.respuesta.opcion) || {}).txt || ''))}${r.respuesta.texto ? ` <i>«${esc(r.respuesta.texto)}»</i>` : ''} <span class="suave">[${r.correcta == null ? 'docente' : r.correcta === true ? 'correcta' : r.correcta === false ? 'incorrecta' : Math.round(r.correcta * 100) + ' %'}]</span>` });
  for (const x of inv.histHip) it.push({ h: x.hora, t: `<b>Hipótesis</b> ${esc(HIPOTESIS[x.h])}: ${esc(x.de)} → ${esc(x.a)}${x.nota ? ` — «${esc(x.nota)}»` : ''}${x.evidencia && x.evidencia.length ? ' (mediciones ' + x.evidencia.map(n => '#' + n).join(', ') + ')' : ''}` });
  for (const x of inv.interpretaciones) it.push({ h: x.hora, t: `<b>Revisión de interpretación</b> ${esc(x.ref)}: «${esc(x.texto)}»` });
  for (const e of inv.eventos.filter(e => e.tipo === 'montaje' || e.tipo === 'borrador' || e.tipo === 'omitida')) it.push({ h: e.hora, t: e.tipo === 'montaje' ? `<b>Montaje</b> masa ×${e.fm}, amplitud ×${e.fa}` : e.tipo === 'borrador' ? `<b>Propone</b> «${esc(NOMBRE_CONCLUSION[e.conclusion] || 'conclusión')}»` : `<b>Pospone</b> una pregunta (${esc(e.nodo)})` });
  if (inv.conclusion) it.push({ h: inv.conclusion.hora, t: `<b>Entrega</b>: ${esc(NOMBRE_CONCLUSION[inv.conclusion.tipo])} · evidencias ${inv.conclusion.evidencias.map(n => '#' + n).join(', ') || '—'} · z = ${inv.conclusion.z ?? '—'} · limitaciones: ${inv.conclusion.limitaciones.map(l => esc(LIMITACIONES[l] || l)).join('; ') || '—'}<br>«${esc(inv.conclusion.justificacion)}»` });
  return it.sort((x, y) => x.h < y.h ? -1 : 1).map(x => `<li><span class="suave peq mono">${esc(fecha(x.h))}</span> ${x.t}</li>`).join('')
}

function pintar() {
  const filas = entregas.map((a, i) => `<tr><td>${esc(a.d.estudiante || '—')}</td><td class="mono">${esc(a.id)}</td><td>${a.letra}</td><td>${esc(a.modelo)}</td><td>${a.inv.conclusion ? esc(a.inv.conclusion.tipo) : '—'} ${a.inv.conclusion ? (CONCLUSIONES_ADMISIBLES[a.modelo].includes(a.inv.conclusion.tipo) ? '✓' : '✗') : ''}</td><td class="mono">${a.ev.total}</td><td class="mono">${total(a)}</td><td>${a.problemas.length ? `<span class="zchip mal">${a.problemas.length}</span>` : '<span class="zchip ok">ok</span>'}</td><td><button class="btn chico" data-ver="${i}">Revisar</button></td></tr>`).join('');
  $('lista').innerHTML = entregas.length ? `<div class="tw"><table class="tabla"><tr><th>Estudiante</th><th>Identificador</th><th>Exp.</th><th>Modelo oculto</th><th>Conclusión</th><th>Auto</th><th>Final</th><th>Integridad</th><th></th></tr>${filas}</table></div>` : '<p class="suave">Carga los archivos JSON que entregaron tus estudiantes.</p>'
}
function detalle(i) {
  const a = entregas[i], n = notas[a.clave] = notas[a.clave] || {};
  const textos = a.ev.pendienteDocente.map(t => `<li><b>${esc(t.tipo)}</b> ${t.pregunta ? `<div class="suave peq">${esc(t.pregunta)}</div>` : ''}«${esc(t.texto)}»</li>`).join('');
  $('detalle').innerHTML = `<div class="tarjeta"><h2>${esc(a.d.estudiante || '—')} · ${esc(a.id)} · experimento ${a.letra}</h2>
    <p><b>Modelo oculto:</b> ${esc(describirModelo(a.exp))}</p><p class="suave">Conclusiones defendibles: ${CONCLUSIONES_ADMISIBLES[a.modelo].map(c => esc(NOMBRE_CONCLUSION[c])).join(' o ')}</p>
    ${a.problemas.length ? `<div class="aviso mal"><b>Integridad:</b><br>${a.problemas.map(esc).join('<br>')}</div>` : '<div class="aviso ok">Todas las mediciones se reproducen exactamente desde la semilla.</div>'}
    <h3>Calificación (deja en blanco para aceptar la automática)</h3><div class="rejilla">${CATS.map(([k, t]) => `<label class="campo"><span>${t} · auto ${a.ev.categorias[k]}</span><input data-nota="${k}" inputmode="decimal" value="${n[k] ?? ''}" placeholder="${a.ev.categorias[k]}"></label>`).join('')}</div>
    <label class="campo"><span>Comentario para el estudiante</span><textarea data-comentario>${esc(n.comentario || '')}</textarea></label><p>Nota final: <b class="mono" id="notaFinal">${total(a)}</b> / 100</p>
    <details open><summary><b>Textos razonados (${a.ev.pendienteDocente.length})</b></summary><ul>${textos}</ul></details>
    <details><summary><b>Cómo llegó a su conclusión (línea de tiempo)</b></summary><ul>${lineaTiempo(a)}</ul></details>
    <details><summary><b>Detalle de la nota automática</b></summary><pre>${esc(JSON.stringify(a.ev.detalle, null, 1))}</pre></details></div>`;
  $('detalle').dataset.i = i; $('detalle').scrollIntoView({ behavior: 'smooth' })
}
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.ver != null) detalle(+b.dataset.ver);
  if (b.id === 'bCsv') { const L = [['estudiante', 'identificador', 'experimento', 'modelo', 'conclusion', 'defendible', ...CATS.map(c => 'auto_' + c[0]), 'nota_auto', 'nota_final', 'integridad', 'comentario'].join(',')];
    for (const a of entregas) { const n = notas[a.clave] || {}, q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; L.push([q(a.d.estudiante), a.id, a.letra, a.modelo, a.inv.conclusion ? a.inv.conclusion.tipo : '', a.inv.conclusion ? CONCLUSIONES_ADMISIBLES[a.modelo].includes(a.inv.conclusion.tipo) : '', ...CATS.map(c => a.ev.categorias[c[0]]), a.ev.total, total(a), a.problemas.length ? 'revisar' : 'ok', q(n.comentario)].join(',')) }
    descargar('calificaciones-laboratorio-mas.csv', '﻿' + L.join('\n'), 'text/csv') }
  if (b.id === 'bReproducir') { const id = normalizarIdentificador($('repId').value); if (!id) { $('repOut').textContent = 'Identificador no válido'; return } const A = asignacion(id);
    $('repOut').innerHTML = `<table class="tabla"><tr><th>Exp.</th><th>Modelo</th><th>m (kg)</th><th>k (N/m)</th><th>A (m)</th><th>Descripción</th></tr>${LETRAS.map(l => { const x = experimento(id, l); return `<tr><td>${l}</td><td>${A[l]}</td><td>${x.nominal.m}</td><td>${x.nominal.k}</td><td>${x.nominal.A}</td><td class="peq">${esc(describirModelo(x))}</td></tr>` }).join('')}</table>` }
});
document.addEventListener('input', e => {
  const i = $('detalle').dataset.i; if (i == null) return; const a = entregas[+i], n = notas[a.clave];
  if (e.target.dataset.nota) { const v = e.target.value.replace(',', '.'); n[e.target.dataset.nota] = v === '' ? null : Math.max(0, Math.min(20, +v)); $('notaFinal').textContent = total(a) }
  if (e.target.dataset.comentario != null) n.comentario = e.target.value;
  guardaNotas(); pintar()
});
if ($('archivos')) {   // solo en docente.html (las pruebas importan analizar sin interfaz)
  $('archivos').addEventListener('change', e => cargarArchivos(e.target.files));
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => { e.preventDefault(); cargarArchivos(e.dataTransfer.files) });
  pintar()
}
