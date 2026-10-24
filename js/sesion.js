// GENERADOR DE INVESTIGACIONES · a partir del identificador (semilla) se derivan, siempre igual:
//   · qué modelo físico oculto hay detrás de cada letra (permutación propia de cada estudiante);
//   · parámetros nominales (masa, constante, amplitud), constantes ocultas e incertidumbres de los instrumentos.
// Nada de esto se guarda: se recalcula desde la semilla (el informe del estudiante no lo contiene).
import { crearAzar } from './azar.js';
import { construirModelo } from './fisica.js';

export const LETRAS = ['A', 'B', 'C', 'D', 'E', 'I'];
export const MODELOS = ['ideal', 'frecuencia', 'amortiguado', 'duffing', 'ruido', 'debil'];
export const T_MAX = 60;            // ventana de observación disponible (s)
export const CREDITOS = 32;         // créditos de investigación por experimento
export const VERSION_MOTOR = 1;     // si cambian las fórmulas o los rangos, se sube (las semillas viejas se reproducen con su versión)

const r3 = x => Math.round(x * 1000) / 1000;
const r1 = x => Math.round(x * 10) / 10;

/** Asignación oculta letra → modelo (permutación determinada por el identificador). */
export function asignacion(id) {
  const az = crearAzar(id + '|asignacion|v' + VERSION_MOTOR), p = az.mezclar(MODELOS), o = {};
  LETRAS.forEach((l, i) => { o[l] = p[i] });
  return o;
}

/** Parámetros de un experimento (letra) de una investigación. Determinista. */
export function experimento(id, letra) {
  const modelo = asignacion(id)[letra], az = crearAzar(`${id}|${letra}|v${VERSION_MOTOR}`);
  // nominales: masa 0,20–1,50 kg; período nominal 0,8–2,5 s (de ahí k); amplitud 5–20 cm
  const m = r3(az.uniforme(0.2, 1.5)), Tn = az.uniforme(0.8, 2.5), k = r1(m * (2 * Math.PI / Tn) ** 2), A = r3(az.uniforme(0.05, 0.2));
  const w = Math.sqrt(k / m), vmax = A * w, amax = A * w * w, E0 = 0.5 * k * A * A;
  // incertidumbres típicas (desviación estándar) de cada instrumento
  let sig = { x: 0.0015, v: 0.02 * vmax, a: 0.03 * amax, F: 0.02 * k * A, E: 0.02 * E0, crono: 0.08, f: 0.005 * w / (2 * Math.PI) };
  const ocultos = { modelo, k };
  if (modelo === 'frecuencia') {
    ocultos.variante = az.elegir(['masa-resorte', 'k-real']);
    if (ocultos.variante === 'masa-resorte') ocultos.mResorte = r3(m * az.uniforme(0.6, 1.5));   // T crece un 9–22 %
    else ocultos.kReal = r1(k * (1 + az.signo() * az.uniforme(0.12, 0.25)));
  }
  if (modelo === 'amortiguado') { const Q = az.uniforme(10, 25); ocultos.Q = Q; ocultos.b = m * w / Q }            // b = m ω0 / Q
  if (modelo === 'duffing') { const eps = az.uniforme(0.35, 0.8); ocultos.eps = eps; ocultos.k3 = eps * k / (A * A) } // k3 A²/k = ε
  if (modelo === 'ruido') { const f = az.uniforme(6, 9); ocultos.factorRuido = f; sig = Object.fromEntries(Object.entries(sig).map(([q, s]) => [q, s * f])) }
  if (modelo === 'debil') {
    /* Amortiguamiento por debajo de la resolución, en el PEOR montaje posible (masa ½ → γ' = 2γ; amplitud ×2 → E' = 4E0, A' = 2A):
       en toda la ventana (60 s) la pérdida de energía (≈ E'·2γ'·t = 16·E0·γ·t) y la caída de amplitud (≈ A'·γ'·t = 4·A·γ·t)
       quedan por debajo de ¼ de la incertidumbre de UNA medición. Las pruebas cuantifican el z máximo alcanzable con todo
       el presupuesto (debe quedar muy por debajo de 2). */
    const gE = 0.25 * sig.E / (16 * E0 * T_MAX), gX = 0.25 * sig.x / (4 * A * T_MAX);
    const g = az.uniforme(0.3, 0.6) * Math.min(gE, gX);
    ocultos.gamma = g; ocultos.b = 2 * m * g
  }
  // semilla de las mediciones (cada medición n usa `${semillaMed}|n`)
  const semillaMed = `${id}|${letra}|med|v${VERSION_MOTOR}`;
  return { id, letra, nominal: { m, k, A }, sigma: sig, ocultos, semillaMed };
}

/** Montaje: factores de masa y de amplitud respecto al nominal (1, 2 o ½). La física oculta no cambia. */
export function montaje(exp, fm = 1, fa = 1) {
  const m = r3(exp.nominal.m * fm), A = r3(exp.nominal.A * fa);
  return { fm, fa, m, A, k: exp.nominal.k, modelo: construirModelo(exp.ocultos, m, A) };
}
export const claveMontaje = (fm, fa) => `${fm}|${fa}`;

/** Descripción del modelo para el DOCENTE (nunca se muestra al estudiante). */
export function describirModelo(exp) {
  const o = exp.ocultos;
  return {
    ideal: () => 'Oscilador armónico ideal: m ẍ = −k x con los parámetros nominales.',
    frecuencia: () => o.variante === 'masa-resorte' ? `Armónico con resorte de masa m_s = ${o.mResorte} kg: m_ef = m + m_s/3; T = 2π√(m_ef/k), mayor que la nominal.` : `Armónico con constante real k = ${o.kReal} N/m distinta de la nominal (${exp.nominal.k} N/m).`,
    amortiguado: () => `Amortiguado subcrítico: m ẍ + b ẋ + k x = 0 con b = ${o.b.toFixed(4)} kg/s (Q ≈ ${o.Q.toFixed(1)} con la masa nominal).`,
    duffing: () => `Duffing conservativo: m ẍ = −k x − k3 x³, k3 = ${o.k3.toFixed(1)} N/m³ (k3A²/k = ${o.eps.toFixed(2)}); T disminuye con la amplitud.`,
    ruido: () => `Armónico ideal con instrumentos ${o.factorRuido.toFixed(1)} veces más ruidosos.`,
    debil: () => `Amortiguamiento ínfimo γ = ${o.gamma.toExponential(2)} s⁻¹ (b = ${o.b.toExponential(2)} kg/s): indetectable con la resolución disponible en 60 s.`
  }[o.modelo]();
}

/** Conclusiones científicamente defendibles para cada modelo (para la evaluación). */
export const CONCLUSIONES_ADMISIBLES = {
  ideal: ['compatible'], frecuencia: ['incompatible'], amortiguado: ['incompatible'], duffing: ['incompatible'],
  ruido: ['compatible'], debil: ['compatible', 'insuficiente']
};
