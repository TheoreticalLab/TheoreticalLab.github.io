// ALMACENAMIENTO LOCAL · el progreso se guarda solo en este navegador (no hay servidor: GitHub Pages es estático).
const CLAVE = 'laboratorio-mas-v1';

function leer() {
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && typeof d === 'object' && d.sesiones) return d } catch (e) { }
  return { sesiones: {}, actual: null }
}
function escribir(d) {
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); return true } catch (e) { return false }
}
export function guardarSesion(ses) { const d = leer(); d.sesiones[ses.id] = ses; d.actual = ses.id; return escribir(d) }
export function sesionActual() { const d = leer(); return d.actual && d.sesiones[d.actual] ? d.sesiones[d.actual] : null }
export function cargarSesion(id) { const d = leer(); return d.sesiones[id] || null }
export function listarSesiones() { return Object.values(leer().sesiones).map(s => ({ id: s.id, alias: s.alias, creada: s.creada, letras: Object.keys(s.investigaciones || {}) })) }
export function activarSesion(id) { const d = leer(); if (d.sesiones[id]) { d.actual = id; escribir(d) } }
export function cerrarSesion() { const d = leer(); d.actual = null; escribir(d) }
