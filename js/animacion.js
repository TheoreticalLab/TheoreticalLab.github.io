// ANIMACIÓN · bloque unido a un resorte horizontal. Dibuja la posición verdadera x(t) del montaje (cualitativa: sin números).
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function dibujarEscena(canvas, x, A, Amax) {
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr) }
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const pared = 22, suelo = H - 34, lado = Math.min(64, H * 0.38), escala = (W * 0.3) / Math.max(Amax, 1e-6);
  const x0 = pared + (W - pared) * 0.52 - lado / 2;                  // equilibrio (borde izquierdo del bloque)
  const xb = x0 + x * escala;
  // suelo y pared
  g.fillStyle = css('--borde'); g.fillRect(0, suelo, W, 3); g.fillRect(pared - 6, suelo - lado - 30, 6, lado + 33);
  g.strokeStyle = css('--borde'); for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(pared - 6, suelo - lado - 30 + i * 14); g.lineTo(pared - 14, suelo - lado - 22 + i * 14); g.stroke() }
  // marcas de equilibrio y de ±A
  g.setLineDash([4, 4]); g.strokeStyle = css('--suave'); g.lineWidth = 1;
  for (const [d, t] of [[0, 'x = 0'], [A, '+A'], [-A, '−A']]) { const px = x0 + lado / 2 + d * escala; g.beginPath(); g.moveTo(px, suelo + 4); g.lineTo(px, suelo - lado - 14); g.stroke(); g.fillStyle = css('--suave'); g.font = '12px ui-monospace, monospace'; g.textAlign = 'center'; g.fillText(t, px, suelo + 20) }
  g.setLineDash([]);
  // resorte: espiras en zigzag desde la pared hasta el bloque
  const y = suelo - lado / 2, n = 14, L = xb - pared, extremo = 10;
  g.strokeStyle = css('--resorte'); g.lineWidth = 2.2; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pared, y); g.lineTo(pared + extremo, y);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; g.lineTo(pared + extremo + (L - 2 * extremo) * t, y + (i % 2 ? 1 : -1) * Math.min(14, lado * 0.25)) }
  g.lineTo(xb - extremo, y); g.lineTo(xb, y); g.stroke();
  // bloque
  g.fillStyle = css('--bloque'); const r = 6; g.beginPath(); g.moveTo(xb + r, suelo - lado); g.arcTo(xb + lado, suelo - lado, xb + lado, suelo, r); g.arcTo(xb + lado, suelo, xb, suelo, r); g.arcTo(xb, suelo, xb, suelo - lado, r); g.arcTo(xb, suelo - lado, xb + lado, suelo - lado, r); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText('m', xb + lado / 2, suelo - lado / 2 + 5)
}
