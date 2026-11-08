const { crearNotificaciones } = require("../modulos/notificaciones");

module.exports = function attachChatSocket(io, pool) {
  io.use((socket, next) => {
    const userId = Number(socket.handshake.auth?.userId);
    if (!Number.isInteger(userId) || userId < 1) return next(new Error("Autenticación requerida."));
    pool.execute("SELECT 1 FROM Usuarios_1 WHERE id_usuario = ? AND activo = 1", [userId])
      .then(([rows]) => {
        if (!rows.length) return next(new Error("La cuenta no está activa."));
        socket.userId = userId;
        next();
      })
      .catch(next);
  });

  io.on("connection", (socket) => {
    socket.join(`usuario_${socket.userId}`);
    socket.on("join_chat", async (chatIdValue) => {
      const chatId = Number(chatIdValue);
      if (!chatId) return;
      const [rows] = await pool.execute("SELECT 1 FROM Chats_por_Usuarios WHERE id_chat = ? AND id_usuario = ?", [chatId, socket.userId]);
      if (rows.length) socket.join(`chat_${chatId}`);
    });
    socket.on("leave_chat", (chatId) => socket.leave(`chat_${Number(chatId)}`));
    socket.on("enviar_mensaje", async ({ chat_id: chatIdValue, contenido } = {}) => {
      const chatId = Number(chatIdValue);
      const text = typeof contenido === "string" ? contenido.trim() : "";
      if (!chatId || !text || text.length > 4000) return;
      try {
        const [membership] = await pool.execute("SELECT 1 FROM Chats_por_Usuarios WHERE id_chat = ? AND id_usuario = ?", [chatId, socket.userId]);
        if (!membership.length) return;
        const [insert] = await pool.execute("INSERT INTO Mensajes (id_chat, id_usuario, contenido) VALUES (?, ?, ?)", [chatId, socket.userId, text]);
        const [rows] = await pool.execute(
          `SELECT m.id_mensaje AS id, m.id_chat AS chat_id, m.id_usuario AS usuario_id, m.contenido, m.fecha_envio,
           m.editado, u.username AS remitente_nombre, u.foto AS remitente_foto
           FROM Mensajes m JOIN Usuarios_1 u ON u.id_usuario = m.id_usuario WHERE m.id_mensaje = ?`, [insert.insertId]
        );
        if (rows.length) {
          io.to(`chat_${chatId}`).emit("nuevo_mensaje", rows[0]);
          const [participantes] = await pool.execute(
            "SELECT id_usuario FROM Chats_por_Usuarios WHERE id_chat = ? AND id_usuario <> ?", [chatId, socket.userId]
          );
          await crearNotificaciones(participantes.map((participante) => participante.id_usuario), {
            titulo: "Nuevo mensaje",
            mensaje: `${rows[0].remitente_nombre}: ${text.slice(0, 180)}`,
            tipo: "CHAT",
          }, io);
        }
      } catch (error) { console.error("No se pudo guardar el mensaje:", error.message); }
    });
  });
};
