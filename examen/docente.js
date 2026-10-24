// Panel del profesor (prototipo): calcula la clave de 4 cifras para un estudiante y un código de bloqueo o de permiso.
import { EXAMEN as C } from './config.js';
import { clave, normalizar } from './claves.js';

const $ = id => document.getElementById(id);
$('dExamen').value = C.codigo;
$('pie').textContent = ['Examen virtual (prototipo)', C.profesor].join(' · ');

async function dar(tipo) {
  const ex = normalizar($('dExamen').value), m = normalizar($('dMatricula').value), c = normalizar($('dCodigo').value);
  if (!ex || !m || c.length !== 4) { $('salida').innerHTML = '<p class="error">Rellena el examen, la matrícula y el código de 4 caracteres.</p>'; return }
  const k = await clave(tipo, ex, m, c);
  $('salida').innerHTML = `<p class="suave" style="margin:14px 0 0">${tipo === 'D' ? 'Clave para desbloquear' : 'Clave de permiso para salir'} · ${m} · ${c}</p><div class="codigo" id="claveDada">${k}</div>`
}
$('bClaveD').addEventListener('click', () => dar('D'));
$('bClaveP').addEventListener('click', () => dar('P'));
