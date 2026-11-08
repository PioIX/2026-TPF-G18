const express = require("express");
const {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} = require("../modulos/notificaciones");

const router = express.Router();

router.get("/:idUsuario", listarNotificaciones);
router.patch("/:idUsuario/leidas", marcarTodasLeidas);
router.patch("/:idUsuario/:idNotificacion/leida", marcarNotificacionLeida);

module.exports = router;
