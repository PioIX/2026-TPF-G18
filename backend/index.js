const config = require("./config/database");
const express = require("express");
const cors = require("cors");
const { pool } = require("./modulos/mysql");

if (!config.jwt.secret) {
  console.error("Falta JWT_SECRET en el archivo .env del entorno. Agregalo y volvé a iniciar.");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, entorno: config.entorno });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "No se pudo conectar con MySQL." });
  }
});

app.use(require("./routes/auth.routes"));

app.listen(config.port, async () => {
  console.log(`EducaLink backend en http://localhost:${config.port} (entorno: ${config.entorno})`);
  try {
    await pool.query("SELECT 1");
    console.log(`Conectado a MySQL: ${config.mysql.database}`);
  } catch (error) {
    console.error("No se pudo conectar con MySQL:", error.code || error.message);
  }
});