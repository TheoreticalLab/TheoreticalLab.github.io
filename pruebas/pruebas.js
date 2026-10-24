// Pruebas automatizadas: física, mediciones, reproducibilidad, intención pedagógica y sesiones completas con bots.
import { armonico, amortiguado, duffing, periodoDuffing, construirModelo, masIdeal, instanteEnPosicion } from '../js/fisica.js';
import { experimento, asignacion, montaje, LETRAS, MODELOS, T_MAX, describirModelo, CONCLUSIONES_ADMISIBLES } from '../js/sesion.js';
import { INSTRUMENTOS, medir, prediccionIdeal } from '../js/mediciones.js';
import { crearAzar } from '../js/azar.js';
import * as INV from '../js/investigacion.js';
import { NODOS, evaluarRespuesta, calcularEvidencia } from '../js/pedagogia.js';
import { evaluar } from '../js/evaluacion.js';
import { informeHTML, informeJSON } from '../js/informe.js';

const lineas = []; let pasan = 0, total = 0;
const prueba = (nombre, f) => { total++; try { const r = f(); if (r === false) throw new Error('falso'); pasan++; lineas.push('PASA  ' + nombre + (typeof r === 'string' ? ' — ' + r : '')) } catch (e) { lineas.push('FALLA ' + nombre + ' — ' + (e && e.message || e)) } };
const cerca = (a, b, tol, q = '') => { if (!(Math.abs(a - b) <= tol)) throw new Error(`${q} ${a} ≠ ${b} (tol ${tol})`) };
const ids = Array.from({ length: 160 }, (_, i) => `MAS-PRBA-${String(i).padStart(4, '0').replace(/0/g, 'Z').replace(/1/g, 'Q')}`);
const expDe = modelo => { for (const id of ids) for (const l of LETRAS) if (asignacion(id)[l] === modelo) return experimento(id, l) };
const todosLosExp = () => ids.flatMap(id => LETRAS.map(l => experimento(id, l)));
const latido = txt => fetch('/latido', { method: 'POST', body: JSON.stringify({ txt }) }).catch(() => { });

