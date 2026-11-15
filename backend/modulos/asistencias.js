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

async function listarReporteAsistenciasDocente(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idMateriaDictada = Number(req.params.idMateriaDictada);
  const desde = String(req.query.desde || "").trim();
  const hasta = String(req.query.hasta || "").trim();
  const fechaValida = (fecha) => /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime()) && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0)) return res.status(400).json({ error: "Datos inválidos." });
  if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta))) return res.status(400).json({ error: "Las fechas del período no son válidas." });
  if (desde && hasta && desde > hasta) return res.status(400).json({ error: "La fecha Desde no puede ser posterior a Hasta." });
  try {
    const condicionesFecha = [];
    const parametros = [idUsuario, idMateriaDictada];
    if (desde) { condicionesFecha.push("a.fecha >= ?"); parametros.push(desde); }
    if (hasta) { condicionesFecha.push("a.fecha <= ?"); parametros.push(hasta); }
    const filtroFechas = condicionesFecha.length ? `AND ${condicionesFecha.join(" AND ")}` : "";
    const [asistencias] = await pool.execute(
      `SELECT a.id_asistencia, a.fecha, a.estado, a.observacion,
              al.id_alumno, al.dni, al.nombre, al.apellido,
              m.nombre AS materia, md.id_materia_dictada,
              c.anio, c.division
       FROM Asistencias a
       JOIN Alumnos al ON al.id_alumno = a.id_alumno
       JOIN Materias_Dictadas md ON md.id_materia_dictada = a.id_materia_dictada
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Dictados_Docentes dd ON dd.id_materia_dictada = md.id_materia_dictada
       JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE d.id_usuario = ? AND md.id_materia_dictada = ? ${filtroFechas}
       ORDER BY a.fecha, al.apellido, al.nombre`, parametros
    );
    res.json({ asistencias, desde: desde || null, hasta: hasta || null });
  } catch (error) { next(error); }
}
async function guardarAsistenciasLote(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idMateriaDictada = Number(req.body.id_materia_dictada);
  const fecha = String(req.body.fecha || "");
  const registros = req.body.asistencias;
  if (![idUsuario, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0)
    || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    || !Array.isArray(registros) || registros.length === 0 || registros.length > 1000) {
    return res.status(400).json({ error: "Completá materia, fecha y una lista válida de asistencias." });
  }
  const normalizados = registros.map((registro) => ({
    id_alumno: Number(registro.id_alumno),
    estado: String(registro.estado || "").toUpperCase(),
    observacion: typeof registro.observacion === "string" ? registro.observacion.trim() : "",
  }));
  const idsAlumnos = normalizados.map((registro) => registro.id_alumno);
  if (normalizados.some((registro) => !Number.isInteger(registro.id_alumno) || registro.id_alumno <= 0
    || !ESTADOS.includes(registro.estado) || registro.observacion.length > 255)
    || new Set(idsAlumnos).size !== idsAlumnos.length) {
    return res.status(400).json({ error: "Hay alumnos repetidos o estados/observaciones inválidos en el lote." });
  }

  let conexion;
  let notificaciones = [];
  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    const [asignacion] = await conexion.execute(
      `SELECT 1 FROM Docentes d JOIN Dictados_Docentes dd ON dd.id_docente = d.id_docente
       WHERE d.id_usuario = ? AND dd.id_materia_dictada = ? LIMIT 1`, [idUsuario, idMateriaDictada]
    );
    if (!asignacion.length) {
      await conexion.rollback();
      return res.status(403).json({ error: "El docente no dicta esa materia." });
    }

    const marcas = idsAlumnos.map(() => "?").join(",");
    const [matriculados] = await conexion.execute(
      `SELECT al.id_alumno, al.id_usuario FROM Materias_Dictadas md
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE md.id_materia_dictada = ? AND al.id_alumno IN (${marcas})`,
      [idMateriaDictada, ...idsAlumnos]
    );
    if (matriculados.length !== idsAlumnos.length) {
      await conexion.rollback();
      return res.status(400).json({ error: "Uno o más alumnos no pertenecen al curso activo de esa materia." });
    }

    const [existentes] = await conexion.execute(
      `SELECT id_asistencia, id_alumno, estado FROM Asistencias
       WHERE id_materia_dictada = ? AND fecha = ? AND id_alumno IN (${marcas})`,
      [idMateriaDictada, fecha, ...idsAlumnos]
    );
    const porAlumno = new Map(existentes.map((registro) => [Number(registro.id_alumno), registro]));
    const usuarioPorAlumno = new Map(matriculados.map((alumno) => [Number(alumno.id_alumno), Number(alumno.id_usuario)]));
    const usuariosANotificar = new Set();

    for (const registro of normalizados) {
      const previa = porAlumno.get(registro.id_alumno);
      if (previa) {
        await conexion.execute(
          "UPDATE Asistencias SET estado = ?, observacion = ? WHERE id_asistencia = ?",
          [registro.estado, registro.observacion || null, previa.id_asistencia]
        );
      } else {
        await conexion.execute(
          "INSERT INTO Asistencias (id_alumno, id_materia_dictada, fecha, estado, observacion) VALUES (?, ?, ?, ?, ?)",
          [registro.id_alumno, idMateriaDictada, fecha, registro.estado, registro.observacion || null]
        );
      }
      if (!previa || previa.estado !== registro.estado) usuariosANotificar.add(usuarioPorAlumno.get(registro.id_alumno));
    }
    await conexion.commit();
    notificaciones = [...usuariosANotificar];
    await crearNotificaciones(notificaciones, {
      titulo: "Asistencia actualizada",
      mensaje: `Tu asistencia del ${fecha} fue registrada o actualizada.`,
      tipo: "ASISTENCIA",
    }, req.app.get("io"));
    res.json({ ok: true, guardadas: normalizados.length, mensaje: `Se guardaron las asistencias de ${normalizados.length} alumnos.` });
  } catch (error) {
    if (conexion) await conexion.rollback();
    next(error);
  } finally {
    conexion?.release();
  }
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

module.exports = { listarAsistenciasAlumno, listarAlumnosDeMateria, listarReporteAsistenciasDocente, guardarAsistenciasLote, guardarAsistencia };
