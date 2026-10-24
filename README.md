# Laboratorio MAS · investigación masa-resorte

**En línea:** https://theoreticallab.github.io/

Laboratorio científico adaptativo para Física General. Cada estudiante investiga seis sistemas masa-resorte horizontales (experimentos A, B, C, D, E, I) y decide, con mediciones y razonamiento, si su movimiento es **compatible con el MAS ideal**, **incompatible** o si la **evidencia es insuficiente**.

- Funciona entero en el navegador: HTML, CSS y JavaScript con módulos ES, **sin dependencias**, sin servidor, sin registro y sin IA externa.
- Se publica gratis en GitHub Pages. El progreso se guarda en el navegador (`localStorage`).
- Cada estudiante recibe un identificador. De él salen, de forma reproducible:
  - la asignación oculta de modelos a letras;
  - los parámetros;
  - el ruido de cada medición.
- Hay predicción comprometida antes de cada medición nueva, 32 créditos por experimento, preguntas que dependen de lo que el estudiante hizo, y un registro completo e inalterable.
- Informe descargable en HTML (para el profesor) y JSON (reproducible). Ninguno revela el modelo oculto.

## Estructura

| Archivo | Papel |
|---|---|
| `js/fisica.js` | **Motor físico**: armónico (ideal, k real, masa del resorte), amortiguado (analítico), Duffing (cuadratura + RK4) |
| `js/sesion.js` | Generador de investigaciones: asignación oculta, parámetros, incertidumbres |
| `js/mediciones.js` | **Generador de mediciones**: instrumentos, costes, ruido reproducible |
| `js/evidencia.js`, `js/pedagogia.js` | **Lógica pedagógica**: evidencia del estudiante y grafo de unas 40 preguntas condicionadas |
| `js/investigacion.js` | Estado y operaciones de una investigación (registro que solo crece) |
| `js/evaluacion.js` | Nota provisional (5 × 20) |
| `js/informe.js` | Exportación HTML y JSON |
| `js/app.js`, `js/animacion.js`, `js/graficas.js`, `css/estilo.css`, `index.html` | **Interfaz**: Inicio, Laboratorio, Instrumentos, Investigación, Informe |
| `docente.html`, `js/docente.js` | Revisión docente: modelo oculto, integridad, línea de tiempo, notas, CSV (no enlazada) |
| `GUIA_DOCENTE.md` | Guía del profesor (no enlazada desde la app) |
| `pruebas/` | Pruebas automatizadas |

## Pruebas

Requieren Python 3 y Google Chrome (no hace falta npm):

```bash
python3 pruebas/correr.py                       # física, mediciones, estadística, pedagogía y 120 sesiones con bots
python3 pruebas/correr.py pruebas/pantalla.html # interfaz de extremo a extremo
python3 pruebas/capturas.py                     # capturas de las 5 pantallas en móvil y escritorio
```

Las pruebas comprueban, entre otras cosas:

- **Física:**
  - el MAS analítico;
  - la conservación de la energía (error < 10⁻¹²);
  - la disipación (dE/dt = −bv²);
  - el período frente a la masa y la amplitud;
  - la coherencia entre x, v, a, F y E;
  - x(0) = A y v(0) = 0 en todos los montajes.
- **Mediciones:**
  - las repeticiones se distribuyen alrededor del valor verdadero;
  - la calibración estadística de z;
  - la reproducibilidad de la semilla.
- **Intención pedagógica:**
  - en el experimento indistinguible, z máximo alcanzable 0,25 con todo el presupuesto;
  - las demás anomalías sí son detectables.
- **Pedagogía y evaluación:**
  - las preguntas corresponden a lo que hizo el estudiante y usan sus números;
  - nunca hay bloqueo;
  - la suerte puntúa menos que la evidencia;
  - los informes no revelan el modelo.
- **Herramienta docente:** detecta datos editados a mano.

Publicación: ver `DESPLIEGUE.md`.