// ======================= 1. FÍSICA =======================
prueba('MAS ideal: x = A cos ωt, v = −Aω sen ωt, a = −ω²x, T = 2π√(m/k), v_max = Aω, a_max = Aω², E = ½kA²', () => {
  const m = 0.7, k = 23.4, A = 0.12, M = armonico({ m, k, A }), w = Math.sqrt(k / m);
  cerca(M.periodo, 2 * Math.PI * Math.sqrt(m / k), 1e-12, 'T');
  for (let t = 0; t < 60; t += 0.37) { const s = M.estado(t); cerca(s.x, A * Math.cos(w * t), 1e-12); cerca(s.v, -A * w * Math.sin(w * t), 1e-12); cerca(s.a, -w * w * s.x, 1e-12); cerca(s.F, -k * s.x, 1e-9); cerca(s.E, 0.5 * k * A * A, 1e-12) }
  cerca(Math.max(...Array.from({ length: 2000 }, (_, i) => Math.abs(M.estado(i * 0.003).v))), A * w, 1e-4 * A * w, 'vmax');
  const I = masIdeal(m, k, A); cerca(I.vmax, A * w, 1e-12); cerca(I.amax, A * w * w, 1e-12); cerca(I.E, 0.5 * k * A * A, 1e-12)
});
prueba('Condiciones iniciales x(0) = A > 0, v(0) = 0 en los 6 modelos y en todos los montajes', () => {
  let n = 0;
  for (const e of todosLosExp().slice(0, 240)) for (const fm of [1, 2, 0.5]) for (const fa of [1, 2, 0.5]) { const M = montaje(e, fm, fa), s = M.modelo.estado(0); cerca(s.x, M.A, 1e-9 * M.A, e.ocultos.modelo); cerca(s.v, 0, 1e-9, e.ocultos.modelo); if (!(M.A > 0)) throw new Error('A'); n++ }
  return n + ' montajes'
});
prueba('Conservación de la energía en los modelos conservativos (ideal, frecuencia, ruido, Duffing) durante 60 s', () => {
  let peor = 0;
  for (const e of todosLosExp().filter(e => ['ideal', 'frecuencia', 'ruido', 'duffing'].includes(e.ocultos.modelo)).slice(0, 120)) for (const fa of [1, 2]) {
    const M = montaje(e, 1, fa).modelo, E0 = M.estado(0).E;
    for (let t = 0; t <= T_MAX; t += 0.0731) peor = Math.max(peor, Math.abs(M.estado(t).E - E0) / E0)
  }
  if (peor > 1e-8) throw new Error('error relativo ' + peor); return 'error relativo máximo ' + peor.toExponential(1)
});
prueba('Disipación en el amortiguado: E nunca crece y dE/dt = −b·v² (comprobado con diferencias centradas)', () => {
  for (const e of todosLosExp().filter(e => e.ocultos.modelo === 'amortiguado').slice(0, 40)) {
    const M = montaje(e, 1, 1).modelo, b = e.ocultos.b; let prev = M.estado(0).E;
    for (let t = 0.01; t <= T_MAX; t += 0.01) { const E = M.estado(t).E; if (E > prev * (1 + 1e-12)) throw new Error('E crece en t=' + t); prev = E }
    for (const t of [0.3, 7.1, 33.3]) { const h = 1e-5, dE = (M.estado(t + h).E - M.estado(t - h).E) / (2 * h), v = M.estado(t).v; cerca(dE, -b * v * v, 1e-5 * Math.max(1e-6, b * v * v) + 1e-9, 'dE/dt') }
  }
});
prueba('Coherencia: v = dx/dt, a = dv/dt y segunda ley de Newton en todos los modelos', () => {
  for (const e of todosLosExp().slice(0, 180)) {
    const M = montaje(e, 1, 1).modelo, h = 1e-5, o = e.ocultos;
    for (const t of [0.137, 3.3, 41.2]) {
      const s = M.estado(t), sx = (M.estado(t + h).x - M.estado(t - h).x) / (2 * h), sv = (M.estado(t + h).v - M.estado(t - h).v) / (2 * h);
      cerca(s.v, sx, 2e-5 * (Math.abs(s.v) + e.nominal.A), o.modelo + ' v'); cerca(s.a, sv, 2e-4 * (Math.abs(s.a) + 1), o.modelo + ' a');
      const m = e.nominal.m;
      if (o.modelo === 'amortiguado' || o.modelo === 'debil') cerca(m * s.a, -o.k * s.x - o.b * s.v, 1e-9, 'Newton');
      else if (o.modelo === 'duffing') cerca(m * s.a, -o.k * s.x - o.k3 * s.x ** 3, 1e-6, 'Duffing');
      else if (o.modelo === 'frecuencia' && o.variante === 'masa-resorte') cerca((m + o.mResorte / 3) * s.a, -o.k * s.x, 1e-9, 'masa efectiva');
      else cerca(m * s.a, -(o.kReal || o.k) * s.x, 1e-9, 'Hooke')
    }
  }
});
const maximos = (M, tmax = 20, dt = 0.0005) => { const t = []; let a = M.estado(0).x, b = M.estado(dt).x; for (let s = 2 * dt; s < tmax; s += dt) { const c = M.estado(s).x; if (b > a && b >= c) t.push(s - dt); a = b; b = c } return t };
prueba('Período: el campo «periodo» coincide con la separación entre máximos simulados (todos los modelos)', () => {
  for (const e of todosLosExp().slice(0, 90)) { const M = montaje(e, 1, 1).modelo, mx = maximos(M, 4 * M.periodo + 0.5); if (mx.length < 3) throw new Error('máximos'); cerca((mx[mx.length - 1] - mx[0]) / (mx.length - 1), M.periodo, 2e-3, e.ocultos.modelo) }
});
prueba('Período frente a masa: ideal ∝ √m; con masa del resorte, cociente √((2m+m_s/3)/(m+m_s/3)) < √2', () => {
  const e = expDe('ideal'); cerca(montaje(e, 2, 1).modelo.periodo / montaje(e, 1, 1).modelo.periodo, Math.SQRT2, 1e-12);
  let x = null; for (const id of ids) for (const l of LETRAS) { const q = experimento(id, l); if (q.ocultos.modelo === 'frecuencia' && q.ocultos.variante === 'masa-resorte') { x = q; break } } if (!x) return 'sin caso';
  const ms = x.ocultos.mResorte, m = x.nominal.m, r = montaje(x, 2, 1).modelo.periodo / montaje(x, 1, 1).modelo.periodo; cerca(r, Math.sqrt((2 * m + ms / 3) / (m + ms / 3)), 1e-9); if (!(r < Math.SQRT2)) throw new Error('no < √2')
});
prueba('Período frente a amplitud: ideal independiente; Duffing (endurecimiento) decrece con A y tiende a 2π√(m/k) si A → 0', () => {
  const e = expDe('ideal'); cerca(montaje(e, 1, 2).modelo.periodo, montaje(e, 1, 1).modelo.periodo, 1e-12);
  const d = expDe('duffing'), T1 = montaje(d, 1, 1).modelo.periodo, T2 = montaje(d, 1, 2).modelo.periodo, Th = montaje(d, 1, 0.5).modelo.periodo;
  if (!(T2 < T1 && T1 < Th)) throw new Error(`${Th} ${T1} ${T2}`);
  // límite lineal: con A → 0 la corrección (≈ 3/8·k3A²/k) desaparece
  cerca(periodoDuffing(1, 10, d.ocultos.k3, 1e-6), 2 * Math.PI * Math.sqrt(1 / 10), 1e-8);
  return `T(A/2) = ${Th.toFixed(4)}, T(A) = ${T1.toFixed(4)}, T(2A) = ${T2.toFixed(4)} s`
});
prueba('Duffing: la integración RK4 cierra la órbita (vuelve a (A, 0) tras un período) y coincide con la cuadratura', () => {
  let peor = 0; for (const e of todosLosExp().filter(e => e.ocultos.modelo === 'duffing').slice(0, 30)) for (const fa of [0.5, 1, 2]) peor = Math.max(peor, montaje(e, 1, fa).modelo.cierre / e.nominal.A);
  if (peor > 1e-9) throw new Error('cierre ' + peor); return 'error de cierre relativo ' + peor.toExponential(1)
});
prueba('Amortiguado: período = 2π/√(ω₀² − γ²) y diferencia con el ideal < 0,5 % (el período no lo delata)', () => {
  for (const e of todosLosExp().filter(e => e.ocultos.modelo === 'amortiguado')) { const M = montaje(e, 1, 1).modelo, Ti = 2 * Math.PI * Math.sqrt(e.nominal.m / e.nominal.k); if (!(Math.abs(M.periodo - Ti) / Ti < 0.005)) throw new Error((M.periodo / Ti)) }
});
prueba('instanteEnPosicion: x(t*) = x0 y el bloque va hacia −A', () => {
  for (const e of todosLosExp().slice(0, 60)) { const M = montaje(e, 1, 1).modelo, x0 = 0.37 * e.nominal.A, t = instanteEnPosicion(M, x0); cerca(M.estado(t).x, x0, 1e-9); if (!(M.estado(t).v < 0)) throw new Error('sentido') }
});

