const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const pool = require("./config/database");

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (_error) {
    res.status(503).json({ ok: false, database: "disconnected" });
  }
});

app.use((error, _req, res, _next) => {
  console.error("Error no controlado:", error.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`EducaLink API escuchando en http://localhost:${port}`));
