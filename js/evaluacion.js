// EVALUACIÓN · nota automática PROVISIONAL (100 puntos, 5 × 20). Lo que exige leer razonamiento escrito queda para el
// docente: aquí no se finge comprensión semántica (no se buscan palabras clave en los textos).
//  1 Predicciones · 2 Selección de experimentos · 3 Cálculos · 4 Razonamiento e hipótesis · 5 Conclusión e incertidumbre
import { calcularEvidencia } from './evidencia.js';
import { experimento, CONCLUSIONES_ADMISIBLES } from './sesion.js';

const r1 = x => Math.round(x * 10) / 10;
const lim = x => Math.max(0, Math.min(20, x));

export function evaluar(ses, inv) {
  const exp = experimento(ses.id, inv.letra), E = calcularEvidencia(inv, exp), det = {};
  // 1) Predicciones: ¿aplicó bien el MAS ideal ANTES de ver el resultado? (se compara con la predicción ideal, no con lo medido:
  //    acertar el valor real por casualidad con un cálculo mal hecho no suma)
  const recal = new Set(inv.respuestas.filter(r => r.nodo === 'pred-recalculo' && r.correcta).map(r => r.clave));
  const ps = E.predicciones.map(p => {
    let s = p.errIdeal <= 0.02 ? 1 : p.errIdeal <= 0.05 ? 0.75 : p.errIdeal <= 0.15 ? 0.4 : 0;
    if (s < 1 && recal.has('p' + p.id)) s += 0.5 * (1 - s);        // corrigió su cálculo después: recupera la mitad
    return s * (p.justificacion.length >= 25 ? 1 : 0.8)
  });
  const c1 = ps.length ? 20 * (ps.reduce((a, b) => a + b, 0) / ps.length) * Math.min(1, ps.length / 4) : 0;
  det.predicciones = { n: ps.length, media: ps.length ? r1(100 * ps.reduce((a, b) => a + b, 0) / ps.length) / 100 : 0 };
  // 2) Selección de experimentos: pruebas que discriminan entre hipótesis rivales, y eficiencia del gasto
  const pesos = { energiaTiempo: 5, amplitud: 5, masa: 3, posicionFuerza: 3, repeticiones: 2 };
  let fam = 0; for (const [k, w] of Object.entries(pesos)) if (E.familias[k]) fam += w;
  const gastoMed = inv.mediciones.reduce((a, d) => a + d.coste, 0), gastoMont = Math.max(0, 32 - inv.creditos - gastoMed);
  const util = inv.mediciones.filter(d => !(d.repeticion && !E.repetidos.some(g => g.ids.includes(d.n) && g.n >= 2 && g.n <= 4))).reduce((a, d) => a + d.coste, 0) + gastoMont;
  const efic = (gastoMed + gastoMont) ? 2 * Math.min(1, util / (gastoMed + gastoMont)) : 0;
  const c2 = lim((fam / 16) * 18 + efic);
  det.seleccion = { familias: Object.keys(pesos).filter(k => E.familias[k]), creditosUsados: 32 - inv.creditos };
  // 3) Cálculos: preguntas numéricas con tolerancia (+ el z declarado en la conclusión, si lo hay)
  const calc = inv.respuestas.filter(r => r.cat === 'calculo');
  let ok = calc.filter(r => r.correcta).length, n = calc.length;
  if (inv.conclusion && inv.conclusion.z != null && E.discrepancias.concat(E.energia ? [{ z: E.energia.z }] : []).length) {
    n++; const zs = E.discrepancias.map(d => Math.abs(d.z)).concat(E.energia ? [Math.abs(E.energia.z)] : []);
    if (zs.some(z => Math.abs(Math.abs(inv.conclusion.z) - z) <= Math.max(0.3, 0.1 * z))) ok++
  }
  const c3 = n ? 20 * (ok / n) * Math.min(1, n / 4) : 0;
  det.calculos = { correctos: ok, total: n };
  // 4) Razonamiento: opciones razonadas (las de varias respuestas, por coincidencia parcial), revisiones fundamentadas de
  //    hipótesis y concepciones erróneas no corregidas
  const raz = inv.respuestas.filter(r => r.cat === 'razonamiento' && r.correcta != null);
  const mr = raz.length ? raz.reduce((a, r) => a + (r.correcta === true ? 1 : r.correcta === false ? 0 : +r.correcta), 0) / raz.length : 0;
  const revisiones = inv.histHip.filter(x => /revisión ante la evidencia/.test(x.motivo || '') || (x.de !== 'sin evaluar' && x.evidencia && x.evidencia.length)).length;
  const errores = Object.keys(inv.marcas || {}).filter(k => k.startsWith('M_') && !inv.marcas['corregida:' + k]).length;
  const c4 = lim(16 * mr * Math.min(1, raz.length / 4) + Math.min(4, 2 * revisiones) - errores);
  det.razonamiento = { preguntas: raz.length, acierto: r1(100 * mr) / 100, revisiones, erroresSinCorregir: errores };
  // 5) Conclusión: ¿es defendible con el modelo real Y está justificada con SU evidencia? (distingue la suerte del razonamiento)
  let c5 = 0; const C = inv.conclusion; det.conclusion = null;
  if (C) {
    const modelo = exp.ocultos.modelo, admisible = CONCLUSIONES_ADMISIBLES[modelo].includes(C.tipo);
    const fuerte = E.discrepancias.filter(d => Math.abs(d.z) >= 3), muyFuerte = E.discrepancias.some(d => Math.abs(d.z) >= 5);
    const cita = C.evidencias.length > 0, citaFuerte = fuerte.some(d => d.ids.some(i => C.evidencias.includes(i)));
    const justificada = C.tipo === 'incompatible' ? fuerte.length > 0 && (citaFuerte || inv.respuestas.some(r => r.nodo === 'conc-incompatible' && r.correcta))
      : C.tipo === 'compatible' ? !fuerte.length && E.nFamilias >= 2 && (E.familias.energiaTiempo || E.familias.amplitud || E.familias.posicionFuerza)
        : !muyFuerte;   // «insuficiente» es honesto salvo que ya tenga una discrepancia contundente
    const extras = (C.limitaciones.length ? 3 : 0) + (cita ? 3 : 0);
    // reconocer los límites cuando de verdad no hay evidencia decisiva no se penaliza
    const base = admisible && justificada ? 14 : C.tipo === 'insuficiente' && justificada ? 14 : !admisible && justificada ? 10 : admisible ? 6 : 2;
    c5 = lim(base + (justificada ? extras : Math.min(2, extras)));
    det.conclusion = { tipo: C.tipo, defendible: admisible, justificadaConSusDatos: justificada, citaEvidencia: cita, limitaciones: C.limitaciones.length };
  }
  const cats = { predicciones: r1(c1), seleccion: r1(c2), calculos: r1(c3), razonamiento: r1(c4), conclusion: r1(c5) };
  const total = r1(Object.values(cats).reduce((a, b) => a + b, 0));
  // pendiente de revisión docente: todo el texto libre
  const textos = [];
  for (const p of inv.predicciones) textos.push({ tipo: 'justificación de predicción', ref: 'P' + p.id, texto: p.justificacion });
  for (const r of inv.respuestas) if (r.respuesta && r.respuesta.texto) textos.push({ tipo: 'respuesta razonada', ref: r.nodo, pregunta: r.pregunta, texto: r.respuesta.texto });
  for (const x of inv.interpretaciones) textos.push({ tipo: 'revisión de interpretación', ref: x.ref, texto: x.texto });
  for (const x of inv.histHip) if (x.nota) textos.push({ tipo: 'nota de hipótesis', ref: x.h, texto: x.nota });
  if (C) textos.push({ tipo: 'justificación de la conclusión', ref: 'conclusión', texto: C.justificacion });
  return { categorias: cats, total, detalle: det, pendienteDocente: textos, provisional: true }
}
