// EVIDENCIA · lo que el estudiante sabe de verdad: resúmenes estadísticos de SUS mediciones (nunca del modelo oculto).
// La pedagogía y la evaluación solo leen esto. z = (observado − esperado) / incertidumbre.
import { masIdeal } from './fisica.js';
import { INSTRUMENTOS } from './mediciones.js';

const media = a => a.reduce((s, x) => s + x, 0) / a.length;
const sdm = a => { if (a.length < 2) return null; const m = media(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) };
export const claveGrupo = d => `${d.instr}|${JSON.stringify(d.p)}|${d.fm}|${d.fa}`;

/** Promedio ponderado de mediciones de una magnitud con su incertidumbre. */
function combina(ms) {
  if (!ms.length) return null;
  const w = ms.map(d => 1 / d.s ** 2), W = w.reduce((a, b) => a + b, 0);
  return { v: ms.reduce((a, d, i) => a + d.v * w[i], 0) / W, s: 1 / Math.sqrt(W), n: ms.length, ids: ms.map(d => d.n) };
}

export function calcularEvidencia(inv, exp) {
  const nom = exp.nominal, ideal0 = masIdeal(nom.m, nom.k, nom.A), Tn = ideal0.T;
  const meds = inv.mediciones.map(d => {
    const pr = d.valores[d.principal], z = (pr.v - d.ideal) / pr.s;
    return { ...d, v: pr.v, s: pr.s, z, rel: (pr.v - d.ideal) / (Math.abs(d.escala) || 1) };
  });
  const E = { meds, Tn, nominal: nom, creditos: inv.creditos, gastado: 32 - inv.creditos };
  // grupos de repeticiones (mismo instrumento, mismos parámetros, mismo montaje)
  const grupos = {};
  for (const d of meds) (grupos[claveGrupo(d)] = grupos[claveGrupo(d)] || []).push(d);
  E.grupos = Object.values(grupos).map(g => ({ instr: g[0].instr, p: g[0].p, fm: g[0].fm, fa: g[0].fa, ids: g.map(d => d.n), vals: g.map(d => d.v), s: g[0].s, n: g.length, media: media(g.map(d => d.v)), sd: sdm(g.map(d => d.v)), ideal: g[0].ideal, unidad: g[0].valores[g[0].principal].u, mag: INSTRUMENTOS[g[0].instr].nombre }));
  for (const g of E.grupos) g.z = (g.media - g.ideal) / (g.s / Math.sqrt(g.n));
  E.repetidos = E.grupos.filter(g => g.n >= 2 && g.instr !== 'serie');
  /* Discrepancias frente al MAS ideal nominal, por GRUPO de mediciones iguales (z de la media). Una medición aislada solo cuenta
     como significativa si se aleja ≥ 5σ: entre muchas mediciones, alguna cae a 3σ por puro azar (comparaciones múltiples);
     a partir de 3σ hace falta confirmarla repitiendo. */
  const sig = g => g.instr !== 'serie' && Math.abs(g.z) >= 3 && (g.n >= 2 || Math.abs(g.z) >= 5);
  E.significativas = E.grupos.filter(sig).map(g => ({ ...meds.find(d => d.n === g.ids[0]), z: g.z, ids: g.ids, n: g.ids[0], nRep: g.n }));
  E.dudosas = E.grupos.filter(g => g.instr !== 'serie' && !sig(g) && Math.abs(g.z) >= 2).map(g => ({ ...meds.find(d => d.n === g.ids[0]), z: g.z, ids: g.ids, nRep: g.n, sinConfirmar: Math.abs(g.z) >= 3 }));
  // período por montaje (todas las mediciones de período del montaje, ponderadas)
  const periodo = (fm, fa) => combina(meds.filter(d => d.instr === 'periodo' && d.fm === fm && d.fa === fa));
  E.T = periodo(1, 1);
  if (E.T) { E.T.ideal = Tn; E.T.z = (E.T.v - Tn) / E.T.s; E.T.pct = 100 * (E.T.v - Tn) / Tn }
  // dependencia con la masa y con la amplitud (cocientes de períodos, con propagación de incertidumbre)
  const cociente = (a, b, esperado) => { if (!a || !b) return null; const r = a.v / b.v, s = r * Math.hypot(a.s / a.v, b.s / b.v); return { r, s, esperado, z: (r - esperado) / s, ids: [...a.ids, ...b.ids] } };
  for (const fm of [2, 0.5]) { const T2 = periodo(fm, 1); if (T2 && E.T) { E.masa = { fm, ...cociente(T2, E.T, Math.sqrt(fm)), T2 }; break } }
  for (const fa of [2, 0.5]) { const T2 = periodo(1, fa); if (T2 && E.T) { E.amplitud = { fa, ...cociente(T2, E.T, 1), T2 }; break } }
  E.montajes = [...new Set(meds.map(d => d.fm + '|' + d.fa).concat(inv.montajes || []))];
  // energía en el tiempo (mismo montaje): grupo temprano y grupo tardío
  E.energia = null;
  for (const cfg of E.montajes) {
    const es = meds.filter(d => d.instr === 'energia' && d.fm + '|' + d.fa === cfg);
    if (es.length < 2) continue;
    const t0 = Math.min(...es.map(d => d.p.t)), t1 = Math.max(...es.map(d => d.p.t));
    if (t1 - t0 < 0.5) continue;
    const a = combina(es.filter(d => d.p.t <= t0 + 1)), b = combina(es.filter(d => d.p.t >= t1 - 1));
    const z = (b.v - a.v) / Math.hypot(a.s, b.s), cand = { cfg, t0, t1, E1: a, E2: b, z, dT: (t1 - t0) / Tn, pct: 100 * (b.v - a.v) / a.v };
    if (!E.energia || cand.dT > E.energia.dT) E.energia = cand
  }
  // amplitud en el tiempo: posiciones cerca de los máximos previstos (t ≈ n·T_nominal), temprano frente a tarde
  const maximos = meds.filter(d => d.instr === 'posicion' && d.fm === 1 && d.fa === 1 && Math.abs(d.p.t / Tn - Math.round(d.p.t / Tn)) < 0.03);
  if (maximos.length >= 2) {
    const t0 = Math.min(...maximos.map(d => d.p.t)), t1 = Math.max(...maximos.map(d => d.p.t));
    if (t1 - t0 >= 3 * Tn) { const a = combina(maximos.filter(d => d.p.t <= t0 + 1)), b = combina(maximos.filter(d => d.p.t >= t1 - 1)); E.amplitudTiempo = { t0, t1, X1: a, X2: b, z: (b.v - a.v) / Math.hypot(a.s, b.s), dT: (t1 - t0) / Tn } }
  }
  // aceleración frente a posición: a/x en distintas posiciones
  const ax = meds.filter(d => d.instr === 'aEnX' && Math.abs(d.p.x0) > 1e-9 && d.fm === 1 && d.fa === 1).map(d => ({ n: d.n, x0: d.p.x0, r: d.v / d.p.x0, s: d.s / Math.abs(d.p.x0) }));
  E.ax = ax;
  if (ax.length >= 2) {
    const ord = ax.slice().sort((a, b) => Math.abs(a.x0) - Math.abs(b.x0)), p = ord[0], q = ord[ord.length - 1];
    if (Math.abs(q.x0) >= 1.3 * Math.abs(p.x0)) E.axComp = { p, q, z: (q.r - p.r) / Math.hypot(p.s, q.s), w2: ideal0.w ** 2 }
  }
  // familias de pruebas discriminantes realizadas
  E.familias = {
    energiaTiempo: !!(E.energia && E.energia.dT >= 5) || !!(E.amplitudTiempo && E.amplitudTiempo.dT >= 5),
    amplitud: !!E.amplitud, masa: !!E.masa, repeticiones: E.repetidos.some(g => g.n >= 3),
    posicionFuerza: !!E.axComp, periodo: !!E.T
  };
  E.nFamilias = ['energiaTiempo', 'amplitud', 'masa', 'repeticiones', 'posicionFuerza'].filter(k => E.familias[k]).length;
  // la discrepancia más fuerte disponible (individual, de cociente o de energía)
  const cand = [];
  for (const d of E.significativas) cand.push({ tipo: 'medicion', ids: d.ids, z: d.z, txt: `${INSTRUMENTOS[d.instr].nombre} (${d.nRep > 1 ? 'media de las mediciones #' + d.ids.join(', #') : 'medición #' + d.n})` });
  if (E.T && Math.abs(E.T.z) >= 3) cand.push({ tipo: 'periodo', ids: E.T.ids, z: E.T.z, txt: 'período medido frente a 2π√(m/k)' });
  if (E.masa && Math.abs(E.masa.z) >= 3) cand.push({ tipo: 'masa', ids: E.masa.ids, z: E.masa.z, txt: `cociente T(${E.masa.fm}m)/T(m) frente a √${E.masa.fm}` });
  if (E.amplitud && Math.abs(E.amplitud.z) >= 3) cand.push({ tipo: 'amplitud', ids: E.amplitud.ids, z: E.amplitud.z, txt: 'período con otra amplitud' });
  if (E.energia && Math.abs(E.energia.z) >= 3) cand.push({ tipo: 'energia', ids: [...E.energia.E1.ids, ...E.energia.E2.ids], z: E.energia.z, txt: 'energía temprana frente a tardía' });
  if (E.axComp && Math.abs(E.axComp.z) >= 3) cand.push({ tipo: 'ax', ids: [E.axComp.p.n, E.axComp.q.n], z: E.axComp.z, txt: 'a/x en dos posiciones' });
  E.discrepancias = cand.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  // predicciones: error de cálculo del estudiante (frente al MAS ideal) y frente a lo observado
  E.predicciones = inv.predicciones.map(p => {
    const d = meds.find(x => x.n === p.medicion), esc = d ? Math.abs(d.escala) || 1 : 1;
    return { ...p, errIdeal: Math.abs(p.valor - p.ideal) / esc, zObs: d ? (d.v - p.valor) / d.s : null, obs: d ? d.v : null, s: d ? d.s : null }
  });
  return E
}
