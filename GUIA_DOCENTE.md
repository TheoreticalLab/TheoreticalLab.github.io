# Laboratorio MAS · Guía docente

> Esta guía **no está enlazada** desde la aplicación del estudiante. Tampoco lo está la herramienta de revisión `docente.html`: ábrela escribiendo su dirección (`…/docente.html`). No compartas ninguna de las dos con los estudiantes.
>
> **Aviso:** el repositorio es público, así que un estudiante que explore GitHub puede encontrarlas. Si eso te preocupa, publica la guía aparte (ver `DESPLIEGUE.md`). La aplicación no pretende ser segura frente a quien sepa programar: su objetivo es educativo.

## 1. Idea

Cada estudiante recibe un identificador de investigación (p. ej. `MAS-7F3K-29QD`). De él se derivan, de forma determinista:

- **La asignación oculta** de seis modelos físicos a las letras A, B, C, D, E, I. Es una permutación distinta para cada estudiante: la «A» de dos estudiantes puede ser un sistema diferente.
- **Los parámetros nominales** de cada experimento:
  - masa entre 0,20 y 1,50 kg;
  - período nominal entre 0,8 y 2,5 s (de ahí sale k);
  - amplitud entre 5 y 20 cm.
- **Las constantes ocultas, las incertidumbres de los instrumentos y el ruido de cada medición.**

La medición número *n* usa la semilla `identificador|letra|med|v1|n`. Por eso repetir una medición da otro ruido, pero siempre alrededor del mismo valor verdadero, y la investigación se puede reproducir exactamente.

Condiciones iniciales en todos los modelos y montajes: **x(0) = A > 0, v(0) = 0**. Ventana de observación: 0–60 s. Presupuesto: **32 créditos** por experimento.

## 2. Modelos y ecuaciones

| Modelo | Ecuación | Qué delata al modelo | Conclusión defendible |
|---|---|---|---|
| **Ideal** | m ẍ = −k x | Nada: todo coincide con el MAS nominal | Compatible |
| **Frecuencia distinta**, variante «masa del resorte» | (m + m_s/3) ẍ = −k x, con m_s entre 0,6 m y 1,5 m | T es un 9–22 % mayor; T(2m)/T(m) < √2; v_max menor; F = m·a ≠ −kx; E(0) = ½kA² sí coincide | Incompatible con el MAS **nominal** |
| **Frecuencia distinta**, variante «k real» | m ẍ = −k_real x, con k_real = k(1 ± 12–25 %) | T distinto, pero T(2m)/T(m) = √2; E(0) = ½k_real A² ≠ ½kA² | Incompatible |
| **Amortiguado** | m ẍ + b ẋ + k x = 0, con Q = ω₀m/b entre 10 y 25 | La energía cae claramente en 60 s (z ≥ 8 con dos mediciones); el período casi no cambia (< 0,5 %) | Incompatible |
| **Duffing** (conservativo) | m ẍ = −k x − k₃ x³, con k₃A²/k entre 0,35 y 0,8 | T menor que el nominal y **decreciente con la amplitud**; a/x cambia con x; la energía se conserva | Incompatible |
| **Ruido** | MAS ideal; instrumentos 6–9 veces más ruidosos | Dispersión grande; hay que promediar | Compatible (o insuficiente si no repitió) |
| **Débil (indistinguible)** | m ẍ + b ẋ + k x = 0, con γ minúsculo | Nada medible (ver §3) | Compatible o insuficiente; ambas valen 20/20 si están justificadas |

**Soluciones que usa el motor:**

- **Armónico:**
  - x = A cos ωt, v = −Aω sen ωt, a = −ω²x, con ω = √(k/m_ef).
  - Energía: K = ½m_ef v² (incluye la del resorte), U = ½kx².
- **Amortiguado** (solución analítica subcrítica):
  - x = A e^(−γt) [cos ω_d t + (γ/ω_d) sen ω_d t] y v = −A (ω₀²/ω_d) e^(−γt) sen ω_d t.
  - Con γ = b/2m y ω_d = √(ω₀² − γ²).
  - Se comprueba que dE/dt = −b v².
- **Duffing:**
  - Período por cuadratura: T = 4∫₀^{π/2} A dθ / √((2/m)[½kA² + ¼k₃A⁴(1 + sen²θ)]).
  - Trayectoria con RK4 a 4096 pasos por período, interpolada con Hermite.
  - Error de cierre de la órbita < 10⁻¹¹; conservación de la energía < 10⁻¹².

