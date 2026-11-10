const express = require("express");
const { listarMateriasAlumno, obtenerDetalleMateriaAlumno, listarMateriasDocente, listarAlumnosMateriaDocente } = require("../modulos/materias");
const router = express.Router();
router.get("/docente/:idUsuario/:idMateriaDictada/alumnos", listarAlumnosMateriaDocente);
router.get("/alumno/:idUsuario/:idMateriaDictada", obtenerDetalleMateriaAlumno);
router.get("/alumno/:idUsuario", listarMateriasAlumno);
router.get("/docente/:idUsuario", listarMateriasDocente);
module.exports = router;
