"use client";

import { useEffect, useState } from "react";
import { useAcademicUser, AcademicLayout, API, styles } from "./AcademicPage";

const LINKS_ALUMNO = [
  { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" }, { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" }, { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
];
const LINKS_DOCENTE = [
  { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" }, { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" }, { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" },
];

function fechaLocalActual() {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
  return fecha.toISOString().slice(0, 10);
}

async function jsonFetch(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function useCarga(url, key, usuario) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    setCargando(true);
    jsonFetch(`${API}/${url}/${usuario.id_usuario}`)
      .then((data) => { if (vigente) setItems(data[key] || []); })
      .catch((e) => { if (vigente) setError(e.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [usuario, url, key]);
  return { items, setItems, error, setError, cargando };
}

function SelectorMateria({ materias, value, onChange }) {
  return <label>Materia<select value={value} onChange={(e) => onChange(e.target.value)} required><option value="">Elegí una materia</option>{materias.map((m) => <option value={m.id_materia_dictada} key={m.id_materia_dictada}>{m.nombre} · {m.anio}° {m.division}</option>)}</select></label>;
}

function Card({ title, children }) {
  return <article className={styles.card}><h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{title}</h2>{children}</article>;
}

function RoleHome({ rol, title, links }) {
  const usuario = useAcademicUser(rol);
  return <AcademicLayout title={title} description={`Hola${usuario?.username ? `, ${usuario.username}` : ""}. Elegí una sección para continuar.`} usuario={usuario} links={links}>
    <section className={styles.grid}>{links.filter((l) => l.href !== `/${rol.toLowerCase()}`).map((link) => <a className={styles.card} href={link.href} key={link.href} style={{ textDecoration: "none", color: "inherit" }}><strong>{link.label}</strong><p style={{ color: "#64748b", marginBottom: 0 }}>Abrir sección</p></a>)}</section>
  </AcademicLayout>;
}

export function AlumnoHome() { return <RoleHome rol="ALUMNO" title="Inicio de alumno" links={LINKS_ALUMNO} />; }
export function DocenteHome() { return <RoleHome rol="DOCENTE" title="Inicio de docente" links={LINKS_DOCENTE} />; }

export function TareasAlumno() {
  const usuario = useAcademicUser("ALUMNO");
  const { items, error, cargando } = useCarga("tareas/alumno", "tareas", usuario);
  const [campos, setCampos] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(null);
  async function entregar(event, idTarea) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(idTarea);
    try {
      const resultado = await jsonFetch(`${API}/tareas/${idTarea}/entregas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, ...(campos[idTarea] || {}) }) });
      setMensaje(resultado.mensaje);
      window.location.reload();
    } catch (e) { setErrorForm(e.message); } finally { setGuardando(null); }
  }
  return <AcademicLayout title="Tareas" description="Consultá las consignas y registrá tus entregas." usuario={usuario} links={LINKS_ALUMNO}>
    {cargando && <p className={styles.notice}>Cargando tareas…</p>}{error && <p className={styles.error}>{error}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}
    {!cargando && !error && items.length === 0 && <p className={styles.notice}>No hay tareas para tus cursos.</p>}
    <section className={styles.grid}>{items.map((t) => <Card key={t.id_tarea} title={t.titulo}><div className={styles.field}><span>Materia y curso</span><strong>{t.materia} · {t.anio}° {t.division}</strong></div><div className={styles.field}><span>Consigna</span><strong>{t.descripcion || "Sin descripción"}</strong></div><div className={styles.field}><span>Entrega hasta</span><strong>{t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha límite"}</strong></div><div className={styles.field}><span>Estado</span><strong>{t.estado_entrega || t.estado}</strong></div>{t.archivo_adjunto && <p><a href={t.archivo_adjunto} target="_blank" rel="noreferrer">Abrir material adjunto</a></p>}{t.id_entrega ? <p>Tu entrega: {t.comentario_entrega || t.archivo_entregado || "Registrada"}</p> : null}{t.estado === "ACTIVA" && !t.id_entrega && <form className={styles.form} style={{ margin: "14px 0 0", padding: 0, border: 0, boxShadow: "none" }} onSubmit={(e) => entregar(e, t.id_tarea)}><label>Enlace o ruta del archivo<input value={campos[t.id_tarea]?.archivo || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], archivo: e.target.value } })} /></label><label>Comentario<textarea value={campos[t.id_tarea]?.comentario || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], comentario: e.target.value } })} rows="2" /></label><button type="submit" disabled={guardando === t.id_tarea}>Entregar</button></form>}</Card>)}</section>
  </AcademicLayout>;
}

export function TareasDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: tareas, error, cargando } = useCarga("tareas/docente", "tareas", usuario);
  const [form, setForm] = useState({ id_materia_dictada: "", titulo: "", descripcion: "", fecha_entrega: "", archivo_adjunto: "" });
  const [mensaje, setMensaje] = useState(""); const [errorForm, setErrorForm] = useState(""); const [guardando, setGuardando] = useState(false);
  async function publicar(event) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(true);
    try { const data = await jsonFetch(`${API}/tareas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id_usuario: usuario.id_usuario, id_materia_dictada: Number(form.id_materia_dictada), fecha_entrega: form.fecha_entrega || null }) }); setMensaje(data.mensaje); window.location.reload(); }
    catch (e) { setErrorForm(e.message); } finally { setGuardando(false); }
  }
  return <AcademicLayout title="Tareas" description="Publicá consignas y consultá cuántas entregas recibiste." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={styles.form} onSubmit={publicar}><h2>Publicar tarea</h2><SelectorMateria materias={materias} value={form.id_materia_dictada} onChange={(v) => setForm({ ...form, id_materia_dictada: v })} /><label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength="150" /></label><label>Fecha límite<input type="datetime-local" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="3" /></label><label>Enlace al material adjunto<input value={form.archivo_adjunto} onChange={(e) => setForm({ ...form, archivo_adjunto: e.target.value })} maxLength="255" /></label><button disabled={guardando || !usuario}>Publicar</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error}>{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando tareas…</p>}{!cargando && tareas.length === 0 && <p className={styles.notice}>Todavía no publicaste tareas.</p>}
    <section className={styles.grid}>{tareas.map((t) => <Card key={t.id_tarea} title={t.titulo}><div className={styles.field}><span>Materia y curso</span><strong>{t.materia} · {t.anio}° {t.division}</strong></div><div className={styles.field}><span>Estado</span><strong>{t.estado}</strong></div><div className={styles.field}><span>Fecha límite</span><strong>{t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha"}</strong></div><div className={styles.field}><span>Entregas recibidas</span><strong>{t.cantidad_entregas}</strong></div></Card>)}</section>
  </AcademicLayout>;
}

export function AsistenciasDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const [materiaId, setMateriaId] = useState(""); const [fecha, setFecha] = useState(fechaLocalActual());
  const [alumnos, setAlumnos] = useState([]); const [estado, setEstado] = useState({}); const [error, setError] = useState(""); const [mensaje, setMensaje] = useState(""); const [cargando, setCargando] = useState(false);
  useEffect(() => {
    if (!usuario || !materiaId || !fecha) { setAlumnos([]); return; }
    let vigente = true; setCargando(true); setError("");
    jsonFetch(`${API}/asistencias/docente/${usuario.id_usuario}/materia/${materiaId}/alumnos?fecha=${fecha}`).then((data) => { if (vigente) { setAlumnos(data.alumnos || []); setEstado(Object.fromEntries((data.alumnos || []).map((a) => [a.id_alumno, { estado: a.estado || "PRESENTE", observacion: a.observacion || "" }]))); } }).catch((e) => vigente && setError(e.message)).finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, materiaId, fecha]);
  async function guardar() {
    setError(""); setMensaje("");
    try { for (const alumno of alumnos) await jsonFetch(`${API}/asistencias`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_alumno: alumno.id_alumno, id_materia_dictada: Number(materiaId), fecha, ...(estado[alumno.id_alumno] || {}) }) }); setMensaje("Asistencias guardadas."); }
    catch (e) { setError(e.message); }
  }
  return <AcademicLayout title="Asistencias" description="Elegí una materia y registrá la asistencia del curso." usuario={usuario} links={LINKS_DOCENTE}>
    <section className={styles.form}><SelectorMateria materias={materias} value={materiaId} onChange={setMateriaId} /><label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label></section>
    {cargando && <p className={styles.notice}>Cargando alumnos…</p>}{error && <p className={styles.error} role="alert">{error}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}{!cargando && materiaId && alumnos.length === 0 && !error && <p className={styles.notice}>No hay alumnos activos en este curso.</p>}
    {alumnos.length > 0 && <><section className={styles.grid}>{alumnos.map((al) => <Card key={al.id_alumno} title={`${al.apellido}, ${al.nombre}`}><label>Estado<select value={estado[al.id_alumno]?.estado || "PRESENTE"} onChange={(e) => setEstado({ ...estado, [al.id_alumno]: { ...estado[al.id_alumno], estado: e.target.value } })}>{["PRESENTE", "AUSENTE", "TARDE", "JUSTIFICADO"].map((s) => <option key={s}>{s}</option>)}</select></label><label>Observación<input value={estado[al.id_alumno]?.observacion || ""} onChange={(e) => setEstado({ ...estado, [al.id_alumno]: { ...estado[al.id_alumno], observacion: e.target.value } })} /></label></Card>)}</section><div style={{ maxWidth: 1200, margin: "18px auto" }}><button className={styles.formButton} type="button" onClick={guardar}>Guardar asistencia del curso</button></div></>}
  </AcademicLayout>;
}

