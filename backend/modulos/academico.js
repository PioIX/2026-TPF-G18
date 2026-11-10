const pool = require("../config/database");

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function esAdmin(idUsuario) {
  const [filas] = await pool.execute(
    "SELECT 1 FROM Usuarios_1 WHERE id_usuario = ? AND rol = 'ADMIN' AND activo = 1 LIMIT 1",
    [idUsuario]
  );
  return filas.length > 0;
}

function responderDuplicado(res, error, mensaje) {
  if (error.code !== "ER_DUP_ENTRY") return false;
  res.status(409).json({ error: mensaje });
  return true;
}

async function guardarOrientacion(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idColegio = idValido(req.body.id_colegio);
  const idOrientacion = req.params.idOrientacion ? idValido(req.params.idOrientacion) : null;
  const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (!idAdmin || !idColegio || (req.params.idOrientacion && !idOrientacion) || !nombre || nombre.length > 100 || descripcion.length > 200) return res.status(400).json({ error: "Completá el colegio, el nombre y una descripción de hasta 200 caracteres." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    if (idOrientacion) {
      const [resultado] = await pool.execute("UPDATE Orientaciones SET id_colegio = ?, nombre = ?, descripcion = ? WHERE id_orientacion = ?", [idColegio, nombre, descripcion || null, idOrientacion]);
      if (!resultado.affectedRows) {
        const [existentes] = await pool.execute("SELECT 1 FROM Orientaciones WHERE id_orientacion = ?", [idOrientacion]);
        if (!existentes.length) return res.status(404).json({ error: "No se encontró esa orientación." });
      }
      return res.json({ ok: true, mensaje: "Orientación actualizada." });
    }
    const [resultado] = await pool.execute("INSERT INTO Orientaciones (id_colegio, nombre, descripcion) VALUES (?, ?, ?)", [idColegio, nombre, descripcion || null]);
    res.status(201).json({ ok: true, id_orientacion: resultado.insertId, mensaje: "Orientación creada." });
  } catch (error) {
    if (responderDuplicado(res, error, "Ya existe esa orientación para el colegio seleccionado.")) return;
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "El colegio seleccionado no existe." });
    next(error);
  }
}

