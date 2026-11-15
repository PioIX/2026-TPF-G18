"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AcademicLayout, API, useAcademicUser, styles } from "./AcademicPage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { calcularPromedioNotas } from "@/lib/notas";

const LINKS = [
  { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" },
  { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" },
  { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
];

export default function DocenteSubjectDetail() {
  const usuario = useAcademicUser("DOCENTE");
  const { idMateriaDictada } = useParams();
  const [materia, setMateria] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busquedaAlumno, setBusquedaAlumno] = useState("");

  useEffect(() => {
    if (!usuario || !idMateriaDictada) return undefined;
    let vigente = true;
    setCargando(true);
    setError("");
    Promise.all([
      fetch(`${API}/materias/docente/${usuario.id_usuario}/${idMateriaDictada}/alumnos`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "No se pudieron cargar los alumnos."); return d.alumnos || []; }),
      fetch(`${API}/materias/docente/${usuario.id_usuario}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "No se pudo cargar la materia."); return (d.materias || []).find((m) => Number(m.id_materia_dictada) === Number(idMateriaDictada)) || null; }),
      fetch(`${API}/calificaciones/docente/${usuario.id_usuario}`).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "No se pudieron cargar las calificaciones."); return d.calificaciones || []; }),
    ]).then(([listaAlumnos, detalleMateria, listaNotas]) => {
      if (!vigente) return;
      if (!detalleMateria) throw new Error("No encontramos esa materia entre tus cursos asignados.");
      setAlumnos(listaAlumnos);
      setMateria(detalleMateria);
      setNotas(listaNotas.filter((nota) => Number(nota.id_materia_dictada) === Number(idMateriaDictada)));
    }).catch((e) => vigente && setError(e.message || "No se pudo cargar la materia."))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, idMateriaDictada]);

  const alumnosConPromedio = useMemo(() => alumnos.map((alumno) => {
    const notasAlumno = notas.filter((nota) => Number(nota.id_alumno) === Number(alumno.id_alumno));
    const promedio = calcularPromedioNotas(notasAlumno);
    return { ...alumno, cantidad_calificaciones: notasAlumno.length, promedio };
  }), [alumnos, notas]);
  const alumnosFiltrados = useMemo(() => {
    const termino = busquedaAlumno.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
    if (!termino) return alumnosConPromedio;
    return alumnosConPromedio.filter((alumno) => `${alumno.nombre} ${alumno.apellido} ${alumno.dni || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").includes(termino));
  }, [alumnosConPromedio, busquedaAlumno]);
  const promedioCurso = calcularPromedioNotas(notas);

  return <AcademicLayout title={materia?.nombre || "Detalle de materia"} description="Alumnos y calificaciones del curso asignado." usuario={usuario} links={LINKS}>
    <Link className={styles.backLink} href="/docente/materias">← Volver a mis materias</Link>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {cargando && <LoadingSpinner label="Cargando materia…" />}
    {materia && !cargando && <>
      <section className={styles.stats}>
        <article className={styles.statCard}><span>Curso</span><strong>{materia.anio}° {materia.division}</strong></article>
        <article className={styles.statCard}><span>Alumnos activos</span><strong>{alumnos.length}</strong></article>
        <article className={styles.statCard}><span>Promedio numérico de la materia</span><strong>{promedioCurso}</strong></article>
      </section>
      <section className={styles.tableCard}>
        <div className={styles.tableTitle}><div><h2>Alumnos del curso</h2><p>{alumnosFiltrados.length} de {alumnos.length} alumnos · El promedio se calcula solo con las notas numéricas.</p></div>{alumnos.length > 0 && <label className={styles.studentSearch}>Buscar alumno<input type="search" value={busquedaAlumno} onChange={(event) => setBusquedaAlumno(event.target.value)} placeholder="Buscar alumno..." aria-label="Buscar alumno por nombre, apellido o DNI" /></label>}</div>
        {alumnos.length ? alumnosFiltrados.length ? <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>DNI</th><th>Calificaciones</th><th>Promedio numérico</th></tr></thead><tbody>{alumnosFiltrados.map((alumno) => { const promedio = Number(String(alumno.promedio).replace(",", ".")); const badgeClass = Number.isFinite(promedio) ? (promedio >= 6 ? styles.gradeApproved : styles.gradeFailed) : styles.gradeText; return <tr key={alumno.id_alumno}><td><strong>{alumno.apellido}, {alumno.nombre}</strong></td><td>{alumno.dni || "—"}</td><td>{alumno.cantidad_calificaciones}</td><td><span className={`${styles.gradePill} ${badgeClass}`}>{alumno.promedio}</span></td></tr>; })}</tbody></table></div> : <p className={styles.panelEmpty}>No se encontraron alumnos con esa búsqueda.</p> : <p className={styles.panelEmpty}>No hay alumnos activos en este curso.</p>}
      </section>
    </>}
  </AcademicLayout>;
}
