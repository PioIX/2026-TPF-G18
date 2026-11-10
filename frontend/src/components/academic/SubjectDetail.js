"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AcademicLayout, API, useAcademicUser, colorMateria, styles as academicStyles } from "./AcademicPage";
import styles from "./SubjectDetail.module.css";

const LINKS = [
  { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" },
  { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" },
  { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
];

function fecha(valor) {
  if (!valor) return "Sin fecha";
  const date = new Date(valor);
  return Number.isNaN(date.getTime()) ? String(valor) : date.toLocaleDateString("es-AR");
}

export default function SubjectDetail() {
  const usuario = useAcademicUser("ALUMNO");
  const params = useParams();
  const idMateriaDictada = params?.idMateriaDictada;
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!usuario || !idMateriaDictada) return;
    let vigente = true;
    setCargando(true);
    setError("");
    fetch(`${API}/materias/alumno/${usuario.id_usuario}/${idMateriaDictada}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la materia.");
        return data;
      })
      .then((data) => vigente && setDatos(data))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, idMateriaDictada]);

  const materia = datos?.materia;
  const calificaciones = datos?.calificaciones || [];
  const asistencias = datos?.asistencias || [];
  const tareas = datos?.tareas || [];
  const promedio = calificaciones.length
    ? (calificaciones.reduce((total, item) => total + Number(item.nota || 0), 0) / calificaciones.length).toFixed(2)
    : "—";
  const presentes = asistencias.filter((item) => item.estado === "PRESENTE").length;
  const presentismo = asistencias.length ? `${Math.round((presentes / asistencias.length) * 100)}%` : "—";
  const pendientes = tareas.filter((item) => !item.id_entrega && item.estado_tarea === "ACTIVA").length;

  return <AcademicLayout title={materia?.nombre || "Detalle de materia"} description="Toda tu información académica de esta materia." usuario={usuario} links={LINKS}>
    <div className={styles.detailPage}>
      <Link className={styles.backLink} href="/alumno/materias">← Volver a mis materias</Link>
      {cargando && <p className={styles.state}>Cargando los datos de la materia…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!cargando && !error && materia && <>
        <section className={styles.hero}>
          <div className={`${styles.heroIcon} ${academicStyles.subjectColor}`} style={colorMateria(materia.id_materia_dictada)}>▤</div>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>INFORMACIÓN DE LA MATERIA</span>
            <h2>{materia.nombre}</h2>
            <p>{materia.descripcion || "Sin descripción disponible."}</p>
            <div className={styles.tags}><span>{materia.anio}° {materia.division} · {materia.orientacion}</span><span>Ciclo lectivo {materia.ciclo_lectivo}</span><span>{materia.horas_semanales ?? "—"} horas semanales</span></div>
            <p className={styles.teachers}><strong>Docentes:</strong> {materia.docentes || "Sin docentes asignados"}</p>
          </div>
        </section>

        <section className={styles.student} aria-label="Datos del alumno">
          <span className={styles.studentAvatar}>{(datos.alumno?.nombre || usuario?.username || "A").slice(0, 1).toUpperCase()}</span>
          <div><small>CURSADA DE</small><strong>{datos.alumno?.nombre} {datos.alumno?.apellido}</strong><span>DNI {datos.alumno?.dni || "—"}</span></div>
        </section>

        <section className={styles.stats} aria-label="Resumen de la materia">
          <article className={styles.statBlue}><span>Calificaciones</span><strong>{calificaciones.length}</strong><small>Promedio {promedio}</small></article>
          <article className={styles.statGreen}><span>Presentismo</span><strong>{presentismo}</strong><small>{presentes} presentes de {asistencias.length} registros</small></article>
          <article className={styles.statOrange}><span>Tareas pendientes</span><strong>{pendientes}</strong><small>{tareas.length} tareas en total</small></article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span className={styles.sectionAccentGreen}>01 · EVALUACIÓN</span><h2>Calificaciones</h2></div><span>{calificaciones.length} registros</span></div>
          {calificaciones.length ? <div className={styles.records}>{calificaciones.map((item) => <article className={styles.record} key={item.id_calificacion}><span className={styles.recordIconGreen}>✓</span><div className={styles.recordBody}><strong>{item.descripcion || item.tipo || "Evaluación"}</strong><span>{item.tipo || "Calificación"} · {fecha(item.fecha)}</span></div><b className={styles.grade}>{item.nota}</b></article>)}</div> : <p className={styles.empty}>Todavía no hay calificaciones registradas para esta materia.</p>}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span className={styles.sectionAccentOrange}>02 · ASISTENCIA</span><h2>Registro de asistencia</h2></div><span>{asistencias.length} registros</span></div>
          {asistencias.length ? <div className={styles.records}>{asistencias.map((item) => <article className={styles.record} key={item.id_asistencia}><span className={styles.recordIconOrange}>◷</span><div className={styles.recordBody}><strong>{fecha(item.fecha)}</strong><span>{item.observacion || "Sin observaciones"}</span></div><span className={`${styles.status} ${styles[`status${item.estado}`] || ""}`}>{item.estado}</span></article>)}</div> : <p className={styles.empty}>Todavía no hay asistencias cargadas para esta materia.</p>}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}><div><span className={styles.sectionAccentBlue}>03 · ACTIVIDADES</span><h2>Tareas y entregas</h2></div><span>{tareas.length} tareas</span></div>
          {tareas.length ? <div className={styles.taskGrid}>{tareas.map((item) => <article className={styles.task} key={item.id_tarea}>
            <div className={styles.taskHeading}><div><strong>{item.titulo}</strong><span>Publicada {fecha(item.fecha_publicacion)} · Vence {fecha(item.fecha_entrega)}</span></div><span className={`${styles.status} ${item.id_entrega ? styles.statusENTREGADA : styles.statusPENDIENTE}`}>{item.estado_entrega || (item.id_entrega ? "ENTREGADA" : "PENDIENTE")}</span></div>
            {item.descripcion && <p>{item.descripcion}</p>}
            {item.archivo_adjunto && <a className={styles.fileLink} href={item.archivo_adjunto} target="_blank" rel="noreferrer">Abrir material adjunto ↗</a>}
            {item.id_entrega && <div className={styles.delivery}><strong>Tu entrega</strong>{item.archivo_entregado && <a href={item.archivo_entregado} target="_blank" rel="noreferrer">Ver archivo entregado ↗</a>}<span>{item.comentario_entrega || "Sin comentario"}</span>{item.devolucion_docente && <p><b>Devolución docente:</b> {item.devolucion_docente}</p>}</div>}
          </article>)}</div> : <p className={styles.empty}>No hay tareas para esta materia.</p>}
        </section>
      </>}
    </div>
  </AcademicLayout>;
}
