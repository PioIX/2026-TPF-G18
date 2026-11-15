const express = require("express");
const {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  borrarNotificacion,
  borrarTodasNotificaciones,
} = require("../modulos/notificaciones");

const router = express.Router();

router.get("/:idUsuario", listarNotificaciones);
router.patch("/:idUsuario/leidas", marcarTodasLeidas);
router.patch("/:idUsuario/:idNotificacion/leida", marcarNotificacionLeida);
router.delete("/:idUsuario/:idNotificacion", borrarNotificacion);
router.delete("/:idUsuario", borrarTodasNotificaciones);

module.exports = router;
