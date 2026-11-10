const pool = require("../config/database");
const { crearNotificaciones } = require("./notificaciones");

async function listarTareasAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [tareas] = await pool.execute(
      `SELECT t.id_tarea, t.titulo, t.descripcion, t.fecha_publicacion, t.fecha_entrega,
              t.archivo_adjunto, t.estado, m.nombre AS materia, md.id_materia_dictada,
              c.anio, c.division, e.id_entrega, e.archivo AS archivo_entregado,
              e.comentario AS comentario_entrega, e.devolucion_docente,
              e.fecha_entrega AS fecha_entrega_real, e.estado AS estado_entrega
       FROM Alumnos al
       JOIN Matriculas ma ON ma.id_alumno = al.id_alumno AND ma.estado = 'ACTIVA'
       JOIN Materias_Dictadas md ON md.id_curso = ma.id_curso
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Tareas t ON t.id_materia_dictada = md.id_materia_dictada
       LEFT JOIN Entregas e ON e.id_tarea = t.id_tarea AND e.id_alumno = al.id_alumno
       WHERE al.id_usuario = ?
       ORDER BY t.fecha_entrega IS NULL, t.fecha_entrega, t.fecha_publicacion DESC`, [idUsuario]
    );
    res.json({ tareas });
  } catch (error) {
    // La migración de la devolución docente puede no estar aplicada todavía.
    // En ese caso las tareas igual se deben poder consultar y mostrar.
    if (error.code !== "ER_BAD_FIELD_ERROR" || !String(error.message).includes("devolucion_docente")) return next(error);
    try {
      const [tareas] = await pool.execute(
        `SELECT t.id_tarea, t.titulo, t.descripcion, t.fecha_publicacion, t.fecha_entrega,
                t.archivo_adjunto, t.estado, m.nombre AS materia, md.id_materia_dictada,
                c.anio, c.division, e.id_entrega, e.archivo AS archivo_entregado,
                e.comentario AS comentario_entrega, NULL AS devolucion_docente,
                e.fecha_entrega AS fecha_entrega_real, e.estado AS estado_entrega
         FROM Alumnos al
         JOIN Matriculas ma ON ma.id_alumno = al.id_alumno AND ma.estado = 'ACTIVA'
         JOIN Materias_Dictadas md ON md.id_curso = ma.id_curso
         JOIN Materias m ON m.id_materia = md.id_materia
         JOIN Cursos c ON c.id_curso = md.id_curso
         JOIN Tareas t ON t.id_materia_dictada = md.id_materia_dictada
         LEFT JOIN Entregas e ON e.id_tarea = t.id_tarea AND e.id_alumno = al.id_alumno
         WHERE al.id_usuario = ?
         ORDER BY t.fecha_entrega IS NULL, t.fecha_entrega, t.fecha_publicacion DESC`, [idUsuario]
      );
      res.json({ tareas });
    } catch (errorAlternativo) { next(errorAlternativo); }
  }
}

async function listarTareasDocente(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [tareas] = await pool.execute(
      `SELECT t.id_tarea, t.titulo, t.descripcion, t.fecha_publicacion, t.fecha_entrega,
              t.archivo_adjunto, t.estado, m.nombre AS materia, md.id_materia_dictada,
              c.anio, c.division,
              (SELECT COUNT(*) FROM Entregas e WHERE e.id_tarea = t.id_tarea) AS cantidad_entregas
       FROM Tareas t
       JOIN Materias_Dictadas md ON md.id_materia_dictada = t.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Docentes d ON d.id_docente = t.id_docente
       WHERE d.id_usuario = ?
       ORDER BY t.fecha_publicacion DESC`, [idUsuario]
    );
    res.json({ tareas });
  } catch (error) { next(error); }
}