Al cambiar el montaje (masa ×½/×2, amplitud ×½/×2) las constantes físicas ocultas (k, m_s, b, k₃) **no cambian**. Las nuevas trayectorias son coherentes con las anteriores.

## 3. El experimento «indistinguible» (cuantificación)

γ se elige para el **peor montaje posible**: masa ½, que duplica γ, y amplitud ×2, que multiplica la energía por 4. En ese montaje, durante los 60 s:

- la pérdida de energía (≈ 16·E₀·γ·60) queda por debajo de **¼ σ_E**;
- la caída de amplitud (≈ 4·A·γ·60) queda por debajo de **¼ σ_x**.

Las pruebas automáticas (`pruebas/pruebas.js`) recorren cientos de investigaciones. Gastando **todo** el presupuesto en la comparación más favorable (energía o posición en un máximo, temprano frente a tarde, promediando), el mayor z alcanzable es **0,25**, muy lejos de 2. **Ningún estudiante puede demostrar honestamente que es incompatible.**

Lo que se evalúa en ese experimento:
- reconocer que «compatible» no es «demostrado»;
- reconocer que un amortiguamiento menor que la resolución nunca se puede excluir.

## 4. Lo que se espera que razonen (respuestas conceptuales)

- **Un período correcto no demuestra un MAS.** Un oscilador amortiguado con Q ≈ 20 tiene un pseudo-período que difiere un 0,03 % del ideal. El cronómetro no lo distingue: hay que mirar la energía o la amplitud a lo largo del tiempo.
- **La conservación de la energía no demuestra un MAS.** U = ½kx² + ¼k₃x⁴ también la conserva. Para distinguir hay que variar la amplitud: en un MAS, T no depende de A (isocronismo). Otra opción es comparar a/x en dos posiciones.
- **Período distinto del nominal.** Si T(2m)/T(m) = √2 y T no depende de A, el resorte es armónico con otra k. Si el cociente es < √2, hay una masa efectiva extra (resorte con masa). Si T depende de A, la fuerza no es lineal (si T decrece con A, el resorte se endurece).
- **La energía inicial no depende de m.** En t = 0, E = ½kA². Si no coincide con la nominal, sospecha de k.
- **Repeticiones.** Mismo instante, mismas condiciones: las diferencias son ruido, no cambios del movimiento. La incertidumbre de la media es σ/√n. Cronometrar 10 oscilaciones divide el error de reacción entre 10.
- **Significación.** z = (observado − esperado)/σ.
  - |z| < 2: compatible.
  - 2–3: dudoso, hay que repetir.
  - ≥ 3: incompatible, mejor si se confirma.
  - Una medición aislada a 3σ entre muchas puede ser azar. La app solo la considera significativa si se repite o si pasa de 5σ.
  - La calibración del ruido está verificada: en modelos ideales, |z| ≥ 3 aparece el 0,28 % de las veces. Puede ocurrir que un estudiante riguroso encuentre una fluctuación genuina de 3σ. La nota lo trata como «conclusión no defendible pero justificada por sus datos» (10–16 de 20 en conclusión), y es una buena ocasión para hablar de comparaciones múltiples.

## 5. Errores frecuentes (la app los marca y desafía)

| Marca | Error | Cómo lo desafía la app |
|---|---|---|
| M_PERIODO | «El período coincide, luego es MAS» | Pregunta si el período distinguiría un amortiguado |
| M_ENERGIA | «La energía se conserva, luego es MAS» | Recuerda los osciladores conservativos no lineales |
| M_ATRIBUYE_SISTEMA | Atribuir al sistema un error propio de cálculo | Radianes, ω en rad/s, fase, signo |
| M_RUIDO_ES_CAMBIO | Creer que el movimiento cambió entre repeticiones | Mismo estado, distinto ruido |
| M_CONCLUYE_PRONTO | Concluir con una sola discrepancia sin confirmarla | Propone repetir antes |
| M_DEMOSTRACION | «Mis datos prueban que es exactamente un MAS» | Insiste en que compatible no es demostrado |
| M_SIN_EVIDENCIA | Concluir «incompatible» sin una observación concreta | Pide la observación y su significación |

Una marca corregida después (respondiendo bien a la pregunta correctora) deja de restar.

## 6. El motor de preguntas

- **No hay una lista fija.** Unos 40 nodos (`js/pedagogia.js`), cada uno con:
  - una **condición** sobre lo que el estudiante midió, predijo, respondió y valoró;
  - un **texto construido con sus números**;
  - una **corrección calculada con sus datos**. Por ejemplo, si su cociente T(2m)/T(m) es compatible con √2 se decide con su z, no con el modelo oculto.
