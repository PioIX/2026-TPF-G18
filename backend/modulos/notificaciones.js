const pool = require("../config/database");

const TIPOS = ["TAREA", "CALIFICACION", "ASISTENCIA", "CHAT", "AVISO"];

function escaparRegex(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizarNombresMensaje(mensaje, usuarios) {
  let texto = String(mensaje || "");
  const longitudClave = (usuario) => Math.max(String(usuario.username || "").length, `${usuario.apellido || ""}, ${usuario.nombre || ""}`.length);
  const ordenados = [...usuarios].sort((a, b) => longitudClave(b) - longitudClave(a));
  for (const usuario of ordenados) {
    const nombre = [usuario.nombre, usuario.apellido].map((parte) => String(parte || "").trim()).filter(Boolean).join(" ");
    if (!nombre) continue;
    const nombreUsuario = String(usuario.username || "").trim();
    if (nombreUsuario && nombreUsuario.toLocaleLowerCase("es") !== nombre.toLocaleLowerCase("es")) {
      const patronUsuario = new RegExp(`(^|[^A-Za-z0-9_])${escaparRegex(nombreUsuario)}(?=$|[^A-Za-z0-9_])`, "gi");
      texto = texto.replace(patronUsuario, (_, separador) => `${separador}${nombre}`);
    }
    const nombreInvertido = new RegExp(`${escaparRegex(String(usuario.apellido || "").trim())}\\s*,\\s*${escaparRegex(String(usuario.nombre || "").trim())}`, "gi");
    if (usuario.nombre && usuario.apellido) texto = texto.replace(nombreInvertido, nombre);
  }
  return texto;
}

async function listarNotificaciones(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    return res.status(400).json({ error: "Usuario inválido." });
  }

  try {
    const soloNoLeidas = req.query.soloNoLeidas === "1";
    const filtro = soloNoLeidas ? "AND leida = 0" : "";
    const [notificaciones] = await pool.execute(
      `SELECT id_notificacion, id_usuario, titulo, mensaje, tipo, leida, fecha_creacion
       FROM Notificaciones
       WHERE id_usuario = ? ${filtro}
       ORDER BY fecha_creacion DESC, id_notificacion DESC`,
      [idUsuario]
    );
    const [usuarios] = await pool.execute(
      `SELECT u.username, COALESCE(a.nombre, d.nombre, u.username) AS nombre,
              COALESCE(a.apellido, d.apellido, '') AS apellido
       FROM Usuarios_1 u
       LEFT JOIN Alumnos a ON a.id_usuario = u.id_usuario
       LEFT JOIN Docentes d ON d.id_usuario = u.id_usuario`
    );
    const [[resumen]] = await pool.execute(
      "SELECT COUNT(*) AS no_leidas FROM Notificaciones WHERE id_usuario = ? AND leida = 0",
      [idUsuario]
    );
    res.json({
      notificaciones: notificaciones.map((notificacion) => ({ ...notificacion, mensaje: normalizarNombresMensaje(notificacion.mensaje, usuarios) })),
      noLeidas: Number(resumen.no_leidas),
    });
  } catch (error) {
    next(error);
  }
}

async function marcarNotificacionLeida(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idNotificacion = Number(req.params.idNotificacion);
  if (![idUsuario, idNotificacion].every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ error: "Datos de notificación inválidos." });
  }

  try {
    const [resultado] = await pool.execute(
      "UPDATE Notificaciones SET leida = 1 WHERE id_notificacion = ? AND id_usuario = ?",
      [idNotificacion, idUsuario]
    );
    if (!resultado.affectedRows) {
      const [existentes] = await pool.execute(
        "SELECT 1 FROM Notificaciones WHERE id_notificacion = ? AND id_usuario = ? LIMIT 1",
        [idNotificacion, idUsuario]
      );
      if (!existentes.length) return res.status(404).json({ error: "No se encontró esa notificación." });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function marcarTodasLeidas(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    return res.status(400).json({ error: "Usuario inválido." });
  }

  try {
    await pool.execute("UPDATE Notificaciones SET leida = 1 WHERE id_usuario = ? AND leida = 0", [idUsuario]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function borrarNotificacion(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  const idNotificacion = Number(req.params.idNotificacion);
  if (![idUsuario, idNotificacion].every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ error: "Datos de notificación inválidos." });
  }
  try {
    const [resultado] = await pool.execute(
      "DELETE FROM Notificaciones WHERE id_notificacion = ? AND id_usuario = ?",
      [idNotificacion, idUsuario]
    );
    if (!resultado.affectedRows) return res.status(404).json({ error: "No se encontró esa notificación." });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function borrarTodasNotificaciones(req, res, next) {
  const idUsuario = Number(req.params.idUsuario);
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(400).json({ error: "Usuario inválido." });
  try {
    const [resultado] = await pool.execute("DELETE FROM Notificaciones WHERE id_usuario = ?", [idUsuario]);
    res.json({ ok: true, eliminadas: resultado.affectedRows });
  } catch (error) { next(error); }
}

async function crearNotificaciones(idUsuarios, { titulo, mensaje, tipo }, io) {
  const usuarios = [...new Set(idUsuarios.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const tituloSeguro = String(titulo || "").trim().slice(0, 150);
  const mensajeSeguro = String(mensaje || "").trim();
  if (!usuarios.length || !tituloSeguro || !mensajeSeguro || !TIPOS.includes(tipo)) return;

  const values = usuarios.map(() => "(?, ?, ?, ?, 0, CURRENT_TIMESTAMP)").join(", ");
  try {
    await pool.execute(
      `INSERT INTO Notificaciones (id_usuario, titulo, mensaje, tipo, leida, fecha_creacion)
       VALUES ${values}`,
      usuarios.flatMap((idUsuario) => [idUsuario, tituloSeguro, mensajeSeguro, tipo])
    );
  } catch (error) {
    console.error("No se pudieron guardar las notificaciones:", error.code || error.message);
    return;
  }
  usuarios.forEach((idUsuario) => io?.to(`usuario_${idUsuario}`).emit("nueva_notificacion", { id_usuario: idUsuario }));
}

module.exports = {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  borrarNotificacion,
  borrarTodasNotificaciones,
  crearNotificaciones,
};
