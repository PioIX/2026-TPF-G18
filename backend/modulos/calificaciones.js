const pool = require("../config/database");
const { crearNotificaciones } = require("./notificaciones");
const TIPOS = ["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"];

async function listarCalificacionesAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [calificaciones] = await pool.execute(
      `SELECT ca.id_calificacion, ca.tipo, ca.descripcion, ca.nota, ca.fecha,
              m.nombre AS materia, md.id_materia_dictada,
              c.anio, c.division
       FROM Calificaciones ca
       JOIN Alumnos al ON al.id_alumno = ca.id_alumno
       JOIN Materias_Dictadas md ON md.id_materia_dictada = ca.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       WHERE al.id_usuario = ?
       ORDER BY ca.fecha DESC, m.nombre`, [idUsuario]
    );
    res.json({ calificaciones });
  } catch (error) { next(error); }
}

async function listarCalificacionesDocente(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [calificaciones] = await pool.execute(
      `SELECT ca.id_calificacion, ca.tipo, ca.descripcion, ca.nota, ca.fecha,
              al.id_alumno, al.nombre AS alumno_nombre, al.apellido AS alumno_apellido,
              m.nombre AS materia, md.id_materia_dictada, c.anio, c.division
       FROM Calificaciones ca
       JOIN Alumnos al ON al.id_alumno = ca.id_alumno
       JOIN Materias_Dictadas md ON md.id_materia_dictada = ca.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Dictados_Docentes dd ON dd.id_materia_dictada = md.id_materia_dictada
       JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE d.id_usuario = ?
       ORDER BY ca.fecha DESC, m.nombre, al.apellido, al.nombre`, [idUsuario]
    );
    res.json({ calificaciones });
  } catch (error) { next(error); }
}

async function crearCalificacion(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idAlumno = Number(req.body.id_alumno);
  const idMateriaDictada = Number(req.body.id_materia_dictada);
  const nota = Number(req.body.nota);
  const { tipo, fecha } = req.body;
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (![idUsuario, idAlumno, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0) || !TIPOS.includes(tipo) || !Number.isFinite(nota) || nota < 0 || nota > 10 || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ""))) {
    return res.status(400).json({ error: "Revisá tipo, nota (0 a 10) y fecha." });
  }
  try {
    const [valida] = await pool.execute(
      `SELECT al.id_usuario FROM Dictados_Docentes dd JOIN Docentes d ON d.id_docente = dd.id_docente
       JOIN Materias_Dictadas md ON md.id_materia_dictada = dd.id_materia_dictada
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE d.id_usuario = ? AND md.id_materia_dictada = ? AND ma.id_alumno = ? LIMIT 1`,
      [idUsuario, idMateriaDictada, idAlumno]
    );
    if (!valida.length) return res.status(403).json({ error: "El docente o el alumno no corresponden a esa materia." });
    const [resultado] = await pool.execute(
      `INSERT INTO Calificaciones (id_alumno, id_materia_dictada, tipo, descripcion, nota, fecha) VALUES (?, ?, ?, ?, ?, ?)`,
      [idAlumno, idMateriaDictada, tipo, descripcion || null, nota, fecha]
    );
    await crearNotificaciones([valida[0].id_usuario], {
      titulo: "Nueva calificación",
      mensaje: `${tipo}: ${nota}${descripcion ? ` · ${descripcion}` : ""}`,
      tipo: "CALIFICACION",
    }, req.app.get("io"));
    res.status(201).json({ ok: true, id_calificacion: resultado.insertId, mensaje: "Calificación guardada." });
  } catch (error) { next(error); }
}

async function actualizarCalificacion(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idCalificacion = Number(req.params.idCalificacion);
  const nota = Number(req.body.nota);
  const { tipo, fecha } = req.body;
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(idCalificacion) || idCalificacion <= 0 || !TIPOS.includes(tipo) || !Number.isFinite(nota) || nota < 0 || nota > 10 || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) || descripcion.length > 150) {
    return res.status(400).json({ error: "Revisá tipo, nota (0 a 10), fecha y descripción." });
  }
  try {
    const [asignadas] = await pool.execute(
      `SELECT ca.id_calificacion, ca.id_alumno, ca.id_materia_dictada, al.id_usuario
       FROM Calificaciones ca
       JOIN Alumnos al ON al.id_alumno = ca.id_alumno
       JOIN Dictados_Docentes dd ON dd.id_materia_dictada = ca.id_materia_dictada
       JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE ca.id_calificacion = ? AND d.id_usuario = ? LIMIT 1`,
      [idCalificacion, idUsuario]
    );
    if (!asignadas.length) return res.status(403).json({ error: "No podés corregir esta calificación." });
    await pool.execute(
      "UPDATE Calificaciones SET tipo = ?, descripcion = ?, nota = ?, fecha = ? WHERE id_calificacion = ?",
      [tipo, descripcion || null, nota, fecha, idCalificacion]
    );
    await crearNotificaciones([asignadas[0].id_usuario], {
      titulo: "Calificación corregida",
      mensaje: `${tipo}: ${nota}${descripcion ? ` · ${descripcion}` : ""}`,
      tipo: "CALIFICACION",
    }, req.app.get("io"));
    res.json({ ok: true, mensaje: "Calificación corregida." });
  } catch (error) { next(error); }
}

module.exports = { listarCalificacionesAlumno, listarCalificacionesDocente, crearCalificacion, actualizarCalificacion };
