const express = require("express");
const { listarTareasAlumno, listarTareasDocente, crearTarea, entregarTarea } = require("../modulos/tareas");
const router = express.Router();
router.get("/alumno/:idUsuario", listarTareasAlumno);
router.get("/docente/:idUsuario", listarTareasDocente);
router.post("/", crearTarea);
router.post("/:idTarea/entregas", entregarTarea);
module.exports = router;
