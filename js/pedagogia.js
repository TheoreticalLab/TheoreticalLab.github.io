// MOTOR PEDAGÓGICO · preguntas como nodos de un grafo de estados. Cada nodo tiene:
//   activa(E, inv) → prioridad (0 = no aplica): depende de lo que el estudiante midió, predijo, respondió e hipotetizó;
//   clave(E, inv)  → identidad de la situación: si la evidencia cambia, la pregunta puede volver a plantearse;
//   texto/opciones → construidos con SUS números; corrección → calculada con SUS datos (no con el modelo oculto);
//   efectos        → marcas de razonamiento (concepciones erróneas, revisiones) y sugerencias de la siguiente prueba.
// Categorías: 'calculo' (numérica con tolerancia), 'razonamiento' (opción evaluable), 'reflexion' (texto para el docente).
import { calcularEvidencia } from './evidencia.js';
import { INSTRUMENTOS, conIncertidumbre, formatear } from './mediciones.js';

// 4 cifras significativas sin ceros finales y con coma decimal («18», no «18,000», que en español se lee dieciocho mil)
const f2 = x => Number.isFinite(x) ? String(+(+x).toPrecision(4)).replace('.', ',') : '—';
const zt = z => (Math.round(Math.abs(z) * 10) / 10).toString().replace('.', ',');
const pct = x => (Math.round(x * 10) / 10).toString().replace('.', ',') + ' %';
const respondida = (inv, id, clave) => inv.respuestas.some(r => r.nodo === id && (clave == null || r.clave === clave));
const respuestaDe = (inv, id) => [...inv.respuestas].reverse().find(r => r.nodo === id);
const omitida = (inv, id, clave) => (inv.omitidas || []).some(o => o.nodo === id && o.clave === clave);
const marca = (inv, f) => !!(inv.marcas && inv.marcas[f]);
const veredicto = z => Math.abs(z) < 2 ? 'compatible' : Math.abs(z) >= 3 ? 'incompatible' : 'indecidible';

export const HIPOTESIS = {
  H_MAS: 'MAS ideal con los parámetros nominales (m, k)',
  H_PARAM: 'Movimiento armónico, pero con parámetros efectivos distintos de los nominales (constante o masa efectiva)',
  H_AMORT: 'Oscilación amortiguada (pierde energía)',
  H_NOLIN: 'Fuerza restauradora no lineal (el período depende de la amplitud)',
  H_RUIDO: 'MAS con mediciones muy ruidosas'
};
export const ESTADOS_H = ['sin evaluar', 'compatible', 'descartada', 'indecidible'];

/* ============================== BANCO DE NODOS ============================== */
export const NODOS = [];
const nodo = o => NODOS.push(o);

// ---------- arranque ----------
nodo({
  id: 'hip-inicial', cat: 'reflexion', tipo: 'opcion+texto',
  activa: (E, inv) => !(inv.histHip || []).length && !inv.mediciones.length ? 100 : 0, clave: () => '1',
  texto: E => `Antes de medir nada: tu montaje tiene m = ${f2(E.nominal.m)} kg, k = ${f2(E.nominal.k)} N/m y amplitud A = ${f2(E.nominal.A)} m. ¿Qué hipótesis de partida eliges y por qué? (podrás cambiarla con la evidencia)`,
  opciones: () => Object.entries(HIPOTESIS).map(([id, t]) => ({ id, txt: t })).concat([{ id: 'ninguna', txt: 'Aún no tengo una hipótesis' }]),
  efecto: (r, E, inv) => r.opcion !== 'ninguna' ? { hipotesis: { [r.opcion]: 'compatible' }, motivo: 'hipótesis de partida' } : {}
});
nodo({
  id: 'calc-w', cat: 'calculo', tipo: 'numero', unidad: 'rad/s',
  activa: (E, inv) => !respondida(inv, 'calc-w') ? (inv.predicciones.length ? 70 : 90) : 0, clave: () => '1',
  texto: E => `Con los parámetros nominales (m = ${f2(E.nominal.m)} kg, k = ${f2(E.nominal.k)} N/m), ¿cuál es la frecuencia angular ω del MAS ideal?`,
  valor: E => Math.sqrt(E.nominal.k / E.nominal.m), tol: () => 0.01, tolTipo: 'rel', ayuda: 'ω = √(k/m)'
});
nodo({
  id: 'calc-T', cat: 'calculo', tipo: 'numero', unidad: 's',
  activa: (E, inv) => respondida(inv, 'calc-w') && !respondida(inv, 'calc-T') ? 85 : 0, clave: () => '1',
  texto: E => `¿Qué período T predice el MAS ideal para tu montaje?`, valor: E => 2 * Math.PI * Math.sqrt(E.nominal.m / E.nominal.k), tol: () => 0.01, tolTipo: 'rel', ayuda: 'T = 2π√(m/k)'
});
nodo({
  id: 'calc-E0', cat: 'calculo', tipo: 'numero', unidad: 'J',
  activa: (E, inv) => (inv.mediciones.some(d => d.instr === 'energia') || (inv.pendiente && inv.pendiente.instr === 'energia')) && !respondida(inv, 'calc-E0') ? 80 : 0, clave: () => '1',
  texto: E => `¿Cuánta energía mecánica predice el MAS ideal para A = ${f2(E.nominal.A)} m y k = ${f2(E.nominal.k)} N/m?`, valor: E => 0.5 * E.nominal.k * E.nominal.A ** 2, tol: () => 0.01, tolTipo: 'rel', ayuda: 'E = ½kA²'
});
nodo({
  id: 'calc-vmax', cat: 'calculo', tipo: 'numero', unidad: 'm/s',
  activa: (E, inv) => inv.mediciones.some(d => d.instr === 'velocidad') && !respondida(inv, 'calc-vmax') ? 60 : 0, clave: () => '1',
  texto: E => '¿Cuál es la rapidez máxima que predice el MAS ideal para tu montaje nominal?', valor: E => E.nominal.A * Math.sqrt(E.nominal.k / E.nominal.m), tol: () => 0.015, tolTipo: 'rel', ayuda: 'v_max = Aω'
});
nodo({
  id: 'calc-amax', cat: 'calculo', tipo: 'numero', unidad: 'm/s²',
  activa: (E, inv) => inv.mediciones.some(d => d.instr === 'aceleracion' || d.instr === 'aEnX') && !respondida(inv, 'calc-amax') ? 60 : 0, clave: () => '1',
  texto: E => '¿Cuál es la aceleración máxima (en valor absoluto) que predice el MAS ideal para tu montaje nominal?', valor: E => E.nominal.A * E.nominal.k / E.nominal.m, tol: () => 0.015, tolTipo: 'rel', ayuda: 'a_max = Aω²'
});

