-- Permite que las cuentas ADMIN guarden su nombre y apellido para el perfil.
ALTER TABLE Usuarios_1
  ADD COLUMN nombre varchar(50) DEFAULT NULL,
  ADD COLUMN apellido varchar(50) DEFAULT NULL;