async function listarConfiguracionAcademica(req, res, next) {
  const idAdmin = idValido(req.params.idAdmin);
  if (!idAdmin) return res.status(400).json({ error: "Administrador inválido." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [colegios] = await pool.execute("SELECT id_colegio, nombre FROM Colegios WHERE activo = 1 ORDER BY nombre");
    const [orientaciones] = await pool.execute("SELECT o.id_orientacion, o.id_colegio, o.nombre, o.descripcion, c.nombre AS colegio FROM Orientaciones o JOIN Colegios c ON c.id_colegio = o.id_colegio ORDER BY c.nombre, o.nombre");
    const [cursos] = await pool.execute(
      `SELECT c.id_curso, c.id_orientacion, c.anio, c.division, c.ciclo_lectivo,
              o.nombre AS orientacion,
              COUNT(DISTINCT CASE WHEN ma.estado = 'ACTIVA' THEN ma.id_alumno END) AS cantidad_alumnos,
              COUNT(DISTINCT md.id_materia_dictada) AS cantidad_materias
       FROM Cursos c
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       LEFT JOIN Matriculas ma ON ma.id_curso = c.id_curso
       LEFT JOIN Materias_Dictadas md ON md.id_curso = c.id_curso
       GROUP BY c.id_curso, c.id_orientacion, c.anio, c.division, c.ciclo_lectivo, o.nombre
       ORDER BY c.ciclo_lectivo DESC, c.anio, c.division`
    );
    const [materias] = await pool.execute("SELECT id_materia, nombre, descripcion FROM Materias ORDER BY nombre");
    const [materiasDictadas] = await pool.execute(
      `SELECT md.id_materia_dictada, md.id_curso, md.id_materia, md.horas_semanales,
              m.nombre AS materia, c.anio, c.division, c.ciclo_lectivo, o.nombre AS orientacion,
              GROUP_CONCAT(DISTINCT CONCAT(d.nombre, ' ', d.apellido, ' · ', dd.rol) ORDER BY dd.rol SEPARATOR ', ') AS docentes
       FROM Materias_Dictadas md
       JOIN Materias m ON m.id_materia = md.id_materia
       JOIN Cursos c ON c.id_curso = md.id_curso
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       LEFT JOIN Dictados_Docentes dd ON dd.id_materia_dictada = md.id_materia_dictada
       LEFT JOIN Docentes d ON d.id_docente = dd.id_docente
       GROUP BY md.id_materia_dictada, md.id_curso, md.id_materia, md.horas_semanales,
                m.nombre, c.anio, c.division, c.ciclo_lectivo, o.nombre
       ORDER BY c.ciclo_lectivo DESC, c.anio, c.division, m.nombre`
    );
    const [docentes] = await pool.execute(
      `SELECT d.id_docente, d.nombre, d.apellido, u.username, u.mail
       FROM Docentes d JOIN Usuarios_1 u ON u.id_usuario = d.id_usuario
       WHERE u.activo = 1 ORDER BY d.apellido, d.nombre`
    );
    const [alumnos] = await pool.execute(
      `SELECT a.id_alumno, a.nombre, a.apellido, a.dni, u.username, u.mail
       FROM Alumnos a JOIN Usuarios_1 u ON u.id_usuario = a.id_usuario
       WHERE u.activo = 1 ORDER BY a.apellido, a.nombre`
    );
    const [matriculas] = await pool.execute(
      `SELECT ma.id_matricula, ma.id_alumno, ma.id_curso, ma.estado,
              a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, u.username,
              c.anio, c.division, c.ciclo_lectivo, o.nombre AS orientacion
       FROM Matriculas ma
       JOIN Alumnos a ON a.id_alumno = ma.id_alumno
       JOIN Usuarios_1 u ON u.id_usuario = a.id_usuario
       JOIN Cursos c ON c.id_curso = ma.id_curso
       JOIN Orientaciones o ON o.id_orientacion = c.id_orientacion
       WHERE ma.estado = 'ACTIVA'
       ORDER BY c.ciclo_lectivo DESC, c.anio, c.division, a.apellido, a.nombre`
    );
    res.json({ colegios, orientaciones, cursos, materias, materiasDictadas, docentes, alumnos, matriculas });
  } catch (error) { next(error); }
}

function datosCurso(body) {
  const idOrientacion = idValido(body.id_orientacion);
  const anio = Number(body.anio);
  const division = typeof body.division === "string" ? body.division.trim() : "";
  const cicloLectivo = Number(body.ciclo_lectivo);
  if (!idOrientacion || !Number.isInteger(anio) || anio < 1 || anio > 7 || !division || division.length > 10 || !Number.isInteger(cicloLectivo) || cicloLectivo < 2000 || cicloLectivo > 2100) return null;
  return [idOrientacion, anio, division, cicloLectivo];
}

async function crearCurso(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const datos = datosCurso(req.body);
  if (!idAdmin || !datos) return res.status(400).json({ error: "Revisá orientación, año, división y ciclo lectivo." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [resultado] = await pool.execute("INSERT INTO Cursos (id_orientacion, anio, division, ciclo_lectivo) VALUES (?, ?, ?, ?)", datos);
    res.status(201).json({ ok: true, id_curso: resultado.insertId, mensaje: "Curso creado." });
  } catch (error) {
    if (responderDuplicado(res, error, "Ese curso ya existe para el ciclo lectivo seleccionado.")) return;
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "La orientación seleccionada ya no existe." });
    next(error);
  }
}

async function actualizarCurso(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idCurso = idValido(req.params.idCurso);
  const datos = datosCurso(req.body);
  if (!idAdmin || !idCurso || !datos) return res.status(400).json({ error: "Revisá orientación, año, división y ciclo lectivo." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [resultado] = await pool.execute("UPDATE Cursos SET id_orientacion = ?, anio = ?, division = ?, ciclo_lectivo = ? WHERE id_curso = ?", [...datos, idCurso]);
    if (!resultado.affectedRows) {
      const [existentes] = await pool.execute("SELECT 1 FROM Cursos WHERE id_curso = ?", [idCurso]);
      if (!existentes.length) return res.status(404).json({ error: "No se encontró ese curso." });
    }
    res.json({ ok: true, mensaje: "Curso actualizado." });
  } catch (error) {
    if (responderDuplicado(res, error, "Ese curso ya existe para el ciclo lectivo seleccionado.")) return;
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "La orientación seleccionada ya no existe." });
    next(error);
  }
}

