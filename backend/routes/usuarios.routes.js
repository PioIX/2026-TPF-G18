const express = require("express");
const {
  obtenerPerfil,
  actualizarPerfil,
  actualizarUsuario,
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
} = require("../modulos/usuarios");

const router = express.Router();

router.get("/", listarUsuarios);
router.post("/", crearUsuario);
router.get("/:idUsuario/perfil", obtenerPerfil);
router.patch("/:idUsuario/perfil", actualizarPerfil);
router.patch("/:id", actualizarUsuario);
router.patch("/:id/estado", cambiarEstadoUsuario);

module.exports = router;