async function crearTarea(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idMateriaDictada = Number(req.body.id_materia_dictada);
  const titulo = typeof req.body.titulo === "string" ? req.body.titulo.trim() : "";
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  const archivo = typeof req.body.archivo_adjunto === "string" ? req.body.archivo_adjunto.trim() : "";
  const fechaEntrega = typeof req.body.fecha_entrega === "string" && req.body.fecha_entrega.trim()
    ? req.body.fecha_entrega.trim().replace("T", " ").replace(/(\d{2}:\d{2})$/, "$1:00")
    : null;
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0) || !titulo) return res.status(400).json({ error: "Completá materia y título." });
  try {
    const [docentes] = await pool.execute(
      `SELECT d.id_docente FROM Docentes d JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       WHERE d.id_usuario = ? AND dd.id_materia_dictada = ? LIMIT 1`, [idUsuario, idMateriaDictada]
    );
    if (!docentes.length) return res.status(403).json({ error: "El docente no está asignado a esa materia." });
    const [resultado] = await pool.execute(
      `INSERT INTO Tareas (id_materia_dictada, id_docente, titulo, descripcion, fecha_entrega, archivo_adjunto, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVA')`,
      [idMateriaDictada, docentes[0].id_docente, titulo, descripcion || null, fechaEntrega, archivo || null]
    );
    const [alumnos] = await pool.execute(
      `SELECT DISTINCT al.id_usuario, m.nombre AS materia
       FROM Materias_Dictadas md
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE md.id_materia_dictada = ?`, [idMateriaDictada]
    );
    await crearNotificaciones(alumnos.map((alumno) => alumno.id_usuario), {
      titulo: "Nueva tarea",
      mensaje: `${titulo} · ${alumnos[0]?.materia || "Materia"}${descripcion ? `\n\nConsigna del docente:\n${descripcion}` : ""}`,
      tipo: "TAREA",
    }, req.app.get("io"));
    res.status(201).json({ ok: true, id_tarea: resultado.insertId, mensaje: "Tarea publicada." });
  } catch (error) { next(error); }
}

async function obtenerTareaDocente(idUsuario, idTarea) {
  const [tareas] = await pool.execute(
    `SELECT t.id_tarea, t.id_materia_dictada, t.titulo, t.estado, m.nombre AS materia
     FROM Tareas t
     JOIN Docentes d ON d.id_docente = t.id_docente
     JOIN Materias_Dictadas md ON md.id_materia_dictada = t.id_materia_dictada
     JOIN Materias m ON m.id_materia = md.id_materia
     WHERE t.id_tarea = ? AND d.id_usuario = ? LIMIT 1`,
    [idTarea, idUsuario]
  );
  return tareas[0] || null;
}

async function notificarAlumnosDeTarea(idMateriaDictada, titulo, mensaje, io) {
  const [alumnos] = await pool.execute(
    `SELECT DISTINCT al.id_usuario
     FROM Materias_Dictadas md
     JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
     JOIN Alumnos al ON al.id_alumno = ma.id_alumno
     WHERE md.id_materia_dictada = ?`,
    [idMateriaDictada]
  );
  await crearNotificaciones(alumnos.map((alumno) => alumno.id_usuario), { titulo, mensaje, tipo: "TAREA" }, io);
}

function convertirFechaEntrega(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(valor)) return undefined;
  return valor.replace("T", " ").length === 16 ? `${valor.replace("T", " ")}:00` : valor.replace("T", " ");
}

async function actualizarTarea(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idTarea = Number(req.params.idTarea);
  const titulo = typeof req.body.titulo === "string" ? req.body.titulo.trim() : "";
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  const archivo = typeof req.body.archivo_adjunto === "string" ? req.body.archivo_adjunto.trim() : "";
  const fechaEntrega = convertirFechaEntrega(req.body.fecha_entrega);
  if (![idUsuario, idTarea].every((id) => Number.isInteger(id) && id > 0) || !titulo || titulo.length > 150 || descripcion.length > 65535 || archivo.length > 255 || fechaEntrega === undefined) {
    return res.status(400).json({ error: "Revisá el título, el material y la fecha límite." });
  }
  try {
    const tarea = await obtenerTareaDocente(idUsuario, idTarea);
    if (!tarea) return res.status(403).json({ error: "No podés editar esta tarea." });
    await pool.execute(
      "UPDATE Tareas SET titulo = ?, descripcion = ?, fecha_entrega = ?, archivo_adjunto = ? WHERE id_tarea = ?",
      [titulo, descripcion || null, fechaEntrega, archivo || null, idTarea]
    );
    await notificarAlumnosDeTarea(
      tarea.id_materia_dictada,
      "Tarea actualizada",
      `${titulo} · ${tarea.materia}${descripcion ? `\n\nConsigna del docente:\n${descripcion}` : ""}`,
      req.app.get("io")
    );
    res.json({ ok: true, mensaje: "Tarea actualizada." });
  } catch (error) { next(error); }
}