async function guardarMateria(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idMateria = req.params.idMateria ? idValido(req.params.idMateria) : null;
  const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
  const descripcion = typeof req.body.descripcion === "string" ? req.body.descripcion.trim() : "";
  if (!idAdmin || (req.params.idMateria && !idMateria) || !nombre || nombre.length > 100 || descripcion.length > 200) return res.status(400).json({ error: "Completá el nombre de la materia y una descripción de hasta 200 caracteres." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    if (idMateria) {
      const [resultado] = await pool.execute("UPDATE Materias SET nombre = ?, descripcion = ? WHERE id_materia = ?", [nombre, descripcion || null, idMateria]);
      if (!resultado.affectedRows) {
        const [existentes] = await pool.execute("SELECT 1 FROM Materias WHERE id_materia = ?", [idMateria]);
        if (!existentes.length) return res.status(404).json({ error: "No se encontró esa materia." });
      }
      return res.json({ ok: true, mensaje: "Materia actualizada." });
    }
    const [resultado] = await pool.execute("INSERT INTO Materias (nombre, descripcion) VALUES (?, ?)", [nombre, descripcion || null]);
    res.status(201).json({ ok: true, id_materia: resultado.insertId, mensaje: "Materia creada." });
  } catch (error) {
    if (responderDuplicado(res, error, "Ya existe una materia con ese nombre.")) return;
    next(error);
  }
}

async function crearMateriaDictada(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idCurso = idValido(req.body.id_curso);
  const idMateria = idValido(req.body.id_materia);
  const horas = req.body.horas_semanales === "" || req.body.horas_semanales === null || req.body.horas_semanales === undefined ? null : Number(req.body.horas_semanales);
  const idDocente = req.body.id_docente ? idValido(req.body.id_docente) : null;
  const rol = req.body.rol || "Titular";
  if (!idAdmin || !idCurso || !idMateria || (horas !== null && (!Number.isInteger(horas) || horas < 1 || horas > 60)) || (req.body.id_docente && !idDocente) || !["Titular", "Suplente", "Ayudante"].includes(rol)) return res.status(400).json({ error: "Revisá curso, materia, horas y docente asignado." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [existentes] = await conexion.execute("SELECT id_materia_dictada FROM Materias_Dictadas WHERE id_curso = ? AND id_materia = ? LIMIT 1", [idCurso, idMateria]);
      let idMateriaDictada;
      if (existentes.length) {
        idMateriaDictada = existentes[0].id_materia_dictada;
        await conexion.execute("UPDATE Materias_Dictadas SET horas_semanales = ? WHERE id_materia_dictada = ?", [horas, idMateriaDictada]);
      } else {
        const [resultado] = await conexion.execute("INSERT INTO Materias_Dictadas (id_curso, id_materia, horas_semanales) VALUES (?, ?, ?)", [idCurso, idMateria, horas]);
        idMateriaDictada = resultado.insertId;
      }
      if (idDocente) {
        const [docentes] = await conexion.execute(
          `SELECT d.id_docente FROM Docentes d JOIN Usuarios_1 u ON u.id_usuario = d.id_usuario
           WHERE d.id_docente = ? AND u.activo = 1 LIMIT 1`, [idDocente]
        );
        if (!docentes.length) {
          await conexion.rollback();
          return res.status(400).json({ error: "El docente seleccionado no está activo." });
        }
        await conexion.execute(
          `INSERT INTO Dictados_Docentes (id_materia_dictada, id_docente, rol) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE rol = VALUES(rol)`, [idMateriaDictada, idDocente, rol]
        );
      }
      await conexion.commit();
      res.status(existentes.length ? 200 : 201).json({ ok: true, id_materia_dictada: idMateriaDictada, mensaje: "Materia asignada al curso." });
    } catch (error) {
      await conexion.rollback();
      if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "El curso o la materia seleccionados ya no existen." });
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Esa materia ya está asignada al curso." });
      next(error);
    } finally { conexion.release(); }
  } catch (error) { next(error); }
}

