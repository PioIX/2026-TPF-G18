const pool = require("../config/database");
const { crearNotificaciones } = require("./notificaciones");
const { adjuntosPorEntrega } = require("./adjuntos");

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function listarEntregasDocente(req, res, next) {
  const idUsuario = idValido(req.params.idUsuario);
  const idTarea = idValido(req.params.idTarea);
  if (!idUsuario || !idTarea) return res.status(400).json({ error: "Docente o tarea inválidos." });

  try {
    const [asignadas] = await pool.execute(
      `SELECT t.id_tarea
       FROM Tareas t
       JOIN Docentes d ON d.id_docente = t.id_docente
       WHERE t.id_tarea = ? AND d.id_usuario = ? LIMIT 1`,
      [idTarea, idUsuario]
    );
    if (!asignadas.length) return res.status(403).json({ error: "No podés consultar las entregas de esta tarea." });

    const [entregas] = await pool.execute(
      `SELECT e.id_entrega, e.archivo, e.comentario, e.devolucion_docente,
              e.fecha_entrega, e.estado, al.id_alumno, al.nombre, al.apellido
       FROM Entregas e
       JOIN Alumnos al ON al.id_alumno = e.id_alumno
       WHERE e.id_tarea = ?
       ORDER BY e.fecha_entrega DESC, al.apellido, al.nombre`,
      [idTarea]
    );
    const adjuntos = await adjuntosPorEntrega(entregas.map((entrega) => entrega.id_entrega));
    res.json({ entregas: entregas.map((entrega) => ({ ...entrega, archivos: adjuntos.get(Number(entrega.id_entrega)) || [] })) });
  } catch (error) { next(error); }
}

async function guardarDevolucion(req, res, next) {
  const idUsuario = idValido(req.body.id_usuario);
  const idEntrega = idValido(req.params.idEntrega);
  const devolucion = typeof req.body.devolucion === "string" ? req.body.devolucion.trim() : "";
  if (!idUsuario || !idEntrega || !devolucion || devolucion.length > 65535) {
    return res.status(400).json({ error: "Escribí una devolución breve para la entrega." });
  }

  try {
    const [entregas] = await pool.execute(
      `SELECT e.id_entrega, e.id_tarea, t.titulo, al.id_usuario
       FROM Entregas e
       JOIN Tareas t ON t.id_tarea = e.id_tarea
       JOIN Docentes d ON d.id_docente = t.id_docente
       JOIN Alumnos al ON al.id_alumno = e.id_alumno
       WHERE e.id_entrega = ? AND d.id_usuario = ? LIMIT 1`,
      [idEntrega, idUsuario]
    );
    if (!entregas.length) return res.status(403).json({ error: "No podés corregir esta entrega." });

    await pool.execute(
      "UPDATE Entregas SET devolucion_docente = ?, estado = 'CORREGIDA' WHERE id_entrega = ?",
      [devolucion, idEntrega]
    );
    await crearNotificaciones([entregas[0].id_usuario], {
      titulo: "Devolución de una tarea",
      mensaje: `Tu entrega de “${entregas[0].titulo}” fue corregida.`,
      tipo: "TAREA",
    }, req.app.get("io"));
    res.json({ ok: true, mensaje: "Devolución guardada y entrega corregida." });
  } catch (error) { next(error); }
}

module.exports = { listarEntregasDocente, guardarDevolucion };
