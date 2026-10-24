// Muñeco científico animado (SVG en línea, sin imágenes externas): bata, gafas y una lupa que «busca».
// Las animaciones están en css/estilo.css (.cientifico) y se desactivan con «reducir movimiento».
export const CIENTIFICO_SVG = `<svg class="cientifico" viewBox="0 0 170 190" role="img" aria-label="Científico con bata y lupa">
  <ellipse class="sombra" cx="82" cy="182" rx="42" ry="5"/>
  <g class="cuerpo">
    <!-- piernas y zapatos -->
    <rect x="62" y="160" width="10" height="16" rx="3" fill="#3b4656"/><rect x="88" y="160" width="10" height="16" rx="3" fill="#3b4656"/>
    <ellipse cx="66" cy="177" rx="10" ry="4" fill="#26303c"/><ellipse cx="94" cy="177" rx="10" ry="4" fill="#26303c"/>
    <!-- bata -->
    <path d="M50 98 Q80 88 110 98 L120 166 Q80 172 40 166 Z" fill="#ffffff" stroke="#2b3a4a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M80 96 L80 166" stroke="#c9d2dc" stroke-width="2"/>
    <path d="M66 95 L80 118 L94 95" fill="#4f7cd6" stroke="#2b3a4a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M77 101 L83 101 L84 118 L80 123 L76 118 Z" fill="#e0533d"/>
    <path d="M64 96 L74 130 M96 96 L86 130" stroke="#2b3a4a" stroke-width="2" fill="none"/>
    <rect x="88" y="132" width="16" height="12" rx="2" fill="#f2f5f8" stroke="#2b3a4a" stroke-width="1.6"/>
    <path d="M92 132 L92 126 M97 132 L97 124" stroke="#4f7cd6" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="80" cy="140" r="2" fill="#2b3a4a"/><circle cx="80" cy="153" r="2" fill="#2b3a4a"/>
    <!-- brazo izquierdo (en reposo) -->
    <path d="M52 104 Q40 128 48 146" stroke="#2b3a4a" stroke-width="2.5" fill="#ffffff"/><circle cx="48" cy="148" r="6" fill="#f3c6a0" stroke="#2b3a4a" stroke-width="2"/>
    <!-- cabeza -->
    <circle cx="80" cy="62" r="29" fill="#f3c6a0" stroke="#2b3a4a" stroke-width="2.5"/>
    <path d="M52 56 Q50 30 70 30 Q72 22 84 26 Q96 20 102 32 Q114 36 108 56 Q104 44 94 42 Q86 48 74 42 Q62 46 52 56 Z" fill="#9aa1ab" stroke="#2b3a4a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="51" cy="64" r="5" fill="#f3c6a0" stroke="#2b3a4a" stroke-width="2"/><circle cx="109" cy="64" r="5" fill="#f3c6a0" stroke="#2b3a4a" stroke-width="2"/>
    <!-- gafas y ojos -->
    <circle cx="69" cy="62" r="8.5" fill="#ffffff" stroke="#2b3a4a" stroke-width="2.2"/><circle cx="91" cy="62" r="8.5" fill="#ffffff" stroke="#2b3a4a" stroke-width="2.2"/>
    <path d="M77.5 62 L82.5 62" stroke="#2b3a4a" stroke-width="2.2"/>
    <ellipse class="ojo" cx="71" cy="63" rx="2.6" ry="3.2" fill="#1d2733"/><ellipse class="ojo" cx="93" cy="63" rx="2.6" ry="3.2" fill="#1d2733"/>
    <path d="M70 79 Q80 86 90 79" stroke="#2b3a4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="62" cy="74" r="3.5" fill="#f0a08a" opacity=".55"/><circle cx="98" cy="74" r="3.5" fill="#f0a08a" opacity=".55"/>
    <!-- brazo derecho con la lupa (gira desde el hombro) -->
    <g class="brazo">
      <path d="M108 104 Q126 100 132 86" stroke="#2b3a4a" stroke-width="2.5" fill="none"/>
      <path d="M108 104 Q126 100 132 86" stroke="#ffffff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".001"/>
      <circle cx="133" cy="84" r="6" fill="#f3c6a0" stroke="#2b3a4a" stroke-width="2"/>
      <path d="M135 80 L143 62" stroke="#7a4f2a" stroke-width="6" stroke-linecap="round"/>
      <circle cx="150" cy="46" r="17" fill="#bfe0ff" fill-opacity=".45" stroke="#2b3a4a" stroke-width="4.5"/>
      <path class="brillo" d="M140 40 Q144 32 152 32" stroke="#ffffff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;
