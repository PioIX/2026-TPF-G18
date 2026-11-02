const express = require("express");
const { login, usuarioPorId, verificarToken } = require("../modulos/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const identificador = String(req.body.email || req.body.username || "").trim();
  const password = String(req.body.password || "");
  if (!identificador || !password) {
    return res.status(400).json({ error: "Completá el correo y la contraseña." });
  }
  try {
    res.json(await login(identificador, password));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: "Error del servidor. Intentá nuevamente." });
  }
});

router.get("/me", verificarToken, async (req, res) => {
  try {
    const usuario = await usuarioPorId(req.usuario.id_usuario);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json({ usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error del servidor. Intentá nuevamente." });
  }
});

module.exports = router;