-- Ejecutar una sola vez en la base de datos de EducaLink.
-- Conserva intacto el comentario escrito por el alumno y guarda aparte
-- la devolución del docente.
ALTER TABLE Entregas
  ADD COLUMN devolucion_docente TEXT NULL AFTER comentario;
