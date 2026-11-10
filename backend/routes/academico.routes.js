const express = require("express");
const {
  listarConfiguracionAcademica,
  guardarOrientacion,
  crearCurso,
  actualizarCurso,
  guardarMateria,
  crearMateriaDictada,
  asignarDocente,
  matricularAlumno,
  cambiarEstadoMatricula,
} = require("../modulos/academico");

const router = express.Router();

router.post("/orientaciones", guardarOrientacion);
router.patch("/orientaciones/:idOrientacion", guardarOrientacion);
router.post("/cursos", crearCurso);
router.patch("/cursos/:idCurso", actualizarCurso);
router.post("/materias", guardarMateria);
router.patch("/materias/:idMateria", guardarMateria);
router.post("/dictados", crearMateriaDictada);
router.post("/dictados/:idMateriaDictada/docentes", asignarDocente);
router.post("/matriculas", matricularAlumno);
router.patch("/matriculas/:idMatricula/estado", cambiarEstadoMatricula);
router.get("/:idAdmin", listarConfiguracionAcademica);

module.exports = router;
