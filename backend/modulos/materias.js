const pool = require("../config/database");

async function listarMateriasAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [materias] = await pool.execute(
      `SELECT md.id_materia_dictada, m.id_materia, m.nombre, m.descripcion,
              md.horas_semanales, c.anio, c.division, c.ciclo_lectivo,
              o.nombre AS orientacion,
              GROUP_CONCAT(DISTINCT CONCAT(d.nombre, ' ', d.apellido, ' (', dd.rol, ')') ORDER BY dd.rol SEPARATOR ', ') AS docentes
       FROM Alumnos a
       JOIN Matriculas ma ON ma.id_alumno = a.id_alumno AND ma.estado = 'ACTIVA'
       JOIN Cursos c ON c.id_curso = ma.id_curso
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       JOIN Materias_Dictadas md ON md.id_curso = c.id_curso
       JOIN Materias m ON m.id_materia = md.id_materia
       LEFT JOIN Dictados_Docentes dd ON dd.id_materia_dictada = md.id_materia_dictada
       LEFT JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE a.id_usuario = ?
       GROUP BY md.id_materia_dictada, m.id_materia, m.nombre, m.descripcion,
                md.horas_semanales, c.anio, c.division, c.ciclo_lectivo, o.nombre
       ORDER BY c.anio, c.division, m.nombre`,
      [idUsuario]
    );
    res.json({ materias });
  } catch (error) { next(error); }
}

async function listarMateriasDocente(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [materias] = await pool.execute(
      `SELECT md.id_materia_dictada, m.id_materia, m.nombre, m.descripcion,
              md.horas_semanales, c.anio, c.division, c.ciclo_lectivo,
              o.nombre AS orientacion, dd.rol,
              (SELECT COUNT(*) FROM Matriculas ma WHERE ma.id_curso = c.id_curso AND ma.estado = 'ACTIVA') AS cantidad_alumnos
       FROM Docentes d
       JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       JOIN Materias_Dictadas md ON md.id_materia_dictada = dd.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       WHERE d.id_usuario = ?
       ORDER BY c.anio, c.division, m.nombre`,
      [idUsuario]
    );
    res.json({ materias });
  } catch (error) { next(error); }
}


async function listarAlumnosMateriaDocente(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idMateriaDictada = Number(req.params.idMateriaDictada);
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0)) return res.status(400).json({ error: "Datos inválidos." });
  try {
    const [alumnos] = await pool.execute(
      `SELECT al.id_alumno, al.nombre, al.apellido, al.dni
       FROM Docentes d
       JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       JOIN Materias_Dictadas md ON md.id_materia_dictada = dd.id_materia_dictada
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE d.id_usuario = ? AND md.id_materia_dictada = ?
       ORDER BY al.apellido, al.nombre`, [idUsuario, idMateriaDictada]
    );
    res.json({ alumnos });
  } catch (error) { next(error); }
}
module.exports = { listarMateriasAlumno, listarMateriasDocente, listarAlumnosMateriaDocente };