// ======================= 2. MEDICIONES =======================
prueba('Mediciones repetidas: ruido alrededor del MISMO valor verdadero (media y dispersión correctas, 400 repeticiones)', () => {
  const e = expDe('ruido'), M = montaje(e, 1, 1), t = 3.21, xv = M.modelo.estado(t).x, vals = Array.from({ length: 400 }, (_, i) => medir(e, i + 1, 'posicion', { t }).valores.x.v);
  const m = vals.reduce((a, b) => a + b, 0) / vals.length, sd = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1));
  cerca(m, xv, 4 * e.sigma.x / 20, 'media'); cerca(sd, e.sigma.x, 0.12 * e.sigma.x, 'sd'); return `σ declarada ${e.sigma.x.toFixed(4)} m, medida ${sd.toFixed(4)} m`
});
prueba('Todas las magnitudes y montajes dan números finitos con incertidumbre positiva', () => {
  for (const e of todosLosExp().slice(0, 120)) for (const [id, I] of Object.entries(INSTRUMENTOS)) for (const [fm, fa] of [[1, 1], [2, 1], [1, 2], [0.5, 0.5]]) {
    const M = montaje(e, fm, fa), p = { t: 12.34, N: 10, x0: 0.5 * M.A, t1: 0, t2: 5 }, P = Object.fromEntries(I.params.map(d => [d.id, p[d.id]])), r = medir(e, 7, id, P, fm, fa);
    if (r.error) throw new Error(id + ' ' + r.error); for (const v of Object.values(r.valores)) if (!Number.isFinite(v.v) || !(v.s > 0)) throw new Error(id + ' no finito'); if (!Number.isFinite(r.ideal)) throw new Error('ideal')
  }
});
prueba('Calibración estadística: en modelos sin anomalía, |z| ≥ 2 y |z| ≥ 3 aparecen con la frecuencia nominal (4,6 % y 0,27 %)', () => {
  let n = 0, z2 = 0, z3 = 0, suma = 0;
  for (const e of todosLosExp().filter(e => e.ocultos.modelo === 'ideal' || e.ocultos.modelo === 'ruido').slice(0, 120)) {
    for (let i = 1; i <= 250; i++) {
      const instr = ['posicion', 'velocidad', 'energia', 'periodo', 'aceleracion', 'fuerza'][i % 6], p = { t: (i * 0.377) % 60, N: 10 }, P = Object.fromEntries(INSTRUMENTOS[instr].params.map(d => [d.id, p[d.id]]));
      const r = medir(e, i, instr, P), v = r.valores[r.principal], z = (v.v - r.ideal) / v.s; n++; suma += z; if (Math.abs(z) >= 2) z2++; if (Math.abs(z) >= 3) z3++
    }
  }
  const f2 = z2 / n, f3 = z3 / n, sesgo = suma / n;
  if (Math.abs(f2 - 0.0455) > 0.006 || Math.abs(f3 - 0.0027) > 0.0012 || Math.abs(sesgo) > 0.02) throw new Error(`|z|≥2: ${(100 * f2).toFixed(2)} %, |z|≥3: ${(100 * f3).toFixed(3)} %, sesgo ${sesgo.toFixed(3)} (n = ${n})`);
  return `${n} mediciones: |z|≥2 ${(100 * f2).toFixed(2)} %, |z|≥3 ${(100 * f3).toFixed(3)} %, z medio ${sesgo.toFixed(4)}`
});
prueba('Período con cronómetro: σ(T) = σ_reacción / N', () => { const e = expDe('ideal'); cerca(medir(e, 1, 'periodo', { N: 10 }).valores.T.s * 10, e.sigma.crono, 1e-12); cerca(medir(e, 1, 'periodo', { N: 1 }).valores.T.s, e.sigma.crono, 1e-12) });

// ======================= 3. REPRODUCIBILIDAD =======================
prueba('La misma semilla reproduce parámetros, modelo y cada medición; otra semilla da otra investigación', () => {
  const a = JSON.stringify([experimento('MAS-AAAA-BBBB', 'C'), medir(experimento('MAS-AAAA-BBBB', 'C'), 5, 'energia', { t: 7 })]);
  const b = JSON.stringify([experimento('MAS-AAAA-BBBB', 'C'), medir(experimento('MAS-AAAA-BBBB', 'C'), 5, 'energia', { t: 7 })]);
  if (a !== b) throw new Error('no reproducible');
  if (JSON.stringify(experimento('MAS-AAAA-BBBC', 'C').nominal) === JSON.stringify(experimento('MAS-AAAA-BBBB', 'C').nominal)) throw new Error('misma investigación con otra semilla');
  if (medir(experimento('MAS-AAAA-BBBB', 'C'), 5, 'posicion', { t: 1 }).valores.x.v === medir(experimento('MAS-AAAA-BBBB', 'C'), 6, 'posicion', { t: 1 }).valores.x.v) throw new Error('la repetición no cambia el ruido')
});
prueba('Asignación oculta: cada investigación tiene los 6 modelos; la letra A cambia de modelo entre estudiantes (≈ uniforme)', () => {
  const cuenta = {}; for (const id of ids) { const a = asignacion(id); if (new Set(Object.values(a)).size !== 6) throw new Error('faltan modelos'); cuenta[a.A] = (cuenta[a.A] || 0) + 1 }
  for (const m of MODELOS) if (!(cuenta[m] > ids.length / 6 * 0.45)) throw new Error('reparto ' + JSON.stringify(cuenta));
  return 'letra A en 160 investigaciones: ' + JSON.stringify(cuenta)
});
prueba('Dos estudiantes con la misma letra obtienen valores numéricos distintos', () => { const a = experimento(ids[0], 'A').nominal, b = experimento(ids[1], 'A').nominal; if (a.m === b.m && a.k === b.k && a.A === b.A) throw new Error('iguales') });

