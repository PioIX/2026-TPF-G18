const express = require("express");
const { iniciarSesion, listarCorreosAdministradores } = require("../modulos/auth");
const router = express.Router();
router.post("/login", iniciarSesion);
router.get("/administradores", listarCorreosAdministradores);
module.exports = router;
