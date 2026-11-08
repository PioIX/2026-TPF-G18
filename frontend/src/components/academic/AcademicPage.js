"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AcademicPage.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const RUTAS_POR_ROL = { ALUMNO: "/alumno", DOCENTE: "/docente", ADMIN: "/admin" };

export function useAcademicUser(rolEsperado) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  useEffect(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      if (!guardado) {
        router.replace("/login");
      } else if (guardado.rol !== rolEsperado) {
        router.replace(RUTAS_POR_ROL[guardado.rol] || "/login");
      } else {
        setUsuario(guardado);
      }
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [rolEsperado, router]);
  return usuario;
}

export function AcademicLayout({ title, description, usuario, children, links }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a className={styles.brand} href={RUTAS_POR_ROL[usuario?.rol] || "/login"}>EducaLink</a>
          <p className={styles.eyebrow}>Espacio académico</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
        </div>
        <div className={styles.userBox}>
          <span>{usuario?.username || usuario?.mail}</span>
          <button type="button" onClick={() => { sessionStorage.removeItem("educalink_usuario"); window.location.href = "/login"; }}>Cerrar sesión</button>
        </div>
      </header>
      <nav className={styles.nav} aria-label="Secciones">
        {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </nav>
      {children}
    </main>
  );
}

export function AcademicListPage({ rol, title, description, endpoint, dataKey, fields, emptyMessage }) {
  const usuario = useAcademicUser(rol);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setCargando(true);
    fetch(`${API}/${endpoint}/${usuario.id_usuario}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los datos.");
        return data;
      })
      .then((data) => { if (vigente) setFilas(data[dataKey] || []); })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario, endpoint, dataKey]);

  return (
    <AcademicLayout title={title} description={description} usuario={usuario} links={rol === "ALUMNO" ? [
      { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" }, { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" }, { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
    ] : [
      { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" }, { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" }, { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
    ]}>
      {cargando ? <p className={styles.notice}>Cargando…</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!cargando && !error && filas.length === 0 ? <p className={styles.notice}>{emptyMessage}</p> : null}
      {filas.length > 0 ? (
        <section className={styles.grid}>
          {filas.map((fila, index) => (
            <article className={styles.card} key={fila.id_materia_dictada || fila.id_asistencia || fila.id_calificacion || fila.id_tarea || index}>
              {fields.map((field) => {
                let value = fila[field.key];
                if (field.format === "curso") value = `${fila.anio}° ${fila.division} · ${fila.orientacion}`;
                return value !== null && value !== undefined && value !== "" ? (
                  <div className={styles.field} key={field.label}><span>{field.label}</span><strong>{value}</strong></div>
                ) : null;
              })}
            </article>
          ))}
        </section>
      ) : null}
    </AcademicLayout>
  );
}

export { API, styles };
