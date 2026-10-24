// Crea una investigación de demostración a medio hacer (para capturas de pantalla).
import * as INV from '../js/investigacion.js';
import { guardarSesion } from '../js/almacen.js';
import { prediccionIdeal } from '../js/mediciones.js';
import { experimento } from '../js/sesion.js';
const ses = INV.nuevaSesion('MAS-DEM4-2345', 'Ana'), inv = INV.abrirInvestigacion(ses, 'B'), e = experimento(ses.id, 'B');
const mide = (instr, p, err = 0.01) => { INV.prepararMedicion(ses, inv, instr, p); if (inv.pendiente.requiere) { const P = inv.pendiente; INV.registrarPrediccion(ses, inv, prediccionIdeal(e, P.instr, P.p, P.fm, P.fa) * (1 + err), 'Con x = A cos(ωt) y ω = √(k/m)') } INV.ejecutarMedicion(ses, inv) };
const q = INV.preguntaActual(ses, inv); INV.responder(ses, inv, q, { opcion: 'H_MAS', texto: 'Es un resorte de laboratorio: espero que cumpla la ley de Hooke.' });
mide('periodo', { N: 10 }); mide('energia', { t: 0.5 }); mide('energia', { t: 55 }); mide('posicion', { t: 1.2 }); mide('posicion', { t: 3.7 }, 0.2); mide('posicion', { t: 6.1 });
INV.valorarHipotesis(inv, 'H_AMORT', 'sin evaluar', 'Aún no comparo energías muy separadas', [2, 3]);
guardarSesion(ses);
await fetch('/resultado', { method: 'POST', body: JSON.stringify({ fin: true, lineas: ['preparada ' + ses.id], pasan: 1, total: 1 }) });