// ---------- predicciones ----------
const predMalCalculada = E => [...E.predicciones].reverse().find(p => p.errIdeal > 0.05);
nodo({
  id: 'pred-calculo', cat: 'razonamiento', tipo: 'opcion',
  activa: E => predMalCalculada(E) ? 88 : 0, clave: E => 'p' + predMalCalculada(E).id,
  texto: E => { const p = predMalCalculada(E); return `Predijiste ${INSTRUMENTOS[p.instr].simbolo} = ${f2(p.valor)} ${INSTRUMENTOS[p.instr].unidad} (${INSTRUMENTOS[p.instr].nombre.toLowerCase()}) y se midió ${conIncertidumbre(p.obs, p.s, INSTRUMENTOS[p.instr].unidad)}. Antes de atribuir la diferencia al sistema, ¿qué compruebas primero?` },
  opciones: () => [{ id: 'calculo', txt: 'Si mi predicción aplica bien el MAS ideal (fórmula, unidades, radianes, signo, instante)' }, { id: 'sistema', txt: 'Nada: si no coincide, el sistema no es un MAS' }, { id: 'ruido', txt: 'Nada: la diferencia será ruido de medición' }],
  correcta: o => o === 'calculo', efecto: (r) => r.opcion === 'sistema' ? { marca: 'M_ATRIBUYE_SISTEMA' } : {},
  retro: () => 'Una predicción mal calculada no dice nada del sistema. Revisa: ¿usaste ω en rad/s y la calculadora en radianes? ¿El signo corresponde a la fase del movimiento?'
});
nodo({
  id: 'pred-recalculo', cat: 'calculo', tipo: 'numero',
  activa: (E, inv) => { const r = respuestaDe(inv, 'pred-calculo'); return r && predMalCalculada(E) && r.clave === 'p' + predMalCalculada(E).id ? 87 : 0 }, clave: E => 'p' + predMalCalculada(E).id,
  unidad: E => INSTRUMENTOS[predMalCalculada(E).instr].unidad,
  texto: E => { const p = predMalCalculada(E), P = Object.entries(p.p).map(([k, v]) => `${k} = ${String(v).replace('.', ',')}`).join(', '); return `Recalcula la predicción del MAS ideal de ${INSTRUMENTOS[p.instr].simbolo} (${INSTRUMENTOS[p.instr].nombre.toLowerCase()})${P ? ' con ' + P : ''}${p.fm !== 1 || p.fa !== 1 ? ` (montaje: masa ×${p.fm}, amplitud ×${p.fa})` : ''}.` },
  valor: E => predMalCalculada(E).ideal, tol: E => 0.02 * (Math.abs(E.meds.find(d => d.n === predMalCalculada(E).medicion)?.escala) || 1), tolTipo: 'abs'
});
const predFallaSistema = E => [...E.predicciones].reverse().find(p => p.errIdeal <= 0.05 && p.zObs != null && Math.abs(p.zObs) >= 3);
nodo({
  id: 'pred-difiere', cat: 'razonamiento', tipo: 'opcion',
  activa: E => predFallaSistema(E) ? 75 : 0, clave: E => 'p' + predFallaSistema(E).id,
  texto: E => { const p = predFallaSistema(E); return `Tu predicción (${f2(p.valor)}) coincide con el MAS ideal, pero la medición (${conIncertidumbre(p.obs, p.s, INSTRUMENTOS[p.instr].unidad)}) está a ${zt(p.zObs)} incertidumbres. ¿Cuál es el paso más sensato ahora?` },
  opciones: E => [{ id: 'repetir', txt: 'Repetir la medición (o medir otra magnitud) para ver si la diferencia se sostiene' }, { id: 'concluir', txt: 'Concluir ya que el sistema no es un MAS' }, { id: 'ignorar', txt: 'Ignorarla: una medición aislada no importa' }],
  correcta: (o, E) => o === 'repetir' || (o === 'concluir' && Math.abs(predFallaSistema(E).zObs) >= 8),
  efecto: r => r.opcion === 'concluir' ? { marca: 'M_CONCLUYE_PRONTO' } : r.opcion === 'ignorar' ? { marca: 'M_IGNORA_EVIDENCIA' } : {},
  retro: () => 'Con 3σ la probabilidad de una fluctuación es pequeña pero no nula; una segunda observación independiente vuelve la conclusión mucho más sólida.'
});

