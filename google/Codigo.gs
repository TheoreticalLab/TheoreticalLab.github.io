/**
 * Laboratorio MAS · receptor de entregas (Google Apps Script, en la cuenta del profesor).
 *
 * Cada entrega llega como el JSON del informe. Se guarda en una carpeta de tu Drive y se añade una fila a la hoja
 * «Entregas» con el resumen. Nada sale de tu cuenta de Google.
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   CLAVE_DOCENTE  → contraseña que escribirás en docente.html para descargar las entregas (obligatoria para leerlas).
 *   CODIGOS_CLASE  → códigos válidos separados por comas, p. ej. «FG-A,FG-B». Si la dejas vacía se acepta cualquier código.
 *
 * Instrucciones paso a paso: CONFIGURAR_GOOGLE.md
 */
var HOJA = 'Entregas';
var CARPETA = 'Laboratorio MAS · entregas';
var CABECERA = ['Recibida', 'Código de clase', 'Estudiante', 'Identificador', 'Experimento', 'Conclusión', 'Nota provisional',
  'Predicciones', 'Selección', 'Cálculos', 'Razonamiento', 'Conclusión (pts)', 'Mediciones', 'Créditos usados', 'Archivo JSON', 'Id del archivo'];
var MAX_BYTES = 3000000;

function doPost(e) {
  try {
    var texto = e && e.postData ? e.postData.contents : '';
    if (!texto || texto.length > MAX_BYTES) return salida_({ ok: false, error: 'tamaño' });
    var d = JSON.parse(texto);
    var rep = d && d.reproduccion;
    if (!d || d.app !== 'laboratorio-mas' || !rep || !/^MAS-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(String(rep.identificador)) || !/^[ABCDEI]$/.test(String(rep.experimento)) || !d.investigacion)
      return salida_({ ok: false, error: 'formato' });
    var codigos = String(propiedades_().getProperty('CODIGOS_CLASE') || '').split(',').map(function (s) { return s.trim().toUpperCase() }).filter(String);
    var codigo = String(d.codigoClase || '').trim().toUpperCase().slice(0, 30);
    if (codigos.length && codigos.indexOf(codigo) < 0) return salida_({ ok: false, error: 'codigo' });
    var cerrojo = LockService.getScriptLock();
    cerrojo.waitLock(20000);
    try {
      var ahora = new Date(), id = rep.identificador, letra = rep.experimento;
      var nombre = id + '-' + letra + '-' + Utilities.formatDate(ahora, 'UTC', 'yyyyMMdd-HHmmss') + '.json';
      var archivo = carpeta_().createFile(nombre, texto, 'application/json');
      var inv = d.investigacion, ev = d.evaluacionProvisional || {}, c = ev.categorias || {};
      hoja_().appendRow([ahora, codigo, String(d.estudiante || '').slice(0, 60), id, letra, inv.conclusion ? inv.conclusion.tipo : '(sin entregar)', num_(ev.total),
        num_(c.predicciones), num_(c.seleccion), num_(c.calculos), num_(c.razonamiento), num_(c.conclusion),
        (inv.mediciones || []).length, 32 - (typeof inv.creditos === 'number' ? inv.creditos : 32), archivo.getUrl(), archivo.getId()]);
      return salida_({ ok: true, recibo: archivo.getId().slice(-6).toUpperCase(), hora: ahora.toISOString() });
    } finally { cerrojo.releaseLock() }
  } catch (err) { return salida_({ ok: false, error: String(err && err.message || err).slice(0, 200) }) }
}

/** GET sin parámetros: comprueba que el servicio está activo. GET ?accion=lista&clave=…&desde=N: entregas (para docente.html). */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.accion === 'lista') {
    var clave = propiedades_().getProperty('CLAVE_DOCENTE');
    if (!clave || p.clave !== clave) return salida_({ ok: false, error: 'clave' });
    var filas = hoja_().getDataRange().getValues().slice(1), desde = Math.max(0, Number(p.desde) || 0), out = [];
    for (var i = desde; i < filas.length; i++) {
      try { out.push(JSON.parse(DriveApp.getFileById(filas[i][15]).getBlob().getDataAsString())) } catch (err) { }
    }
    return salida_({ ok: true, total: filas.length, entregas: out });
  }
  return salida_({ ok: true, servicio: 'Laboratorio MAS · receptor de entregas' });
}

function salida_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }
function propiedades_() { return PropertiesService.getScriptProperties() }
function num_(x) { return typeof x === 'number' ? x : '' }
function hoja_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), h = ss.getSheetByName(HOJA);
  if (!h) { h = ss.insertSheet(HOJA); h.appendRow(CABECERA); h.setFrozenRows(1) }
  return h
}
function carpeta_() { var it = DriveApp.getFoldersByName(CARPETA); return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA) }
