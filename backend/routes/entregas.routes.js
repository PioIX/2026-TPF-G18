const express = require("express");
const { listarEntregasDocente, guardarDevolucion } = require("../modulos/entregas");

const router = express.Router();

router.get("/docente/:idUsuario/tarea/:idTarea", listarEntregasDocente);
router.patch("/:idEntrega/devolucion", guardarDevolucion);

module.exports = router;