export function CalificacionesDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: calificaciones, error, cargando } = useCarga("calificaciones/docente", "calificaciones", usuario);
  const [materiaId, setMateriaId] = useState(""); const [alumnos, setAlumnos] = useState([]); const [form, setForm] = useState({ id_alumno: "", tipo: "TRABAJO", nota: "", descripcion: "", fecha: fechaLocalActual() });
  const [mensaje, setMensaje] = useState(""); const [errorForm, setErrorForm] = useState(""); const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (!usuario || !materiaId) { setAlumnos([]); return; } let vigente = true; jsonFetch(`${API}/materias/docente/${usuario.id_usuario}/${materiaId}/alumnos`).then((d) => vigente && setAlumnos(d.alumnos || [])).catch((e) => vigente && setErrorForm(e.message)); return () => { vigente = false; }; }, [usuario, materiaId]);
  async function guardar(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), ...form, id_alumno: Number(form.id_alumno), nota: Number(form.nota) }) }); setMensaje(d.mensaje); window.location.reload(); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  return <AcademicLayout title="Calificaciones" description="Cargá notas y consultá las evaluaciones registradas." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={styles.form} onSubmit={guardar}><h2>Cargar calificación</h2><SelectorMateria materias={materias} value={materiaId} onChange={(v) => { setMateriaId(v); setForm({ ...form, id_alumno: "" }); }} /><label>Alumno<select required value={form.id_alumno} onChange={(e) => setForm({ ...form, id_alumno: e.target.value })}><option value="">Elegí un alumno</option>{alumnos.map((a) => <option key={a.id_alumno} value={a.id_alumno}>{a.apellido}, {a.nombre}</option>)}</select></label><label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Nota (0 a 10)<input type="number" min="0" max="10" step="0.01" required value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label><label>Fecha<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label><label>Descripción<input maxLength="150" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><button disabled={guardando || !materiaId}>Guardar</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando calificaciones…</p>}{!cargando && calificaciones.length === 0 && <p className={styles.notice}>Todavía no cargaste calificaciones.</p>}
    <section className={styles.grid}>{calificaciones.map((c) => <Card key={c.id_calificacion} title={`${c.alumno_apellido}, ${c.alumno_nombre}`}><div className={styles.field}><span>Materia y curso</span><strong>{c.materia} · {c.anio}° {c.division}</strong></div><div className={styles.field}><span>Evaluación</span><strong>{c.tipo}{c.descripcion ? ` · ${c.descripcion}` : ""}</strong></div><div className={styles.field}><span>Nota</span><strong>{c.nota}</strong></div><div className={styles.field}><span>Fecha</span><strong>{c.fecha}</strong></div></Card>)}</section>
  </AcademicLayout>;
}