// ---------- repeticiones y ruido ----------
const grupoDisperso = E => E.repetidos.find(g => Math.max(...g.vals) - Math.min(...g.vals) > 1.5 * g.s);
nodo({
  id: 'ruido-cambio', cat: 'razonamiento', tipo: 'opcion',
  activa: E => grupoDisperso(E) ? 72 : 0, clave: E => grupoDisperso(E).ids.slice(0, 2).join(','),
  texto: E => { const g = grupoDisperso(E); return `Mediste ${g.mag.toLowerCase()} con exactamente las mismas condiciones ${g.n} veces: ${g.vals.map(v => f2(v)).join('; ')} ${g.unidad}. ¿Cambió el movimiento del bloque entre una medición y otra?` },
  opciones: () => [{ id: 'ruido', txt: 'No: el estado en ese instante es el mismo; las diferencias son ruido de medición' }, { id: 'cambia', txt: 'Sí: el sistema se comporta distinto cada vez' }, { id: 'nose', txt: 'No se puede saber' }],
  correcta: o => o === 'ruido', efecto: r => r.opcion === 'cambia' ? { marca: 'M_RUIDO_ES_CAMBIO' } : {},
  retro: () => 'Mismo sistema, mismas condiciones iniciales, mismo instante: el valor verdadero es el mismo. La variación entre repeticiones mide la incertidumbre.'
});
const grupo3 = E => E.repetidos.find(g => g.n >= 3);
nodo({
  id: 'calc-media', cat: 'calculo', tipo: 'numero',
  activa: (E, inv) => grupo3(E) ? 65 : 0, clave: E => grupo3(E).ids.join(','), unidad: E => grupo3(E).unidad,
  texto: E => { const g = grupo3(E); return `Calcula la media de tus ${g.n} mediciones de ${g.mag.toLowerCase()} (${g.vals.map(v => f2(v)).join('; ')} ${g.unidad}).` },
  valor: E => grupo3(E).media, tol: E => Math.max(0.15 * grupo3(E).s, 1e-9), tolTipo: 'abs'
});
nodo({
  id: 'calc-sd', cat: 'calculo', tipo: 'numero',
  activa: (E, inv) => grupo3(E) && respondida(inv, 'calc-media', grupo3(E).ids.join(',')) ? 64 : 0, clave: E => grupo3(E).ids.join(','), unidad: E => grupo3(E).unidad,
  texto: E => `Calcula la desviación estándar muestral (dividiendo entre n − 1) de esas ${grupo3(E).n} mediciones.`, valor: E => grupo3(E).sd, tol: () => 0.08, tolTipo: 'rel'
});
nodo({
  id: 'sigma-media', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => grupo3(E) && respondida(inv, 'calc-sd', grupo3(E).ids.join(',')) ? 63 : 0, clave: E => grupo3(E).ids.join(','),
  texto: E => { const g = grupo3(E); return `El instrumento declara una incertidumbre σ = ${formatear(g.s, g.s / 10).v} ${g.unidad} por medición. ¿Qué incertidumbre tiene la MEDIA de tus ${g.n} mediciones?` },
  opciones: () => [{ id: 'raiz', txt: 'σ/√n: promediar reduce la incertidumbre' }, { id: 'igual', txt: 'σ: promediar no cambia nada' }, { id: 'suma', txt: 'n·σ: los errores se acumulan' }],
  correcta: o => o === 'raiz', retro: () => 'Errores aleatorios independientes: la incertidumbre de la media es σ/√n. Por eso repetir mediciones permite detectar diferencias pequeñas.'
});

