const pool = require("../config/database");

function validarIdUsuario(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function consultarPerfil(conexion, idUsuario) {
  const [filas] = await conexion.execute(
    `SELECT u.id_usuario, u.username, u.mail, u.foto, u.fecha_registro, u.activo, u.rol,
            COALESCE(a.nombre, d.nombre, u.username) AS nombre,
            COALESCE(a.apellido, d.apellido, '') AS apellido,
            COALESCE(a.dni, d.dni) AS dni,
            a.fecha_nacimiento, d.especialidad
     FROM Usuarios_1 u
     LEFT JOIN Alumnos a ON a.id_usuario = u.id_usuario
     LEFT JOIN Docentes d ON d.id_usuario = u.id_usuario
     WHERE u.id_usuario = ? LIMIT 1`,
    [idUsuario]
  );
  return filas[0] || null;
}

async function guardarDatosUsuario(conexion, idUsuario, datos) {
  const username = typeof datos.username === "string" ? datos.username.trim() : "";
  const mail = typeof datos.mail === "string" ? datos.mail.trim() : "";
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const apellido = typeof datos.apellido === "string" ? datos.apellido.trim() : "";
  const dni = typeof datos.dni === "string" ? datos.dni.trim() : "";
  const fechaNacimiento = typeof datos.fecha_nacimiento === "string" && datos.fecha_nacimiento ? datos.fecha_nacimiento : null;
  const especialidad = typeof datos.especialidad === "string" ? datos.especialidad.trim() : "";

  if (!username || username.length > 100 || !mail || mail.length > 100 || !/^\S+@\S+\.\S+$/.test(mail)) {
    const error = new Error("Ingresá un usuario y un correo válido.");
    error.status = 400;
    throw error;
  }

  const [existentes] = await conexion.execute(
    "SELECT rol FROM Usuarios_1 WHERE id_usuario = ? LIMIT 1",
    [idUsuario]
  );
  if (!existentes.length) {
    const error = new Error("No se encontró esa cuenta.");
    error.status = 404;
    throw error;
  }
  const rol = existentes[0].rol;
  if (rol !== "ADMIN" && (!nombre || !apellido || nombre.length > 50 || apellido.length > 50)) {
    const error = new Error("Completá nombre y apellido.");
    error.status = 400;
    throw error;
  }
  if (dni.length > 20 || especialidad.length > 100) {
    const error = new Error("Revisá el largo de los datos ingresados.");
    error.status = 400;
    throw error;
  }
  if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
    const error = new Error("La fecha de nacimiento no es válida.");
    error.status = 400;
    throw error;
  }

  await conexion.execute("UPDATE Usuarios_1 SET username = ?, mail = ? WHERE id_usuario = ?", [username, mail, idUsuario]);
  if (rol === "ALUMNO") {
    await conexion.execute(
      "UPDATE Alumnos SET nombre = ?, apellido = ?, dni = ?, fecha_nacimiento = ? WHERE id_usuario = ?",
      [nombre, apellido, dni || null, fechaNacimiento, idUsuario]
    );
  } else if (rol === "DOCENTE") {
    await conexion.execute(
      "UPDATE Docentes SET nombre = ?, apellido = ?, dni = ?, especialidad = ? WHERE id_usuario = ?",
      [nombre, apellido, dni || null, especialidad || null, idUsuario]
    );
  }
}

async function obtenerPerfil(req, res, next) {
  const idUsuario = validarIdUsuario(req.params.idUsuario);
  if (!idUsuario) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const perfil = await consultarPerfil(pool, idUsuario);
    if (!perfil) return res.status(404).json({ error: "No se encontró esa cuenta." });
    res.json({ perfil });
  } catch (error) { next(error); }
}

async function actualizarPerfil(req, res, next) {
  const idUsuario = validarIdUsuario(req.params.idUsuario);
  if (!idUsuario) return res.status(400).json({ error: "Usuario inválido." });
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await guardarDatosUsuario(conexion, idUsuario, req.body);
    await conexion.commit();
    res.json({ ok: true, perfil: await consultarPerfil(pool, idUsuario), mensaje: "Perfil actualizado." });
  } catch (error) {
    await conexion.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Ese usuario, correo o DNI ya está registrado." });
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  } finally { conexion.release(); }
}

async function cambiarContrasena(req, res, next) {
  const idUsuario = validarIdUsuario(req.params.id);
  const actual = typeof req.body.password_actual === "string" ? req.body.password_actual : "";
  const nueva = typeof req.body.password_nueva === "string" ? req.body.password_nueva : "";
  if (!idUsuario || !actual || nueva.length < 8 || nueva.length > 255) return res.status(400).json({ error: "Ingresá la contraseña actual y una nueva de entre 8 y 255 caracteres." });
  if (actual === nueva) return res.status(400).json({ error: "La nueva contraseña debe ser distinta de la actual." });
  try {
    const [resultado] = await pool.execute("UPDATE Usuarios_1 SET password = ? WHERE id_usuario = ? AND password = ? AND activo = 1", [nueva, idUsuario, actual]);
    if (!resultado.affectedRows) {
      const [cuenta] = await pool.execute("SELECT id_usuario FROM Usuarios_1 WHERE id_usuario = ? AND activo = 1 LIMIT 1", [idUsuario]);
      if (!cuenta.length) return res.status(404).json({ error: "No se encontró una cuenta activa." });
      return res.status(400).json({ error: "La contraseña actual no coincide." });
    }
    res.json({ ok: true, mensaje: "Contraseña actualizada." });
  } catch (error) { next(error); }
}

async function restablecerContrasena(req, res, next) {
  const idUsuario = validarIdUsuario(req.params.id);
  const idAdmin = validarIdUsuario(req.body.id_admin);
  const nueva = typeof req.body.password_nueva === "string" ? req.body.password_nueva : "";
  if (!idUsuario || !idAdmin || nueva.length < 8 || nueva.length > 255) return res.status(400).json({ error: "Ingresá una nueva contraseña de entre 8 y 255 caracteres." });
  try {
    const [admins] = await pool.execute("SELECT 1 FROM Usuarios_1 WHERE id_usuario = ? AND rol = 'ADMIN' AND activo = 1 LIMIT 1", [idAdmin]);
    if (!admins.length) return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
    const [resultado] = await pool.execute("UPDATE Usuarios_1 SET password = ? WHERE id_usuario = ?", [nueva, idUsuario]);
    if (!resultado.affectedRows) {
      const [cuenta] = await pool.execute("SELECT id_usuario FROM Usuarios_1 WHERE id_usuario = ? LIMIT 1", [idUsuario]);
      if (!cuenta.length) return res.status(404).json({ error: "No se encontró ese usuario." });
    }
    res.json({ ok: true, mensaje: "Contraseña restablecida. El usuario ya puede ingresar con la nueva contraseña." });
  } catch (error) { next(error); }
}

async function actualizarUsuario(req, res, next) {
  const idUsuario = validarIdUsuario(req.params.id);
  if (!idUsuario) return res.status(400).json({ error: "Usuario inválido." });
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    await guardarDatosUsuario(conexion, idUsuario, req.body);
    await conexion.commit();
    res.json({ ok: true, perfil: await consultarPerfil(pool, idUsuario), mensaje: "Usuario actualizado." });
  } catch (error) {
    await conexion.rollback();
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Ese usuario, correo o DNI ya está registrado." });
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  } finally { conexion.release(); }
}

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
  obtenerPerfil,
  actualizarPerfil,
  cambiarContrasena,
  restablecerContrasena,
  actualizarUsuario,
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
};
