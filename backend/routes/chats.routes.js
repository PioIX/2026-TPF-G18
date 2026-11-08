const express = require("express");
const pool = require("../config/database");
const router = express.Router();

router.get("/:usuarioId", async (req, res, next) => {
  try {
    const userId = Number(req.params.usuarioId);
    if (!Number.isInteger(userId) || userId < 1) return res.status(400).json({ error: "Usuario inválido." });
    const [chats] = await pool.execute(
      `SELECT c.id_chat AS id, c.nombre, c.es_grupal AS es_grupo, c.foto, c.fecha_creacion,
        (SELECT m.contenido FROM Mensajes m WHERE m.id_chat = c.id_chat ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_contenido,
        (SELECT m.fecha_envio FROM Mensajes m WHERE m.id_chat = c.id_chat ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_envio,
        (SELECT u.username FROM Chats_por_Usuarios cu2 JOIN Usuarios_1 u ON u.id_usuario = cu2.id_usuario
          WHERE cu2.id_chat = c.id_chat AND cu2.id_usuario <> ? LIMIT 1) AS contacto
       FROM Chats c JOIN Chats_por_Usuarios cu ON cu.id_chat = c.id_chat
       WHERE cu.id_usuario = ? AND c.activo = 1
       ORDER BY COALESCE(ultimo_envio, c.fecha_creacion) DESC`, [userId, userId]
    );
    res.json(chats.map((chat) => ({ ...chat, nombre: chat.es_grupo ? chat.nombre : (chat.contacto || "Conversación"), ultimo_mensaje: chat.ultimo_contenido ? { contenido: chat.ultimo_contenido, fecha_envio: chat.ultimo_envio } : null })));
  } catch (error) { next(error); }
});

router.get("/:chatId/mensajes", async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    const userId = Number(req.query.usuarioId);
    if (!chatId || !userId) return res.status(400).json({ error: "Faltan datos del chat." });
    const [membership] = await pool.execute("SELECT 1 FROM Chats_por_Usuarios WHERE id_chat = ? AND id_usuario = ?", [chatId, userId]);
    if (!membership.length) return res.status(403).json({ error: "No pertenecés a este chat." });
    const [messages] = await pool.execute(
      `SELECT m.id_mensaje AS id, m.id_chat AS chat_id, m.id_usuario AS usuario_id, m.contenido,
        m.fecha_envio, m.editado, u.username AS remitente_nombre, u.foto AS remitente_foto
       FROM Mensajes m JOIN Usuarios_1 u ON u.id_usuario = m.id_usuario
       WHERE m.id_chat = ? ORDER BY m.fecha_envio ASC`, [chatId]
    );
    res.json(messages);
  } catch (error) { next(error); }
});

router.patch("/:chatId/mensajes/:mensajeId", async (req, res, next) => {
  const chatId = Number(req.params.chatId);
  const messageId = Number(req.params.mensajeId);
  const userId = Number(req.body?.usuarioId);
  const contenido = typeof req.body?.contenido === "string" ? req.body.contenido.trim() : "";
  if (![chatId, messageId, userId].every((id) => Number.isInteger(id) && id > 0) || !contenido || contenido.length > 4000) {
    return res.status(400).json({ error: "El mensaje debe tener entre 1 y 4000 caracteres." });
  }
  try {
    const [owned] = await pool.execute(
      `SELECT m.id_mensaje FROM Mensajes m
       JOIN Chats_por_Usuarios cu ON cu.id_chat = m.id_chat AND cu.id_usuario = ?
       WHERE m.id_mensaje = ? AND m.id_chat = ? AND m.id_usuario = ? LIMIT 1`,
      [userId, messageId, chatId, userId]
    );
    if (!owned.length) return res.status(404).json({ error: "No se encontró un mensaje propio en este chat." });

    await pool.execute(
      "UPDATE Mensajes SET contenido = ?, editado = 1 WHERE id_mensaje = ? AND id_chat = ? AND id_usuario = ?",
      [contenido, messageId, chatId, userId]
    );
    const [rows] = await pool.execute(
      `SELECT m.id_mensaje AS id, m.id_chat AS chat_id, m.id_usuario AS usuario_id,
              m.contenido, m.fecha_envio, m.editado,
              u.username AS remitente_nombre, u.foto AS remitente_foto
       FROM Mensajes m JOIN Usuarios_1 u ON u.id_usuario = m.id_usuario
       WHERE m.id_mensaje = ?`, [messageId]
    );
    if (!rows.length) return res.status(404).json({ error: "El mensaje ya no está disponible." });
    req.app.get("io").to(`chat_${chatId}`).emit("mensaje_editado", rows[0]);
    res.json(rows[0]);
  } catch (error) { next(error); }
});

