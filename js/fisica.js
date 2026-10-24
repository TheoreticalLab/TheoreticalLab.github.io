// MOTOR FÍSICO · sistema masa-resorte horizontal. Sin interfaz ni pedagogía: solo ecuaciones.
// Condiciones iniciales siempre x(0) = A > 0, v(0) = 0. Unidades SI.
//
// Modelos (tipo):
//   'armonico'   m_ef ẍ = −k x                      (ideal; o con k real ≠ nominal; o con masa del resorte: m_ef = m + m_s/3)
//   'amortiguado' m ẍ + b ẋ + k x = 0               (subamortiguado: solución analítica)
//   'duffing'    m ẍ = −k x − k3 x³                  (conservativo; U = ½kx² + ¼k3x⁴; período por cuadratura, trayectoria RK4)
// Cada modelo devuelve estado(t) = {x, v, a, F, K, U, E}, el período verdadero y la energía inicial.
// «F» es la fuerza que el resorte ejerce sobre el bloque (fuerza restauradora): con resorte con masa es m·a (no −kx).

const DOS_PI = 2 * Math.PI;

/** Oscilador armónico (conservativo). m: masa del bloque; mEf: masa efectiva (≥ m); k: constante real. */
export function armonico({ m, k, A, mEf = m }) {
  const w = Math.sqrt(k / mEf);
  return {
    tipo: 'armonico', w, periodo: DOS_PI / w, energiaInicial: 0.5 * k * A * A,
    estado(t) {
      const c = Math.cos(w * t), s = Math.sin(w * t);
      const x = A * c, v = -A * w * s, a = -w * w * x;
      const U = 0.5 * k * x * x, K = 0.5 * mEf * v * v;
      return { x, v, a, F: m * a, K, U, E: K + U };
    }
  };
}

/** Oscilador amortiguado subcrítico: x = A e^(−γt) [cos ω_d t + (γ/ω_d) sen ω_d t], con γ = b/2m, ω_d = √(ω0² − γ²). */
export function amortiguado({ m, k, A, b }) {
  const w0 = Math.sqrt(k / m), g = b / (2 * m);
  if (!(g < w0)) throw new Error('amortiguamiento no subcrítico');
  const wd = Math.sqrt(w0 * w0 - g * g);
  return {
    tipo: 'amortiguado', w: wd, w0, gamma: g, periodo: DOS_PI / wd, energiaInicial: 0.5 * k * A * A,
    estado(t) {
      const e = Math.exp(-g * t), c = Math.cos(wd * t), s = Math.sin(wd * t);
      const x = A * e * (c + (g / wd) * s);
      const v = -A * e * (w0 * w0 / wd) * s;           // derivada exacta de x(t)
      const a = -(k * x + b * v) / m;                    // segunda ley de Newton
      const U = 0.5 * k * x * x, K = 0.5 * m * v * v;
      return { x, v, a, F: -k * x, K, U, E: K + U };
    }
  };
}

/** Período exacto del oscilador de Duffing conservativo, por cuadratura.
 *  T = 4 ∫₀^A dx / v(x). Con x = A sen θ el integrando queda suave (sin singularidad):
 *  T = 4 ∫₀^{π/2} A dθ / √( (2/m) [ ½kA² + ¼k3A⁴(1 + sen²θ) ] ). Simpson compuesto, 2000 intervalos. */
export function periodoDuffing(m, k, k3, A) {
  const n = 2000, h = (Math.PI / 2) / n;
  const f = th => { const s = Math.sin(th); return A / Math.sqrt((2 / m) * (0.5 * k * A * A + 0.25 * k3 * A ** 4 * (1 + s * s))); };
  let sum = f(0) + f(Math.PI / 2);
  for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
  return 4 * (h / 3) * sum;
}

/** Duffing conservativo (resorte que se endurece si k3 > 0). La trayectoria es periódica: se integra con RK4 un
 *  período exacto (paso T/N) y se interpola con polinomios de Hermite cúbicos usando x, v y a (derivadas exactas). */
