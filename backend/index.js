const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const usuariosRoutes = require("./routes/usuarios.routes");
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chats.routes");
const materiasRoutes = require("./routes/materias.routes");
const academicoRoutes = require("./routes/academico.routes");
const asistenciaRoutes = require("./routes/asistencia.routes");
const calificacionesRoutes = require("./routes/calificaciones.routes");
const tareasRoutes = require("./routes/tareas.routes");
const entregasRoutes = require("./routes/entregas.routes");
const archivosRoutes = require("./routes/archivos.routes");
const { CARPETA_ARCHIVOS } = require("./modulos/archivos");
const notificacionesRoutes = require("./routes/notificaciones.routes");
const pool = require("./config/database");
const attachChatSocket = require("./sockets/chat.socket");

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST", "PATCH", "DELETE"] },
});

app.set("io", io);
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/materias", materiasRoutes);
app.use("/api/academico", academicoRoutes);
app.use("/api/asistencias", asistenciaRoutes);
app.use("/api/calificaciones", calificacionesRoutes);
app.use("/api/tareas", tareasRoutes);
app.use("/api/entregas", entregasRoutes);
app.use("/api/archivos", archivosRoutes);
app.use("/uploads", express.static(CARPETA_ARCHIVOS, { dotfiles: "deny", index: false }));
app.use("/api/notificaciones", notificacionesRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(503).json({ ok: false, database: "disconnected" });
  }
});

attachChatSocket(io, pool);

app.use((error, _req, res, _next) => {
  console.error("Error no controlado:", error.code || error.message);
  const status = Number(error.status) || 500;
  res.status(status).json({ error: status === 413 ? "El archivo supera el límite de 10 MB." : status < 500 ? error.message : "Error interno del servidor." });
});

const port = Number(process.env.PORT) || 4000;
server.listen(port, () => {
  console.log(`EducaLink API escuchando en el puerto ${port} (${process.env.NODE_ENV || "local"}).`);
  pool.query("SELECT 1")
    .then(() => console.log("Conexión a MySQL disponible."))
    .catch((error) => console.error("MySQL no está disponible:", error.code || error.message));
});
