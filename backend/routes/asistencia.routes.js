const express = require("express");
const { listarAsistenciasAlumno, listarAlumnosDeMateria, listarReporteAsistenciasDocente, guardarAsistenciasLote, guardarAsistencia } = require("../modulos/asistencias");
const router = express.Router();
router.get("/alumno/:idUsuario", listarAsistenciasAlumno);
router.get("/docente/:idUsuario/materia/:idMateriaDictada/alumnos", listarAlumnosDeMateria);
router.get("/docente/:idUsuario/materia/:idMateriaDictada/reporte", listarReporteAsistenciasDocente);
router.post("/lote", guardarAsistenciasLote);
router.post("/", guardarAsistencia);
module.exports = router;
