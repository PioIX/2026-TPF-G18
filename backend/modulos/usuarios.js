const pool = require("../config/database");

async function listarUsuarios(req, res, next) {
  try {
    const busqueda = `%${String(req.query.q || "").trim()}%`;

    const [usuarios] = await pool.execute(
      `SELECT
         u.id_usuario,
         u.username,
         u.mail,
         u.foto,
         u.fecha_registro,
         u.activo,
         u.rol,
         COALESCE(a.nombre, d.nombre, u.username) AS nombre,
         COALESCE(a.apellido, d.apellido, '') AS apellido,
         COALESCE(a.dni, d.dni) AS dni,
         a.fecha_nacimiento,
         d.especialidad
       FROM Usuarios_1 u
       LEFT JOIN Alumnos a ON a.id_usuario = u.id_usuario
       LEFT JOIN Docentes d ON d.id_usuario = u.id_usuario
       WHERE u.username LIKE ? OR u.mail LIKE ?
          OR a.nombre LIKE ? OR a.apellido LIKE ?
          OR d.nombre LIKE ? OR d.apellido LIKE ?
       ORDER BY u.rol, nombre, apellido`,
      [busqueda, busqueda, busqueda, busqueda, busqueda, busqueda]
    );

    res.json({ usuarios });
  } catch (error) {
    next(error);
  }
}

async function crearUsuario(req, res, next) {
  const {
    username,
    mail,
    password,
    rol,
    nombre,
    apellido,
    dni,
    fecha_nacimiento,
    especialidad,
    foto,
  } = req.body;

  const rolesPermitidos = ["ALUMNO", "DOCENTE", "ADMIN"];

  if (!username?.trim() || !mail?.trim() || !password || !rol) {
    return res.status(400).json({
      error: "Completá usuario, correo, contraseña y rol.",
    });
  }

  if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({ error: "El rol seleccionado no es válido." });
  }

  if (rol !== "ADMIN" && (!nombre?.trim() || !apellido?.trim())) {
    return res.status(400).json({
      error: "Para alumnos y docentes, completá nombre y apellido.",
    });
  }

  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const [resultado] = await conexion.execute(
      `INSERT INTO Usuarios_1
         (username, mail, password, foto, activo, rol)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [username.trim(), mail.trim(), password, foto?.trim() || null, rol]
    );

    const idUsuario = resultado.insertId;

    if (rol === "ALUMNO") {
      await conexion.execute(
        `INSERT INTO Alumnos
           (id_usuario, nombre, apellido, fecha_nacimiento, dni)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idUsuario,
          nombre.trim(),
          apellido.trim(),
          fecha_nacimiento || null,
          dni?.trim() || null,
        ]
      );
    }

    if (rol === "DOCENTE") {
      await conexion.execute(
        `INSERT INTO Docentes
           (id_usuario, dni, nombre, apellido, especialidad)
         VALUES (?, ?, ?, ?, ?)`,
        [
          idUsuario,
          dni?.trim() || null,
          nombre.trim(),
          apellido.trim(),
          especialidad?.trim() || null,
        ]
      );
    }

    await conexion.commit();

    res.status(201).json({
      ok: true,
      id_usuario: idUsuario,
      mensaje: "Usuario creado.",
    });
  } catch (error) {
    await conexion.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Ese correo, nombre de usuario o DNI ya está registrado.",
      });
    }

    next(error);
  } finally {
    conexion.release();
  }
}

async function cambiarEstadoUsuario(req, res, next) {
  const idUsuario = Number(req.params.id);
  const activo = Number(req.body.activo);

  if (!Number.isInteger(idUsuario) || idUsuario <= 0 || ![0, 1].includes(activo)) {
    return res.status(400).json({ error: "Datos inválidos." });
  }

  try {
    const [resultado] = await pool.execute(
      "UPDATE Usuarios_1 SET activo = ? WHERE id_usuario = ?",
      [activo, idUsuario]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró ese usuario." });
    }

    res.json({
      ok: true,
      mensaje: activo ? "Usuario activado." : "Usuario desactivado.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
};