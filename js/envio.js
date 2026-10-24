// ENVÍO AL PROFESOR · manda el informe JSON al receptor del profesor (Google Apps Script) y guarda el recibo.
// Se envía como texto plano: así el navegador no hace consulta previa CORS y Apps Script lo acepta.
import { CONFIG } from './config.js';
import { informeJSON } from './informe.js';

export const envioActivo = () => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(CONFIG.urlEnvio || '');
const MOTIVOS = { codigo: 'El código de clase no es válido. Revísalo con tu profesor.', formato: 'El receptor no reconoció el informe.', 'tamaño': 'El informe es demasiado grande.', clave: 'Acceso denegado.' };

export async function enviarAlProfesor(ses, letra, codigo, f = globalThis.fetch) {
  const inv = ses.investigaciones[letra];
  if (!inv || !inv.conclusion) return { error: 'Primero entrega tu conclusión.' };
  if (!envioActivo()) return { error: 'Tu profesor aún no ha activado el envío. Descarga los dos archivos y entrégalos como te indique.' };
  const c = String(codigo || '').trim().toUpperCase();
  if (CONFIG.pedirCodigoClase && !c) return { error: 'Escribe el código de clase que te dio tu profesor.' };
  const d = informeJSON(ses, letra); d.codigoClase = c;
  let r;
  try {
    const resp = await f(CONFIG.urlEnvio, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d), redirect: 'follow' });
    r = await resp.json()
  } catch (e) { return { error: 'No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo (o descarga los archivos).' } }
  if (!r || !r.ok) return { error: MOTIVOS[r && r.error] || 'El envío falló: ' + (r && r.error || 'respuesta inesperada') };
  inv.envios = (inv.envios || []).concat([{ hora: new Date().toISOString(), recibo: r.recibo, codigo: c }]);
  return { ok: true, recibo: r.recibo }
}