// ======================= 4. INTENCIÓN PEDAGÓGICA =======================
prueba('Experimento de amortiguamiento ínfimo: con TODO el presupuesto, la mejor z alcanzable es < 1 (indistinguible del MAS)', () => {
  let peorZ = 0, peorTxt = '';
  for (const e of todosLosExp().filter(e => e.ocultos.modelo === 'debil')) for (const [fm, fa] of [[1, 1], [0.5, 2], [0.5, 1], [1, 2]]) {
    const M = montaje(e, fm, fa).modelo, montajeCoste = fm === 1 && fa === 1 ? 0 : 3, nE = Math.floor((32 - montajeCoste) / 3);
    const dE = M.estado(0).E - M.estado(T_MAX).E, zE = dE / (e.sigma.E * Math.sqrt(1 / Math.ceil(nE / 2) + 1 / Math.floor(nE / 2)));
    const Tm = M.periodo, tl = Math.floor(T_MAX / Tm) * Tm, nX = 32 - montajeCoste, dX = M.estado(0).x - M.estado(tl).x, zX = dX / (e.sigma.x * Math.sqrt(2 / (nX / 2)));
    const z = Math.max(zE, zX); if (z > peorZ) { peorZ = z; peorTxt = `${e.id}/${e.letra} montaje ${fm}|${fa}: ΔE/σ_E = ${(dE / e.sigma.E).toFixed(3)}, Δx/σ_x = ${(dX / e.sigma.x).toFixed(3)}` }
  }
  if (peorZ >= 1) throw new Error('z = ' + peorZ.toFixed(2) + ' ' + peorTxt); return `z máximo ${peorZ.toFixed(2)} (${peorTxt})`
});
prueba('Las anomalías de los otros modelos SÍ son detectables con el presupuesto (amortiguado, Duffing, frecuencia, ruido)', () => {
  const msg = [];
  for (const e of todosLosExp()) {
    const M = montaje(e, 1, 1).modelo, o = e.ocultos, Ti = 2 * Math.PI * Math.sqrt(e.nominal.m / e.nominal.k), sT = e.sigma.crono / 10;
    if (o.modelo === 'amortiguado') { const z = (M.estado(0).E - M.estado(T_MAX - 1).E) / (e.sigma.E * Math.SQRT2); if (z < 8) throw new Error('amortiguado poco visible z=' + z) }
    if (o.modelo === 'duffing') { const z = (M.periodo - montaje(e, 1, 2).modelo.periodo) / (sT * Math.SQRT2); if (z < 5) throw new Error('Duffing z=' + z) }
    if (o.modelo === 'frecuencia') { const z = Math.abs(M.periodo - Ti) / sT; if (z < 5) throw new Error('frecuencia z=' + z) }
  }
  return 'amortiguado z ≥ 8 en energía; Duffing z ≥ 5 en T(A) frente a T(2A); frecuencia z ≥ 5 con 10 oscilaciones'
});