// ---------- período ----------
nodo({
  id: 'periodo-coincide', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.T && Math.abs(E.T.z) < 2 ? 70 : 0, clave: E => E.T.ids.join(','),
  texto: E => `Tu período medido (${conIncertidumbre(E.T.v, E.T.s, 's')}) coincide con 2π√(m/k) = ${f2(E.T.ideal)} s (diferencia de ${zt(E.T.z)} incertidumbres). ¿Qué puedes afirmar con esto?`,
  opciones: () => [{ id: 'demuestra', txt: 'Que el movimiento es un MAS ideal' }, { id: 'compatible', txt: 'Que el período es compatible con el MAS ideal, pero otros movimientos (por ejemplo, con amortiguamiento débil) tendrían casi el mismo período' }, { id: 'lineal', txt: 'Que el resorte es lineal para cualquier amplitud' }],
  correcta: o => o === 'compatible', efecto: r => r.opcion === 'demuestra' ? { marca: 'M_PERIODO' } : r.opcion === 'lineal' ? { marca: 'M_LINEAL' } : {},
  retro: () => 'Un acuerdo en una sola magnitud es una condición necesaria del MAS, no suficiente: hay que buscar las pruebas que distinguirían las alternativas.'
});
nodo({
  id: 'amort-periodo', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => (marca(inv, 'M_PERIODO') || respondida(inv, 'periodo-coincide')) && !respondida(inv, 'amort-periodo') ? 62 : 0, clave: () => '1',
  texto: E => `En un oscilador amortiguado con factor de calidad Q = 20, la amplitud cae a la mitad en unas 4–5 oscilaciones, pero su pseudo-período T_d = 2π/√(ω₀² − γ²) solo difiere del ideal en un 0,03 %. Con tu cronómetro (incertidumbre ${E.T ? conIncertidumbre(E.T.s, E.T.s / 10, 's') : 'de décimas de segundo'}), ¿podrías distinguir ese oscilador de un MAS midiendo solo el período?`,
  opciones: () => [{ id: 'no', txt: 'No: habría que mirar si la energía o la amplitud disminuyen con el tiempo' }, { id: 'si', txt: 'Sí: el período lo delataría' }],
  correcta: o => o === 'no', efecto: r => r.opcion === 'no' ? { sugiere: 'energiaTiempo', corrige: 'M_PERIODO' } : {},
  retro: () => 'El amortiguamiento se manifiesta sobre todo en la energía (o la amplitud) a lo largo del tiempo, no en el período.'
});
nodo({
  id: 'periodo-difiere', cat: 'razonamiento', tipo: 'multi',
  activa: E => E.T && Math.abs(E.T.z) >= 3 ? 74 : 0, clave: E => E.T.ids.join(','),
  texto: E => `Tu período (${conIncertidumbre(E.T.v, E.T.s, 's')}) difiere un ${pct(E.T.pct)} de 2π√(m/k) = ${f2(E.T.ideal)} s: ${zt(E.T.z)} incertidumbres. ¿Qué explicaciones físicas podrían producir esa diferencia? (marca todas las plausibles)`,
  opciones: () => [{ id: 'k', txt: 'La constante real del resorte no es la nominal' }, { id: 'masa', txt: 'La masa efectiva no es m (por ejemplo, el resorte tiene masa)' }, { id: 'nolin', txt: 'La fuerza no es lineal y el período depende de la amplitud' }, { id: 'amort', txt: 'Un amortiguamiento débil' }, { id: 'crono', txt: 'Simplemente un error de cronometraje' }],
  correctas: E => ['k', 'masa', 'nolin'].concat(Math.abs(E.T.z) < 4 ? ['crono'] : []),
  efecto: () => ({ sugiere: 'amplitud' }), retro: () => 'Un amortiguamiento débil apenas cambia el período; un error de cronometraje no explica varias incertidumbres de diferencia. Quedan los parámetros efectivos y la no linealidad: cambiar la amplitud o la masa las distingue.'
});
nodo({
  id: 'discriminar', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => respondida(inv, 'periodo-difiere') && !E.familias.amplitud && !E.familias.posicionFuerza ? 60 : 0, clave: () => '1',
  texto: () => '¿Qué experimento distingue «resorte armónico con parámetros efectivos distintos» de «fuerza restauradora no lineal»?',
  opciones: () => [{ id: 'amp', txt: 'Cambiar la amplitud inicial y volver a medir el período' }, { id: 'e0', txt: 'Medir la energía en t = 0' }, { id: 'x0', txt: 'Medir la posición en t = 0' }],
  correcta: o => o === 'amp', efecto: r => r.opcion === 'amp' ? { sugiere: 'amplitud' } : {}, retro: () => 'En un oscilador armónico el período no depende de la amplitud; en uno no lineal sí.'
});
nodo({
  id: 'cronometro', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => inv.mediciones.some(d => d.instr === 'periodo' && d.p.N === 1) && !inv.mediciones.some(d => d.instr === 'periodo' && d.p.N === 10) && !respondida(inv, 'cronometro') ? 55 : 0, clave: () => '1',
  texto: E => `Cronometraste una sola oscilación: tu tiempo de reacción (unos ${String(0.08).replace('.', ',')} s) pesa entero sobre el período. ¿Qué reduce más la incertidumbre del período por crédito gastado?`,
  opciones: () => [{ id: 'N10', txt: 'Cronometrar 10 oscilaciones seguidas y dividir entre 10 (σ/10)' }, { id: 'rep', txt: 'Repetir varias veces la medición de una oscilación (σ/√n)' }, { id: 'nada', txt: 'Nada: la incertidumbre es la que es' }],
  correcta: o => o === 'N10', retro: () => 'Una sola medición de 10 oscilaciones divide entre 10 el error de reacción; diez repeticiones de una oscilación solo lo dividen entre √10 y cuestan mucho más.'
});

// ---------- dependencia con la masa ----------
nodo({
  id: 'masa-pred', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => (inv.montajes || []).some(c => c.startsWith('2|') || c.startsWith('0.5|')) && !E.masa ? 66 : 0, clave: () => '1',
  texto: (E, inv) => { const fm = (inv.montajes || []).find(c => c.startsWith('2|')) ? 2 : 0.5; return `Montaste el bloque con ${fm === 2 ? 'el doble' : 'la mitad'} de masa. Según el MAS ideal, ¿cuánto vale T(${fm === 2 ? '2m' : 'm/2'}) / T(m)?` },
  opciones: (E, inv) => { const fm = (inv.montajes || []).find(c => c.startsWith('2|')) ? 2 : 0.5; return [{ id: 'raiz', txt: fm === 2 ? '√2 ≈ 1,414' : '1/√2 ≈ 0,707' }, { id: 'lin', txt: fm === 2 ? '2' : '0,5' }, { id: 'uno', txt: '1 (no cambia)' }] },
  correcta: o => o === 'raiz', retro: () => 'T = 2π√(m/k): el período crece con la raíz cuadrada de la masa.'
});
nodo({
  id: 'masa-cociente', cat: 'calculo', tipo: 'numero',
  activa: E => E.masa ? 68 : 0, clave: E => E.masa.ids.join(','),
  texto: E => `Con tus mediciones, T(${E.masa.fm === 2 ? '2m' : 'm/2'}) = ${conIncertidumbre(E.masa.T2.v, E.masa.T2.s, 's')} y T(m) = ${conIncertidumbre(E.T.v, E.T.s, 's')}. Calcula el cociente.`,
  valor: E => E.masa.r, tol: () => 0.004, tolTipo: 'rel'
});
nodo({
  id: 'masa-compat', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => E.masa && respondida(inv, 'masa-cociente', E.masa.ids.join(',')) ? 67 : 0, clave: E => E.masa.ids.join(','),
  texto: E => `Tu cociente es ${conIncertidumbre(E.masa.r, E.masa.s, '')}; el MAS ideal predice ${f2(E.masa.esperado)}. ¿Qué concluyes de esta comparación?`,
  opciones: () => [{ id: 'compatible', txt: 'Compatibles (diferencia menor que 2 incertidumbres)' }, { id: 'incompatible', txt: 'Incompatibles (diferencia de 3 incertidumbres o más)' }, { id: 'indecidible', txt: 'No puedo decidir (entre 2 y 3 incertidumbres): necesito más precisión' }],
  correcta: (o, E) => o === veredicto(E.masa.z),
  retro: E => `La diferencia es de ${zt(E.masa.z)} incertidumbres.`
});
nodo({
  id: 'masa-interp', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.masa && Math.abs(E.masa.z) >= 3 ? 61 : 0, clave: E => E.masa.ids.join(','),
  texto: E => `El cociente medido (${f2(E.masa.r)}) está más cerca de 1 que la predicción ${f2(E.masa.esperado)}${E.masa.r > E.masa.esperado === (E.masa.fm < 1) ? '' : ' (o se aleja de 1)'}. ¿Qué modelo explica que el período dependa de la masa del bloque de forma más débil que √m?`,
  opciones: () => [{ id: 'mres', txt: 'El resorte tiene masa: T = 2π√((m + m_s/3)/k)' }, { id: 'amort', txt: 'Un amortiguamiento débil' }, { id: 'kreal', txt: 'Una constante k distinta de la nominal' }],
  correcta: (o, E) => o === 'mres' && Math.abs(E.masa.r - 1) < Math.abs(E.masa.esperado - 1),
  retro: () => 'Una k distinta cambia los dos períodos en el mismo factor y deja el cociente en √2; la masa del resorte suma un término que no se duplica.'
});