async function asignarDocente(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idMateriaDictada = idValido(req.params.idMateriaDictada);
  const idDocente = idValido(req.body.id_docente);
  const rol = req.body.rol;
  if (!idAdmin || !idMateriaDictada || !idDocente || !["Titular", "Suplente", "Ayudante"].includes(rol)) return res.status(400).json({ error: "Revisá docente y rol." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [docentes] = await pool.execute("SELECT d.id_docente FROM Docentes d JOIN Usuarios_1 u ON u.id_usuario = d.id_usuario WHERE d.id_docente = ? AND u.activo = 1 LIMIT 1", [idDocente]);
    if (!docentes.length) return res.status(400).json({ error: "El docente seleccionado no está activo." });
    await pool.execute(
      `INSERT INTO Dictados_Docentes (id_materia_dictada, id_docente, rol) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rol = VALUES(rol)`, [idMateriaDictada, idDocente, rol]
    );
    res.json({ ok: true, mensaje: "Docente asignado o actualizado." });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(404).json({ error: "No se encontró esa materia dictada." });
    next(error);
  }
}

async function matricularAlumno(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idAlumno = idValido(req.body.id_alumno);
  const idCurso = idValido(req.body.id_curso);
  if (!idAdmin || !idAlumno || !idCurso) return res.status(400).json({ error: "Seleccioná un alumno y un curso." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [alumnos] = await pool.execute("SELECT a.id_alumno FROM Alumnos a JOIN Usuarios_1 u ON u.id_usuario = a.id_usuario WHERE a.id_alumno = ? AND u.activo = 1 LIMIT 1", [idAlumno]);
    if (!alumnos.length) return res.status(400).json({ error: "El alumno seleccionado no está activo." });
    const [existentes] = await pool.execute("SELECT id_matricula, estado FROM Matriculas WHERE id_alumno = ? AND id_curso = ? LIMIT 1", [idAlumno, idCurso]);
    if (existentes.length && existentes[0].estado === "ACTIVA") return res.status(409).json({ error: "El alumno ya está matriculado en ese curso." });
    if (existentes.length) await pool.execute("UPDATE Matriculas SET estado = 'ACTIVA' WHERE id_matricula = ?", [existentes[0].id_matricula]);
    else await pool.execute("INSERT INTO Matriculas (id_alumno, id_curso, estado) VALUES (?, ?, 'ACTIVA')", [idAlumno, idCurso]);
    res.status(201).json({ ok: true, mensaje: existentes.length ? "Matrícula reactivada." : "Alumno matriculado." });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ error: "El curso seleccionado ya no existe." });
    next(error);
  }
}

async function cambiarEstadoMatricula(req, res, next) {
  const idAdmin = idValido(req.body.id_admin);
  const idMatricula = idValido(req.params.idMatricula);
  const estado = req.body.estado;
  if (!idAdmin || !idMatricula || !["ACTIVA", "BAJA", "FINALIZADA"].includes(estado)) return res.status(400).json({ error: "El estado de matrícula no es válido." });
  try {
    if (!await esAdmin(idAdmin)) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [resultado] = await pool.execute("UPDATE Matriculas SET estado = ? WHERE id_matricula = ?", [estado, idMatricula]);
    if (!resultado.affectedRows) return res.status(404).json({ error: "No se encontró esa matrícula." });
    res.json({ ok: true, mensaje: estado === "ACTIVA" ? "Matrícula activada." : estado === "BAJA" ? "Matrícula dada de baja." : "Matrícula finalizada." });
  } catch (error) { next(error); }
}

module.exports = { listarConfiguracionAcademica, guardarOrientacion, crearCurso, actualizarCurso, guardarMateria, crearMateriaDictada, asignarDocente, matricularAlumno, cambiarEstadoMatricula };