export function duffing({ m, k, A, k3, N = 4096 }) {
  const T = periodoDuffing(m, k, k3, A), dt = T / N;
  const acel = x => -(k * x + k3 * x * x * x) / m;
  const xs = new Float64Array(N + 1), vs = new Float64Array(N + 1);
  let x = A, v = 0; xs[0] = x; vs[0] = v;
  for (let i = 1; i <= N; i++) {
    const k1x = v, k1v = acel(x);
    const k2x = v + 0.5 * dt * k1v, k2v = acel(x + 0.5 * dt * k1x);
    const k3x = v + 0.5 * dt * k2v, k3v = acel(x + 0.5 * dt * k2x);
    const k4x = v + dt * k3v, k4v = acel(x + dt * k3x);
    x += dt / 6 * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    xs[i] = x; vs[i] = v;
  }
  const cierre = Math.hypot(xs[N] - A, vs[N] / Math.sqrt(k / m));   // tras un período debe volver a (A, 0)
  const U = x => 0.5 * k * x * x + 0.25 * k3 * x ** 4;
  const E0 = U(A);
  // Hermite cúbico en [t_i, t_i+1] con valores p0,p1 y derivadas d0,d1
  const herm = (p0, d0, p1, d1, s, h) => { const s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * d0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * d1 };
  return {
    tipo: 'duffing', periodo: T, w: DOS_PI / T, energiaInicial: E0, cierre,
    estado(t) {
      let tau = t % T; if (tau < 0) tau += T;
      const i = Math.min(N - 1, Math.floor(tau / dt)), s = (tau - i * dt) / dt;
      const x = herm(xs[i], vs[i], xs[i + 1], vs[i + 1], s, dt);
      const v = herm(vs[i], acel(xs[i]), vs[i + 1], acel(xs[i + 1]), s, dt);
      const a = acel(x);
      const Uv = U(x), K = 0.5 * m * v * v;
      return { x, v, a, F: m * a, K, U: Uv, E: K + Uv };
    }
  };
}

/** Primer instante t ∈ (0, T/2] en que x(t) = x0 (el bloque va de +A hacia −A). null si no alcanza ese punto. */
export function instanteEnPosicion(mod, x0) {
  const T = mod.periodo, n = 400;
  if (x0 > mod.estado(0).x) return null;
  let t0 = 0, f0 = mod.estado(0).x - x0;
  if (Math.abs(f0) < 1e-15) return 0;
  for (let i = 1; i <= n; i++) {
    const t1 = (T / 2) * i / n, f1 = mod.estado(t1).x - x0;
    if (f0 > 0 && f1 <= 0) {   // bisección
      let lo = t0, hi = t1;
      for (let j = 0; j < 80; j++) { const mid = 0.5 * (lo + hi); if (mod.estado(mid).x - x0 > 0) lo = mid; else hi = mid }
      return 0.5 * (lo + hi);
    }
    t0 = t1; f0 = f1;
  }
  return null;
}

/** Construye el modelo físico de una configuración (masa y amplitud del montaje) a partir de las constantes ocultas.
 *  ocultos: {modelo, kReal, mResorte, b, k3, ...}. Las constantes físicas no cambian al cambiar masa o amplitud. */
export function construirModelo(ocultos, m, A) {
  const o = ocultos;
  switch (o.modelo) {
    case 'ideal':
    case 'ruido':
      return armonico({ m, k: o.k, A });
    case 'frecuencia':
      return o.variante === 'masa-resorte' ? armonico({ m, k: o.k, A, mEf: m + o.mResorte / 3 }) : armonico({ m, k: o.kReal, A });
    case 'amortiguado':
    case 'debil':
      return amortiguado({ m, k: o.k, A, b: o.b });
    case 'duffing':
      return duffing({ m, k: o.k, A, k3: o.k3 });
    default:
      throw new Error('modelo desconocido ' + o.modelo);
  }
}

/** Predicciones del MAS ideal con los parámetros nominales (lo que el estudiante puede calcular). */
export function masIdeal(m, k, A) {
  const w = Math.sqrt(k / m);
  return {
    w, T: DOS_PI / w, f: w / DOS_PI, vmax: A * w, amax: A * w * w, E: 0.5 * k * A * A,
    x: t => A * Math.cos(w * t), v: t => -A * w * Math.sin(w * t), a: t => -w * w * A * Math.cos(w * t),
    F: t => -k * A * Math.cos(w * t), aEnX: x0 => -w * w * x0,
    K: t => 0.5 * m * (A * w * Math.sin(w * t)) ** 2, U: t => 0.5 * k * (A * Math.cos(w * t)) ** 2
  };
}