async function cambiarEstadoTarea(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idTarea = Number(req.params.idTarea);
  const estado = req.body.estado;
  if (![idUsuario, idTarea].every((id) => Number.isInteger(id) && id > 0) || !["ACTIVA", "CERRADA"].includes(estado)) {
    return res.status(400).json({ error: "El estado de la tarea no es válido." });
  }
  try {
    const tarea = await obtenerTareaDocente(idUsuario, idTarea);
    if (!tarea) return res.status(403).json({ error: "No podés cambiar esta tarea." });
    await pool.execute("UPDATE Tareas SET estado = ? WHERE id_tarea = ?", [estado, idTarea]);
    if (tarea.estado !== estado) {
      await notificarAlumnosDeTarea(
        tarea.id_materia_dictada,
        estado === "CERRADA" ? "Tarea cerrada" : "Tarea reabierta",
        `${tarea.titulo} · ${tarea.materia}`,
        req.app.get("io")
      );
    }
    res.json({ ok: true, estado, mensaje: estado === "CERRADA" ? "Tarea cerrada." : "Tarea reabierta." });
  } catch (error) { next(error); }
}

async function entregarTarea(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idTarea = Number(req.params.idTarea);
  const archivo = typeof req.body.archivo === "string" ? req.body.archivo.trim() : "";
  const comentario = typeof req.body.comentario === "string" ? req.body.comentario.trim() : "";
  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(idTarea) || idTarea <= 0 || (!archivo && !comentario)) return res.status(400).json({ error: "Adjuntá una ruta de archivo o escribí un comentario." });
  try {
    const [pertenece] = await pool.execute(
      `SELECT al.id_alumno, al.nombre AS alumno_nombre, al.apellido AS alumno_apellido, t.fecha_entrega FROM Alumnos al
       JOIN Matriculas ma ON ma.id_alumno = al.id_alumno AND ma.estado = 'ACTIVA'
       JOIN Materias_Dictadas md ON md.id_curso = ma.id_curso
       JOIN Tareas t ON t.id_materia_dictada = md.id_materia_dictada AND t.id_tarea = ? AND t.estado = 'ACTIVA'
       WHERE al.id_usuario = ? LIMIT 1`, [idTarea, idUsuario]
    );
    if (!pertenece.length) return res.status(403).json({ error: "La tarea no está activa o no corresponde a tu curso." });
    const idAlumno = pertenece[0].id_alumno;
    const estado = pertenece[0].fecha_entrega && new Date(pertenece[0].fecha_entrega) < new Date() ? "TARDE" : "ENTREGADA";
    const [previa] = await pool.execute(`SELECT id_entrega FROM Entregas WHERE id_tarea = ? AND id_alumno = ? LIMIT 1`, [idTarea, idAlumno]);
    if (previa.length) {
      await pool.execute(`UPDATE Entregas SET archivo = ?, comentario = ?, devolucion_docente = NULL, fecha_entrega = CURRENT_TIMESTAMP, estado = ? WHERE id_entrega = ?`, [archivo || null, comentario || null, estado, previa[0].id_entrega]);
    } else {
      await pool.execute(`INSERT INTO Entregas (id_tarea, id_alumno, archivo, comentario, estado) VALUES (?, ?, ?, ?, ?)`, [idTarea, idAlumno, archivo || null, comentario || null, estado]);
    }
    const [docentes] = await pool.execute(
      `SELECT d.id_usuario FROM Tareas t JOIN Docentes d ON d.id_docente = t.id_docente WHERE t.id_tarea = ?`, [idTarea]
    );
    await crearNotificaciones(docentes.map((docente) => docente.id_usuario), {
      titulo: previa.length ? "Entrega actualizada" : "Nueva entrega",
      mensaje: `${pertenece[0].alumno_apellido}, ${pertenece[0].alumno_nombre} entregó una tarea.`,
      tipo: "TAREA",
    }, req.app.get("io"));
    res.json({ ok: true, mensaje: "Entrega guardada." });
  } catch (error) { next(error); }
}

module.exports = { listarTareasAlumno, listarTareasDocente, crearTarea, actualizarTarea, cambiarEstadoTarea, entregarTarea };
