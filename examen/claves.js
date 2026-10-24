// Claves de desbloqueo y de permiso: 4 cifras = HMAC(secreto, tipo|examen|matrícula|código). Cada clave sirve solo para
// ese estudiante y ese código (que cambia en cada bloqueo), así que dictarla en voz alta no ayuda a nadie más.
import { SECRETO_DEMO } from './config.js';

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTWXYZ';   // sin caracteres confundibles
export const normalizar = t => String(t || '').trim().toUpperCase().replace(/\s+/g, '');

/** Código de 4 caracteres para un bloqueo o una solicitud de permiso. */
export function codigoNuevo() {
  const n = new Uint32Array(4); crypto.getRandomValues(n);
  return [...n].map(x => ALFABETO[x % ALFABETO.length]).join('')
}

/** tipo: 'D' (desbloqueo) o 'P' (permiso para salir). */
export async function clave(tipo, examen, matricula, codigo) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(SECRETO_DEMO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode([tipo, normalizar(examen), normalizar(matricula), normalizar(codigo)].join('|'))));
  const n = ((s[0] << 24) | (s[1] << 16) | (s[2] << 8) | s[3]) >>> 0;
  return String(n % 10000).padStart(4, '0')
}
