"use client";

import { useEffect, useState } from "react";
import { AcademicLayout, API } from "@/components/academic/AcademicPage";
import styles from "./perfil.module.css";

const LINKS = {
  ALUMNO: [{ href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" }, { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" }, { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" }],
  DOCENTE: [{ href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" }, { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" }, { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" }],
  ADMIN: [{ href: "/admin", label: "Inicio" }],
};

function fechaLegible(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "—" : fecha.toLocaleDateString("es-AR");
}

export default function PerfilPage() {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let vigente = true;
    async function cargar() {
      let guardado;
      try {
        guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      } catch {
        sessionStorage.removeItem("educalink_usuario");
      }
      if (!guardado?.id_usuario) {
        window.location.replace("/login");
        return;
      }
      setUsuario(guardado);
      try {
        const response = await fetch(`${API}/usuarios/${guardado.id_usuario}/perfil`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el perfil.");
        if (vigente) {
          setPerfil(data.perfil);
          setFormulario({
            username: data.perfil.username || "", mail: data.perfil.mail || "",
            nombre: data.perfil.nombre === data.perfil.username && data.perfil.rol === "ADMIN" ? "" : data.perfil.nombre || "",
            apellido: data.perfil.apellido || "", dni: data.perfil.dni || "",
            fecha_nacimiento: data.perfil.fecha_nacimiento ? String(data.perfil.fecha_nacimiento).slice(0, 10) : "",
            especialidad: data.perfil.especialidad || "",
          });
        }
      } catch (err) {
        if (vigente) setError(err.message);
      } finally {
        if (vigente) setCargando(false);
      }
    }
    cargar();
    return () => { vigente = false; };
  }, []);

  function actualizarCampo(event) {
    setFormulario((actual) => ({ ...actual, [event.target.name]: event.target.value }));
  }

  async function guardar(event) {
    event.preventDefault();
    if (!usuario) return;
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      const response = await fetch(`${API}/usuarios/${usuario.id_usuario}/perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formulario),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron guardar los cambios.");
      setPerfil(data.perfil);
      const actualizada = { ...usuario, username: data.perfil.username, mail: data.perfil.mail };
      sessionStorage.setItem("educalink_usuario", JSON.stringify(actualizada));
      setUsuario(actualizada);
      setMensaje(data.mensaje || "Perfil actualizado.");
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const rol = perfil?.rol || usuario?.rol;
  const nombreRol = rol === "ADMIN" ? "Administrador" : rol === "DOCENTE" ? "Docente" : "Alumno";
  const inicial = (perfil?.username || usuario?.username || "U").slice(0, 1).toUpperCase();

  return <AcademicLayout title="Mi perfil" description="Consultá y actualizá los datos de tu cuenta." usuario={usuario} links={LINKS[rol] || LINKS.ALUMNO}>
    <div className={styles.profilePage}>
      <section className={styles.identityCard}>
        <div className={styles.identityMain}><div className={styles.avatar}>{inicial}</div><div><span className={styles.eyebrow}>CUENTA EDUCALINK</span><h2>{perfil ? [perfil.nombre, perfil.apellido].filter((parte) => parte && parte !== perfil.username).join(" ") || perfil.username : usuario?.username || "Perfil"}</h2><p>{perfil?.mail || usuario?.mail}</p></div></div>
        <span className={styles.roleBadge}>{nombreRol}</span>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {mensaje && <p className={styles.success} role="status">{mensaje}</p>}
      {cargando ? <div className={styles.loading}>Cargando tus datos…</div> : perfil && <form className={styles.formCard} onSubmit={guardar}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>INFORMACIÓN PERSONAL</span><h2>Datos de la cuenta</h2><p>Estos datos se usan para identificarte en la plataforma.</p></div><span className={`${styles.accountState} ${Number(perfil.activo) ? styles.active : styles.inactive}`}><i />{Number(perfil.activo) ? "Cuenta activa" : "Cuenta inactiva"}</span></div>

        <div className={styles.fields}>
          <label>Nombre de usuario<input name="username" value={formulario.username || ""} onChange={actualizarCampo} required maxLength={100} autoComplete="username" /></label>
          <label>Correo electrónico<input name="mail" type="email" value={formulario.mail || ""} onChange={actualizarCampo} required maxLength={100} autoComplete="email" /></label>
          {rol !== "ADMIN" && <>
            <label>Nombre<input name="nombre" value={formulario.nombre || ""} onChange={actualizarCampo} required maxLength={50} autoComplete="given-name" /></label>
            <label>Apellido<input name="apellido" value={formulario.apellido || ""} onChange={actualizarCampo} required maxLength={50} autoComplete="family-name" /></label>
            <label>DNI<input name="dni" value={formulario.dni || ""} onChange={actualizarCampo} maxLength={20} /></label>
            {rol === "ALUMNO" && <label>Fecha de nacimiento<input name="fecha_nacimiento" type="date" value={formulario.fecha_nacimiento || ""} onChange={actualizarCampo} /></label>}
            {rol === "DOCENTE" && <label>Especialidad<input name="especialidad" value={formulario.especialidad || ""} onChange={actualizarCampo} maxLength={100} /></label>}
          </>}
          <label>Rol en EducaLink<input value={nombreRol} readOnly /></label>
          <label>Cuenta creada<input value={fechaLegible(perfil.fecha_registro)} readOnly /></label>
        </div>
        <div className={styles.formFooter}><p>La contraseña no se modifica desde esta pantalla.</p><button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>}
    </div>
  </AcademicLayout>;
}