router.delete("/:chatId/mensajes/:mensajeId", async (req, res, next) => {
  const chatId = Number(req.params.chatId);
  const messageId = Number(req.params.mensajeId);
  const userId = Number(req.query.usuarioId);
  if (![chatId, messageId, userId].every((id) => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ error: "Datos del mensaje inválidos." });
  }
  try {
    const [deleted] = await pool.execute(
      `DELETE m FROM Mensajes m
       JOIN Chats_por_Usuarios cu ON cu.id_chat = m.id_chat AND cu.id_usuario = ?
       WHERE m.id_mensaje = ? AND m.id_chat = ? AND m.id_usuario = ?`,
      [userId, messageId, chatId, userId]
    );
    if (!deleted.affectedRows) return res.status(404).json({ error: "No se encontró un mensaje propio en este chat." });
    const payload = { id: messageId, chat_id: chatId };
    req.app.get("io").to(`chat_${chatId}`).emit("mensaje_eliminado", payload);
    res.json({ ok: true, ...payload });
  } catch (error) { next(error); }
});
router.post("/nuevo", async (req, res, next) => {
  const { usuarioId, emailOtro } = req.body;
  const userId = Number(usuarioId);
  if (!userId || !emailOtro?.trim()) return res.status(400).json({ error: "Indicá el correo del contacto." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [contact] = await connection.execute("SELECT id_usuario FROM Usuarios_1 WHERE mail = ? AND activo = 1", [emailOtro.trim()]);
    if (!contact.length) { await connection.rollback(); return res.status(404).json({ error: "No encontramos una cuenta activa con ese correo." }); }
    const contactId = Number(contact[0].id_usuario);
    if (contactId === userId) { await connection.rollback(); return res.status(400).json({ error: "No podés iniciar un chat con tu propia cuenta." }); }
    const [existing] = await connection.execute(
      `SELECT c.id_chat FROM Chats c JOIN Chats_por_Usuarios a ON a.id_chat = c.id_chat
       JOIN Chats_por_Usuarios b ON b.id_chat = c.id_chat
       WHERE c.es_grupal = 0 AND c.activo = 1 AND a.id_usuario = ? AND b.id_usuario = ? LIMIT 1`, [userId, contactId]
    );
    if (existing.length) { await connection.commit(); return res.json({ ok: true, chatId: existing[0].id_chat }); }
    const [chat] = await connection.execute("INSERT INTO Chats (es_grupal, activo) VALUES (0, 1)");
    await connection.execute("INSERT INTO Chats_por_Usuarios (id_chat, id_usuario) VALUES (?, ?), (?, ?)", [chat.insertId, userId, chat.insertId, contactId]);
    await connection.commit();
    res.status(201).json({ ok: true, chatId: chat.insertId });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

router.post("/grupo", async (req, res, next) => {
  const userId = Number(req.body.usuarioId);
  const emails = Array.isArray(req.body.emails) ? [...new Set(req.body.emails.map((email) => String(email).trim()).filter(Boolean))] : [];
  const nombre = String(req.body.nombreGrupo || "").trim();
  if (!userId || !nombre || emails.length < 2) return res.status(400).json({ error: "Un grupo necesita nombre y al menos dos participantes además de vos." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const placeholders = emails.map(() => "?").join(",");
    const [users] = await connection.execute(`SELECT id_usuario FROM Usuarios_1 WHERE activo = 1 AND mail IN (${placeholders})`, emails);
    if (users.length !== emails.length) { await connection.rollback(); return res.status(404).json({ error: "Uno o más correos no corresponden a cuentas activas." }); }
    const ids = [...new Set([userId, ...users.map((u) => Number(u.id_usuario))])];
    const [chat] = await connection.execute("INSERT INTO Chats (nombre, foto, es_grupal, activo) VALUES (?, ?, 1, 1)", [nombre, req.body.fotoGrupo || null]);
    const values = ids.map(() => "(?, ?)").join(",");
    await connection.execute(`INSERT INTO Chats_por_Usuarios (id_chat, id_usuario, administrador) VALUES ${values}`, ids.flatMap((id) => [chat.insertId, id]));
    await connection.commit();
    res.status(201).json({ ok: true, chatId: chat.insertId });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

module.exports = router;
