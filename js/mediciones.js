// GENERADOR DE MEDICIONES · instrumentos, costes e incertidumbres. El valor verdadero sale del motor físico; el ruido de la
// medición n sale de la semilla «semillaMed|n»: repetir da ruido distinto alrededor del MISMO valor verdadero, y reproducir
// la investigación da exactamente los mismos números.
import { crearAzar } from './azar.js';
import { montaje, T_MAX } from './sesion.js';
import { masIdeal, instanteEnPosicion } from './fisica.js';

export const COSTE_MONTAJE = 3;
const tiempo = { id: 't', nombre: 'instante', unidad: 's', min: 0, max: T_MAX, paso: 0.01 };

/* Cada instrumento:
   medir(exp, mont, p, az) → { valores: {clave: {v, s, u, n}}, principal, extra } (s = incertidumbre típica declarada)
   ideal(mont, p)          → lo que predice el MAS ideal con los parámetros nominales del montaje (magnitud principal)
   escala(mont)            → magnitud típica, para comparar predicciones cerca de cero */
export const INSTRUMENTOS = {
  posicion: {
    nombre: 'Posición', icono: 'x', pregunta: '¿Cuál es la posición del bloque en el instante t?', unidad: 'm', simbolo: 'x', params: [tiempo], coste: () => 1,
    medir: (e, M, p, az) => ({ valores: { x: { v: M.modelo.estado(p.t).x + az.normal() * e.sigma.x, s: e.sigma.x, u: 'm', n: 'x' } }, principal: 'x' }),
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).x(p.t), escala: M => M.A
  },
  velocidad: {
    nombre: 'Velocidad', icono: 'v', pregunta: '¿Cuál es la velocidad del bloque en el instante t?', unidad: 'm/s', simbolo: 'v', params: [tiempo], coste: () => 2,
    medir: (e, M, p, az) => ({ valores: { v: { v: M.modelo.estado(p.t).v + az.normal() * e.sigma.v, s: e.sigma.v, u: 'm/s', n: 'v' } }, principal: 'v' }),
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).v(p.t), escala: M => masIdeal(M.m, M.k, M.A).vmax
  },
  aceleracion: {
    nombre: 'Aceleración', icono: 'a', pregunta: '¿Cuál es la aceleración del bloque en el instante t?', unidad: 'm/s²', simbolo: 'a', params: [tiempo], coste: () => 2,
    medir: (e, M, p, az) => ({ valores: { a: { v: M.modelo.estado(p.t).a + az.normal() * e.sigma.a, s: e.sigma.a, u: 'm/s²', n: 'a' } }, principal: 'a' }),
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).a(p.t), escala: M => masIdeal(M.m, M.k, M.A).amax
  },
  fuerza: {
    nombre: 'Fuerza del resorte', icono: 'F', pregunta: '¿Qué fuerza ejerce el resorte sobre el bloque en el instante t?', unidad: 'N', simbolo: 'F', params: [tiempo], coste: () => 2,
    medir: (e, M, p, az) => ({ valores: { F: { v: M.modelo.estado(p.t).F + az.normal() * e.sigma.F, s: e.sigma.F, u: 'N', n: 'F' } }, principal: 'F' }),
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).F(p.t), escala: M => M.k * M.A
  },
  energia: {
    nombre: 'Energía', icono: 'E', pregunta: '¿Cuánta energía cinética, potencial y mecánica hay en el instante t?', unidad: 'J', simbolo: 'E', params: [tiempo], coste: () => 3,
    medir: (e, M, p, az) => {
      const s = M.modelo.estado(p.t), sk = e.sigma.E / Math.SQRT2, K = s.K + az.normal() * sk, U = s.U + az.normal() * sk;
      return { valores: { E: { v: K + U, s: e.sigma.E, u: 'J', n: 'E' }, K: { v: K, s: sk, u: 'J', n: 'K' }, U: { v: U, s: sk, u: 'J', n: 'U' } }, principal: 'E' }
    },
    ideal: M => masIdeal(M.m, M.k, M.A).E, escala: M => masIdeal(M.m, M.k, M.A).E
  },
  periodo: {
    nombre: 'Período (cronómetro)', icono: 'T', pregunta: '¿Cuánto dura una oscilación? (se cronometran N oscilaciones desde t = 0)', unidad: 's', simbolo: 'T',
    params: [{ id: 'N', nombre: 'oscilaciones cronometradas', opciones: [1, 5, 10] }], coste: p => (+p.N >= 10 ? 4 : +p.N >= 5 ? 3 : 2),
    medir: (e, M, p, az) => { const N = +p.N, tot = N * M.modelo.periodo + az.normal() * e.sigma.crono; return { valores: { T: { v: tot / N, s: e.sigma.crono / N, u: 's', n: 'T' } }, principal: 'T', extra: { total: tot, N } } },
    ideal: M => masIdeal(M.m, M.k, M.A).T, escala: M => masIdeal(M.m, M.k, M.A).T
  },
  frecuencia: {
    nombre: 'Frecuencia (frecuencímetro)', icono: 'f', pregunta: '¿Cuál es la frecuencia de oscilación?', unidad: 'Hz', simbolo: 'f', params: [], coste: () => 3,
    medir: (e, M, p, az) => ({ valores: { f: { v: 1 / M.modelo.periodo + az.normal() * e.sigma.f, s: e.sigma.f, u: 'Hz', n: 'f' } }, principal: 'f' }),
    ideal: M => masIdeal(M.m, M.k, M.A).f, escala: M => masIdeal(M.m, M.k, M.A).f
  },
  aEnX: {
    nombre: 'Aceleración en una posición', icono: 'a(x)', pregunta: '¿Cuál es la aceleración cuando el bloque pasa por la posición x? (primer paso, de +A hacia −A)', unidad: 'm/s²', simbolo: 'a',
    params: [{ id: 'x0', nombre: 'posición', unidad: 'm', min: -0.4, max: 0.4, paso: 0.001 }], coste: () => 3,
    // si el bloque no llega a esa posición en su primera media oscilación, no se cobra
    viable: (e, M, p) => instanteEnPosicion(M.modelo, +p.x0) != null,
    medir: (e, M, p, az) => { const t = instanteEnPosicion(M.modelo, +p.x0), s = M.modelo.estado(t); return { valores: { a: { v: s.a + az.normal() * e.sigma.a, s: e.sigma.a, u: 'm/s²', n: 'a' } }, principal: 'a', extra: { t } } },
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).aEnX(+p.x0), escala: M => masIdeal(M.m, M.k, M.A).amax
  },
  serie: {
    nombre: 'Registro de posición (10 puntos)', icono: 'x(t)', pregunta: 'Registrar la posición en 10 instantes equiespaciados entre t₁ y t₂', unidad: 'm', simbolo: 'x',
    params: [{ ...tiempo, id: 't1', nombre: 'desde' }, { ...tiempo, id: 't2', nombre: 'hasta' }], coste: () => 6, sinPrediccion: true,
    viable: (e, M, p) => +p.t2 > +p.t1,
    medir: (e, M, p, az) => { const pts = []; for (let i = 0; i < 10; i++) { const t = Math.round((+p.t1 + (+p.t2 - +p.t1) * i / 9) * 100) / 100; pts.push({ t, x: M.modelo.estado(t).x + az.normal() * e.sigma.x }) } return { valores: { x: { v: pts[0].x, s: e.sigma.x, u: 'm', n: 'x' } }, principal: 'x', extra: { puntos: pts, s: e.sigma.x } } },
    ideal: (M, p) => masIdeal(M.m, M.k, M.A).x(+p.t1), escala: M => M.A
  }
};