// ---------- dependencia con la amplitud ----------
nodo({
  id: 'amp-pred', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => (inv.montajes || []).some(c => /^1\|(2|0\.5)$/.test(c)) && !E.amplitud ? 66 : 0, clave: () => '1',
  texto: () => 'Cambiaste la amplitud inicial. Según el MAS ideal, ¿qué le pasa al período?',
  opciones: () => [{ id: 'igual', txt: 'No cambia: es independiente de la amplitud (isocronismo)' }, { id: 'crece', txt: 'Crece en proporción a la amplitud' }, { id: 'raiz', txt: 'Crece como la raíz de la amplitud' }],
  correcta: o => o === 'igual'
});
nodo({
  id: 'amp-compat', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.amplitud ? 69 : 0, clave: E => E.amplitud.ids.join(','),
  texto: E => `Con amplitud ×${String(E.amplitud.fa).replace('.', ',')}, T = ${conIncertidumbre(E.amplitud.T2.v, E.amplitud.T2.s, 's')}; con la amplitud original, T = ${conIncertidumbre(E.T.v, E.T.s, 's')} (cociente ${conIncertidumbre(E.amplitud.r, E.amplitud.s, '')}). ¿Depende el período de la amplitud?`,
  opciones: () => [{ id: 'compatible', txt: 'No hay evidencia de dependencia (diferencia menor que 2 incertidumbres)' }, { id: 'incompatible', txt: 'Sí, depende (3 incertidumbres o más)' }, { id: 'indecidible', txt: 'No puedo decidir con esta precisión' }],
  correcta: (o, E) => o === veredicto(E.amplitud.z), retro: E => `El cociente difiere de 1 en ${zt(E.amplitud.z)} incertidumbres.`
});
nodo({
  id: 'amp-interp', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.amplitud && Math.abs(E.amplitud.z) >= 3 ? 63 : 0, clave: E => E.amplitud.ids.join(','),
  texto: E => `Con ${E.amplitud.fa > 1 ? 'más' : 'menos'} amplitud el período ${(E.amplitud.r < 1) === (E.amplitud.fa > 1) ? 'disminuye' : 'aumenta'}. ¿Qué tipo de fuerza restauradora produce ese comportamiento?`,
  opciones: () => [{ id: 'dura', txt: 'Un resorte que se endurece: la fuerza crece más rápido que kx al estirarlo' }, { id: 'blanda', txt: 'Un resorte que se ablanda: la fuerza crece más despacio que kx' }, { id: 'amort', txt: 'Un amortiguamiento' }],
  correcta: (o, E) => o === ((E.amplitud.r < 1) === (E.amplitud.fa > 1) ? 'dura' : 'blanda'),
  efecto: () => ({ hipotesisSugerida: 'H_NOLIN' }), retro: () => 'Si la fuerza crece más rápido que lineal, a más amplitud el bloque acelera más y completa antes la oscilación.'
});

