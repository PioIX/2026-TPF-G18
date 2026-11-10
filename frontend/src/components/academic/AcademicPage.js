"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/theme/ThemeToggle";
import useSocket from "@/hooks/useSocket";
import styles from "./AcademicPage.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const RUTAS_POR_ROL = { ALUMNO: "/alumno", DOCENTE: "/docente", ADMIN: "/admin" };
const ICONOS = { Inicio: "⌂", Materias: "▤", "Gestión académica": "▦", Asistencias: "✓", Calificaciones: "▦", Tareas: "☷", Chat: "◌", Notificaciones: "♧", Perfil: "○" };
export function colorMateria(idMateria) {
  const id = Number(idMateria);
  const hue = Number.isFinite(id) && id > 0 ? (((id - 1) * 137.508) % 360).toFixed(2) : "210";
  return { "--subject-hue": hue };
}

export function useAcademicUser(rolEsperado) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  useEffect(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      if (!guardado) router.replace("/login");
      else if (guardado.rol !== rolEsperado) router.replace(RUTAS_POR_ROL[guardado.rol] || "/login");
      else setUsuario(guardado);
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [rolEsperado, router]);
  return usuario;
}

export function AcademicLayout({ title, description, usuario, children, links }) {
  const pathname = usePathname();
  const inicio = RUTAS_POR_ROL[usuario?.rol] || "/login";
  const [noLeidas, setNoLeidas] = useState(0);
  const { socket } = useSocket(usuario?.id_usuario);
  const navLinks = [
    ...links,
    ...(!links.some((link) => link.href === "/notificaciones") ? [{ href: "/notificaciones", label: "Notificaciones" }] : []),
    ...(!links.some((link) => link.href === "/perfil") ? [{ href: "/perfil", label: "Perfil" }] : []),
  ];

  useEffect(() => {
    if (!usuario?.id_usuario) return undefined;
    let vigente = true;
    const cargarNoLeidas = async () => {
      try {
        const response = await fetch(`${API}/notificaciones/${usuario.id_usuario}?soloNoLeidas=1`);
        const data = await response.json();
        if (vigente && response.ok) setNoLeidas(Number(data.noLeidas) || 0);
      } catch { /* El acceso a las notificaciones puede reintentarse al cambiar de sección. */ }
    };
    cargarNoLeidas();
    window.addEventListener("educalink:refrescar-notificaciones", cargarNoLeidas);
    return () => {
      vigente = false;
      window.removeEventListener("educalink:refrescar-notificaciones", cargarNoLeidas);
    };
  }, [usuario?.id_usuario, pathname]);

  useEffect(() => {
    if (!socket) return undefined;
    const actualizar = () => window.dispatchEvent(new Event("educalink:refrescar-notificaciones"));
    socket.on("nueva_notificacion", actualizar);
    return () => socket.off("nueva_notificacion", actualizar);
  }, [socket]);

  function cerrarSesion() {
    sessionStorage.removeItem("educalink_usuario");
    window.location.href = "/login";
  }
  return (
    <div className={styles.shell}>
      <motion.aside className={styles.sidebar} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.38, ease: "easeOut" }}>
        <Link className={styles.brand} href={inicio}>
          <span className={styles.brandMark}><img className={styles.brandLogoLight} src="/images/educalink-logo-light.png" alt="EducaLink" /><img className={styles.brandLogoDark} src="/images/educalink-logo-dark.png" alt="" /></span>
        </Link>
        <div className={styles.navCaption}>MENÚ PRINCIPAL</div>
        <nav className={styles.nav} aria-label="Secciones">
          {navLinks.map((link, index) => {
            const activo = pathname === link.href;
            return <motion.div className={styles.navEntry} key={link.href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.24, delay: index * 0.035, ease: "easeOut" }}>
              <Link className={`${styles.navLink} ${activo ? styles.navLinkActive : ""}`} href={link.href} aria-current={activo ? "page" : undefined}>
                <span className={styles.navIcon} aria-hidden="true">{ICONOS[link.label] || "·"}</span><span>{link.label}</span>
                {link.href === "/notificaciones" && noLeidas > 0 && <span className={styles.notificationBadge}>{noLeidas > 99 ? "99+" : noLeidas}</span>}
              </Link>
            </motion.div>;
          })}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.avatar}>{(usuario?.username || usuario?.mail || "U").slice(0, 1).toUpperCase()}</div>
          <div className={styles.userMeta}><strong>{usuario?.username || "Usuario"}</strong><span>{usuario?.rol || ""}</span></div>
          <button className={styles.logout} onClick={cerrarSesion} type="button" aria-label="Cerrar sesión" title="Cerrar sesión">↪</button>
        </div>
      </motion.aside>
      <div className={styles.main}>
        <motion.header className={styles.topbar} initial={{ opacity: 0, y: -9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: "easeOut" }}>
          <div className={styles.breadcrumb}>EducaLink <span>/</span> {title}</div>
          <div className={styles.topbarRight}><span className={styles.topbarStatus}><i /> Ciclo lectivo 2026</span><ThemeToggle /><Link className={styles.avatarSmall} href="/perfil" aria-label="Ir a mi perfil" title="Mi perfil">{(usuario?.username || "U").slice(0, 1).toUpperCase()}</Link></div>
        </motion.header>
        <motion.main className={styles.content} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, delay: 0.06, ease: "easeOut" }}>
          <motion.div className={styles.pageHeading} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, delay: 0.1, ease: "easeOut" }}>
            <div><p className={styles.eyebrow}>{usuario?.rol === "DOCENTE" ? "Portal docente" : usuario?.rol === "ADMIN" ? "Portal de administración" : "Portal del alumno"}</p><h1>{title}</h1><p className={styles.description}>{description}</p></div>
          </motion.div>
          <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.14, ease: "easeOut" }}>{children}</motion.div>
        </motion.main>
      </div>
    </div>
  );
}