/** Normaliza y valida los parámetros de una medición. Devuelve {p} o {error}. */
export function validarParametros(id, p, mont) {
  const I = INSTRUMENTOS[id], o = {};
  if (!I) return { error: 'Instrumento desconocido' };
  for (const d of I.params) {
    const v = d.opciones ? +p[d.id] : Number(String(p[d.id]).replace(',', '.'));
    if (d.opciones) { if (!d.opciones.includes(v)) return { error: `Elige ${d.nombre}` }; o[d.id] = v; continue }
    if (!Number.isFinite(v)) return { error: `Escribe un número para ${d.nombre}` };
    if (v < d.min || v > d.max) return { error: `${d.nombre} debe estar entre ${d.min} y ${d.max} ${d.unidad || ''}` };
    o[d.id] = Math.round(v / d.paso) * d.paso; o[d.id] = Math.round(o[d.id] * 1e6) / 1e6
  }
  if (id === 'aEnX' && Math.abs(o.x0) > mont.A + 1e-12) return { error: `El bloque solo se mueve entre −${mont.A} m y +${mont.A} m en este montaje` };
  return { p: o }
}

/** Realiza la medición número n (determinista). No toca créditos ni registros: eso es de la investigación. */
export function medir(exp, n, id, p, fm = 1, fa = 1) {
  const I = INSTRUMENTOS[id], M = montaje(exp, fm, fa);
  if (I.viable && !I.viable(exp, M, p)) return { error: id === 'aEnX' ? 'El bloque no pasa por esa posición en su primera media oscilación: no se ha cobrado nada.' : 'Parámetros no válidos: no se ha cobrado nada.' };
  const az = crearAzar(exp.semillaMed + '|' + n), r = I.medir(exp, M, p, az);
  return { ...r, ideal: I.ideal(M, p), escala: I.escala(M) }
}

/** Valor que predice el MAS ideal con parámetros nominales (para comparar y evaluar predicciones). */
export function prediccionIdeal(exp, id, p, fm = 1, fa = 1) { const M = montaje(exp, fm, fa); return INSTRUMENTOS[id].ideal(M, p) }

/** Cifras con sentido según la incertidumbre: 2 cifras significativas en σ y el valor redondeado a ese decimal. */
export function formatear(v, s) {
  if (!Number.isFinite(v)) return '—';
  if (!(s > 0)) return String(+v.toPrecision(4)).replace('.', ',');
  const d = Math.max(0, Math.min(8, 1 - Math.floor(Math.log10(s))));
  return { v: v.toFixed(d).replace('.', ','), s: s.toFixed(d).replace('.', ',') }
}
export const conIncertidumbre = (v, s, u) => { const f = formatear(v, s); return typeof f === 'string' ? `${f} ${u}` : `${f.v} ± ${f.s} ${u}` };
