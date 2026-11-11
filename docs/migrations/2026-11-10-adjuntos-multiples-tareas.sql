-- Ejecutar una sola vez en la base de datos de EducaLink.
-- Los campos archivo_adjunto y archivo se conservan para los enlaces anteriores.
CREATE TABLE Tareas_Archivos (
  id_adjunto INT NOT NULL AUTO_INCREMENT,
  id_tarea INT NOT NULL,
  url TEXT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_adjunto),
  KEY idx_tareas_archivos_tarea (id_tarea),
  CONSTRAINT fk_tareas_archivos_tarea FOREIGN KEY (id_tarea)
    REFERENCES Tareas (id_tarea) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Entregas_Archivos (
  id_adjunto INT NOT NULL AUTO_INCREMENT,
  id_entrega INT NOT NULL,
  url TEXT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_adjunto),
  KEY idx_entregas_archivos_entrega (id_entrega),
  CONSTRAINT fk_entregas_archivos_entrega FOREIGN KEY (id_entrega)
    REFERENCES Entregas (id_entrega) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
