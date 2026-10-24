# Despliegue en GitHub Pages

GitHub Pages es un **alojamiento estático**. Lo que eso implica:

- No guarda entregas ni datos de los estudiantes: cada uno guarda su progreso en su navegador y te entrega los archivos descargados (HTML y JSON) por la vía que uses: aula virtual, correo…
- No hay secretos que proteger: la app no usa claves ni APIs. Cualquiera con conocimientos de programación puede leer el código. El objetivo es educativo, no antitrampas.

## Publicar (una vez)

```bash
cd Laboratorio_MAS
git init && git add -A && git commit -m "Laboratorio MAS"
gh repo create laboratorio-mas --public --source . --push       # o crea el repositorio en github.com y haz git push
gh api -X POST repos/<usuario>/laboratorio-mas/pages -f "source[branch]=main" -f "source[path]=/"
```

Sin `gh`, desde github.com:

1. Ve a **Settings → Pages**.
2. En **Source**, elige «Deploy from a branch».
3. Selecciona la rama `main` y la carpeta `/ (root)`.

En uno o dos minutos la app queda en `https://<usuario>.github.io/laboratorio-mas/`. El archivo `.nojekyll` evita que GitHub procese la carpeta con Jekyll.

## Qué compartir

| Para | Enlace |
|---|---|
| Estudiantes | `https://<usuario>.github.io/laboratorio-mas/` |
| Tú | `https://<usuario>.github.io/laboratorio-mas/docente.html` (no está enlazada desde la app) |

La guía docente (`GUIA_DOCENTE.md`) está en el repositorio. Si el repositorio es público, un estudiante curioso puede encontrarla. Si prefieres evitarlo, tienes dos opciones:

- **(a) Repositorio privado para la guía:** borra `GUIA_DOCENTE.md` y `docente.html` del repositorio público y guárdalos en otro privado. `docente.html` funciona igual abierta desde tu equipo con un servidor local: `python3 -m http.server` en la carpeta y abre `http://localhost:8000/docente.html`.
- **(b) Aceptarlo:** los modelos se asignan al azar a cada estudiante, así que saber qué modelos existen no dice cuál es cada letra.

## Actualizar

Cualquier `git push` a `main` vuelve a publicar.

Si cambias fórmulas, rangos o el generador de ruido, sube `VERSION_MOTOR` en `js/sesion.js`. Si no lo haces, los identificadores ya usados darían experimentos distintos a los que vieron los estudiantes.

## Antes de publicar una versión nueva

```bash
python3 pruebas/correr.py && python3 pruebas/correr.py pruebas/pantalla.html
```
