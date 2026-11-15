const pool = require("../config/database");
const { crearNotificaciones } = require("./notificaciones");
const TIPOS = ["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"];
const MAX_LONGITUD_NOTA = 50;

function normalizarNota(valor) {
  const texto = String(valor ?? "").trim();
  if (!texto || texto.length > MAX_LONGITUD_NOTA) return null;
  const numeroTexto = texto.replace(",", ".");
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(numeroTexto)) {
    const numero = Number(numeroTexto);
    return Number.isFinite(numero) && numero >= 0 && numero <= 10 ? numero : null;
  }
  return texto.toLocaleUpperCase("es");
}

async function listarCalificacionesAlumno(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [calificaciones] = await pool.execute(
      `SELECT DISTINCT ca.id_calificacion, ca.tipo, ca.descripcion, ca.nota, ca.fecha,
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
      `SELECT DISTINCT ca.id_calificacion, ca.tipo, ca.descripcion, ca.nota, ca.fecha,
              al.id_alumno, al.dni AS alumno_dni, al.nombre AS alumno_nombre, al.apellido AS alumno_apellido,
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
  const nota = normalizarNota(req.body.nota);
  const { tipo, fecha } = req.body;
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (![idUsuario, idAlumno, idMateriaDictada].every((id) => Number.isInteger(id) && id > 0) || !TIPOS.includes(tipo) || nota === null || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) || descripcion.length > 5000) {
    return res.status(400).json({ error: "La nota debe ser un valor de 0 a 10 o texto de hasta 50 caracteres. Revisá también tipo, fecha y devolución." });
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

async function guardarCalificacionesLote(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idMateriaDictada = Number(req.body.id_materia_dictada);
  const registros = req.body.calificaciones;
  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(idMateriaDictada) || idMateriaDictada <= 0
    || !Array.isArray(registros) || registros.length === 0 || registros.length > 1000) {
    return res.status(400).json({ error: "Completá la materia y una lista válida de calificaciones." });
  }
  const normalizados = registros.map((registro) => ({
    id_calificacion: registro.id_calificacion ? Number(registro.id_calificacion) : null,
    id_alumno: Number(registro.id_alumno),
    tipo: String(registro.tipo || "").toUpperCase(),
    nota: normalizarNota(registro.nota),
    fecha: String(registro.fecha || ""),
    descripcion: typeof registro.descripcion === "string" ? registro.descripcion.trim() : "",
  }));
  const idsCalificaciones = normalizados.filter((registro) => registro.id_calificacion).map((registro) => registro.id_calificacion);
  if (normalizados.some((registro) => (registro.id_calificacion !== null && (!Number.isInteger(registro.id_calificacion) || registro.id_calificacion <= 0))
    || !Number.isInteger(registro.id_alumno) || registro.id_alumno <= 0
    || !TIPOS.includes(registro.tipo) || registro.nota === null
    || !/^\d{4}-\d{2}-\d{2}$/.test(registro.fecha) || registro.descripcion.length > 5000)
    || new Set(idsCalificaciones).size !== idsCalificaciones.length) {
    return res.status(400).json({ error: "Hay IDs duplicados o datos inválidos. La nota debe ser un valor de 0 a 10 o texto de hasta 50 caracteres." });
  }

  let conexion;
  let creadas = 0;
  let actualizadas = 0;
  let usuariosANotificar = [];
  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    const [asignacion] = await conexion.execute(
      `SELECT 1 FROM Dictados_Docentes dd JOIN Docentes d ON d.id_docente = dd.id_docente
       WHERE d.id_usuario = ? AND dd.id_materia_dictada = ? LIMIT 1`, [idUsuario, idMateriaDictada]
    );
    if (!asignacion.length) {
      await conexion.rollback();
      return res.status(403).json({ error: "El docente no dicta esa materia." });
    }

    const idsAlumnos = [...new Set(normalizados.map((registro) => registro.id_alumno))];
    const marcadoresAlumnos = idsAlumnos.map(() => "?").join(",");
    const [alumnosMatriculados] = await conexion.execute(
      `SELECT al.id_alumno, al.id_usuario FROM Materias_Dictadas md
       JOIN Matriculas ma ON ma.id_curso = md.id_curso AND ma.estado = 'ACTIVA'
       JOIN Alumnos al ON al.id_alumno = ma.id_alumno
       WHERE md.id_materia_dictada = ? AND al.id_alumno IN (${marcadoresAlumnos})`,
      [idMateriaDictada, ...idsAlumnos]
    );
    if (alumnosMatriculados.length !== idsAlumnos.length) {
      await conexion.rollback();
      return res.status(400).json({ error: "Uno o más alumnos no pertenecen al curso activo de esa materia." });
    }

    const usuarioPorAlumno = new Map(alumnosMatriculados.map((alumno) => [Number(alumno.id_alumno), Number(alumno.id_usuario)]));
    const existentesPorId = new Map();
    if (idsCalificaciones.length) {
      const marcadoresNotas = idsCalificaciones.map(() => "?").join(",");
      const [existentes] = await conexion.execute(
        `SELECT ca.id_calificacion, ca.id_alumno, ca.id_materia_dictada, al.id_usuario
         FROM Calificaciones ca JOIN Alumnos al ON al.id_alumno = ca.id_alumno
         JOIN Dictados_Docentes dd ON dd.id_materia_dictada = ca.id_materia_dictada
         JOIN Docentes d ON d.id_docente = dd.id_docente
         WHERE ca.id_calificacion IN (${marcadoresNotas}) AND d.id_usuario = ?`,
        [...idsCalificaciones, idUsuario]
      );
      existentes.forEach((registro) => existentesPorId.set(Number(registro.id_calificacion), registro));
      if (existentes.length !== idsCalificaciones.length || normalizados.some((registro) => registro.id_calificacion && (
        Number(existentesPorId.get(registro.id_calificacion)?.id_alumno) !== registro.id_alumno
        || Number(existentesPorId.get(registro.id_calificacion)?.id_materia_dictada) !== idMateriaDictada
      ))) {
        await conexion.rollback();
        return res.status(403).json({ error: "Un ID de calificación no pertenece a este docente, alumno y materia." });
      }
    }

    const notificar = new Set();
    for (const registro of normalizados) {
      if (registro.id_calificacion) {
        await conexion.execute(
          "UPDATE Calificaciones SET tipo = ?, descripcion = ?, nota = ?, fecha = ? WHERE id_calificacion = ?",
          [registro.tipo, registro.descripcion || null, registro.nota, registro.fecha, registro.id_calificacion]
        );
        actualizadas += 1;
        notificar.add(Number(existentesPorId.get(registro.id_calificacion).id_usuario));
      } else {
        await conexion.execute(
          "INSERT INTO Calificaciones (id_alumno, id_materia_dictada, tipo, descripcion, nota, fecha) VALUES (?, ?, ?, ?, ?, ?)",
          [registro.id_alumno, idMateriaDictada, registro.tipo, registro.descripcion || null, registro.nota, registro.fecha]
        );
        creadas += 1;
        notificar.add(usuarioPorAlumno.get(registro.id_alumno));
      }
    }
    await conexion.commit();
    usuariosANotificar = [...notificar];
    await crearNotificaciones(usuariosANotificar, {
      titulo: "Calificaciones actualizadas",
      mensaje: `El docente cargó o actualizó una calificación en esta materia.`,
      tipo: "CALIFICACION",
    }, req.app.get("io"));
    res.json({ ok: true, creadas, actualizadas, mensaje: `Se guardaron ${normalizados.length} calificaciones (${creadas} nuevas y ${actualizadas} actualizadas).` });
  } catch (error) {
    if (conexion) await conexion.rollback();
    next(error);
  } finally {
    conexion?.release();
  }
}

async function actualizarCalificacion(req, res, next) {
  const idUsuario = Number(req.body.id_usuario);
  const idCalificacion = Number(req.params.idCalificacion);
  const nota = normalizarNota(req.body.nota);
  const { tipo, fecha } = req.body;
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || !Number.isInteger(idCalificacion) || idCalificacion <= 0 || !TIPOS.includes(tipo) || nota === null || !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || "")) || descripcion.length > 5000) {
    return res.status(400).json({ error: "La nota debe ser un valor de 0 a 10 o texto de hasta 50 caracteres. Revisá también tipo, fecha y devolución." });
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

module.exports = { listarCalificacionesAlumno, listarCalificacionesDocente, crearCalificacion, guardarCalificacionesLote, actualizarCalificacion };
