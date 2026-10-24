// Banco de problemas con parámetros: cada estudiante recibe números distintos y otro orden. Todo sale de la semilla
// examen|matrícula, así que el mismo estudiante ve siempre el mismo examen (aunque recargue) y el profesor puede reproducirlo.
import { crearAzar } from '../js/azar.js';

const g = 9.8;
// valor en una rejilla (lo, lo+paso, …, hi): números «de enunciado», no decimales raros
const valor = (az, lo, hi, paso) => +(lo + paso * az.entero(0, Math.round((hi - lo) / paso))).toFixed(6);
export const coma = x => String(x).replace('.', ',');
/** 3 cifras significativas con coma decimal. */
export const fmt = x => coma(+(+x).toPrecision(3));

export const NUMERICOS = [
  { id: 'tiro', tema: 'Cinemática', generar: az => {
    const h = valor(az, 5, 40, 1), v = valor(az, 3, 15, 0.5);
    return { enunciado: `Desde lo alto de un acantilado de ${coma(h)} m se lanza horizontalmente una piedra a ${coma(v)} m/s. Despreciando el rozamiento con el aire, ¿a qué distancia horizontal de la base del acantilado cae?`, unidad: 'm', respuesta: v * Math.sqrt(2 * h / g) } } },
  { id: 'vertical', tema: 'Cinemática', generar: az => {
    const v = valor(az, 8, 25, 0.5);
    return { enunciado: `Se lanza una pelota verticalmente hacia arriba a ${coma(v)} m/s. Despreciando el rozamiento con el aire, ¿qué altura máxima alcanza sobre el punto de lanzamiento?`, unidad: 'm', respuesta: v * v / (2 * g) } } },
  { id: 'plano', tema: 'Dinámica', generar: az => {
    const m = valor(az, 2, 10, 0.5), th = az.entero(25, 45), mu = valor(az, 0.1, 0.3, 0.01), r = th * Math.PI / 180;
    return { enunciado: `Un bloque de ${coma(m)} kg se suelta sobre un plano inclinado ${th}° respecto a la horizontal. El coeficiente de rozamiento cinético es ${coma(mu)}. ¿Cuál es la aceleración del bloque a lo largo del plano?`, unidad: 'm/s²', respuesta: g * (Math.sin(r) - mu * Math.cos(r)) } } },
  { id: 'atwood', tema: 'Dinámica', generar: az => {
    const m1 = valor(az, 3, 8, 0.5), m2 = valor(az, 1, 2.5, 0.5);
    return { enunciado: `En una máquina de Atwood, dos bloques de ${coma(m1)} kg y ${coma(m2)} kg cuelgan de una cuerda ideal que pasa por una polea sin masa ni rozamiento. ¿Cuál es el módulo de la aceleración de los bloques?`, unidad: 'm/s²', respuesta: (m1 - m2) * g / (m1 + m2) } } },
  { id: 'curva', tema: 'Dinámica', generar: az => {
    const R = valor(az, 30, 120, 5), mu = valor(az, 0.4, 0.9, 0.05);
    return { enunciado: `Un coche toma una curva plana (sin peralte) de ${coma(R)} m de radio. El coeficiente de rozamiento estático entre los neumáticos y el asfalto es ${coma(mu)}. ¿Cuál es la rapidez máxima con la que puede tomar la curva sin derrapar?`, unidad: 'm/s', respuesta: Math.sqrt(mu * g * R) } } },
  { id: 'resorte', tema: 'Energía', generar: az => {
    const m = valor(az, 0.2, 1.5, 0.1), k = valor(az, 200, 800, 10), x = valor(az, 5, 20, 1);
    return { enunciado: `Un bloque de ${coma(m)} kg comprime ${x} cm un resorte de constante ${k} N/m sobre una superficie horizontal sin rozamiento. Al soltarlo, ¿con qué rapidez sale despedido el bloque?`, unidad: 'm/s', respuesta: x / 100 * Math.sqrt(k / m) } } },
  { id: 'choque', tema: 'Momento lineal', generar: az => {
    const m1 = valor(az, 0.5, 3, 0.1), v1 = valor(az, 2, 10, 0.5), m2 = valor(az, 0.5, 3, 0.1);
    return { enunciado: `Un carrito de ${coma(m1)} kg que se mueve a ${coma(v1)} m/s choca con otro de ${coma(m2)} kg que está en reposo, y quedan unidos. ¿Con qué rapidez se mueven juntos justo después del choque?`, unidad: 'm/s', respuesta: m1 * v1 / (m1 + m2) } } },
  { id: 'periodo', tema: 'Oscilaciones', generar: az => {
    const m = valor(az, 0.2, 2, 0.1), k = valor(az, 20, 200, 5);
    return { enunciado: `Un bloque de ${coma(m)} kg unido a un resorte de constante ${k} N/m oscila sin rozamiento. ¿Cuál es el período de oscilación?`, unidad: 's', respuesta: 2 * Math.PI * Math.sqrt(m / k) } } }
];

export const CONCEPTUALES = [
  { id: 'pendulo', tema: 'Oscilaciones', generar: az => {
    const n = az.elegir([4, 9]), r = Math.sqrt(n);
    return { enunciado: `Si la longitud de un péndulo simple se multiplica por ${n} (oscilaciones pequeñas), su período:`,
      opciones: [`se multiplica por ${r}`, `se multiplica por ${n}`, `se divide entre ${r}`, 'no cambia'], correcta: 0 } } },
  { id: 'amplitud', tema: 'Oscilaciones', generar: az => {
    const n = az.elegir([2, 3]);
    return { enunciado: `Si se ${n === 2 ? 'duplica' : 'triplica'} la amplitud de un oscilador masa-resorte ideal, su período:`,
      opciones: ['no cambia', `se multiplica por ${n}`, `se multiplica por √${n}`, `se divide entre ${n}`], correcta: 0 } } }
];

/** Examen de un estudiante: numéricos y conceptuales elegidos del banco, con sus números, en orden propio. */
export function generarExamen(examen, matricula, cfg) {
  const az = crearAzar(`examen|${examen}|${matricula}`);
  const elegidos = [...az.mezclar(NUMERICOS).slice(0, cfg.numericos), ...az.mezclar(CONCEPTUALES).slice(0, cfg.conceptuales)];
  return az.mezclar(elegidos).map(t => {
    const p = { id: t.id, tema: t.tema, ...t.generar(az) };
    if (p.opciones) {   // opciones en orden aleatorio: la correcta no está siempre en el mismo sitio
      const orden = az.mezclar(p.opciones.map((_, i) => i));
      p.correcta = orden.indexOf(p.correcta); p.opciones = orden.map(i => p.opciones[i]); p.tipo = 'opcion'
    } else p.tipo = 'numero';
    return p
  })
}

/** Número escrito por el estudiante («12,5», «12.5», «1,2e3»); null si no es un número. */
export function leerNumero(t) {
  const s = String(t ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return null; const x = Number(s); return Number.isFinite(x) ? x : null
}

/** Corrige: [{ok, dada, correcta}] por problema. */
export function corregir(problemas, respuestas, cfg) {
  return problemas.map((p, i) => {
    const r = respuestas[i];
    if (p.tipo === 'opcion') return { ok: r != null && +r === p.correcta, dada: r != null ? p.opciones[+r] : '', correcta: p.opciones[p.correcta] };
    const x = leerNumero(r);
    return { ok: x != null && Math.abs(x - p.respuesta) <= cfg.tolerancia * Math.abs(p.respuesta), dada: r || '', correcta: `${fmt(p.respuesta)} ${p.unidad}` }
  })
}
