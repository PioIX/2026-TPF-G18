const pool = require("../config/database");

const MAX_ARCHIVOS_POR_ENVIO = 20;

function validarAdjuntos(valor) {
  if (valor === undefined) return { ok: true, archivos: null };
  if (!Array.isArray(valor) || valor.length > MAX_ARCHIVOS_POR_ENVIO) {
    return { ok: false, error: `Adjuntá hasta ${MAX_ARCHIVOS_POR_ENVIO} archivos por envío.` };
  }
  const archivos = [];
  const vistos = new Set();
  for (const item of valor) {
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    const nombre = typeof item?.nombre === "string" ? item.nombre.trim() : "";
    if (!url || url.length > 2000 || !nombre || nombre.length > 255) {
      return { ok: false, error: "Revisá el nombre y la dirección de los archivos adjuntos." };
    }
    if (!vistos.has(url)) {
      vistos.add(url);
      archivos.push({ url, nombre });
    }
  }
  return { ok: true, archivos };
}

async function listarAdjuntos(tabla, clave, ids) {
  const resultado = new Map(ids.map((id) => [Number(id), []]));
  if (!ids.length) return resultado;
  const marcadores = ids.map(() => "?").join(", ");
  const [filas] = await pool.execute(
    `SELECT ${clave} AS id_referencia, url, nombre FROM ${tabla} WHERE ${clave} IN (${marcadores}) ORDER BY id_adjunto`,
    ids
  );
  filas.forEach((fila) => resultado.get(Number(fila.id_referencia))?.push({ url: fila.url, nombre: fila.nombre }));
  return resultado;
}

async function reemplazarAdjuntos(db, tabla, clave, idReferencia, archivos) {
  if (archivos === null) return;
  await db.execute(`DELETE FROM ${tabla} WHERE ${clave} = ?`, [idReferencia]);
  if (!archivos.length) return;
  const valores = archivos.map(() => "(?, ?, ?)").join(", ");
  const parametros = archivos.flatMap((archivo) => [idReferencia, archivo.url, archivo.nombre]);
  await db.execute(`INSERT INTO ${tabla} (${clave}, url, nombre) VALUES ${valores}`, parametros);
}

function adjuntosPorTarea(ids) { return listarAdjuntos("Tareas_Archivos", "id_tarea", ids); }
function adjuntosPorEntrega(ids) { return listarAdjuntos("Entregas_Archivos", "id_entrega", ids); }
function guardarAdjuntosTarea(db, idTarea, archivos) { return reemplazarAdjuntos(db, "Tareas_Archivos", "id_tarea", idTarea, archivos); }
function guardarAdjuntosEntrega(db, idEntrega, archivos) { return reemplazarAdjuntos(db, "Entregas_Archivos", "id_entrega", idEntrega, archivos); }

module.exports = { validarAdjuntos, adjuntosPorTarea, adjuntosPorEntrega, guardarAdjuntosTarea, guardarAdjuntosEntrega };
