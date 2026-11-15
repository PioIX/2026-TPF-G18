-- Ejecutar una sola vez en la base EducaLink.
-- Permite guardar notas numéricas y valoraciones en texto (por ejemplo AV, S, EP+ o EP).
ALTER TABLE Calificaciones
  MODIFY COLUMN nota VARCHAR(50) NOT NULL;
