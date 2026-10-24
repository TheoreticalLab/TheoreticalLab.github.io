// GRÁFICAS · solo con datos que el estudiante ya obtuvo: puntos medidos con barras de ±1σ y sus predicciones (huecas).
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = x => { const a = Math.abs(x); if (a < 1e-12) return '0'; return (a >= 100 ? x.toFixed(0) : a >= 1 ? x.toFixed(1) : a >= 0.01 ? x.toFixed(3) : x.toExponential(1)).replace('.', ',') };

/** series: [{puntos: [{t, v, s}], tipo: 'medida' | 'prediccion'}]; etiquetas: {x, y} */
export function dibujarGrafica(canvas, series, etiquetas) {
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const pts = series.flatMap(s => s.puntos); if (!pts.length) return;
  let x0 = Math.min(...pts.map(p => p.t)), x1 = Math.max(...pts.map(p => p.t)), y0 = Math.min(...pts.map(p => p.v - (p.s || 0))), y1 = Math.max(...pts.map(p => p.v + (p.s || 0)));
  if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1 } if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1 }
  const py = (y1 - y0) * 0.08; y0 -= py; y1 += py; const px = (x1 - x0) * 0.04, x00 = x0; x0 = x00 >= 0 ? Math.max(0, x0 - px) : x0 - px; x1 += px;
  const M = { l: 58, r: 12, t: 26, b: 34 }, X = t => M.l + (t - x0) / (x1 - x0) * (W - M.l - M.r), Y = v => H - M.b - (v - y0) / (y1 - y0) * (H - M.t - M.b);
  g.strokeStyle = css('--borde'); g.fillStyle = css('--suave'); g.font = '12px ui-monospace, monospace'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, yy = Y(v); g.beginPath(); g.moveTo(M.l, yy); g.lineTo(W - M.r, yy); g.stroke(); g.textAlign = 'right'; g.fillText(fmt(v), M.l - 6, yy + 4) }
  for (let i = 0; i <= 5; i++) { const t = x0 + (x1 - x0) * i / 5; g.textAlign = 'center'; g.fillText(fmt(t), X(t), H - M.b + 16) }
  if (y0 < 0 && y1 > 0) { g.strokeStyle = css('--suave'); g.beginPath(); g.moveTo(M.l, Y(0)); g.lineTo(W - M.r, Y(0)); g.stroke() }
  g.textAlign = 'left'; g.fillText(etiquetas.y, 4, 12); g.textAlign = 'right'; g.fillText(etiquetas.x, W - M.r, H - 4);
  for (const s of series) for (const p of s.puntos) {
    const cx = X(p.t), cy = Y(p.v);
    if (s.tipo === 'medida') {
      g.strokeStyle = css('--acento'); g.fillStyle = css('--acento'); g.lineWidth = 1.5;
      if (p.s) { g.beginPath(); g.moveTo(cx, Y(p.v - p.s)); g.lineTo(cx, Y(p.v + p.s)); g.moveTo(cx - 4, Y(p.v - p.s)); g.lineTo(cx + 4, Y(p.v - p.s)); g.moveTo(cx - 4, Y(p.v + p.s)); g.lineTo(cx + 4, Y(p.v + p.s)); g.stroke() }
      g.beginPath(); g.arc(cx, cy, 3.5, 0, 2 * Math.PI); g.fill()
    } else { g.strokeStyle = css('--aviso'); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 5, 0, 2 * Math.PI); g.stroke() }
  }
}