// ---------- energía ----------
nodo({
  id: 'energia-cuando', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => inv.mediciones.some(d => d.instr === 'energia') && !E.familias.energiaTiempo && !respondida(inv, 'energia-cuando') ? 58 : 0, clave: () => '1',
  texto: E => 'Si este oscilador perdiera energía muy lentamente, ¿cómo lo detectarías con más probabilidad?',
  opciones: () => [{ id: 'separar', txt: 'Midiendo la energía al principio y lo más tarde posible (y repitiendo si la diferencia es pequeña)' }, { id: 'cero', txt: 'Midiendo la energía muchas veces en t = 0' }, { id: 'periodo', txt: 'Midiendo con precisión el período' }],
  correcta: o => o === 'separar', efecto: r => r.opcion === 'separar' ? { sugiere: 'energiaTiempo' } : {}
});
nodo({
  id: 'energia-z', cat: 'calculo', tipo: 'numero',
  activa: E => E.energia ? 66 : 0, clave: E => [...E.energia.E1.ids, ...E.energia.E2.ids].join(','),
  texto: E => `Energía temprana (t ≈ ${f2(E.energia.t0)} s): ${conIncertidumbre(E.energia.E1.v, E.energia.E1.s, 'J')}; tardía (t ≈ ${f2(E.energia.t1)} s): ${conIncertidumbre(E.energia.E2.v, E.energia.E2.s, 'J')}. Calcula z = (E₂ − E₁)/√(σ₁² + σ₂²).`,
  valor: E => E.energia.z, tol: E => Math.max(0.1, 0.05 * Math.abs(E.energia.z)), tolTipo: 'abs'
});
nodo({
  id: 'energia-conserva', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => E.energia && Math.abs(E.energia.z) < 2 && E.energia.dT >= 5 && respondida(inv, 'energia-z', [...E.energia.E1.ids, ...E.energia.E2.ids].join(',')) ? 64 : 0, clave: E => [...E.energia.E1.ids, ...E.energia.E2.ids].join(','),
  texto: E => `En ${f2(E.energia.t1 - E.energia.t0)} s (unas ${Math.round(E.energia.dT)} oscilaciones) la energía no cambia más allá de la incertidumbre. ¿Demuestra esto que el movimiento es un MAS?`,
  opciones: () => [{ id: 'si', txt: 'Sí: la conservación de la energía caracteriza al MAS' }, { id: 'no', txt: 'No: un oscilador conservativo NO armónico (fuerza no lineal) también conserva la energía, y una pérdida menor que la resolución pasaría inadvertida' }],
  correcta: o => o === 'no', efecto: r => r.opcion === 'si' ? { marca: 'M_ENERGIA' } : { corrige: 'M_ENERGIA', sugiere: 'amplitud' },
  retro: () => 'Conservación de energía y MAS no son lo mismo: U = ½kx² + ¼k₃x⁴ también conserva la energía. Y «no detecto pérdida» significa «pérdida menor que mi resolución».'
});
nodo({
  id: 'energia-pierde', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.energia && E.energia.z <= -3 ? 70 : 0, clave: E => [...E.energia.E1.ids, ...E.energia.E2.ids].join(','),
  texto: E => `La energía bajó un ${pct(-E.energia.pct)} en ${f2(E.energia.t1 - E.energia.t0)} s: ${zt(E.energia.z)} incertidumbres. ¿Qué implica?`,
  opciones: () => [{ id: 'disipa', txt: 'Hay disipación: el movimiento no es un MAS ideal (es compatible con un oscilador amortiguado)' }, { id: 'ruido', txt: 'Es ruido de medición' }, { id: 'transforma', txt: 'La energía cinética se transformó en potencial' }],
  correcta: o => o === 'disipa', efecto: r => r.opcion === 'disipa' ? { hipotesisSugerida: 'H_AMORT' } : {},
  retro: () => 'La energía MECÁNICA ya suma cinética y potencial: si baja de forma significativa, algo la disipa.'
});
nodo({
  id: 'energia-dudosa', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.energia && Math.abs(E.energia.z) >= 2 && Math.abs(E.energia.z) < 3 ? 65 : 0, clave: E => [...E.energia.E1.ids, ...E.energia.E2.ids].join(','),
  texto: E => `La diferencia de energía es de ${zt(E.energia.z)} incertidumbres: ni claramente compatible ni claramente distinta. ¿Qué haces?`,
  opciones: () => [{ id: 'mas', txt: 'Repetir las mediciones (o separarlas más en el tiempo) antes de decidir' }, { id: 'disipa', txt: 'Concluir que hay disipación' }, { id: 'conserva', txt: 'Concluir que se conserva' }],
  correcta: o => o === 'mas', efecto: r => r.opcion === 'mas' ? { sugiere: 'repeticiones' } : { marca: 'M_CONCLUYE_PRONTO' }
});
nodo({
  id: 'energia-inicial', cat: 'razonamiento', tipo: 'opcion',
  activa: E => { const d = E.meds.find(x => x.instr === 'energia' && x.p.t < 0.05 && x.fm === 1 && x.fa === 1); return d && Math.abs(d.z) >= 3 ? 59 : 0 }, clave: () => '1',
  texto: E => { const d = E.meds.find(x => x.instr === 'energia' && x.p.t < 0.05 && x.fm === 1 && x.fa === 1); return `En t ≈ 0 mediste E = ${conIncertidumbre(d.v, d.s, 'J')}, pero ½kA² con los valores nominales da ${f2(d.ideal)} J. En t = 0 toda la energía es potencial. ¿Qué parámetro nominal es sospechoso?` },
  opciones: () => [{ id: 'k', txt: 'La constante del resorte k' }, { id: 'm', txt: 'La masa m' }, { id: 'nada', txt: 'Ninguno: será ruido' }],
  correcta: o => o === 'k', efecto: r => r.opcion === 'k' ? { hipotesisSugerida: 'H_PARAM' } : {}, retro: () => 'En t = 0 la velocidad es nula: E = ½kA² no depende de m.'
});

// ---------- aceleración frente a posición ----------
nodo({
  id: 'ax-calc', cat: 'calculo', tipo: 'numero', unidad: 's⁻²',
  activa: E => E.ax.length ? 57 : 0, clave: E => String(E.ax[0].n),
  texto: E => `Mediste a = ${f2(E.meds.find(d => d.n === E.ax[0].n).v)} m/s² cuando x = ${f2(E.ax[0].x0)} m. Calcula a/x.`, valor: E => E.ax[0].r, tol: () => 0.02, tolTipo: 'rel'
});
nodo({
  id: 'ax-lineal', cat: 'razonamiento', tipo: 'opcion',
  activa: E => E.axComp ? 62 : 0, clave: E => E.axComp.p.n + ',' + E.axComp.q.n,
  texto: E => `a/x vale ${conIncertidumbre(E.axComp.p.r, E.axComp.p.s, 's⁻²')} en x = ${f2(E.axComp.p.x0)} m y ${conIncertidumbre(E.axComp.q.r, E.axComp.q.s, 's⁻²')} en x = ${f2(E.axComp.q.x0)} m. En un MAS, a/x = −ω² es constante. ¿Qué dicen tus datos?`,
  opciones: () => [{ id: 'compatible', txt: 'a/x es constante dentro de la incertidumbre: compatible con fuerza lineal' }, { id: 'incompatible', txt: 'a/x cambia con la posición: la fuerza no es lineal' }, { id: 'indecidible', txt: 'No puedo decidir con esta precisión' }],
  correcta: (o, E) => o === veredicto(E.axComp.z), retro: E => `La diferencia es de ${zt(E.axComp.z)} incertidumbres.`
});

