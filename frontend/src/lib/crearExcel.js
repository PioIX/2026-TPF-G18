const encoder = new TextEncoder();

function xmlSeguro(valor) {
  return String(valor ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function columnaExcel(numero) {
  let valor = numero;
  let letras = "";
  while (valor > 0) {
    const resto = (valor - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    valor = Math.floor((valor - 1) / 26);
  }
  return letras;
}

const tablaCrc = (() => {
  const tabla = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = tablaCrc[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function combinar(partes) {
  const largo = partes.reduce((total, parte) => total + parte.length, 0);
  const salida = new Uint8Array(largo);
  let offset = 0;
  partes.forEach((parte) => { salida.set(parte, offset); offset += parte.length; });
  return salida;
}

function celdaXml(valor, referencia) {
  if (typeof valor === "number" && Number.isFinite(valor)) return `<c r="${referencia}"><v>${valor}</v></c>`;
  const texto = valor instanceof Date ? valor.toLocaleString("es-AR") : String(valor ?? "");
  return `<c r="${referencia}" t="inlineStr"><is><t xml:space="preserve">${xmlSeguro(texto)}</t></is></c>`;
}

function generarArchivos(nombreHoja, encabezados, filas) {
  const tabla = [encabezados, ...filas];
  const filasXml = tabla.map((fila, indiceFila) => {
    const celdas = fila.map((valor, indiceColumna) => celdaXml(valor, `${columnaExcel(indiceColumna + 1)}${indiceFila + 1}`)).join("");
    return `<row r="${indiceFila + 1}">${celdas}</row>`;
  }).join("");
  const hoja = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${filasXml}</sheetData></worksheet>`;
  const libro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlSeguro(nombreHoja).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const relacionesRaiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const relacionesLibro = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  return [
    ["[Content_Types].xml", tipos],
    ["_rels/.rels", relacionesRaiz],
    ["xl/workbook.xml", libro],
    ["xl/_rels/workbook.xml.rels", relacionesLibro],
    ["xl/worksheets/sheet1.xml", hoja],
  ].map(([nombre, contenido]) => ({ nombre: encoder.encode(nombre), datos: encoder.encode(contenido) }));
}

function crearExcelBlob(nombreHoja, encabezados, filas) {
  const archivos = generarArchivos(nombreHoja, encabezados, filas);
  const locales = [];
  const centrales = [];
  let offset = 0;

  archivos.forEach(({ nombre, datos }) => {
    const crc = crc32(datos);
    const local = new Uint8Array(30 + nombre.length);
    const localVista = new DataView(local.buffer);
    localVista.setUint32(0, 0x04034b50, true);
    localVista.setUint16(4, 20, true);
    localVista.setUint16(6, 0x0800, true);
    localVista.setUint16(8, 0, true);
    localVista.setUint16(10, 0, true);
    localVista.setUint16(12, 0x21, true);
    localVista.setUint32(14, crc, true);
    localVista.setUint32(18, datos.length, true);
    localVista.setUint32(22, datos.length, true);
    localVista.setUint16(26, nombre.length, true);
    localVista.setUint16(28, 0, true);
    local.set(nombre, 30);
    locales.push(local, datos);

    const central = new Uint8Array(46 + nombre.length);
    const centralVista = new DataView(central.buffer);
    centralVista.setUint32(0, 0x02014b50, true);
    centralVista.setUint16(4, 20, true);
    centralVista.setUint16(6, 20, true);
    centralVista.setUint16(8, 0x0800, true);
    centralVista.setUint16(10, 0, true);
    centralVista.setUint16(12, 0, true);
    centralVista.setUint16(14, 0x21, true);
    centralVista.setUint32(16, crc, true);
    centralVista.setUint32(20, datos.length, true);
    centralVista.setUint32(24, datos.length, true);
    centralVista.setUint16(28, nombre.length, true);
    centralVista.setUint16(30, 0, true);
    centralVista.setUint16(32, 0, true);
    centralVista.setUint16(34, 0, true);
    centralVista.setUint16(36, 0, true);
    centralVista.setUint32(38, 0, true);
    centralVista.setUint32(42, offset, true);
    central.set(nombre, 46);
    centrales.push(central);
    offset += local.length + datos.length;
  });

  const directorio = combinar(centrales);
  const eocd = new Uint8Array(22);
  const eocdVista = new DataView(eocd.buffer);
  eocdVista.setUint32(0, 0x06054b50, true);
  eocdVista.setUint16(4, 0, true);
  eocdVista.setUint16(6, 0, true);
  eocdVista.setUint16(8, archivos.length, true);
  eocdVista.setUint16(10, archivos.length, true);
  eocdVista.setUint32(12, directorio.length, true);
  eocdVista.setUint32(16, offset, true);
  eocdVista.setUint16(20, 0, true);
  return new Blob([combinar([...locales, directorio, eocd])], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function descargarExcel(nombreArchivo, nombreHoja, encabezados, filas) {
  const blob = crearExcelBlob(nombreHoja, encabezados, filas);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo.toLowerCase().endsWith(".xlsx") ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
