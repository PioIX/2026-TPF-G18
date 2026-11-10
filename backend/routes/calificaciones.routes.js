const express = require("express");
const { listarCalificacionesAlumno, listarCalificacionesDocente, crearCalificacion, actualizarCalificacion } = require("../modulos/calificaciones");
const router = express.Router();
router.get("/alumno/:idUsuario", listarCalificacionesAlumno);
router.get("/docente/:idUsuario", listarCalificacionesDocente);
router.post("/", crearCalificacion);
router.patch("/:idCalificacion", actualizarCalificacion);
module.exports = router;
