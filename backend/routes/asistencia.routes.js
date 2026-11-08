const express = require("express");
const { listarAsistenciasAlumno, listarAlumnosDeMateria, guardarAsistencia } = require("../modulos/asistencias");
const router = express.Router();
router.get("/alumno/:idUsuario", listarAsistenciasAlumno);
router.get("/docente/:idUsuario/materia/:idMateriaDictada/alumnos", listarAlumnosDeMateria);
router.post("/", guardarAsistencia);
module.exports = router;
