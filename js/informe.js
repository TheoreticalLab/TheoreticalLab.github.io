// INFORME · exportación JSON (completa y reproducible) y HTML legible para el profesor. Ninguno revela el modelo oculto.
import { experimento, VERSION_MOTOR, T_MAX, CREDITOS } from './sesion.js';
import { INSTRUMENTOS, conIncertidumbre } from './mediciones.js';
import { HIPOTESIS } from './pedagogia.js';
import { evaluar } from './evaluacion.js';
import { urlMarca, textoMarca } from './marca.js';
import { resumenIntegridad } from './integridad.js';

/** Sección «Registro de integridad» (HTML) para el informe y la herramienta docente. Describe señales; no juzga. */
export function htmlIntegridad(inv) {
  const r = resumenIntegridad(inv), R = inv.integridad || { salidas: [], copias: [], pegados: [], inserciones: [] }, f = s => { try { return new Date(s).toLocaleString('es') } catch (e) { return s } };
  const ctx = c => !c ? '—' : c === 'prediccion' ? 'predicción' : c === 'conclusion' ? 'conclusión' : c.startsWith('pregunta:') ? 'pregunta «' + c.slice(9) + '»' : c;
  const ev = [...R.salidas.map(s => ({ h: s.hora, t: `Salió de la app ${String(s.segundos).replace('.', ',')} s durante ${ctx(s.contexto)} (${s.motivo})` })),
    ...R.copias.map(c => ({ h: c.hora, t: `Copió ${c.caracteres} caracteres${c.contexto ? ' durante ' + ctx(c.contexto) : ''}: «${c.inicio}${c.caracteres > 80 ? '…' : ''}»` })),
    ...R.pegados.map(p => ({ h: p.hora, t: `Intentó ${p.como} ${p.caracteres} caracteres en «${p.campo}» (bloqueado)` })),
    ...R.inserciones.map(p => ({ h: p.hora, t: `Inserción de ${p.caracteres} caracteres de golpe en «${p.campo}» (${p.tipo})` }))].sort((a, b) => a.h < b.h ? -1 : 1);
  return `<table><tr><th>Señal</th><th>Valor</th></tr>
    <tr><td>Salidas de la app durante preguntas, predicciones o la conclusión</td><td>${r.salidasDurantePreguntas} (${r.segundosFuera} s en total; la más larga, ${String(r.salidaMasLarga).replace('.', ',')} s)</td></tr>
    <tr><td>Salidas en otros momentos (navegando por la app)</td><td>${r.salidasEnOtrosMomentos}</td></tr>
    <tr><td>Copias de texto (de enunciados de preguntas)</td><td>${r.copiasDeTexto} (${r.copiasDeEnunciados})</td></tr>
    <tr><td>Intentos de pegar (bloqueados)</td><td>${r.intentosDePegar}</td></tr><tr><td>Inserciones grandes de golpe</td><td>${r.insercionesGrandes}</td></tr>
    <tr><td>Respuestas largas escritas a más de 8 caracteres por segundo</td><td>${r.respuestasEscritasMuyRapido}</td></tr></table>
    ${inv.integridad && inv.integridad.avisoVisto ? `<p><small>Aviso del registro aceptado: ${esc(f(inv.integridad.avisoVisto))}.</small></p>` : ''}
    ${ev.length ? `<ul>${ev.map(x => `<li><small>${esc(f(x.h))}</small> · ${esc(x.t)}</li>`).join('')}</ul>` : ''}
    <p><small>Son señales, no pruebas: salir de la app puede ser un mensaje o una llamada, y copiar texto puede ser para tus apuntes. El registro no afecta a la nota automática.</small></p>`
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = iso => { try { return new Date(iso).toLocaleString('es') } catch (e) { return iso } };
const num = x => String(+(+x).toPrecision(4)).replace('.', ',');
export const NOMBRE_CONCLUSION = { compatible: 'Compatible con el MAS ideal', incompatible: 'Incompatible con el MAS ideal', insuficiente: 'Evidencia insuficiente para decidir' };
export const LIMITACIONES = {
  resolucion: 'Resolución de los instrumentos', repeticiones: 'Pocas repeticiones', ventana: 'Ventana de observación limitada (60 s)',
  amplitud: 'Solo probé una amplitud', masa: 'Solo probé una masa', nominales: 'Los parámetros nominales pueden no ser exactos', presupuesto: 'Presupuesto de créditos agotado'
};

export function informeJSON(ses, letra) {
  const inv = ses.investigaciones[letra], e = experimento(ses.id, letra);
  return {
    app: 'laboratorio-mas', formato: 1, generado: new Date().toISOString(),
    reproduccion: { identificador: ses.id, experimento: letra, versionMotor: VERSION_MOTOR, nota: 'Con el identificador y la letra se regeneran exactamente los parámetros, el modelo y cada medición (ver GUIA_DOCENTE.md).' },
    estudiante: ses.alias, creada: ses.creada, nominal: e.nominal, incertidumbres: e.sigma, creditosIniciales: CREDITOS, ventanaS: T_MAX,
    investigacion: inv, evaluacionProvisional: evaluar(ses, inv)
  }
}

function descripcionMedicion(d) {
  const I = INSTRUMENTOS[d.instr], P = Object.entries(d.p).map(([k, v]) => `${k} = ${num(v)}`).join(', ');
  const vals = Object.values(d.valores).map(x => `${x.n} = ${conIncertidumbre(x.v, x.s, x.u)}`).join(' · ');
  return { nombre: I.nombre, P, vals, montaje: d.fm === 1 && d.fa === 1 ? 'nominal' : `masa ×${num(d.fm)}, amplitud ×${num(d.fa)}` }
}

export function informeHTML(ses, letra) {
  const inv = ses.investigaciones[letra], e = experimento(ses.id, letra), ev = evaluar(ses, inv), C = inv.conclusion;
  const filasMed = inv.mediciones.map(d => { const x = descripcionMedicion(d), p = d.prediccion ? inv.predicciones.find(q => q.id === d.prediccion) : null; return `<tr><td>${d.n}</td><td>${esc(fecha(d.hora))}</td><td>${esc(x.nombre)}${d.repeticion ? ' (repetición)' : ''}</td><td>${esc(x.P)}</td><td>${esc(x.montaje)}</td><td>${esc(x.vals)}</td><td>${p ? esc(num(p.valor)) : '—'}</td><td>${d.coste}</td></tr>` }).join('');
  const filasPred = inv.predicciones.map(p => `<tr><td>P${p.id}</td><td>${esc(fecha(p.hora))}</td><td>${esc(INSTRUMENTOS[p.instr].nombre)}</td><td>${esc(num(p.valor))} ${esc(INSTRUMENTOS[p.instr].unidad)}</td><td>${esc(p.justificacion)}</td><td>${p.medicion ? '#' + p.medicion : '—'}</td></tr>`).join('');
  const filasResp = inv.respuestas.map(r => `<tr><td>${esc(fecha(r.hora))}</td><td>${esc(r.pregunta)}</td><td>${esc(r.respuesta.numero ?? (r.respuesta.opciones ? r.respuesta.opciones.map(o => (r.opciones || []).find(x => x.id === o)?.txt || o).join('; ') : ((r.opciones || []).find(x => x.id === r.respuesta.opcion) || {}).txt || ''))}${r.respuesta.texto ? '<br><i>' + esc(r.respuesta.texto) + '</i>' : ''}</td><td>${r.correcta == null ? 'docente' : r.correcta === true ? 'sí' : r.correcta === false ? 'no' : Math.round(r.correcta * 100) + ' %'}</td></tr>`).join('');
  const filasHip = inv.histHip.map(x => `<tr><td>${esc(fecha(x.hora))}</td><td>${esc(HIPOTESIS[x.h])}</td><td>${esc(x.de)} → <b>${esc(x.a)}</b></td><td>${esc(x.nota)}${x.motivo ? ' <small>(' + esc(x.motivo) + ')</small>' : ''}${x.evidencia && x.evidencia.length ? ' · mediciones ' + x.evidencia.map(n => '#' + n).join(', ') : ''}</td></tr>`).join('');
  const interp = inv.interpretaciones.map(x => `<li>${esc(fecha(x.hora))} · ${esc(x.ref)}: ${esc(x.texto)}</li>`).join('');
  const hipActual = Object.entries(inv.hipotesis).map(([h, x]) => `<li>${esc(HIPOTESIS[h])}: <b>${esc(x.estado)}</b>${x.nota ? ' — ' + esc(x.nota) : ''}</li>`).join('');
  const cats = [['predicciones', 'Calidad de las predicciones'], ['seleccion', 'Selección de experimentos'], ['calculos', 'Cálculos y comparaciones'], ['razonamiento', 'Razonamiento e hipótesis'], ['conclusion', 'Conclusión e incertidumbre']];
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Informe ${esc(ses.id)} · experimento ${esc(letra)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:980px;margin:24px auto;padding:0 16px;color:#1b1f24;background:#fff}h1{font-size:22px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ddd;padding:4px 6px;vertical-align:top;text-align:left}th{background:#f3f4f6}.k{display:grid;grid-template-columns:220px 1fr;gap:2px 12px}.nota{font-size:28px;font-weight:700}small{color:#666}@media print{h2{break-after:avoid}}body{background-image:${urlMarca(textoMarca(ses)).replace(/</g, '%3C')};-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>
<h1>Informe de investigación · Laboratorio MAS</h1>
<div class="k"><b>Identificador de la sesión</b><span>${esc(ses.id)}</span><b>Estudiante (alias)</b><span>${esc(ses.alias || '—')}</span><b>Fecha de inicio</b><span>${esc(fecha(inv.iniciada))}</span><b>Informe generado</b><span>${esc(fecha(new Date().toISOString()))}</span><b>Experimento</b><span>${esc(letra)}</span>
<b>Parámetros nominales</b><span>m = ${num(e.nominal.m)} kg · k = ${num(e.nominal.k)} N/m · A = ${num(e.nominal.A)} m · x(0) = A, v(0) = 0</span><b>Créditos usados</b><span>${CREDITOS - inv.creditos} de ${CREDITOS}</span>
<b>Reproducción</b><span>identificador ${esc(ses.id)} + experimento ${esc(letra)} (motor v${VERSION_MOTOR})</span></div>
<h2>Hipótesis</h2><p>Valoración final:</p><ul>${hipActual}</ul>${filasHip ? `<p>Cambios de hipótesis (en orden):</p><table><tr><th>Fecha</th><th>Hipótesis</th><th>Cambio</th><th>Nota y evidencia</th></tr>${filasHip}</table>` : '<p>Sin cambios registrados.</p>'}
<h2>Predicciones (registradas antes de cada medición, inalterables)</h2>${filasPred ? `<table><tr><th>#</th><th>Fecha</th><th>Magnitud</th><th>Predicción</th><th>Justificación</th><th>Medición</th></tr>${filasPred}</table>` : '<p>Ninguna.</p>'}
<h2>Mediciones e incertidumbres</h2>${filasMed ? `<table><tr><th>#</th><th>Fecha</th><th>Instrumento</th><th>Parámetros</th><th>Montaje</th><th>Resultado</th><th>Predicción</th><th>Créditos</th></tr>${filasMed}</table>` : '<p>Ninguna.</p>'}
${interp ? `<h2>Revisiones de interpretación</h2><ul>${interp}</ul>` : ''}
<h2>Preguntas de la investigación y cálculos</h2>${filasResp ? `<table><tr><th>Fecha</th><th>Pregunta (tal como se mostró, con sus datos)</th><th>Respuesta</th><th>Correcta (automático)</th></tr>${filasResp}</table>` : '<p>Ninguna.</p>'}
<h2>Conclusión final</h2>${C ? `<p><b>${esc(NOMBRE_CONCLUSION[C.tipo])}</b> · ${esc(fecha(C.hora))}</p><p>Evidencias citadas: ${C.evidencias.length ? C.evidencias.map(n => '#' + n).join(', ') : 'ninguna'}${C.z != null ? ` · significación declarada: z = ${esc(num(C.z))}` : ''}</p><p>Limitaciones reconocidas: ${C.limitaciones.length ? C.limitaciones.map(l => esc(LIMITACIONES[l] || l)).join('; ') : 'ninguna'}</p><p><b>Justificación:</b> ${esc(C.justificacion)}</p>` : '<p>Todavía no entregada.</p>'}
<h2>Registro de integridad</h2>${htmlIntegridad(inv)}
<h2>Calificación provisional (automática)</h2><p class="nota">${ev.total} / 100</p><table><tr><th>Criterio</th><th>Puntos</th></tr>${cats.map(([k, t]) => `<tr><td>${t}</td><td>${ev.categorias[k]} / 20</td></tr>`).join('')}</table>
<p><small>Provisional: los textos razonados (${ev.pendienteDocente.length}) requieren revisión docente. La nota automática no interpreta el contenido de los textos.</small></p>
</body></html>`
}

export function descargar(nombre, contenido, tipo) {
  const b = new Blob([contenido], { type: tipo }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}