// ---------- hipótesis: coherencia con la evidencia ----------
const incoherencia = (E, inv) => {
  const H = inv.hipotesis || {};
  if (H.H_MAS && H.H_MAS.estado === 'compatible' && E.discrepancias.length) return { h: 'H_MAS', motivo: `tienes una discrepancia significativa (${E.discrepancias[0].txt}, ${zt(E.discrepancias[0].z)}σ)`, sugerido: 'descartada' };
  if (H.H_AMORT && H.H_AMORT.estado === 'descartada' && !E.familias.energiaTiempo) return { h: 'H_AMORT', motivo: 'no has comparado la energía (o la amplitud) en instantes muy separados', sugerido: 'sin evaluar' };
  if (H.H_AMORT && H.H_AMORT.estado === 'descartada' && E.familias.energiaTiempo) return { h: 'H_AMORT', motivo: 'una pérdida de energía menor que tu resolución no se puede excluir: como mucho puedes acotarla', sugerido: 'indecidible' };
  if (H.H_NOLIN && H.H_NOLIN.estado === 'descartada' && !E.familias.amplitud && !E.familias.posicionFuerza) return { h: 'H_NOLIN', motivo: 'no has variado la amplitud ni comparado a/x en dos posiciones', sugerido: 'sin evaluar' };
  if (H.H_RUIDO && H.H_RUIDO.estado === 'compatible' && E.repetidos.length && E.repetidos.every(g => g.sd != null && g.sd < 1.5 * g.s && g.s < 0.05 * Math.abs(g.ideal || 1))) return { h: 'H_RUIDO', motivo: 'tus repeticiones muestran una dispersión pequeña', sugerido: 'descartada' };
  return null
};
nodo({
  id: 'hip-coherencia', cat: 'razonamiento', tipo: 'opcion+texto',
  activa: (E, inv) => incoherencia(E, inv) ? 80 : 0, clave: (E, inv) => { const x = incoherencia(E, inv); return x.h + ':' + inv.hipotesis[x.h].estado + ':' + E.meds.length },
  texto: (E, inv) => { const x = incoherencia(E, inv); return `Valoraste «${HIPOTESIS[x.h]}» como «${inv.hipotesis[x.h].estado}», pero ${x.motivo}. ¿Revisas esa valoración? Explica tu decisión.` },
  opciones: (E, inv) => { const x = incoherencia(E, inv); return [{ id: 'revisar', txt: `Sí: la paso a «${x.sugerido}»` }, { id: 'mantener', txt: 'No: la mantengo (justifico por qué)' }] },
  correcta: o => o === 'revisar',
  efecto: (r, E, inv) => { const x = incoherencia(E, inv); return r.opcion === 'revisar' ? { hipotesis: { [x.h]: x.sugerido }, motivo: 'revisión ante la evidencia: ' + x.motivo, revision: true } : {} }
});

// ---------- presupuesto ----------
const PRUEBAS = {
  energiaTiempo: { txt: 'Energía al principio y lo más tarde posible (6 créditos)', coste: 6 },
  amplitud: { txt: 'Montaje con otra amplitud + período de 10 oscilaciones (7 créditos)', coste: 7 },
  masa: { txt: 'Montaje con otra masa + período de 10 oscilaciones (7 créditos)', coste: 7 },
  repeticiones: { txt: 'Repetir 2 veces una medición dudosa (2–6 créditos)', coste: 2 },
  posicionFuerza: { txt: 'Aceleración en dos posiciones distintas (6 créditos)', coste: 6 }
};
nodo({
  id: 'presupuesto', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => E.creditos <= 10 && E.creditos >= 2 && E.nFamilias < 3 && !inv.conclusion ? 58 : 0, clave: E => String(E.creditos),
  texto: E => `Te quedan ${E.creditos} créditos. ¿Qué prueba aporta ahora más información para decidir?`,
  opciones: E => Object.entries(PRUEBAS).map(([id, p]) => ({ id, txt: p.txt + (E.familias[id] ? ' — ya la hiciste' : '') })).concat([{ id: 'repetirHecha', txt: 'Repetir algo que ya medí sin dudas' }]),
  correcta: (o, E) => o !== 'repetirHecha' && !E.familias[o] && PRUEBAS[o].coste <= E.creditos,
  efecto: r => PRUEBAS[r.opcion] ? { sugiere: r.opcion } : {}
});

