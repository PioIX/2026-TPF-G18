const pool = require("../config/database");
const { crearNotificaciones } = require("./notificaciones");
const ESTADOS = ["PRESENTE", "AUSENTE", "TARDE", "JUSTIFICADO"];

async function listarAsistenciasAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [asistencias] = await pool.execute(
      `SELECT a.id_asistencia, a.fecha, a.estado, a.observacion,
              m.nombre AS materia, md.id_materia_dictada,
              c.anio, c.division
       FROM Asistencias a
       JOIN Alumnos al ON al.id_alumno = a.id_alumno
       JOIN Materias_Dictadas md ON md.id_materia_dictada = a.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       WHERE al.id_usuario = ?
       ORDER BY a.fecha DESC, m.nombre`, [idUsuario]
    );
    res.json({ asistencias });
  } catch (error) { next(error); }
}

async function listarAlumnosDeMateria(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idMateriaDictada = Number(req.params.idMateriaDictada);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.fecha || "")) ? req.query.fecha : new Date().toISOString().slice(0, 10);
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0)) return res.status(400).json({ error: "Datos inválidos." });
  try {
    const [alumnos] = await pool.execute(
      `SELECT al.id_alumno, al.nombre, al.apellido, al.dni,
              asi.estado, asi.observacion
       FROM Docentes d
       JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       JOIN Materias_Dictadas md ON md.id_materia_dictada = dd.id_materia_dictada
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       LEFT JOIN Asistencias asi ON asi.id_alumno = al.id_alumno
          AND asi.id_materia_dictada = md.id_materia_dictada AND asi.fecha = ?
       WHERE d.id_usuario = ? AND md.id_materia_dictada = ?
       ORDER BY al.apellido, al.nombre`, [fecha, idUsuario, idMateriaDictada]
    );
    res.json({ alumnos, fecha });
  } catch (error) { next(error); }
}

async function guardarAsistencia(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idAlumno = Number(req.body.id_alumno);
  const idMateriaDictada = Number(req.body.id_materia_dictada);
  const { fecha, estado } = req.body;
  const observacion = typeof req.body.observacion === "string" ? req.body.observacion.trim() : "";
  if (![idUsuario, idAlumno, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) || !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: "Completá materia, alumno, fecha y un estado válido." });
  }
  try {
    const [asignacion] = await pool.execute(
      `SELECT 1 FROM Docentes d JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       WHERE d.id_usuario = ? AND dd.id_materia_dictada = ? LIMIT 1`, [idUsuario, idMateriaDictada]
    );
    if (!asignacion.length) return res.status(403).json({ error: "El docente no dicta esa materia." });
    const [matriculado] = await pool.execute(
      `SELECT al.id_usuario FROM Materias_Dictadas md
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE md.id_materia_dictada = ? AND ma.id_alumno = ? LIMIT 1`, [idMateriaDictada, idAlumno]
    );
    if (!matriculado.length) return res.status(400).json({ error: "El alumno no pertenece al curso de esa materia." });
    const [previa] = await pool.execute(
      `SELECT id_asistencia, estado FROM Asistencias WHERE id_alumno = ? AND id_materia_dictada = ? AND fecha = ? LIMIT 1`,
      [idAlumno, idMateriaDictada, fecha]
    );
    if (previa.length) {
      await pool.execute(`UPDATE Asistencias SET estado = ?, observacion = ? WHERE id_asistencia = ?`, [estado, observacion || null, previa[0].id_asistencia]);
    } else {
      await pool.execute(
        `INSERT INTO Asistencias (id_alumno, id_materia_dictada, fecha, estado, observacion) VALUES (?, ?, ?, ?, ?)`,
        [idAlumno, idMateriaDictada, fecha, estado, observacion || null]
      );
    }
    if (!previa.length || previa[0].estado !== estado) {
      await crearNotificaciones([matriculado[0].id_usuario], {
        titulo: "Asistencia actualizada",
        mensaje: `Tu asistencia del ${fecha} quedó registrada como ${estado.toLowerCase()}.`,
        tipo: "ASISTENCIA",
      }, req.app.get("io"));
    }
    res.json({ ok: true, mensaje: "Asistencia guardada." });
  } catch (error) { next(error); }
}

module.exports = { listarAsistenciasAlumno, listarAlumnosDeMateria, guardarAsistencia };
