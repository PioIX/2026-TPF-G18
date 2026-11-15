const pool = require("../config/database");

async function iniciarSesion(req, res, next) {
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password) {
    return res.status(400).json({ error: "Ingresá el correo electrónico y la contraseña." });
  }
  try {
    const [usuarios] = await pool.execute(
      `SELECT id_usuario, username, mail, foto, fecha_registro, rol, nombre, apellido
       FROM Usuarios_1 WHERE mail = ? AND password = ? AND activo = 1 LIMIT 1`,
      [email, password]
    );
    if (!usuarios.length) {
      return res.status(401).json({ error: "Credenciales incorrectas o cuenta inactiva." });
    }
    return res.json({ ok: true, usuario: usuarios[0] });
  } catch (error) {
    return next(error);
  }
}

async function listarCorreosAdministradores(_req, res, next) {
  try {
    const [administradores] = await pool.execute(
      `SELECT mail FROM Usuarios_1
       WHERE rol = 'ADMIN'
         AND LOWER(username) <> 'adminprueba'
         AND LOWER(mail) <> 'pruebaadmin4@gmail.com'
         AND mail IS NOT NULL AND TRIM(mail) <> ''
       ORDER BY username`
    );
    res.json({ correos: administradores.map(({ mail }) => mail) });
  } catch (error) {
    next(error);
  }
}

module.exports = { iniciarSesion, listarCorreosAdministradores };
