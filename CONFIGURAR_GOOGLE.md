# Recibir las entregas en tu Google Sheets (una sola vez, unos 5 minutos)

Al final, cada estudiante podrá pulsar **«Enviar al profesor»**. Su entrega llegará así:

- una **fila** en tu hoja «Entregas» con alias, identificador, experimento, conclusión, nota provisional y fecha;
- el **archivo JSON completo** en la carpeta «Laboratorio MAS · entregas» de tu Google Drive.

Todo queda en tu cuenta de Google. Los estudiantes no necesitan cuenta.

## 1. Crear la hoja y pegar el receptor

1. Entra en https://sheets.new (crea una hoja nueva) y ponle un nombre, por ejemplo «Laboratorio MAS · entregas».
2. Menú **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
3. Borra todo lo que haya en `Código.gs` y pega el contenido de [`google/Codigo.gs`](google/Codigo.gs).
4. Pulsa el icono de **guardar** (💾).

## 2. Poner la clave y los códigos de clase

1. En el editor, a la izquierda, entra en **⚙ Configuración del proyecto**.
2. Baja hasta **Propiedades del script** y pulsa **Añadir propiedad del script**. Crea estas dos:

| Propiedad | Valor (ejemplo) | Para qué |
|---|---|---|
| `CLAVE_DOCENTE` | una contraseña tuya, p. ej. `pendulo-azul-73` | Para descargar las entregas desde `docente.html`. **No la compartas.** |
| `CODIGOS_CLASE` | `FG-A,FG-B` | Códigos que darás en clase (uno por grupo). Solo se aceptan entregas con uno de ellos. Si lo dejas vacío, se acepta cualquier código. |

3. Pulsa **Guardar propiedades del script**.

## 3. Publicarlo como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En el engranaje de «Seleccionar tipo», elige **Aplicación web**.
3. Rellena el formulario:
   - **Descripción:** Laboratorio MAS.
   - **Ejecutar como:** **Yo** (tu cuenta).
   - **Quién tiene acceso:** **Cualquier usuario**. Es necesario para que los estudiantes puedan enviar sin cuenta de Google. Solo pueden *añadir* entregas; para *leerlas* hace falta tu `CLAVE_DOCENTE`.
4. Pulsa **Implementar**.
5. Google pide autorización la primera vez:
   1. Pulsa **Autorizar acceso** y elige tu cuenta.
   2. Si aparece «Google no ha verificado esta aplicación», pulsa **Configuración avanzada → Ir a … (no seguro)**. Es tu propio script.
   3. Pulsa **Permitir**. Pide acceso a tus hojas de cálculo y a tu Drive porque escribe la fila y guarda el JSON.
6. Copia la **URL de la aplicación web**. Termina en `/exec`.

## 4. Activarlo en el laboratorio

Envía esa URL a quien mantiene el laboratorio, o edita tú `js/config.js` en el repositorio:

```js
export const CONFIG = {
  urlEnvio: 'https://script.google.com/macros/s/AKfy…/exec',
  pedirCodigoClase: true
};
```

Al hacer `git push`, GitHub Pages lo publica en uno o dos minutos y aparece el botón «Enviar al profesor».

## 5. Ver y revisar las entregas

| Dónde | Qué ves |
|---|---|
| La **hoja «Entregas»** | Una fila por envío |
| **`https://theoreticallab.github.io/docente.html`** → «Entregas recibidas en tu Google Sheets» | Pega la URL del paso 3 y tu `CLAVE_DOCENTE` y pulsa «Cargar entregas». Verás el modelo oculto de cada estudiante y la comprobación de integridad (si alguien editó un dato, aparece). Puedes poner la nota por criterio y exportar el CSV |

Si un estudiante envía varias veces, `docente.html` usa la entrega más reciente de cada experimento. En la hoja quedan todas, como historial.

## Si cambias el código más adelante

Pega el nuevo `Codigo.gs` y luego **Implementar → Gestionar implementaciones → ✏ (editar) → Versión: nueva versión → Implementar**. Así la URL no cambia.

## Privacidad y límites

- Se envía el alias que el estudiante escribe, nunca su correo ni otros datos del navegador. Si no quieres nombres reales, pide alias o números de lista.
- Cuotas gratuitas de Google: de sobra para un curso (miles de envíos al día).
- La URL de envío es pública dentro de la app. Alguien podría mandar entregas falsas, pero hay tres defensas:
  - necesitaría un código de clase válido;
  - `docente.html` regenera cada medición desde la semilla y marca cualquier dato inventado o editado;
  - la hoja guarda la hora de cada envío.
