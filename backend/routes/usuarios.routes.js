const express = require("express");
const {
  listarUsuarios,
  crearUsuario,
  cambiarEstadoUsuario,
} = require("../modulos/usuarios");

const router = express.Router();

router.get("/", listarUsuarios);
router.post("/", crearUsuario);
router.patch("/:id/estado", cambiarEstadoUsuario);

module.exports = router;