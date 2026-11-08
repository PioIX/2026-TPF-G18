const express = require("express");
const { listarCalificacionesAlumno, listarCalificacionesDocente, crearCalificacion } = require("../modulos/calificaciones");
const router = express.Router();
router.get("/alumno/:idUsuario", listarCalificacionesAlumno);
router.get("/docente/:idUsuario", listarCalificacionesDocente);
router.post("/", crearCalificacion);
module.exports = router;
