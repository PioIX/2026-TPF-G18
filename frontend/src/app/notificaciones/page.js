"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AcademicLayout, API, styles as academicStyles } from "@/components/academic/AcademicPage";
import styles from "./notificaciones.module.css";

const LINKS = {
  ALUMNO: [
    { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" },
    { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" },
    { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
  ],
  DOCENTE: [
    { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" },
    { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" },
    { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
  ],
  ADMIN: [{ href: "/admin", label: "Gestión de usuarios" }],
};

const ICONOS = { TAREA: "☷", CALIFICACION: "▦", ASISTENCIA: "✓", CHAT: "◌", AVISO: "♧" };

function fechaLegible(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificacionesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      if (!guardado || !LINKS[guardado.rol]) { router.replace("/login"); return; }
      setUsuario(guardado);
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [router]);

  const cargarNotificaciones = useCallback(async () => {
    if (!usuario?.id_usuario) return;
    setError("");
    try {
      const response = await fetch(`${API}/notificaciones/${usuario.id_usuario}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las notificaciones.");
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(Number(data.noLeidas) || 0);
    } catch (e) {
      setError(e.message || "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, [usuario?.id_usuario]);

  useEffect(() => {
    if (!usuario) return undefined;
    cargarNotificaciones();
    window.addEventListener("educalink:refrescar-notificaciones", cargarNotificaciones);
    return () => window.removeEventListener("educalink:refrescar-notificaciones", cargarNotificaciones);
  }, [usuario, cargarNotificaciones]);

  async function marcarLeida(idNotificacion) {
    setActualizando(true);
    setError("");
    try {
      const response = await fetch(`${API}/notificaciones/${usuario.id_usuario}/${idNotificacion}/leida`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la notificación.");
      setNotificaciones((items) => items.map((item) => Number(item.id_notificacion) === Number(idNotificacion) ? { ...item, leida: 1 } : item));
      setNoLeidas((cantidad) => Math.max(0, cantidad - 1));
      window.dispatchEvent(new Event("educalink:refrescar-notificaciones"));
    } catch (e) {
      setError(e.message || "No se pudo conectar con el servidor.");
    } finally {
      setActualizando(false);
    }
  }

  async function marcarTodasLeidas() {
    setActualizando(true);
    setError("");
    try {
      const response = await fetch(`${API}/notificaciones/${usuario.id_usuario}/leidas`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron actualizar las notificaciones.");
      setNotificaciones((items) => items.map((item) => ({ ...item, leida: 1 })));
      setNoLeidas(0);
      window.dispatchEvent(new Event("educalink:refrescar-notificaciones"));
    } catch (e) {
      setError(e.message || "No se pudo conectar con el servidor.");
    } finally {
      setActualizando(false);
    }
  }

  if (!usuario) return <main className={academicStyles.notice}>Cargando notificaciones…</main>;
  const links = LINKS[usuario.rol];

  return <AcademicLayout title="Notificaciones" description="Novedades de tus materias y conversaciones." usuario={usuario} links={links}>
    <section className={styles.toolbar}>
      <div><strong>{noLeidas}</strong><span>{noLeidas === 1 ? "notificación sin leer" : "notificaciones sin leer"}</span></div>
      <button type="button" onClick={marcarTodasLeidas} disabled={!noLeidas || actualizando}>Marcar todas como leídas</button>
    </section>
    {error && <p className={academicStyles.error} role="alert">{error}</p>}
    {cargando && <p className={academicStyles.notice}>Cargando notificaciones…</p>}
    {!cargando && !error && notificaciones.length === 0 && <div className={academicStyles.empty}><span className={academicStyles.emptyIcon}>♧</span><strong>Todavía no tenés notificaciones</strong><span>Las novedades de tus tareas, calificaciones, asistencias y chats aparecerán acá.</span></div>}
    {!cargando && notificaciones.length > 0 && <section className={styles.list} aria-label="Lista de notificaciones">
      {notificaciones.map((item) => {
        const leida = Boolean(Number(item.leida));
        return <article className={`${styles.item} ${leida ? "" : styles.unread}`} key={item.id_notificacion}>
          <span className={styles.icon} aria-hidden="true">{ICONOS[item.tipo] || "♧"}</span>
          <div className={styles.body}>
            <div className={styles.heading}><h2>{item.titulo}</h2>{!leida && <span className={styles.dot} aria-label="Sin leer" />}</div>
            <p>{item.mensaje}</p>
            <div className={styles.meta}><span>{String(item.tipo || "AVISO").toLowerCase()}</span><time>{fechaLegible(item.fecha_creacion)}</time></div>
          </div>
          {!leida && <button className={styles.readButton} type="button" onClick={() => marcarLeida(item.id_notificacion)} disabled={actualizando}>Marcar leída</button>}
        </article>;
      })}
    </section>}
  </AcademicLayout>;
}
