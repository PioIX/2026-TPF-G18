-- EducaLink: estructura actual de la base, sin registros.
-- Generado desde el esquema conectado: 2026_5INF_G18

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `Alumnos` (
  `id_alumno` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_alumno`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `uq_alumnos_dni` (`dni`),
  CONSTRAINT `fk_alumnos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios_1` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Asistencias` (
  `id_asistencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_alumno` int(11) NOT NULL,
  `id_materia_dictada` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `estado` enum('PRESENTE','AUSENTE','TARDE','JUSTIFICADO') NOT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_asistencia`),
  KEY `fk_asistencias_alumno` (`id_alumno`),
  KEY `fk_asistencias_materia_dictada` (`id_materia_dictada`),
  CONSTRAINT `fk_asistencias_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `Alumnos` (`id_alumno`),
  CONSTRAINT `fk_asistencias_materia_dictada` FOREIGN KEY (`id_materia_dictada`) REFERENCES `Materias_Dictadas` (`id_materia_dictada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Calificaciones` (
  `id_calificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_alumno` int(11) NOT NULL,
  `id_materia_dictada` int(11) NOT NULL,
  `tipo` enum('EXAMEN','TRABAJO','TP','PARCIAL','OTRO') NOT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  `nota` decimal(4,2) NOT NULL,
  `fecha` date NOT NULL,
  PRIMARY KEY (`id_calificacion`),
  KEY `fk_calificaciones_alumno` (`id_alumno`),
  KEY `fk_calificaciones_materia_dictada` (`id_materia_dictada`),
  CONSTRAINT `fk_calificaciones_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `Alumnos` (`id_alumno`),
  CONSTRAINT `fk_calificaciones_materia_dictada` FOREIGN KEY (`id_materia_dictada`) REFERENCES `Materias_Dictadas` (`id_materia_dictada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Chats` (
  `id_chat` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `es_grupal` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_chat`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Chats_por_Usuarios` (
  `id_chat_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_chat` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_union` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `administrador` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_chat_usuario`),
  UNIQUE KEY `uq_chat_usuario` (`id_chat`,`id_usuario`),
  KEY `fk_chatusuarios_usuario` (`id_usuario`),
  CONSTRAINT `fk_chatusuarios_chat` FOREIGN KEY (`id_chat`) REFERENCES `Chats` (`id_chat`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_chatusuarios_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios_1` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Colegios` (
  `id_colegio` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `localidad` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_colegio`),
  UNIQUE KEY `uq_colegios_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Cursos` (
  `id_curso` int(11) NOT NULL AUTO_INCREMENT,
  `id_orientacion` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  `division` varchar(10) NOT NULL,
  `ciclo_lectivo` int(11) NOT NULL,
  PRIMARY KEY (`id_curso`),
  UNIQUE KEY `uq_curso` (`id_orientacion`,`anio`,`division`,`ciclo_lectivo`),
  CONSTRAINT `fk_cursos_orientacion` FOREIGN KEY (`id_orientacion`) REFERENCES `Orientaciones` (`id_orientacion`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Dictados_Docentes` (
  `id_materia_dictada` int(11) NOT NULL,
  `id_docente` int(11) NOT NULL,
  `rol` enum('Titular','Suplente','Ayudante') NOT NULL,
  PRIMARY KEY (`id_materia_dictada`,`id_docente`),
  KEY `fk_dd_docente` (`id_docente`),
  CONSTRAINT `fk_dd_docente` FOREIGN KEY (`id_docente`) REFERENCES `Docentes` (`id_docente`),
  CONSTRAINT `fk_dd_materia_dictada` FOREIGN KEY (`id_materia_dictada`) REFERENCES `Materias_Dictadas` (`id_materia_dictada`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Docentes` (
  `id_docente` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `especialidad` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_docente`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `dni` (`dni`),
  CONSTRAINT `fk_docentes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios_1` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Empresas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) DEFAULT NULL,
  `localidad` varchar(255) DEFAULT NULL,
  `tipo_empresa` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Entregas` (
  `id_entrega` int(11) NOT NULL AUTO_INCREMENT,
  `id_tarea` int(11) NOT NULL,
  `id_alumno` int(11) NOT NULL,
  `archivo` varchar(255) DEFAULT NULL,
  `comentario` text,
  `fecha_entrega` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('ENTREGADA','CORREGIDA','TARDE') NOT NULL,
  PRIMARY KEY (`id_entrega`),
  KEY `fk_entregas_tarea` (`id_tarea`),
  KEY `fk_entregas_alumno` (`id_alumno`),
  CONSTRAINT `fk_entregas_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `Alumnos` (`id_alumno`),
  CONSTRAINT `fk_entregas_tarea` FOREIGN KEY (`id_tarea`) REFERENCES `Tareas` (`id_tarea`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Entregas_Archivos` (
  `id_adjunto` int(11) NOT NULL AUTO_INCREMENT,
  `id_entrega` int(11) NOT NULL,
  `url` text NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `fecha_subida` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_adjunto`),
  KEY `idx_entregas_archivos_entrega` (`id_entrega`),
  CONSTRAINT `fk_entregas_archivos_entrega` FOREIGN KEY (`id_entrega`) REFERENCES `Entregas` (`id_entrega`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Materias` (
  `id_materia` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_materia`),
  UNIQUE KEY `uq_materias_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Materias_Dictadas` (
  `id_materia_dictada` int(11) NOT NULL AUTO_INCREMENT,
  `id_curso` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `horas_semanales` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_materia_dictada`),
  UNIQUE KEY `uq_materia_dictada` (`id_curso`,`id_materia`),
  KEY `fk_md_materia` (`id_materia`),
  CONSTRAINT `fk_md_curso` FOREIGN KEY (`id_curso`) REFERENCES `Cursos` (`id_curso`),
  CONSTRAINT `fk_md_materia` FOREIGN KEY (`id_materia`) REFERENCES `Materias` (`id_materia`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Matriculas` (
  `id_matricula` int(11) NOT NULL AUTO_INCREMENT,
  `id_alumno` int(11) NOT NULL,
  `id_curso` int(11) NOT NULL,
  `estado` enum('ACTIVA','BAJA','FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
  PRIMARY KEY (`id_matricula`),
  UNIQUE KEY `uq_matricula` (`id_alumno`,`id_curso`),
  KEY `fk_matriculas_curso` (`id_curso`),
  CONSTRAINT `fk_matriculas_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `Alumnos` (`id_alumno`),
  CONSTRAINT `fk_matriculas_curso` FOREIGN KEY (`id_curso`) REFERENCES `Cursos` (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Mensajes` (
  `id_mensaje` int(11) NOT NULL AUTO_INCREMENT,
  `id_chat` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `contenido` text NOT NULL,
  `fecha_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `editado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_mensaje`),
  KEY `fk_mensajes_chat` (`id_chat`),
  KEY `fk_mensajes_usuario` (`id_usuario`),
  CONSTRAINT `fk_mensajes_chat` FOREIGN KEY (`id_chat`) REFERENCES `Chats` (`id_chat`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mensajes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios_1` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Notificaciones` (
  `id_notificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo` enum('TAREA','CALIFICACION','ASISTENCIA','CHAT','AVISO') NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `fk_notificaciones_usuario` (`id_usuario`),
  CONSTRAINT `fk_notificaciones_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios_1` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Orientaciones` (
  `id_orientacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_colegio` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_orientacion`),
  UNIQUE KEY `uq_orientacion` (`id_colegio`,`nombre`),
  CONSTRAINT `fk_orientaciones_colegio` FOREIGN KEY (`id_colegio`) REFERENCES `Colegios` (`id_colegio`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Partidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `puntuacion` int(11) DEFAULT '0',
  `fecha_creacion` date NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_partidas_usuario` (`id_usuario`),
  CONSTRAINT `fk_partidas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `Usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Preguntas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `letra` char(5) NOT NULL,
  `pregunta` varchar(255) NOT NULL,
  `respuesta` varchar(255) NOT NULL,
  `dificultad` enum('facil','medio','dificil') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=343 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Preguntas_por_Partida` (
  `id_pregunta` int(11) NOT NULL,
  `id_partida` int(11) NOT NULL,
  `resultado` enum('correcta','incorrecta','sin_responder') NOT NULL,
  PRIMARY KEY (`id_pregunta`,`id_partida`),
  KEY `fk_pxp_partida` (`id_partida`),
  CONSTRAINT `fk_pxp_partida` FOREIGN KEY (`id_partida`) REFERENCES `Partidas` (`id`),
  CONSTRAINT `fk_pxp_pregunta` FOREIGN KEY (`id_pregunta`) REFERENCES `Preguntas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Productos` (
  `id_empresa` int(11) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) DEFAULT NULL,
  `Precio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `id_empresa` (`id_empresa`),
  CONSTRAINT `Productos_ibfk_1` FOREIGN KEY (`id_empresa`) REFERENCES `Empresas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Tareas` (
  `id_tarea` int(11) NOT NULL AUTO_INCREMENT,
  `id_materia_dictada` int(11) NOT NULL,
  `id_docente` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text,
  `fecha_publicacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_entrega` datetime DEFAULT NULL,
  `archivo_adjunto` varchar(255) DEFAULT NULL,
  `estado` enum('ACTIVA','CERRADA') NOT NULL,
  PRIMARY KEY (`id_tarea`),
  KEY `fk_tareas_materia_dictada` (`id_materia_dictada`),
  KEY `fk_tareas_docente` (`id_docente`),
  CONSTRAINT `fk_tareas_docente` FOREIGN KEY (`id_docente`) REFERENCES `Docentes` (`id_docente`),
  CONSTRAINT `fk_tareas_materia_dictada` FOREIGN KEY (`id_materia_dictada`) REFERENCES `Materias_Dictadas` (`id_materia_dictada`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Tareas_Archivos` (
  `id_adjunto` int(11) NOT NULL AUTO_INCREMENT,
  `id_tarea` int(11) NOT NULL,
  `url` text NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `fecha_subida` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_adjunto`),
  KEY `idx_tareas_archivos_tarea` (`id_tarea`),
  CONSTRAINT `fk_tareas_archivos_tarea` FOREIGN KEY (`id_tarea`) REFERENCES `Tareas` (`id_tarea`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Trabajadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) DEFAULT NULL,
  `apellido` varchar(255) DEFAULT NULL,
  `id_empresa` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `id_empresa` (`id_empresa`),
  CONSTRAINT `Trabajadores_ibfk_1` FOREIGN KEY (`id_empresa`) REFERENCES `Empresas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fecha_creacion` date NOT NULL,
  `es_admin` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=66666667 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Usuarios_1` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `mail` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '0',
  `rol` enum('ALUMNO','DOCENTE','ADMIN') NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `mail` (`mail`),
  UNIQUE KEY `uq_usuarios_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS=1;
