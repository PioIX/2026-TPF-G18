"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #d5dbea",
  borderRadius: 8,
  font: "inherit",
};

export default function AdminPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [rol, setRol] = useState("ALUMNO");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const guardado = sessionStorage.getItem("educalink_usuario");

    if (!guardado) {
      router.replace("/login");
      return;
    }

    try {
      const usuario = JSON.parse(guardado);
      if (usuario.rol !== "ADMIN") {
        router.replace("/");
        return;
      }
      cargarUsuarios();
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [router]);

  async function cargarUsuarios(filtro = busqueda) {
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(
        `${API}/usuarios?q=${encodeURIComponent(filtro)}`
      );
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "No se pudieron cargar los usuarios.");

      setUsuarios(datos.usuarios || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function crearUsuario(event) {
    event.preventDefault();
    setError("");
    setMensaje("");

    const formulario = new FormData(event.currentTarget);
    const cuerpo = Object.fromEntries(formulario.entries());
    cuerpo.rol = rol;

    try {
      const respuesta = await fetch(`${API}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "No se pudo crear el usuario.");

      event.currentTarget.reset();
      setRol("ALUMNO");
      setMensaje("Usuario creado correctamente.");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(usuario) {
    setError("");
    setMensaje("");

    try {
      const respuesta = await fetch(`${API}/usuarios/${usuario.id_usuario}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: usuario.activo ? 0 : 1 }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "No se pudo actualizar el usuario.");

      setMensaje(datos.mensaje);
      await cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32, color: "#17213d" }}>
      <h1>Gestión de usuarios</h1>
      <p>Creá cuentas y administrá el acceso de alumnos, docentes y administradores.</p>

      {error && <p role="alert" style={{ color: "#a62e35" }}>{error}</p>}
      {mensaje && <p role="status" style={{ color: "#237447" }}>{mensaje}</p>}

      <section style={{ background: "#fff", padding: 24, borderRadius: 12, margin: "24px 0" }}>
        <h2>Crear usuario</h2>

        <form onSubmit={crearUsuario} style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label>
            Nombre de usuario
            <input name="username" required maxLength={100} style={inputStyle} />
          </label>

          <label>
            Correo
            <input name="mail" type="email" required maxLength={100} style={inputStyle} />
          </label>

          <label>
            Contraseña
            <input name="password" type="password" required maxLength={255} style={inputStyle} />
          </label>

          <label>
            Rol
            <select value={rol} onChange={(event) => setRol(event.target.value)} style={inputStyle}>
              <option value="ALUMNO">Alumno</option>
              <option value="DOCENTE">Docente</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>

          {rol !== "ADMIN" && (
            <>
              <label>
                Nombre
                <input name="nombre" required maxLength={50} style={inputStyle} />
              </label>
              <label>
                Apellido
                <input name="apellido" required maxLength={50} style={inputStyle} />
              </label>
              <label>
                DNI
                <input name="dni" maxLength={20} style={inputStyle} />
              </label>
            </>
          )}

          {rol === "ALUMNO" && (
            <label>
              Fecha de nacimiento
              <input name="fecha_nacimiento" type="date" style={inputStyle} />
            </label>
          )}

          {rol === "DOCENTE" && (
            <label>
              Especialidad
              <input name="especialidad" maxLength={100} style={inputStyle} />
            </label>
          )}

          <button type="submit" style={{ padding: 12, border: 0, borderRadius: 8, background: "#354ed0", color: "#fff", cursor: "pointer" }}>
            Crear usuario
          </button>
        </form>
      </section>

      <section style={{ background: "#fff", padding: 24, borderRadius: 12 }}>
        <h2>Usuarios registrados</h2>

        <form onSubmit={(event) => { event.preventDefault(); cargarUsuarios(busqueda); }}
          style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, usuario o correo" style={inputStyle} />
          <button type="submit">Buscar</button>
        </form>

        {cargando ? <p>Cargando usuarios…</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th>Nombre</th><th>Usuario</th><th>Correo</th>
                  <th>Rol</th><th>Estado</th><th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id_usuario}>
                    <td>{usuario.nombre} {usuario.apellido}</td>
                    <td>{usuario.username}</td>
                    <td>{usuario.mail}</td>
                    <td>{usuario.rol}</td>
                    <td>{usuario.activo ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button type="button" onClick={() => cambiarEstado(usuario)}>
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!usuarios.length && <tr><td colSpan="6">No hay usuarios para mostrar.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}