- **Repetición de preguntas:** una pregunta respondida no se repite salvo que su situación cambie (nuevas mediciones).
- **Desafíos de la conclusión:** al proponer una conclusión aparecen preguntas específicas:
  - «compatible»: qué alternativas siguen sin descartar;
  - «incompatible»: qué observación concreta lo justifica;
  - «insuficiente»: qué prueba decidiría.
- **Sin bloqueos:** «Ahora no» siempre está disponible. Entregar siempre es posible, incluso sin créditos, declarando evidencia insuficiente.

## 7. Evaluación (100 puntos, provisional)

| Criterio (20) | Cómo se calcula automáticamente |
|---|---|
| Predicciones | Cercanía de cada predicción al MAS ideal con parámetros nominales (≤ 2 %: completa; ≤ 5 %: ¾; ≤ 15 %: 0,4), ×0,8 sin justificación; hacen falta ≥ 4 para el máximo. Si luego recalcula bien, recupera la mitad. **Se compara con el cálculo correcto, no con lo medido:** acertar el valor real con un cálculo equivocado no suma |
| Selección de experimentos | Pruebas discriminantes: energía separada en el tiempo (5), dependencia con la amplitud (5), con la masa (3), a/x en dos posiciones (3), repeticiones (2), más eficiencia del gasto (2) |
| Cálculos | Preguntas numéricas con tolerancia (ω, T, E₀, medias, desviación, cocientes, z) y el z declarado en la conclusión |
| Razonamiento | Preguntas de opción razonada (16) + revisiones de hipótesis ante la evidencia (hasta 4) − errores sin corregir |
| Conclusión | Defendible con el modelo real **y** justificada con sus datos: 14 + 3 (limitaciones) + 3 (evidencias citadas). Acertar sin evidencia (suerte): 6. No defendible pero justificada por sus datos: 10–12. «Insuficiente» honesto (sin evidencia decisiva): 14–20 |

**Lo que la nota automática no hace:** interpretar textos. Todo texto libre queda en «pendiente de revisión docente»:
- justificaciones de las predicciones;
- respuestas razonadas;
- notas de hipótesis;
- revisiones de interpretación;
- justificación final.

No hay búsqueda de palabras clave.

**Validación con bots** (120 sesiones):
- quien concluye correctamente sin medir obtiene de media 6/20 en conclusión (18/100 en total);
- quien investiga con método obtiene ≈ 18/20 (≈ 91/100).

## 8. Revisión de entregas (`docente.html`)

1. Abre `https://theoreticallab.github.io/docente.html` (no está enlazada).
2. Arrastra los JSON de los estudiantes. Por cada uno verás:
   - **el modelo oculto** y las conclusiones defendibles;
   - **la integridad:** cada medición se regenera desde la semilla y debe coincidir exactamente; un valor editado a mano se detecta;
   - **la línea de tiempo** completa: predicciones (con su valor ideal), mediciones, preguntas, cambios de hipótesis, propuesta y entrega;
   - **los textos razonados** y el detalle de la nota automática.
3. Pon tu nota por criterio (en blanco = la automática) y un comentario. Exporta la clase a CSV.
4. **Reproducir sin el archivo:** escribe un identificador y verás la asignación oculta y los parámetros de sus seis experimentos.

**Para leer las notas:**
- Una nota alta en «Selección» con una conclusión no defendible suele indicar un estudiante con método pero que interpretó mal.
- Una conclusión defendible con «Selección» y «Cálculos» bajos suele ser suerte.
- Mira los cambios de hipótesis: la revisión fundamentada es lo que se quiere premiar.

## 8 bis. Registro de integridad y uso de IA

**Lo que no puede hacer ninguna página web:**
- detectar o bloquear el uso de IA en el mismo dispositivo (otras apps, otras pestañas, Google Lens);
- impedir capturas de pantalla;
- impedir que se use un segundo dispositivo.

El navegador aísla la página por diseño.

**Lo que hace el laboratorio:** es transparente. Se anuncia en la misión y en un aviso que el estudiante confirma con «Entendido»; la hora de esa confirmación queda registrada.

