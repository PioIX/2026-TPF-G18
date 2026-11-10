const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const pool = require("../config/database");

const CARPETA_ARCHIVOS = path.join(__dirname, "..", "uploads");
const TIPOS_ARCHIVO = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
};

function errorHttp(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

async function validarContexto(contexto, idUsuario, idTarea) {
  if (contexto === "material") {
    const [docentes] = await pool.execute(
      `SELECT 1 FROM Docentes d JOIN Usuarios_1 u ON u.id_usuario = d.id_usuario
       WHERE d.id_usuario = ? AND u.rol = 'DOCENTE' AND u.activo = 1 LIMIT 1`,
      [idUsuario]
    );
    return docentes.length > 0;
  }
  if (contexto === "entrega" && idTarea) {
    const [alumnos] = await pool.execute(
      `SELECT 1 FROM Alumnos al
       JOIN Usuarios_1 u ON u.id_usuario = al.id_usuario AND u.activo = 1
       JOIN Matriculas ma ON ma.id_alumno = al.id_alumno AND ma.estado = 'ACTIVA'
       JOIN Materias_Dictadas md ON md.id_curso = ma.id_curso
       JOIN Tareas t ON t.id_materia_dictada = md.id_materia_dictada
       WHERE al.id_usuario = ? AND t.id_tarea = ? AND t.estado = 'ACTIVA' LIMIT 1`,
      [idUsuario, idTarea]
    );
    return alumnos.length > 0;
  }
  return false;
}

async function guardarArchivo(req, res, next) {
  const idUsuario = Number(req.query.id_usuario);
  const idTarea = req.query.id_tarea ? Number(req.query.id_tarea) : null;
  const contexto = req.query.contexto;
  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || (idTarea !== null && (!Number.isInteger(idTarea) || idTarea <= 0))) {
    return res.status(400).json({ error: "El usuario o la tarea seleccionados no son válidos." });
  }
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "Seleccioná un archivo para subir." });

  let nombreOriginal = "";
  try { nombreOriginal = decodeURIComponent(req.get("x-file-name") || ""); }
  catch { return res.status(400).json({ error: "El nombre del archivo no es válido." }); }
  const extension = path.extname(nombreOriginal).toLowerCase();
  const tiposPermitidos = TIPOS_ARCHIVO[extension];
  const mime = String(req.get("content-type") || "").split(";")[0].toLowerCase();
  if (!tiposPermitidos || (mime && mime !== "application/octet-stream" && !tiposPermitidos.includes(mime))) {
    return res.status(415).json({ error: "Formato no permitido. Usá PDF, imágenes, documentos, planillas o presentaciones." });
  }

  try {
    if (!await validarContexto(contexto, idUsuario, idTarea)) return res.status(403).json({ error: "No tenés permiso para subir un archivo en esta tarea." });
    await fs.mkdir(CARPETA_ARCHIVOS, { recursive: true });
    const nombreGuardado = `${randomUUID()}${extension}`;
    await fs.writeFile(path.join(CARPETA_ARCHIVOS, nombreGuardado), req.body, { flag: "wx" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${nombreGuardado}`;
    res.status(201).json({ ok: true, url, nombre: path.basename(nombreOriginal), mensaje: "Archivo subido." });
  } catch (error) { next(error); }
}

module.exports = { guardarArchivo, CARPETA_ARCHIVOS };