export function AcademicListPage({ rol, title, description, endpoint, dataKey, fields, emptyMessage, display = "cards", summaryType = "", detailHref = "" }) {
  const usuario = useAcademicUser(rol);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setCargando(true);
    fetch(`${API}/${endpoint}/${usuario.id_usuario}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudieron cargar los datos."); return data; })
      .then((data) => { if (vigente) setFilas(data[dataKey] || []); })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario, endpoint, dataKey]);

  const promedio = filas.length ? (filas.reduce((total, fila) => total + Number(fila.nota || 0), 0) / filas.length).toFixed(2) : "—";
  const porcentaje = filas.length ? `${Math.round((filas.filter((fila) => fila.estado === "PRESENTE").length / filas.length) * 100)}%` : "—";
  const resumen = summaryType === "calificaciones" ? [{ label: "Evaluaciones registradas", value: filas.length }, { label: "Promedio general", value: promedio }] : summaryType === "asistencias" ? [{ label: "Registros de asistencia", value: filas.length }, { label: "Presentismo", value: porcentaje }] : [];
  const valor = (field, fila) => field.format === "curso" ? `${fila.anio}° ${fila.division} · ${fila.orientacion}` : fila[field.key];
  const badge = (field, value) => field.key === "estado" || field.key === "estado_entrega" ? <span className={`${styles.badge} ${styles[`badge${String(value).replace(/[^a-zA-Z]/g, "")}`] || ""}`}>{value}</span> : value;

  return <AcademicLayout title={title} description={description} usuario={usuario} links={rol === "ALUMNO" ? [
    { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" }, { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" }, { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
  ] : [
    { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" }, { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" }, { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
  ]}>
    {resumen.length > 0 && <section className={styles.stats}>{resumen.map((item) => <article className={styles.statCard} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</section>}
    {cargando && <p className={styles.notice}>Cargando…</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!cargando && !error && filas.length === 0 && <p className={styles.empty}><span className={styles.emptyIcon}>▤</span><strong>{emptyMessage}</strong><span>Cuando haya información disponible, aparecerá acá.</span></p>}
    {!cargando && !error && filas.length > 0 && (display === "table" ? <div className={styles.tableCard}><div className={styles.tableTitle}><div><h2>{summaryType === "calificaciones" ? "Detalle de calificaciones" : "Historial"}</h2><p>{filas.length} registros</p></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr>{fields.map((field) => <th key={field.label}>{field.label}</th>)}</tr></thead><tbody>{filas.map((fila, index) => <tr key={fila.id_materia_dictada || fila.id_asistencia || fila.id_calificacion || fila.id_tarea || index}>{fields.map((field) => { const v = valor(field, fila); return <td key={field.label}>{v === null || v === undefined || v === "" ? "—" : badge(field, v)}</td>; })}</tr>)}</tbody></table></div></div> : <section className={styles.courseGrid}>{filas.map((fila, index) => {
      const contenido = <><div className={styles.courseIcon}>▤</div><div className={styles.courseInfo}>{fields.map((field, fieldIndex) => { const v = valor(field, fila); return v !== null && v !== undefined && v !== "" ? <div className={fieldIndex === 0 ? styles.courseName : styles.courseMeta} key={field.label}>{fieldIndex === 0 ? <strong>{v}</strong> : <><span>{field.label}</span><b>{badge(field, v)}</b></>}</div> : null; })}</div><span className={styles.courseArrow}>›</span></>;
      const key = fila.id_materia_dictada || fila.id_asistencia || fila.id_calificacion || fila.id_tarea || index;
      const esMateria = dataKey === "materias" && fila.id_materia_dictada;
      const className = `${styles.courseCard} ${esMateria ? styles.subjectColor : ""}`;
      const style = esMateria ? colorMateria(fila.id_materia_dictada) : undefined;
      return detailHref && fila.id_materia_dictada ? <Link className={className} style={style} href={`${detailHref}/${fila.id_materia_dictada}`} key={key} aria-label={`Ver detalle de ${fila.nombre || "la materia"}`}>{contenido}</Link> : <article className={className} style={style} key={key}>{contenido}</article>;
    })}</section>)}
  </AcademicLayout>;
}

export { API, styles };
