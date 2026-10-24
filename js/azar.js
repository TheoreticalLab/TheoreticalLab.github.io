// Azar reproducible: todo lo aleatorio de una investigación sale de su identificador (semilla).
// sfc32 alimentado con cyrb128: rápido, de buena calidad estadística y sin dependencias.

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** Generador con semilla de texto. Misma semilla → misma secuencia, en cualquier navegador. */
export function crearAzar(semilla) {
  const r = sfc32(...cyrb128(String(semilla)));
  for (let i = 0; i < 12; i++) r();
  const az = {
    siguiente: r,
    uniforme: (lo, hi) => lo + (hi - lo) * r(),
    entero: (lo, hi) => lo + Math.floor(r() * (hi - lo + 1)),
    elegir: arr => arr[Math.floor(r() * arr.length)],
    signo: () => (r() < 0.5 ? -1 : 1),
    // normal estándar (Box-Muller)
    normal: () => {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    mezclar: arr => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  };
  return az;
}

// Alfabeto sin caracteres confundibles (sin 0/O, 1/I/L, U/V)
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTWXYZ';

/** Identificador nuevo de investigación, p. ej. «MAS-7F3K-29QD». Usa el azar del sistema si existe. */
export function nuevoIdentificador() {
  const n = new Uint32Array(8);
  if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(n);
  else for (let i = 0; i < 8; i++) n[i] = Math.floor(Math.random() * 2 ** 32);
  const c = [...n].map(x => ALFABETO[x % ALFABETO.length]).join('');
  return `MAS-${c.slice(0, 4)}-${c.slice(4, 8)}`;
}

/** ¿Tiene forma de identificador válido? (se aceptan minúsculas y espacios alrededor) */
export function normalizarIdentificador(texto) {
  const t = String(texto || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^MAS-[2-9A-HJ-NP-TW-Z]{4}-[2-9A-HJ-NP-TW-Z]{4}$/.test(t) ? t : null;
}