// ---------- conclusión (se plantean al proponer un borrador de conclusión) ----------
const noDescartadas = E => ['amortDebil'].concat(E.familias.amplitud || E.familias.posicionFuerza ? [] : ['nolin']).concat(E.familias.periodo || E.familias.masa ? [] : ['param']).concat(E.familias.repeticiones ? [] : ['ruido']);
nodo({
  id: 'conc-compatible', cat: 'razonamiento', tipo: 'multi',
  activa: (E, inv) => inv.borrador && inv.borrador.tipo === 'compatible' ? 95 : 0, clave: E => 'c' + E.meds.length,
  texto: () => 'Propones «compatible con el MAS ideal». Con lo que mediste, ¿qué alternativas SIGUEN siendo compatibles con tus observaciones? (marca todas)',
  opciones: () => [{ id: 'amortDebil', txt: 'Un amortiguamiento muy débil' }, { id: 'nolin', txt: 'Una fuerza no lineal' }, { id: 'param', txt: 'Parámetros efectivos distintos de los nominales' }, { id: 'ruido', txt: 'Un MAS con instrumentos más ruidosos de lo que creo' }, { id: 'ninguna', txt: 'Ninguna: mis datos prueban que es exactamente un MAS' }],
  correctas: E => noDescartadas(E), efecto: r => (r.opciones || []).includes('ninguna') ? { marca: 'M_DEMOSTRACION' } : {},
  retro: () => '«Compatible» significa «no contradicho dentro de la resolución»: un amortiguamiento suficientemente débil nunca se puede excluir del todo.'
});
nodo({
  id: 'conc-incompatible', cat: 'razonamiento', tipo: 'opcion',
  activa: (E, inv) => inv.borrador && inv.borrador.tipo === 'incompatible' ? 95 : 0, clave: E => 'c' + E.meds.length,
  texto: () => 'Propones «incompatible con el MAS ideal». ¿Qué observación tuya lo justifica con más fuerza?',
  opciones: E => E.discrepancias.slice(0, 5).map((d, i) => ({ id: 'd' + i, txt: `${d.txt} (${zt(d.z)}σ)` })).concat(E.dudosas.slice(0, 2).map(d => ({ id: 'm' + d.n, txt: `${INSTRUMENTOS[d.instr].nombre} #${d.n} (${zt(d.z)}σ)` }))).concat([{ id: 'intuicion', txt: 'Ninguna en concreto: el movimiento no parecía armónico' }]),
  correcta: o => /^d\d$/.test(o), efecto: r => r.opcion === 'intuicion' ? { marca: 'M_SIN_EVIDENCIA' } : {},
  retro: () => 'Una conclusión de incompatibilidad necesita una discrepancia concreta y significativa (≥ 3σ), mejor si se confirma con otra medición.'
});
nodo({
  id: 'conc-insuficiente', cat: 'reflexion', tipo: 'opcion+texto',
  activa: (E, inv) => inv.borrador && inv.borrador.tipo === 'insuficiente' ? 95 : 0, clave: E => 'c' + E.meds.length,
  texto: () => 'Propones «evidencia insuficiente». ¿Qué prueba adicional permitiría decidir, y qué resultado esperarías en cada caso? Elige la prueba y explícalo.',
  opciones: E => Object.entries(PRUEBAS).map(([id, p]) => ({ id, txt: p.txt + (E.familias[id] ? ' (ya hecha)' : '') })),
  correcta: (o, E) => !E.familias[o]
});

/* ============================== MOTOR ============================== */
/** Siguiente pregunta según el estado: la de mayor prioridad que aplica y no está respondida (ni omitida) para la misma situación. */
export function siguientePregunta(inv, exp) {
  const E = calcularEvidencia(inv, exp); let mejor = null;
  for (const n of NODOS) {
    let p = 0, clave = null;
    try { p = n.activa(E, inv) || 0; if (p > 0) clave = String(n.clave(E, inv)) } catch (e) { p = 0 }
    if (p <= 0 || respondida(inv, n.id, clave) || omitida(inv, n.id, clave)) continue;
    if (!mejor || p > mejor.p) mejor = { n, p, clave }
  }
  if (!mejor) return null;
  const n = mejor.n;
  return { id: n.id, cat: n.cat, tipo: n.tipo, clave: mejor.clave, texto: n.texto(E, inv), opciones: n.opciones ? n.opciones(E, inv) : null, unidad: typeof n.unidad === 'function' ? n.unidad(E) : n.unidad || '', ayuda: n.ayuda || '' };
}

/** Evalúa una respuesta (sin modificar nada). Devuelve {correcta: true|false|null, esperado, retro, efecto}. */
export function evaluarRespuesta(inv, exp, nodoId, clave, r) {
  const n = NODOS.find(x => x.id === nodoId), E = calcularEvidencia(inv, exp);
  let correcta = null, esperado = null;
  if (n.tipo === 'numero') {
    const v = Number(String(r.numero).replace(',', '.')); esperado = n.valor(E); const tol = n.tol(E);
    correcta = Number.isFinite(v) && (n.tolTipo === 'rel' ? Math.abs(v - esperado) <= tol * Math.abs(esperado) : Math.abs(v - esperado) <= tol);
  } else if (n.tipo === 'multi') {
    const ok = new Set(n.correctas(E)), sel = new Set(r.opciones || []);
    const inter = [...sel].filter(x => ok.has(x)).length, union = new Set([...sel, ...ok]).size;
    correcta = union ? inter / union : 1; esperado = [...ok];
  } else if (n.correcta) correcta = n.correcta(r.opcion, E, inv);
  const retro = n.retro ? n.retro(E, inv) : '', efecto = n.efecto ? n.efecto(r, E, inv) || {} : {};
  return { correcta, esperado, retro, efecto, cat: n.cat };
}

/** Sugerencias de la siguiente prueba (visibles en Instrumentos): según lo que falta por discriminar. */
export function sugerencias(inv, exp) {
  const E = calcularEvidencia(inv, exp), s = [], pide = new Set(Object.values(inv.marcas || {}).filter(x => typeof x === 'string'));
  for (const r of inv.respuestas) if (r.efecto && r.efecto.sugiere) pide.add(r.efecto.sugiere);
  const Tn = E.Tn, tard = Math.floor((60 - 1) / Tn) * Tn;
  const txt = {
    energiaTiempo: `Comparar la energía (o la posición en un máximo) en t ≈ 0 y en t ≈ ${f2(tard)} s, unas ${Math.round(tard / Tn)} oscilaciones después.`,
    amplitud: 'Montar el bloque con el doble (o la mitad) de amplitud y cronometrar 10 oscilaciones.',
    masa: 'Montar el bloque con el doble (o la mitad) de masa y cronometrar 10 oscilaciones.',
    repeticiones: 'Repetir la medición más dudosa para estimar su dispersión.',
    posicionFuerza: 'Medir la aceleración al pasar por dos posiciones bien distintas y comparar a/x.'
  };
  for (const k of pide) if (txt[k] && !E.familias[k]) s.push({ id: k, txt: txt[k], motivo: 'la propusiste en tus respuestas' });
  return s
}
export { calcularEvidencia };
