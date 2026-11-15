const express = require("express");
const {
  listarConfiguracionAcademica,
  guardarOrientacion,
  crearCurso,
  actualizarCurso,
  eliminarCurso,
  guardarMateria,
  eliminarMateria,
  crearMateriaDictada,
  actualizarMateriaDictada,
  asignarDocente,
  editarAsignacionDocente,
  quitarDocenteAsignado,
  eliminarMateriaDictada,
  matricularAlumno,
  cambiarEstadoMatricula,
} = require("../modulos/academico");

const router = express.Router();

router.post("/orientaciones", guardarOrientacion);
router.patch("/orientaciones/:idOrientacion", guardarOrientacion);
router.post("/cursos", crearCurso);
router.patch("/cursos/:idCurso", actualizarCurso);
router.delete("/cursos/:id", eliminarCurso);
router.post("/materias", guardarMateria);
router.patch("/materias/:idMateria", guardarMateria);
router.delete("/materias/:id", eliminarMateria);
router.post("/dictados", crearMateriaDictada);
router.patch("/dictados/:idMateriaDictada", actualizarMateriaDictada);
router.delete("/dictados/:id", eliminarMateriaDictada);
router.post("/dictados/:idMateriaDictada/docentes", asignarDocente);
router.patch("/dictados/:idMateriaDictada/docentes/:idDocente", editarAsignacionDocente);
router.delete("/dictados/:idMateriaDictada/docentes/:idDocente", quitarDocenteAsignado);
router.post("/matriculas", matricularAlumno);
router.patch("/matriculas/:idMatricula/estado", cambiarEstadoMatricula);
router.get("/:idAdmin", listarConfiguracionAcademica);

module.exports = router;
