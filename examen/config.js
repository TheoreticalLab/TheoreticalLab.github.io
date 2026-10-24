// Configuración del examen (prototipo). En la versión real esto lo sirve el servidor (Apps Script) y la clave secreta
// NUNCA está en el navegador del estudiante: aquí sí está, porque el prototipo funciona sin servidor.
export const EXAMEN = {
  codigo: 'DEMO',                 // lo das en clase: sin él no se puede empezar
  titulo: 'Examen de prueba · Física General',
  profesor: 'Francisco Orbe',
  minutos: 30,                    // duración; el reloj no se detiene aunque el examen esté bloqueado
  toleranciaS: 2,                 // salidas más breves solo avisan (un roce, la barra de notificaciones); las demás bloquean
  permisoMin: 10,                 // un permiso para salir vale para una salida dentro de estos minutos
  numericos: 4,                   // problemas numéricos por estudiante (del banco, con números propios)
  conceptuales: 1,                // preguntas de opción múltiple por estudiante
  tolerancia: 0.02                // error relativo admitido en las respuestas numéricas (2 %)
};

export const SECRETO_DEMO = 'prototipo-examen-theoreticallab-2026';
