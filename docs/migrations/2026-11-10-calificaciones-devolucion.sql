-- Ejecutar una sola vez en la base EducaLink.
-- Permite que el docente escriba devoluciones detalladas en la descripción de la nota.
ALTER TABLE Calificaciones
  MODIFY COLUMN descripcion TEXT NULL;