| Medida | Detalle |
|---|---|
| **Pegado bloqueado** | En predicciones, respuestas, notas de hipótesis, revisiones y justificación final. Cada intento queda registrado. Sí se puede pegar en alias, identificador y código de clase |
| **Salidas de la app** | Cambio de app o pestaña, o pérdida de foco de la ventana durante ≥ 1 s mientras hay una pregunta, una predicción pendiente o la conclusión abierta. Se guarda el contexto exacto («pregunta pred-calculo», «predicción», «conclusión») y la duración. Las salidas en otros momentos solo se cuentan |
| **Copias de texto** | Especialmente de enunciados de preguntas |
| **Inserciones grandes de golpe** | ≥ 20 caracteres en una sola operación (portapapeles del teclado, dictado, autocompletar) |
| **Cómo se escribió cada respuesta** | Caracteres, segundos y texto insertado de golpe. Se marcan las respuestas de ≥ 80 caracteres escritas a más de 8 caracteres por segundo |
| **Marca de agua** | Identificador y alias en diagonal sobre las pantallas con datos y en el informe HTML: las capturas son rastreables |

**Dónde lo ves:**
- en el informe HTML («Registro de integridad»);
- en `docente.html`: columna «Señales de uso», detalle con la lista de eventos y columnas en el CSV.

**Cómo interpretarlo:**
- Son **señales, no pruebas**: una salida puede ser un mensaje o una llamada; una copia, sus apuntes. En escritorio también cuenta pulsar en la barra de direcciones.
- Lo que más dice es el **patrón**: salir varias veces justo durante las preguntas, después de copiar el enunciado, y volver con respuestas largas escritas muy deprisa.
- El registro **no cambia la nota automática**. Si ves un patrón, lo más eficaz es una pregunta oral de 2–3 minutos sobre *su* investigación: con datos y modelos personales, quien no razonó no puede explicar sus propias mediciones.
- El registro lo genera el navegador del estudiante. Alguien con conocimientos técnicos podría editarlo en el JSON. Las mediciones no se pueden falsificar sin que se note (se regeneran desde la semilla), pero el registro de integridad sí.

## 9. Limitaciones experimentales (deliberadas)

- **Instrumentos:**

  | Magnitud | σ |
  |---|---|
  | Posición | 1,5 mm |
  | Velocidad | 2 % de v_max |
  | Aceleración | 3 % de a_max |
  | Fuerza | 2 % de kA |
  | Energía | 2 % de E₀ |
  | Cronómetro | 0,08 s (tiempo de reacción) |
  | Frecuencímetro | 0,5 % |

  En el modelo con ruido, todo ×6–9 (y así lo declara el instrumento).
- **Ventana:** 60 s. **Presupuesto:** 32 créditos. No se puede hacer todo: hay que elegir.
- **Costes:**

  | Operación | Créditos |
  |---|---|
  | Posición | 1 |
  | Velocidad, aceleración, fuerza | 2 |
  | Energía (K, U, E) | 3 |
  | Período | 2/3/4 (1/5/10 oscilaciones) |
  | Frecuencia | 3 |
  | Aceleración en una posición | 3 |
  | Registro de 10 posiciones | 6 |
  | Montaje nuevo | 3 (una vez) |
- **Sin derivadas:** todo se resuelve con las fórmulas del MAS, cocientes, medias y z. No hace falta cálculo diferencial.

## 10. Recomendaciones para una clase presencial (2 × 50 min)

1. **10 min:** repasar MAS, incertidumbre y z. Que cada estudiante abra el enlace, anote su identificador y elija la letra que tú indiques (o deja elegir).
2. **15 min:** primer experimento en parejas, pero cada uno con su propia sesión: los números serán distintos, así que no pueden copiar resultados.
3. **10 min:** puesta en común sin desvelar modelos. ¿Quién encontró una prueba que distinga amortiguamiento? ¿Y no linealidad?
4. **Segunda sesión:** dos experimentos más y entrega del JSON y del HTML por la plataforma de la asignatura.
5. **Después:** revisa en `docente.html`. En la clase siguiente discute el experimento «indistinguible»: es el mejor momento para hablar de qué significa «compatible».

## 11. Reproducir una sesión

- **Con el archivo:** el JSON contiene `reproduccion.identificador`, `reproduccion.experimento` y `versionMotor`. `docente.html` regenera todo desde ahí.
- **Sin el archivo:** «Reproducir una sesión desde su identificador» en `docente.html`, o en la app del estudiante escribiendo el identificador en «Continuar o reproducir». Esto último abre una sesión nueva con los mismos experimentos; no recupera lo que el estudiante hizo, que solo está en su navegador o en su JSON.
- **Si algún día cambian las fórmulas o los rangos,** hay que subir `VERSION_MOTOR` en `js/sesion.js`. Las semillas antiguas solo se reproducen con la versión con que se crearon.
