import { CIENTIFICO_SVG } from '../js/cientifico.js';
document.getElementById('avisoEtico').innerHTML = `<div class="emergente-caja">${CIENTIFICO_SVG}<h2>Has salido de la app y has vuelto a entrar</h2>
  <p>Nuestro sistema lo ha detectado y lo ha registrado para tu profesor: 14 s fuera mientras respondías una pregunta · 2.ª vez.</p>
  <p><b>Te recordamos las reglas éticas:</b></p><ul><li>El trabajo es <b>individual</b>.</li><li>Responde <b>sin IA ni ayuda externa</b>.</li><li>Razona con <b>tus propias mediciones</b>: reconocer lo que no sabes también cuenta en la nota.</li></ul>
  <p><button type="button" class="btn prim">Entendido, sigo con mi trabajo</button></p></div>`;
