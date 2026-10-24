// CONFIGURACIÓN DEL PROFESOR · dirección del receptor de entregas (Google Apps Script, ver CONFIGURAR_GOOGLE.md).
// Vacía = el botón «Enviar al profesor» avisa de que el envío no está activado (la descarga de archivos sigue disponible).
export const CONFIG = {
  profesor: 'Francisco Orbe',     // aparece en la app (pie de todas las pantallas e inicio) y en el informe
  asignatura: 'Física General',
  urlEnvio: '',
  pedirCodigoClase: true      // pedir el código de clase que el profesor da en el aula (separa grupos y descarta envíos ajenos)
};
