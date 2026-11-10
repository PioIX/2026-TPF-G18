"use client";

import { useCallback, useEffect, useState } from "react";
import { AcademicLayout, API, useAcademicUser } from "@/components/academic/AcademicPage";
import styles from "./academico.module.css";

const LINKS_ADMIN = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/academico", label: "Gestión académica" },
];

const CURSO_VACIO = () => ({ id_curso: "", id_orientacion: "", anio: "", division: "", ciclo_lectivo: String(new Date().getFullYear()) });
const MATERIA_VACIA = { id_materia: "", nombre: "", descripcion: "" };
const ORIENTACION_VACIA = { id_orientacion: "", id_colegio: "", nombre: "", descripcion: "" };
const DICTADO_VACIO = { id_curso: "", id_materia: "", horas_semanales: "" };
const DOCENTE_VACIO = { id_materia_dictada: "", id_docente: "", rol: "Titular" };
const MATRICULA_VACIA = { id_alumno: "", id_curso: "" };

function etiquetaCurso(curso) {
  return `${curso.anio}° ${curso.division} · ${curso.orientacion} · ${curso.ciclo_lectivo}`;
}

async function enviar(path, method, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo guardar la información.");
  return data;
}

export default function GestionAcademicaPage() {
  const usuario = useAcademicUser("ADMIN");
  const [seccion, setSeccion] = useState("cursos");
  const [catalogo, setCatalogo] = useState({ orientaciones: [], cursos: [], materias: [], materiasDictadas: [], docentes: [], alumnos: [], matriculas: [] });
  const [curso, setCurso] = useState(CURSO_VACIO);
  const [materia, setMateria] = useState(MATERIA_VACIA);
  const [orientacion, setOrientacion] = useState(ORIENTACION_VACIA);
  const [dictado, setDictado] = useState(DICTADO_VACIO);
  const [docente, setDocente] = useState(DOCENTE_VACIO);
  const [matricula, setMatricula] = useState(MATRICULA_VACIA);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarCatalogo = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try {
      const response = await fetch(`${API}/academico/${usuario.id_usuario}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los datos académicos.");
      setCatalogo(data);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  }, [usuario]);

  useEffect(() => { cargarCatalogo(); }, [cargarCatalogo]);

  async function guardar(event, path, method, body, alGuardar) {
    event.preventDefault();
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const data = await enviar(path, method, { ...body, id_admin: usuario.id_usuario });
      setMensaje(data.mensaje || "Cambios guardados.");
      alGuardar?.();
      await cargarCatalogo();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  async function bajaMatricula(item) {
    setError(""); setMensaje(""); setGuardando(true);
    try {
      const data = await enviar(`/academico/matriculas/${item.id_matricula}/estado`, "PATCH", { id_admin: usuario.id_usuario, estado: "BAJA" });
      setMensaje(data.mensaje);
      await cargarCatalogo();
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }

  return <AcademicLayout title="Gestión académica" description="Organizá cursos, materias, docentes y matrículas." usuario={usuario} links={LINKS_ADMIN}>
    <div className={styles.page}>
      <nav className={styles.tabs} aria-label="Gestión académica">
        {[["cursos", "Cursos y materias"], ["orientaciones", "Orientaciones"], ["dictados", "Materias y docentes"], ["matriculas", "Matrículas"]].map(([id, nombre]) => <button type="button" key={id} className={seccion === id ? styles.tabActive : ""} onClick={() => setSeccion(id)}>{nombre}</button>)}
      </nav>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {mensaje && <p className={styles.success} role="status">{mensaje}</p>}
      {cargando && <p className={styles.loading}>Actualizando información…</p>}

      {seccion === "cursos" && <>
        <div className={styles.formsGrid}>
          <form className={styles.panel} onSubmit={(event) => guardar(event, curso.id_curso ? `/academico/cursos/${curso.id_curso}` : "/academico/cursos", curso.id_curso ? "PATCH" : "POST", curso, () => setCurso(CURSO_VACIO()))}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>{curso.id_curso ? "MODIFICAR" : "NUEVO"}</span><h2>{curso.id_curso ? "Editar curso" : "Crear curso"}</h2></div></div>
            <div className={styles.fields}>
              <label>Orientación<select value={curso.id_orientacion} onChange={(event) => setCurso({ ...curso, id_orientacion: event.target.value })} required><option value="">Elegí una orientación</option>{catalogo.orientaciones.map((item) => <option key={item.id_orientacion} value={item.id_orientacion}>{item.nombre}</option>)}</select></label>
              <label>Año<input type="number" min="1" max="7" value={curso.anio} onChange={(event) => setCurso({ ...curso, anio: event.target.value })} required /></label>
              <label>División<input maxLength="10" placeholder="A, B…" value={curso.division} onChange={(event) => setCurso({ ...curso, division: event.target.value })} required /></label>
              <label>Ciclo lectivo<input type="number" min="2000" max="2100" value={curso.ciclo_lectivo} onChange={(event) => setCurso({ ...curso, ciclo_lectivo: event.target.value })} required /></label>
            </div>
            <div className={styles.formActions}>{curso.id_curso && <button type="button" className={styles.secondaryButton} onClick={() => setCurso(CURSO_VACIO())}>Cancelar</button>}<button className={styles.primaryButton} type="submit" disabled={guardando}>{guardando ? "Guardando…" : curso.id_curso ? "Guardar cambios" : "Crear curso"}</button></div>
          </form>

          <form className={styles.panel} onSubmit={(event) => guardar(event, materia.id_materia ? `/academico/materias/${materia.id_materia}` : "/academico/materias", materia.id_materia ? "PATCH" : "POST", materia, () => setMateria(MATERIA_VACIA))}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>{materia.id_materia ? "MODIFICAR" : "CATÁLOGO"}</span><h2>{materia.id_materia ? "Editar materia" : "Agregar materia"}</h2></div></div>
            <div className={styles.fields}><label>Nombre<input maxLength="100" value={materia.nombre} onChange={(event) => setMateria({ ...materia, nombre: event.target.value })} required /></label><label className={styles.fullField}>Descripción<input maxLength="200" value={materia.descripcion} onChange={(event) => setMateria({ ...materia, descripcion: event.target.value })} /></label></div>
            <div className={styles.formActions}>{materia.id_materia && <button type="button" className={styles.secondaryButton} onClick={() => setMateria(MATERIA_VACIA)}>Cancelar</button>}<button className={styles.primaryButton} type="submit" disabled={guardando}>{guardando ? "Guardando…" : materia.id_materia ? "Guardar cambios" : "Agregar materia"}</button></div>
          </form>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.overline}>CICLOS LECTIVOS</span><h2>Cursos existentes</h2></div><span className={styles.countPill}>{catalogo.cursos.length} cursos</span></div>
          {catalogo.cursos.length === 0 ? <p className={styles.empty}>Todavía no hay cursos cargados.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Curso</th><th>Alumnos</th><th>Materias</th><th>Acción</th></tr></thead><tbody>{catalogo.cursos.map((item) => <tr key={item.id_curso}><td><strong>{etiquetaCurso(item)}</strong></td><td>{item.cantidad_alumnos}</td><td>{item.cantidad_materias}</td><td><button type="button" className={styles.textButton} onClick={() => { setCurso({ id_curso: item.id_curso, id_orientacion: String(item.id_orientacion), anio: String(item.anio), division: item.division, ciclo_lectivo: String(item.ciclo_lectivo) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar curso</button></td></tr>)}</tbody></table></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}><div><span className={styles.overline}>CATÁLOGO</span><h2>Materias existentes</h2></div><span className={styles.countPill}>{catalogo.materias.length} materias</span></div>
          {catalogo.materias.length === 0 ? <p className={styles.empty}>Todavía no hay materias cargadas.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Nombre</th><th>Descripción</th><th>Acción</th></tr></thead><tbody>{catalogo.materias.map((item) => <tr key={item.id_materia}><td><strong>{item.nombre}</strong></td><td>{item.descripcion || "—"}</td><td><button type="button" className={styles.textButton} onClick={() => { setMateria({ id_materia: item.id_materia, nombre: item.nombre, descripcion: item.descripcion || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar materia</button></td></tr>)}</tbody></table></div>}
        </section>
      </>}

      {seccion === "orientaciones" && <>
        <form className={styles.panel} onSubmit={(event) => guardar(event, orientacion.id_orientacion ? `/academico/orientaciones/${orientacion.id_orientacion}` : "/academico/orientaciones", orientacion.id_orientacion ? "PATCH" : "POST", orientacion, () => setOrientacion(ORIENTACION_VACIA))}>
          <div className={styles.panelHeading}><div><span className={styles.overline}>{orientacion.id_orientacion ? "MODIFICAR" : "CATÁLOGO"}</span><h2>{orientacion.id_orientacion ? "Editar orientación" : "Crear orientación"}</h2></div></div>
          <div className={styles.fields}>
            <label>Colegio<select value={orientacion.id_colegio} onChange={(event) => setOrientacion({ ...orientacion, id_colegio: event.target.value })} required><option value="">Elegí un colegio</option>{catalogo.colegios?.map((item) => <option key={item.id_colegio} value={item.id_colegio}>{item.nombre}</option>)}</select></label>
            <label>Nombre<input maxLength="100" value={orientacion.nombre} onChange={(event) => setOrientacion({ ...orientacion, nombre: event.target.value })} required /></label>
            <label className={styles.fullField}>Descripción<input maxLength="200" value={orientacion.descripcion} onChange={(event) => setOrientacion({ ...orientacion, descripcion: event.target.value })} /></label>
          </div>
          <div className={styles.formActions}>{orientacion.id_orientacion && <button type="button" className={styles.secondaryButton} onClick={() => setOrientacion(ORIENTACION_VACIA)}>Cancelar</button>}<button className={styles.primaryButton} type="submit" disabled={guardando || !catalogo.colegios?.length}>{guardando ? "Guardando…" : orientacion.id_orientacion ? "Guardar cambios" : "Crear orientación"}</button></div>
        </form>
        <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.overline}>CATÁLOGO</span><h2>Orientaciones existentes</h2></div><span className={styles.countPill}>{catalogo.orientaciones.length} orientaciones</span></div>{!catalogo.orientaciones.length ? <p className={styles.empty}>Todavía no hay orientaciones cargadas.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Colegio</th><th>Orientación</th><th>Descripción</th><th>Acción</th></tr></thead><tbody>{catalogo.orientaciones.map((item) => <tr key={item.id_orientacion}><td>{item.colegio}</td><td><strong>{item.nombre}</strong></td><td>{item.descripcion || "—"}</td><td><button type="button" className={styles.textButton} onClick={() => { setOrientacion({ id_orientacion: item.id_orientacion, id_colegio: String(item.id_colegio), nombre: item.nombre, descripcion: item.descripcion || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button></td></tr>)}</tbody></table></div>}</section>
      </>}

      {seccion === "dictados" && <>
        <div className={styles.formsGrid}>
          <form className={styles.panel} onSubmit={(event) => guardar(event, "/academico/dictados", "POST", dictado, () => setDictado(DICTADO_VACIO))}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>PLAN DE ESTUDIOS</span><h2>Asignar materia a curso</h2></div></div>
            <div className={styles.fields}><label>Curso<select value={dictado.id_curso} onChange={(event) => setDictado({ ...dictado, id_curso: event.target.value })} required><option value="">Elegí un curso</option>{catalogo.cursos.map((item) => <option key={item.id_curso} value={item.id_curso}>{etiquetaCurso(item)}</option>)}</select></label><label>Materia<select value={dictado.id_materia} onChange={(event) => setDictado({ ...dictado, id_materia: event.target.value })} required><option value="">Elegí una materia</option>{catalogo.materias.map((item) => <option key={item.id_materia} value={item.id_materia}>{item.nombre}</option>)}</select></label><label>Horas semanales<input type="number" min="1" max="60" value={dictado.horas_semanales} onChange={(event) => setDictado({ ...dictado, horas_semanales: event.target.value })} /></label></div>
            <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Asignar materia"}</button></div>
          </form>

          <form className={styles.panel} onSubmit={(event) => guardar(event, `/academico/dictados/${docente.id_materia_dictada}/docentes`, "POST", docente, () => setDocente(DOCENTE_VACIO))}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>EQUIPO DOCENTE</span><h2>Asignar docente</h2></div></div>
            <div className={styles.fields}><label>Materia dictada<select value={docente.id_materia_dictada} onChange={(event) => setDocente({ ...docente, id_materia_dictada: event.target.value })} required><option value="">Elegí curso y materia</option>{catalogo.materiasDictadas.map((item) => <option key={item.id_materia_dictada} value={item.id_materia_dictada}>{item.materia} · {item.anio}° {item.division} · {item.ciclo_lectivo}</option>)}</select></label><label>Docente<select value={docente.id_docente} onChange={(event) => setDocente({ ...docente, id_docente: event.target.value })} required><option value="">Elegí un docente</option>{catalogo.docentes.map((item) => <option key={item.id_docente} value={item.id_docente}>{item.apellido}, {item.nombre} (@{item.username})</option>)}</select></label><label>Rol<select value={docente.rol} onChange={(event) => setDocente({ ...docente, rol: event.target.value })}>{["Titular", "Suplente", "Ayudante"].map((rol) => <option key={rol}>{rol}</option>)}</select></label></div>
            <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={guardando || !docente.id_materia_dictada}>{guardando ? "Guardando…" : "Asignar docente"}</button></div>
          </form>
        </div>
        <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.overline}>ASIGNACIONES</span><h2>Materias por curso</h2></div><span className={styles.countPill}>{catalogo.materiasDictadas.length} asignaciones</span></div>{catalogo.materiasDictadas.length === 0 ? <p className={styles.empty}>Asigná materias a cursos para verlas acá.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Curso</th><th>Materia</th><th>Horas</th><th>Docentes asignados</th></tr></thead><tbody>{catalogo.materiasDictadas.map((item) => <tr key={item.id_materia_dictada}><td>{etiquetaCurso(item)}</td><td><strong>{item.materia}</strong></td><td>{item.horas_semanales || "—"}</td><td>{item.docentes || "Sin docente asignado"}</td></tr>)}</tbody></table></div>}</section>
      </>}

      {seccion === "matriculas" && <>
        <form className={styles.panel} onSubmit={(event) => guardar(event, "/academico/matriculas", "POST", matricula, () => setMatricula(MATRICULA_VACIA))}>
          <div className={styles.panelHeading}><div><span className={styles.overline}>INSCRIPCIONES</span><h2>Matricular alumno</h2><p>La matrícula activa al alumno en todas las materias de ese curso.</p></div></div>
          <div className={styles.fields}><label>Alumno<select value={matricula.id_alumno} onChange={(event) => setMatricula({ ...matricula, id_alumno: event.target.value })} required><option value="">Elegí un alumno</option>{catalogo.alumnos.map((item) => <option key={item.id_alumno} value={item.id_alumno}>{item.apellido}, {item.nombre} · @{item.username}</option>)}</select></label><label>Curso<select value={matricula.id_curso} onChange={(event) => setMatricula({ ...matricula, id_curso: event.target.value })} required><option value="">Elegí un curso</option>{catalogo.cursos.map((item) => <option key={item.id_curso} value={item.id_curso}>{etiquetaCurso(item)}</option>)}</select></label></div>
          <div className={styles.formActions}><button className={styles.primaryButton} type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Matricular alumno"}</button></div>
        </form>
        <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.overline}>MATRÍCULAS ACTIVAS</span><h2>Alumnos por curso</h2></div><span className={styles.countPill}>{catalogo.matriculas.length} matrículas</span></div>{catalogo.matriculas.length === 0 ? <p className={styles.empty}>No hay matrículas activas.</p> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Alumno</th><th>Curso</th><th>Acción</th></tr></thead><tbody>{catalogo.matriculas.map((item) => <tr key={item.id_matricula}><td><strong>{item.alumno_apellido}, {item.alumno_nombre}</strong><small className={styles.subline}>@{item.username}</small></td><td>{etiquetaCurso(item)}</td><td><button type="button" className={styles.dangerButton} disabled={guardando} onClick={() => bajaMatricula(item)}>Dar de baja</button></td></tr>)}</tbody></table></div>}</section>
      </>}

      <p className={styles.integrityNote}>Los cursos y materias vinculados a información académica se editan en lugar de borrarse, para conservar el historial.</p>
    </div>
  </AcademicLayout>;
}
