const pool = require("../config/database");
const { adjuntosPorTarea, adjuntosPorEntrega } = require("./adjuntos");

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

async function obtenerDetalleMateriaAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idMateriaDictada = Number(req.params.idMateriaDictada);
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ error: "Usuario o materia inválidos." });
  }

  try {
    const [materias] = await pool.execute(
      `SELECT md.id_materia_dictada, m.id_materia, m.nombre, m.descripcion,
              md.horas_semanales, c.anio, c.division, c.ciclo_lectivo,
              o.nombre AS orientacion,
              al.id_alumno, al.nombre AS alumno_nombre, al.apellido AS alumno_apellido, al.dni AS alumno_dni,
              GROUP_CONCAT(DISTINCT CONCAT(d.nombre, ' ', d.apellido, ' (', dd.rol, ')') ORDER BY dd.rol SEPARATOR ', ') AS docentes
       FROM Alumnos al
       JOIN Matriculas ma ON ma.id_alumno = al.id_alumno AND ma.estado = 'ACTIVA'
       JOIN Cursos c ON c.id_curso = ma.id_curso
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       JOIN Materias_Dictadas md ON md.id_curso = c.id_curso
       JOIN Materias m ON m.id_materia = md.id_materia
       LEFT JOIN Dictados_Docentes dd ON dd.id_materia_dictada = md.id_materia_dictada
       LEFT JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE al.id_usuario = ? AND md.id_materia_dictada = ?
       GROUP BY md.id_materia_dictada, m.id_materia, m.nombre, m.descripcion,
                md.horas_semanales, c.anio, c.division, c.ciclo_lectivo, o.nombre,
                al.id_alumno, al.nombre, al.apellido, al.dni`,
      [idUsuario, idMateriaDictada]
    );
    if (!materias.length) return res.status(404).json({ error: "No encontramos esa materia en tus cursos activos." });

    const materia = materias[0];
    const idAlumno = materia.id_alumno;
    const [[calificaciones], [asistencias]] = await Promise.all([
      pool.execute(
        `SELECT id_calificacion, tipo, descripcion, nota, fecha
         FROM Calificaciones
         WHERE id_alumno = ? AND id_materia_dictada = ?
         ORDER BY fecha DESC, id_calificacion DESC`, [idAlumno, idMateriaDictada]
      ),
      pool.execute(
        `SELECT id_asistencia, fecha, estado, observacion
         FROM Asistencias
         WHERE id_alumno = ? AND id_materia_dictada = ?
         ORDER BY fecha DESC, id_asistencia DESC`, [idAlumno, idMateriaDictada]
      ),
    ]);

    const consultaTareas = (incluirDevolucion) => pool.execute(
      `SELECT t.id_tarea, t.titulo, t.descripcion, t.fecha_publicacion, t.fecha_entrega,
              t.archivo_adjunto, t.estado AS estado_tarea,
              e.id_entrega, e.archivo AS archivo_entregado, e.comentario AS comentario_entrega,
              ${incluirDevolucion ? "e.devolucion_docente" : "NULL AS devolucion_docente"},
              e.fecha_entrega AS fecha_entrega_real, e.estado AS estado_entrega
       FROM Tareas t
       LEFT JOIN Entregas e ON e.id_tarea = t.id_tarea AND e.id_alumno = ?
       WHERE t.id_materia_dictada = ?
       ORDER BY t.fecha_entrega IS NULL, t.fecha_entrega, t.fecha_publicacion DESC`,
      [idAlumno, idMateriaDictada]
    );

    let tareas;
    try {
      [tareas] = await consultaTareas(true);
    } catch (error) {
      if (error.code !== "ER_BAD_FIELD_ERROR" || !String(error.message).includes("devolucion_docente")) throw error;
      [tareas] = await consultaTareas(false);
    }

    const alumno = {
      id_alumno: materia.id_alumno,
      nombre: materia.alumno_nombre,
      apellido: materia.alumno_apellido,
      dni: materia.alumno_dni,
    };
    delete materia.id_alumno;
    delete materia.alumno_nombre;
    delete materia.alumno_apellido;
    delete materia.alumno_dni;
    const adjuntosTarea = await adjuntosPorTarea(tareas.map((tarea) => tarea.id_tarea));
    const adjuntosEntrega = await adjuntosPorEntrega(tareas.map((tarea) => tarea.id_entrega).filter(Boolean));
    res.json({
      materia,
      alumno,
      calificaciones,
      asistencias,
      tareas: tareas.map((tarea) => ({
        ...tarea,
        archivos_adjunto: adjuntosTarea.get(Number(tarea.id_tarea)) || [],
        archivos_entregados: adjuntosEntrega.get(Number(tarea.id_entrega)) || [],
      })),
    });
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
module.exports = { listarMateriasAlumno, obtenerDetalleMateriaAlumno, listarMateriasDocente, listarAlumnosMateriaDocente };
