// MARCA DE AGUA · identificador y alias del estudiante en diagonal, discretos, sobre las pantallas con datos.
// No impide capturas (ninguna web puede): las hace rastreables.
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export function svgMarca(texto) {
  const t = xml(texto);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="180" y="105" text-anchor="middle" transform="rotate(-24 180 100)" font-family="ui-monospace, monospace" font-size="15" fill="rgb(128,128,128)" fill-opacity="0.13">${t}</text></svg>`
}
export const urlMarca = texto => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarca(texto))}")`;
export const textoMarca = ses => `${ses.id}${ses.alias ? ' · ' + ses.alias.slice(0, 30) : ''}`;

export function aplicarMarca(ses, visible) {
  let el = document.getElementById('marcaAgua');
  if (!el) { el = document.createElement('div'); el.id = 'marcaAgua'; el.className = 'marca-agua'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el) }
  el.hidden = !(ses && visible);
  if (ses && visible) { const u = urlMarca(textoMarca(ses)); if (el.dataset.u !== u) { el.style.backgroundImage = u; el.dataset.u = u } }
}