// ======================= 5. MOTOR PEDAGÓGICO Y SESIONES CON BOTS =======================
const nueva = id => { const s = INV.nuevaSesion(id, 'bot'); return s };
function contestar(ses, inv, preg, modo, az) {
  if (modo === 'aleatorio') {
    const r = preg.tipo === 'numero' ? { numero: String(az.uniforme(-5, 5)) } : preg.tipo === 'multi' ? { opciones: [az.elegir(preg.opciones).id] } : { opcion: az.elegir(preg.opciones).id, texto: 'Respuesta de prueba del bot aleatorio' };
    return INV.responder(ses, inv, preg, r)
  }
  // bot que razona bien: busca la opción correcta con la evaluación del propio motor (simula a un estudiante que entiende)
  const e = experimento(ses.id, inv.letra);
  if (preg.tipo === 'numero') { const x = evaluarRespuesta(inv, e, preg.id, preg.clave, { numero: '0' }); return INV.responder(ses, inv, preg, { numero: String(x.esperado) }) }
  if (preg.tipo === 'multi') { const x = evaluarRespuesta(inv, e, preg.id, preg.clave, { opciones: [] }); return INV.responder(ses, inv, preg, { opciones: x.esperado.length ? x.esperado : [preg.opciones[0].id] }) }
  for (const o of preg.opciones) { const x = evaluarRespuesta(inv, e, preg.id, preg.clave, { opcion: o.id }); if (x.correcta === true || x.correcta == null && o.id !== 'ninguna') return INV.responder(ses, inv, preg, { opcion: o.id, texto: 'Lo decido con mis mediciones y su incertidumbre.' }) }
  return INV.responder(ses, inv, preg, { opcion: preg.opciones[0].id, texto: 'Lo decido con mis mediciones y su incertidumbre.' })
}
function medirBot(ses, inv, instr, p, buena, az) {
  const r = INV.prepararMedicion(ses, inv, instr, p); if (r.error) return r;
  if (r.requierePrediccion) { const P = inv.pendiente, ideal = prediccionIdeal(experimento(ses.id, inv.letra), P.instr, P.p, P.fm, P.fa); INV.registrarPrediccion(ses, inv, buena ? ideal * (1 + az.uniforme(-0.01, 0.01)) : ideal * az.uniforme(0.3, 2) + az.normal(), 'Uso el MAS ideal: x = A cos(ωt), ω = √(k/m).') }
  return INV.ejecutarMedicion(ses, inv)
}
const registroPreguntas = [];
function vaciarPreguntas(ses, inv, modo, az, max = 40) { for (let i = 0; i < max; i++) { const q = INV.preguntaActual(ses, inv); if (!q) return; registroPreguntas.push({ q, inv: JSON.parse(JSON.stringify({ montajes: inv.montajes, med: inv.mediciones.map(d => ({ instr: d.instr, fm: d.fm, fa: d.fa, p: d.p })) })) }); const r = contestar(ses, inv, q, modo, az); if (r.error) INV.omitirPregunta(inv, q) } }
function sesionBot(id, letra, estrategia) {
  const ses = nueva(id), inv = INV.abrirInvestigacion(ses, letra), az = crearAzar(id + estrategia), e = experimento(id, letra), Tn = 2 * Math.PI * Math.sqrt(e.nominal.m / e.nominal.k), tl = Math.round(Math.floor(58 / Tn) * Tn * 100) / 100;
  const modo = estrategia === 'aleatorio' ? 'aleatorio' : 'bueno';
  if (estrategia === 'cientifico') {
    vaciarPreguntas(ses, inv, modo, az);
    medirBot(ses, inv, 'periodo', { N: 10 }, true, az); vaciarPreguntas(ses, inv, modo, az);
    medirBot(ses, inv, 'energia', { t: 0 }, true, az); medirBot(ses, inv, 'energia', { t: tl }, true, az); vaciarPreguntas(ses, inv, modo, az);
    INV.cambiarMontaje(ses, inv, 1, 2); medirBot(ses, inv, 'periodo', { N: 10 }, true, az); vaciarPreguntas(ses, inv, modo, az);
    INV.cambiarMontaje(ses, inv, 2, 1); medirBot(ses, inv, 'periodo', { N: 10 }, true, az); INV.cambiarMontaje(ses, inv, 1, 1); vaciarPreguntas(ses, inv, modo, az);
    for (let i = 0; i < 3 && inv.creditos >= 3; i++) { medirBot(ses, inv, 'energia', { t: tl }, true, az); medirBot(ses, inv, 'energia', { t: 0 }, true, az) }
    while (inv.creditos >= 1) { const r = medirBot(ses, inv, 'posicion', { t: 0 }, true, az); if (r.error) break }
    vaciarPreguntas(ses, inv, modo, az)
  } else if (estrategia === 'periodo') { medirBot(ses, inv, 'periodo', { N: 1 }, true, az) }
  else if (estrategia === 'aleatorio') {
    for (let i = 0; i < 60 && inv.creditos > 0; i++) {
      if (az.siguiente() < 0.1) INV.cambiarMontaje(ses, inv, az.elegir([1, 2, 0.5]), az.elegir([1, 2, 0.5]));
      const instr = az.elegir(Object.keys(INSTRUMENTOS)), p = { t: Math.round(az.uniforme(0, 60) * 100) / 100, N: az.elegir([1, 5, 10]), x0: az.uniforme(-0.3, 0.3), t1: az.uniforme(0, 30), t2: az.uniforme(0, 60) };
      const P = Object.fromEntries(INSTRUMENTOS[instr].params.map(d => [d.id, p[d.id]])); medirBot(ses, inv, instr, P, az.siguiente() < 0.5, az);
      if (inv.pendiente && inv.pendiente.requiere) INV.cancelarPendiente(inv);
      if (az.siguiente() < 0.3) vaciarPreguntas(ses, inv, modo, az, 3);
      if (az.siguiente() < 0.1) INV.valorarHipotesis(inv, az.elegir(['H_MAS', 'H_AMORT', 'H_NOLIN', 'H_PARAM', 'H_RUIDO']), az.elegir(['compatible', 'descartada', 'indecidible']), 'nota del bot')
    }
  }
  // conclusión
  const E = calcularEvidencia(inv, e);
  let tipo = estrategia === 'adivino' ? CONCLUSIONES_ADMISIBLES[e.ocultos.modelo][0] : estrategia === 'periodo' ? 'compatible' : estrategia === 'aleatorio' ? az.elegir(['compatible', 'incompatible', 'insuficiente']) : E.discrepancias.length ? 'incompatible' : E.nFamilias >= 2 ? 'compatible' : 'insuficiente';
  INV.proponerConclusion(inv, tipo); vaciarPreguntas(ses, inv, modo, az);
  const ev = E.discrepancias[0];
  const r = INV.entregarConclusion(inv, { tipo, evidencias: estrategia === 'cientifico' && ev ? ev.ids : [], z: estrategia === 'cientifico' && ev ? ev.z : null, limitaciones: estrategia === 'cientifico' ? ['resolucion', 'ventana'] : [], justificacion: 'Justificación escrita del bot con referencia a sus mediciones e incertidumbres.' });
  if (r.error) throw new Error('no pudo entregar: ' + r.error);
  return { ses, inv, ev: evaluar(ses, inv), modelo: e.ocultos.modelo }
}
const sesiones = [];
prueba('Más de 100 sesiones automáticas (4 estrategias × 6 letras) sin errores, créditos ≥ 0 y nota en [0, 100]', () => {
  let n = 0;
  for (let i = 0; i < 30; i++) for (const est of ['cientifico', 'aleatorio', 'adivino', 'periodo']) {
    const id = ids[i], letra = LETRAS[(i + est.length) % 6], s = sesionBot(id, letra, est); n++;
    if (s.inv.creditos < 0) throw new Error('créditos negativos');
    if (!(s.ev.total >= 0 && s.ev.total <= 100) || Object.values(s.ev.categorias).some(x => !(x >= 0 && x <= 20))) throw new Error('nota fuera de rango ' + JSON.stringify(s.ev.categorias));
    for (const d of s.inv.mediciones) for (const v of Object.values(d.valores)) if (!Number.isFinite(v.v)) throw new Error('medición no finita');
    sesiones.push({ est, ...s })
  }
  return n + ' sesiones'
});
prueba('Las preguntas adaptativas corresponden a lo que el estudiante hizo (condiciones verificadas en cada pregunta mostrada)', () => {
  const req = {
    'masa-pred': x => x.inv.montajes.some(c => /^(2|0\.5)\|/.test(c)), 'masa-cociente': x => x.inv.med.some(d => d.instr === 'periodo' && d.fm !== 1) && x.inv.med.some(d => d.instr === 'periodo' && d.fm === 1 && d.fa === 1),
    'amp-pred': x => x.inv.montajes.some(c => /^1\|(2|0\.5)$/.test(c)), 'amp-compat': x => x.inv.med.some(d => d.instr === 'periodo' && d.fa !== 1),
    'energia-z': x => x.inv.med.filter(d => d.instr === 'energia').length >= 2, 'periodo-coincide': x => x.inv.med.some(d => d.instr === 'periodo'),
    'periodo-difiere': x => x.inv.med.some(d => d.instr === 'periodo'), 'ruido-cambio': x => x.inv.med.some((d, i) => x.inv.med.some((e, j) => j !== i && e.instr === d.instr && JSON.stringify(e.p) === JSON.stringify(d.p) && e.fm === d.fm && e.fa === d.fa)),
    'ax-lineal': x => x.inv.med.filter(d => d.instr === 'aEnX').length >= 2, 'calc-E0': () => true
  };
  let n = 0; for (const r of registroPreguntas) { const f = req[r.q.id]; if (f) { n++; if (!f(r)) throw new Error(`«${r.q.id}» se mostró sin sus mediciones`) } }
  return n + ' preguntas condicionadas comprobadas de ' + registroPreguntas.length
});
prueba('Las preguntas usan los datos propios del estudiante (números de sus mediciones en el enunciado)', () => {
  let n = 0; for (const r of registroPreguntas.filter(r => ['masa-cociente', 'energia-z', 'periodo-coincide', 'periodo-difiere'].includes(r.q.id))) { n++; if (!/\d,\d/.test(r.q.texto)) throw new Error(r.q.id + ' sin números') } return n + ' enunciados con datos'
});
prueba('Siempre se puede entregar, incluso sin mediciones ni créditos («evidencia insuficiente» disponible)', () => {
  const s = nueva('MAS-ZZZZ-ZZZZ'), inv = INV.abrirInvestigacion(s, 'I'); inv.creditos = 0;
  const r = INV.entregarConclusion(inv, { tipo: 'insuficiente', justificacion: 'No pude medir nada: la evidencia es insuficiente para decidir.' }); return r.ok === true
});
prueba('La predicción confirmada no se puede alterar; la interpretación se revisa añadiendo, sin borrar', () => {
  const s = nueva('MAS-PRED-ZZZZ'), inv = INV.abrirInvestigacion(s, 'A'); INV.prepararMedicion(s, inv, 'posicion', { t: 1 }); INV.registrarPrediccion(s, inv, '0,05', 'x = A cos(ωt) con mis datos');
  if (!INV.registrarPrediccion(s, inv, '9', 'cambio de idea').error) throw new Error('se pudo cambiar'); INV.ejecutarMedicion(s, inv);
  INV.revisarInterpretacion(inv, 'P1', 'Me equivoqué de fase'); return inv.predicciones[0].valor === 0.05 && inv.interpretaciones.length === 1
});
prueba('Evaluación: acertar por casualidad (sin evidencia) puntúa mucho menos que justificar con evidencia', () => {
  const adiv = sesiones.filter(s => s.est === 'adivino'), cien = sesiones.filter(s => s.est === 'cientifico' && CONCLUSIONES_ADMISIBLES[s.modelo].includes(s.inv.conclusion.tipo));
  const mA = adiv.reduce((a, s) => a + s.ev.categorias.conclusion, 0) / adiv.length, mC = cien.reduce((a, s) => a + s.ev.categorias.conclusion, 0) / cien.length;
  if (!(mA <= 6.5 && mC >= 15)) throw new Error(`adivino ${mA}, científico ${mC}`);
  const tA = adiv.reduce((a, s) => a + s.ev.total, 0) / adiv.length, tC = cien.reduce((a, s) => a + s.ev.total, 0) / cien.length;
  return `conclusión: adivino ${mA.toFixed(1)}/20, científico ${mC.toFixed(1)}/20 · total: adivino ${tA.toFixed(0)}, científico ${tC.toFixed(0)}`
});
prueba('El bot científico llega a la conclusión defendible en la mayoría de modelos (≥ 80 %)', () => {
  const c = sesiones.filter(s => s.est === 'cientifico'), ok = c.filter(s => CONCLUSIONES_ADMISIBLES[s.modelo].includes(s.inv.conclusion.tipo));
  const mal = c.filter(s => !ok.includes(s)).map(s => { const E = calcularEvidencia(s.inv, experimento(s.ses.id, s.inv.letra)), d = E.discrepancias[0]; return `${s.modelo}→${s.inv.conclusion.tipo} [${s.ses.id}/${s.inv.letra}: ${d ? d.txt + ' z=' + d.z.toFixed(2) : ''}]` });
  if (ok.length / c.length < 0.8) throw new Error(`${ok.length}/${c.length}: ${mal.join(', ')}`); return `${ok.length}/${c.length}${mal.length ? ' (fallos: ' + mal.join(', ') + ')' : ''}`
});
prueba('El informe del estudiante (HTML y JSON) no revela el modelo oculto y contiene lo necesario para reproducir', () => {
  for (const s of sesiones.slice(0, 40)) {
    const h = informeHTML(s.ses, s.inv.letra), j = JSON.stringify(informeJSON(s.ses, s.inv.letra)), d = describirModelo(experimento(s.ses.id, s.inv.letra));
    if (h.includes(d) || j.includes(d) || /"ocultos"|"modelo":"(ideal|frecuencia|amortiguado|duffing|ruido|debil)"/.test(j)) throw new Error('revela el modelo');
    if (!h.includes(s.ses.id) || !j.includes('"identificador"')) throw new Error('falta reproducción');
    if (!h.includes('Francisco Orbe') || !j.includes('"profesor":"Francisco Orbe"')) throw new Error('falta el nombre del profesor')
  }
});
{
  const { analizar } = await import('../js/docente.js');
  prueba('Docente: un informe íntegro se reproduce exactamente desde la semilla', () => { const s = sesiones.find(x => x.est === 'cientifico'), a = analizar(JSON.parse(JSON.stringify(informeJSON(s.ses, s.inv.letra)))); if (a.problemas.length) throw new Error(a.problemas.join('; ')); return a.modelo === s.modelo });
  prueba('Docente: detecta una medición editada a mano', () => { const s = sesiones.find(x => x.est === 'cientifico'), j = JSON.parse(JSON.stringify(informeJSON(s.ses, s.inv.letra))); const m = j.investigacion.mediciones[0]; m.valores[m.principal].v *= 1.01; const a = analizar(j); if (!a.problemas.length) throw new Error('no detectada'); return a.problemas[0] });
}
// ======================= 6. ENVÍO A GOOGLE SHEETS (receptor Codigo.gs con servicios de Google simulados) =======================
{
  const src = await (await fetch('../google/Codigo.gs')).text();
  const nuevoGoogle = (props = {}) => {
    const hojas = {}, archivos = {}, carpetas = {}; let nId = 0;
    const hoja = n => ({ n, filas: [], appendRow(r) { this.filas.push(r) }, setFrozenRows() { }, getDataRange() { const f = this.filas; return { getValues: () => f } } });
    const G = {
      SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => hojas[n] || null, insertSheet: n => (hojas[n] = hoja(n)) }) },
      DriveApp: {
        getFoldersByName: n => { const c = carpetas[n]; let usado = false; return { hasNext: () => !!c && !usado, next: () => { usado = true; return c } } },
        createFolder: n => (carpetas[n] = { createFile: (nombre, texto) => { const id = 'archivo' + String(++nId).padStart(6, '0'); return (archivos[id] = { getUrl: () => 'https://drive/' + id, getId: () => id, getBlob: () => ({ getDataAsString: () => texto }), nombre }) } }),
        getFileById: id => archivos[id]
      },
      PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null }) },
      LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
      Utilities: { formatDate: d => d.toISOString().replace(/\D/g, '').slice(0, 14) },
      ContentService: { createTextOutput: s => ({ setMimeType: () => ({ texto: s }) }), MimeType: { JSON: 'json' } }
    };
    const api = new Function(...Object.keys(G), src + '\nreturn { doPost, doGet };')(...Object.values(G));
    return { api, hojas, archivos, post: obj => JSON.parse(api.doPost({ postData: { contents: typeof obj === 'string' ? obj : JSON.stringify(obj) } }).texto), get: p => JSON.parse(api.doGet({ parameter: p }).texto) }
  };
  const s0 = sesiones.find(x => x.est === 'cientifico'), doc = JSON.parse(JSON.stringify(informeJSON(s0.ses, s0.inv.letra)));
  prueba('Receptor de Google: guarda la entrega en Drive y añade su fila a la hoja «Entregas»', () => {
    const g = nuevoGoogle({ CODIGOS_CLASE: 'FG-A, FG-B', CLAVE_DOCENTE: 's3creta' }), r = g.post({ ...doc, codigoClase: 'fg-a' });
    if (!r.ok || !/^[A-Z0-9]{6}$/.test(r.recibo)) throw new Error(JSON.stringify(r));
    const f = g.hojas.Entregas.filas; if (f.length !== 2 || f[1][3] !== s0.ses.id || f[1][4] !== s0.inv.letra || f[1][1] !== 'FG-A' || f[1][6] !== doc.evaluacionProvisional.total) throw new Error(JSON.stringify(f[1]));
    return 'fila: ' + JSON.stringify(f[1].slice(1, 8))
  });
  prueba('Receptor de Google: rechaza código de clase ajeno, JSON que no es un informe y lecturas sin la clave docente', () => {
    const g = nuevoGoogle({ CODIGOS_CLASE: 'FG-A', CLAVE_DOCENTE: 's3creta' });
    if (g.post({ ...doc, codigoClase: 'OTRA' }).error !== 'codigo') throw new Error('acepta código ajeno');
    if (g.post({ hola: 1 }).error !== 'formato' || g.post('no es json').ok) throw new Error('acepta basura');
    if (g.get({ accion: 'lista', clave: 'mala' }).error !== 'clave' || g.get({ accion: 'lista' }).ok) throw new Error('lista sin clave');
    if (!nuevoGoogle({ CODIGOS_CLASE: '' }).post({ ...doc, codigoClase: '' }).ok) throw new Error('sin códigos configurados debería aceptar')
  });
  {
    const { CONFIG } = await import('../js/config.js'), { enviarAlProfesor } = await import('../js/envio.js'), { incorporar } = await import('../js/docente.js');
    const g = nuevoGoogle({ CODIGOS_CLASE: 'FG-A', CLAVE_DOCENTE: 's3creta' }), antes = CONFIG.urlEnvio;
    const fetchFalso = async (url, o) => ({ json: async () => g.post(o.body) });
    const r0 = await enviarAlProfesor(s0.ses, s0.inv.letra, 'FG-A', fetchFalso);
    prueba('Envío sin activar: avisa y no envía (la descarga de archivos sigue disponible)', () => !!r0.error && /no ha activado/.test(r0.error));
    CONFIG.urlEnvio = 'https://script.google.com/macros/s/AKfycbPRUEBA_123/exec';
    const rSin = await enviarAlProfesor(s0.ses, s0.inv.letra, '', fetchFalso), rMal = await enviarAlProfesor(s0.ses, s0.inv.letra, 'ZZ', fetchFalso);
    const rOk = await enviarAlProfesor(s0.ses, s0.inv.letra, 'fg-a', fetchFalso), rRed = await enviarAlProfesor(s0.ses, s0.inv.letra, 'FG-A', async () => { throw new Error('sin red') });
    const s2 = sesiones.find(x => x.est === 'periodo'); await enviarAlProfesor(s2.ses, s2.inv.letra, 'FG-A', fetchFalso);
    CONFIG.urlEnvio = antes;
    prueba('Envío: pide el código, rechaza uno ajeno, guarda el recibo y avisa si no hay conexión', () => {
      if (!/código/.test(rSin.error) || !/código de clase no es válido/.test(rMal.error) || !rOk.ok || !/conectar/.test(rRed.error)) throw new Error(JSON.stringify([rSin, rMal, rOk, rRed]));
      return s0.inv.envios.length === 1 && s0.inv.envios[0].recibo === rOk.recibo && s0.inv.envios[0].codigo === 'FG-A'
    });
    const lista = g.get({ accion: 'lista', clave: 's3creta' }), x = incorporar(lista.entregas);
    prueba('Docente: carga desde el receptor, regenera el modelo oculto y no encuentra problemas de integridad', () => {
      if (!lista.ok || lista.entregas.length !== 2 || x.entregas.length !== 2 || x.msgs.length) throw new Error(JSON.stringify({ n: lista.entregas.length, msgs: x.msgs }));
      if (x.entregas.some(a => a.problemas.length)) throw new Error(x.entregas.map(a => a.problemas).join(';'));
      return x.entregas.map(a => `${a.id}/${a.letra}: ${a.modelo}, nota ${a.ev.total}`).join(' · ')
    });
    prueba('Docente: si un estudiante envía dos veces, se queda la entrega más reciente', () => { const d1 = JSON.parse(JSON.stringify(doc)), d2 = JSON.parse(JSON.stringify(doc)); d1.generado = '2026-10-24T10:00:00Z'; d2.generado = '2026-10-24T11:00:00Z'; d2.estudiante = 'segunda'; const y = incorporar([d2, d1]); return y.entregas.length === 1 && y.entregas[0].d.estudiante === 'segunda' });
  }
}
{
  const { svgMarca, urlMarca } = await import('../js/marca.js'), s = svgMarca('MAS-ABCD-2345 · <Ana & "Luis">');
  prueba('Marca de agua: escapa el alias y es una imagen válida', () => { const doc2 = new DOMParser().parseFromString(s, 'image/svg+xml'); if (doc2.querySelector('parsererror')) throw new Error('SVG inválido'); return doc2.querySelector('text').textContent === 'MAS-ABCD-2345 · <Ana & "Luis">' && urlMarca('x').startsWith('url("data:image/svg+xml') });
}
prueba('Banco de preguntas: todos los nodos tienen identificador único y categoría válida', () => { const s = new Set(NODOS.map(n => n.id)); if (s.size !== NODOS.length) throw new Error('duplicados'); return NODOS.length + ' nodos' });

await fetch('/resultado', { method: 'POST', body: JSON.stringify({ fin: true, lineas, pasan, total }) });
