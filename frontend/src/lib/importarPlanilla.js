import readXlsxFile from "read-excel-file/browser";

const MAX_BYTES = 10 * 1024 * 1024;

function normalizarEncabezado(valor) {
  return String(valor ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export async function leerPlanilla(file) {
  if (!file) throw new Error("Elegí un archivo para importar.");
  if (file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 10 MB.");
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error("Usá un archivo Excel .xlsx o CSV. Las hojas de Google se pueden descargar en uno de esos formatos.");

  const rows = /\.csv$/i.test(file.name) ? await leerCsv(file) : await readXlsxFile(file);
  const headers = (rows.shift() || []).map(normalizarEncabezado);
  if (!headers.length || !rows.length) throw new Error("La primera fila debe contener encabezados y debajo tiene que haber datos.");

  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row, index) => Object.fromEntries(headers.map((header, column) => [header, celdaTexto(row[column])])))
    .map((row, index) => ({ ...row, __fila: index + 2 }));
}

function celdaTexto(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const fecha = new Date(valor.getTime() - valor.getTimezoneOffset() * 60000);
    return fecha.toISOString().slice(0, 10);
  }
  return String(valor ?? "").trim();
}

async function leerCsv(file) {
  const texto = (await file.text()).replace(/^\uFEFF/, "");
  const primeraLinea = texto.split(/\r?\n/, 1)[0] || "";
  const comas = (primeraLinea.match(/,/g) || []).length;
  const puntosYComas = (primeraLinea.match(/;/g) || []).length;
  const separador = puntosYComas > comas ? ";" : ",";
  const filas = [];
  let fila = []; let celda = ""; let entreComillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i];
    if (caracter === '"') {
      if (entreComillas && texto[i + 1] === '"') { celda += '"'; i += 1; }
      else entreComillas = !entreComillas;
    } else if (caracter === separador && !entreComillas) { fila.push(celda); celda = ""; }
    else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
      if (caracter === "\r" && texto[i + 1] === "\n") i += 1;
      fila.push(celda); filas.push(fila); fila = []; celda = "";
    } else celda += caracter;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

export function buscarColumna(row, ...nombres) {
  for (const nombre of nombres) {
    const valor = row[normalizarEncabezado(nombre)];
    if (valor !== undefined && valor !== "") return valor;
  }
  return "";
}

export function fechaPlanilla(valor) {
  const texto = String(valor || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const dmy = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return "";
}
