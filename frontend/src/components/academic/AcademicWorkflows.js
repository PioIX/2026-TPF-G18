"use client";

import { useEffect, useState } from "react";
import { useAcademicUser, AcademicLayout, API, styles } from "./AcademicPage";
import { subirArchivo } from "@/lib/subirArchivo";
import { descargarExcel } from "@/lib/crearExcel";

const LINKS_ALUMNO = [
  { href: "/alumno", label: "Inicio" }, { href: "/alumno/materias", label: "Materias" }, { href: "/alumno/asistencias", label: "Asistencias" }, { href: "/alumno/calificaciones", label: "Calificaciones" }, { href: "/alumno/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" }, { href: "/notificaciones", label: "Notificaciones" },
];
const LINKS_DOCENTE = [
  { href: "/docente", label: "Inicio" }, { href: "/docente/materias", label: "Materias" }, { href: "/docente/asistencias", label: "Asistencias" }, { href: "/docente/calificaciones", label: "Calificaciones" }, { href: "/docente/tareas", label: "Tareas" }, { href: "/chat", label: "Chat" }, { href: "/notificaciones", label: "Notificaciones" },
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

function RoleHome({ rol, title, links }) {
  const usuario = useAcademicUser(rol);
  const [datos, setDatos] = useState({ materias: [], tareas: [], notas: [], asistencias: [] });
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!usuario) return;
    let vigente = true;
    const rutas = rol === "ALUMNO"
      ? [["materias", "materias/alumno"], ["tareas", "tareas/alumno"], ["notas", "calificaciones/alumno"], ["asistencias", "asistencias/alumno"]]
      : [["materias", "materias/docente"], ["tareas", "tareas/docente"], ["notas", "calificaciones/docente"]];
    Promise.allSettled(rutas.map(async ([key, ruta]) => [key, await jsonFetch(`${API}/${ruta}/${usuario.id_usuario}`)]))
      .then((resultados) => {
        if (!vigente) return;
        const siguiente = { materias: [], tareas: [], notas: [], asistencias: [] };
        resultados.forEach((resultado) => {
          if (resultado.status === "fulfilled") {
            const [key, data] = resultado.value;
            siguiente[key] = data[key] || [];
          }
        });
        setDatos(siguiente);
      })
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, rol]);

  const pendientes = datos.tareas.filter((t) => rol === "ALUMNO" ? !t.id_entrega && t.estado === "ACTIVA" : t.estado === "ACTIVA");
  const promedio = datos.notas.length ? (datos.notas.reduce((total, nota) => total + Number(nota.nota || 0), 0) / datos.notas.length).toFixed(2) : "—";
  const tarjetas = rol === "ALUMNO"
    ? [["Materias", datos.materias.length, "▤"], ["Tareas pendientes", pendientes.length, "☷"], ["Promedio", promedio, "▦"], ["Asistencias cargadas", datos.asistencias.length, "✓"]]
    : [["Cursos asignados", datos.materias.length, "▤"], ["Tareas activas", pendientes.length, "☷"], ["Calificaciones", datos.notas.length, "▦"]];

  return <AcademicLayout title={title} description={`Hola${usuario?.username ? `, ${usuario.username}` : ""}. Este es tu resumen académico.`} usuario={usuario} links={links}>
    <section className={styles.stats}>{tarjetas.map(([label, value, icon]) => <article className={styles.statCard} key={label}><span className={styles.statIcon}>{icon}</span><span>{label}</span><strong>{cargando ? "…" : value}</strong></article>)}</section>
    <section className={styles.dashboardGrid}>
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Mis materias" : "Materias asignadas"}</h2><p>{datos.materias.length} cursos activos</p></div><a href={`/${rol.toLowerCase()}/materias`}>Ver todas <span>›</span></a></div>
        {datos.materias.length ? <div className={styles.dashboardRows}>{datos.materias.slice(0, 4).map((materia) => <div className={styles.dashboardRow} key={materia.id_materia_dictada}><span className={styles.rowIcon}>▤</span><div><strong>{materia.nombre}</strong><small>{materia.anio}° {materia.division} · {materia.orientacion || materia.rol}</small></div><span className={styles.rowArrow}>›</span></div>)}</div> : <p className={styles.panelEmpty}>{cargando ? "Cargando materias…" : "No hay materias para mostrar todavía."}</p>}
      </article>
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Próximas tareas" : "Actividad reciente"}</h2><p>{rol === "ALUMNO" ? "Entregas pendientes" : "Tareas que publicaste"}</p></div><a href={`/${rol.toLowerCase()}/tareas`}>Ver todas <span>›</span></a></div>
        {datos.tareas.length ? <div className={styles.dashboardRows}>{datos.tareas.slice(0, 4).map((tarea) => <div className={styles.dashboardRow} key={tarea.id_tarea}><span className={`${styles.rowIcon} ${styles.rowIconAccent}`}>☷</span><div><strong>{tarea.titulo}</strong><small>{tarea.materia} · {tarea.fecha_entrega ? new Date(tarea.fecha_entrega).toLocaleDateString("es-AR") : "Sin fecha límite"}</small></div><span className={styles.rowArrow}>›</span></div>)}</div> : <p className={styles.panelEmpty}>{cargando ? "Cargando tareas…" : "No hay tareas publicadas."}</p>}
      </article>
      <article className={`${styles.panel} ${styles.quickPanel}`}>
        <div className={styles.panelHeading}><div><h2>Accesos rápidos</h2><p>Ir directo a una sección</p></div></div>
        {links.filter((link) => link.href !== `/${rol.toLowerCase()}`).map((link) => <a className={styles.quickLink} href={link.href} key={link.href}><span>{link.label}</span><span>›</span></a>)}
      </article>
    </section>
  </AcademicLayout>;
}

export function AlumnoHome() { return <RoleHome rol="ALUMNO" title="Inicio" links={LINKS_ALUMNO} />; }
export function DocenteHome() { return <RoleHome rol="DOCENTE" title="Inicio" links={LINKS_DOCENTE} />; }

export function TareasAlumno() {
  const usuario = useAcademicUser("ALUMNO");
  const { items, error, cargando } = useCarga("tareas/alumno", "tareas", usuario);
  const [campos, setCampos] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(null);
  const [filtro, setFiltro] = useState("TODAS");
  async function entregar(event, idTarea) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(idTarea);
    try {
      const resultado = await jsonFetch(`${API}/tareas/${idTarea}/entregas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, ...(campos[idTarea] || {}) }) });
      setMensaje(resultado.mensaje);
      window.location.reload();
    } catch (e) { setErrorForm(e.message); } finally { setGuardando(null); }
  }
  async function adjuntarEntrega(event, idTarea) {
    const file = event.target.files?.[0];
    if (!file || !usuario) return;
    setErrorForm(""); setMensaje(""); setSubiendoArchivo(idTarea);
    try {
      const data = await subirArchivo(file, { idUsuario: usuario.id_usuario, contexto: "entrega", idTarea });
      setCampos((actuales) => ({ ...actuales, [idTarea]: { ...actuales[idTarea], archivo: data.url } }));
      setMensaje(`Archivo adjuntado: ${data.nombre}`);
    } catch (e) { setErrorForm(e.message); }
    finally { setSubiendoArchivo(null); event.target.value = ""; }
  }
  const visibles = items.filter((t) => filtro === "TODAS" || (filtro === "ENTREGADAS" ? Boolean(t.id_entrega) : !t.id_entrega));
  return <AcademicLayout title="Tareas" description="Revisá las consignas y seguí el estado de tus entregas." usuario={usuario} links={LINKS_ALUMNO}>
    <section className={styles.assignmentBoard}>
      <div className={styles.assignmentToolbar}><div><h2>Mis tareas</h2><p>{items.length} tareas asignadas</p></div><div className={styles.filterTabs}>{[["TODAS", "Todas"], ["PENDIENTES", "Pendientes"], ["ENTREGADAS", "Entregadas"]].map(([id, label]) => <button type="button" className={filtro === id ? styles.filterActive : ""} onClick={() => setFiltro(id)} key={id}>{label}</button>)}</div></div>
      {cargando && <p className={styles.panelEmpty}>Cargando tareas…</p>}{error && <p className={styles.error} role="alert">{error}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}
      {!cargando && !error && !visibles.length && <p className={styles.panelEmpty}>{filtro === "TODAS" ? "No hay tareas para tus cursos." : "No hay tareas en este filtro."}</p>}
      <div className={styles.assignmentList}>{visibles.map((t) => <article className={styles.assignmentRow} key={t.id_tarea}>
        <div className={styles.assignmentMain}><span className={styles.subjectPill}>{t.materia}</span><div><h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p><small>{t.anio}° {t.division} · Vence: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha límite"}</small>{t.archivo_adjunto && <a className={styles.materialLink} href={t.archivo_adjunto} target="_blank" rel="noreferrer">Abrir material adjunto</a>}</div></div>
        <div className={styles.assignmentStatus}><span className={`${styles.badge} ${styles[`badge${t.estado_entrega || (t.id_entrega ? "ENTREGADA" : t.estado)}`] || ""}`}>{t.estado_entrega || (t.id_entrega ? "ENTREGADA" : t.estado)}</span>{t.id_entrega && <div className={styles.deliveryFeedback}><small><strong>Tu entrega:</strong> {t.comentario_entrega || "Enviada"}</small>{t.archivo_entregado && <a className={styles.materialLink} href={t.archivo_entregado} target="_blank" rel="noreferrer">Abrir archivo entregado</a>}{t.devolucion_docente && <p><strong>Devolución del docente</strong><span>{t.devolucion_docente}</span></p>}</div>}</div>
        {t.estado === "ACTIVA" && <form className={styles.deliveryForm} onSubmit={(e) => entregar(e, t.id_tarea)}><label>Enlace o ruta del archivo<input value={campos[t.id_tarea]?.archivo || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], archivo: e.target.value } })} /></label><label>Adjuntar archivo<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarEntrega(event, t.id_tarea)} disabled={subiendoArchivo === t.id_tarea} /><small>{subiendoArchivo === t.id_tarea ? "Subiendo archivo…" : "Máximo 10 MB"}</small></label><label>Comentario<textarea rows="1" value={campos[t.id_tarea]?.comentario || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], comentario: e.target.value } })} /></label><button type="submit" disabled={guardando === t.id_tarea || subiendoArchivo === t.id_tarea}>{guardando === t.id_tarea ? "Enviando…" : t.id_entrega ? "Volver a entregar" : "Entregar"}</button></form>}
      </article>)}</div>
    </section>
  </AcademicLayout>;
}

export function TareasDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: tareas, setItems: setTareas, error, cargando } = useCarga("tareas/docente", "tareas", usuario);
  const [form, setForm] = useState({ id_materia_dictada: "", titulo: "", descripcion: "", fecha_entrega: "", archivo_adjunto: "" });
  const [edicion, setEdicion] = useState(null);
  const [subiendoMaterial, setSubiendoMaterial] = useState("");
  const [tareaRevision, setTareaRevision] = useState(null);
  const [entregas, setEntregas] = useState([]);
  const [cargandoEntregas, setCargandoEntregas] = useState(false);
  const [devoluciones, setDevoluciones] = useState({});
  const [guardandoEntrega, setGuardandoEntrega] = useState(null);
  const [mensaje, setMensaje] = useState(""); const [errorForm, setErrorForm] = useState(""); const [guardando, setGuardando] = useState(false);
  async function publicar(event) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(true);
    try { const data = await jsonFetch(`${API}/tareas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id_usuario: usuario.id_usuario, id_materia_dictada: Number(form.id_materia_dictada), fecha_entrega: form.fecha_entrega || null }) }); setMensaje(data.mensaje); const actualizadas = await jsonFetch(`${API}/tareas/docente/${usuario.id_usuario}`); setTareas(actualizadas.tareas || []); setForm({ id_materia_dictada: "", titulo: "", descripcion: "", fecha_entrega: "", archivo_adjunto: "" }); }
    catch (e) { setErrorForm(e.message); } finally { setGuardando(false); }
  }

  async function adjuntarMaterial(event, destino) {
    const file = event.target.files?.[0];
    if (!file || !usuario) return;
    setErrorForm(""); setMensaje(""); setSubiendoMaterial(destino);
    try {
      const data = await subirArchivo(file, { idUsuario: usuario.id_usuario, contexto: "material" });
      if (destino === "nueva") setForm((actual) => ({ ...actual, archivo_adjunto: data.url }));
      else setEdicion((actual) => ({ ...actual, archivo_adjunto: data.url }));
      setMensaje(`Material adjuntado: ${data.nombre}`);
    } catch (e) { setErrorForm(e.message); }
    finally { setSubiendoMaterial(""); event.target.value = ""; }
  }

  function iniciarEdicion(tarea) {
    setErrorForm(""); setMensaje("");
    setEdicion({ id_tarea: tarea.id_tarea, titulo: tarea.titulo, descripcion: tarea.descripcion || "", fecha_entrega: tarea.fecha_entrega ? String(tarea.fecha_entrega).replace(" ", "T").slice(0, 16) : "", archivo_adjunto: tarea.archivo_adjunto || "" });
  }

  async function guardarEdicion(event) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(true);
    try {
      const data = await jsonFetch(`${API}/tareas/${edicion.id_tarea}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edicion, id_usuario: usuario.id_usuario, fecha_entrega: edicion.fecha_entrega || null }) });
      setTareas((actuales) => actuales.map((tarea) => tarea.id_tarea === edicion.id_tarea ? { ...tarea, ...edicion, fecha_entrega: edicion.fecha_entrega || null } : tarea));
      setMensaje(data.mensaje); setEdicion(null);
    } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); }
  }

  async function cambiarEstado(tarea) {
    setErrorForm(""); setMensaje(""); setGuardando(true);
    const estado = tarea.estado === "ACTIVA" ? "CERRADA" : "ACTIVA";
    try {
      const data = await jsonFetch(`${API}/tareas/${tarea.id_tarea}/estado`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, estado }) });
      setTareas((actuales) => actuales.map((item) => item.id_tarea === tarea.id_tarea ? { ...item, estado } : item));
      setMensaje(data.mensaje);
    } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); }
  }

  async function alternarEntregas(tarea) {
    setErrorForm(""); setMensaje("");
    if (tareaRevision === tarea.id_tarea) { setTareaRevision(null); return; }
    setTareaRevision(tarea.id_tarea); setCargandoEntregas(true); setEntregas([]);
    try {
      const data = await jsonFetch(`${API}/entregas/docente/${usuario.id_usuario}/tarea/${tarea.id_tarea}`);
      setEntregas(data.entregas || []);
      setDevoluciones(Object.fromEntries((data.entregas || []).map((entrega) => [entrega.id_entrega, entrega.devolucion_docente || ""])));
    } catch (e) { setErrorForm(e.message); }
    finally { setCargandoEntregas(false); }
  }

  async function guardarDevolucion(event, entrega) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardandoEntrega(entrega.id_entrega);
    try {
      const devolucion = (devoluciones[entrega.id_entrega] || "").trim();
      const data = await jsonFetch(`${API}/entregas/${entrega.id_entrega}/devolucion`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, devolucion }) });
      setEntregas((actuales) => actuales.map((item) => item.id_entrega === entrega.id_entrega ? { ...item, devolucion_docente: devolucion, estado: "CORREGIDA" } : item));
      setMensaje(data.mensaje);
    } catch (e) { setErrorForm(e.message); }
    finally { setGuardandoEntrega(null); }
  }

  return <AcademicLayout title="Tareas" description="Publicá consignas y revisá las entregas de tus cursos." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={styles.form} onSubmit={publicar}><h2>Publicar tarea</h2><SelectorMateria materias={materias} value={form.id_materia_dictada} onChange={(v) => setForm({ ...form, id_materia_dictada: v })} /><label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength="150" /></label><label>Fecha límite<input type="datetime-local" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} /></label><label>Descripción<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="3" /></label><label>Enlace al material adjunto<input value={form.archivo_adjunto} onChange={(e) => setForm({ ...form, archivo_adjunto: e.target.value })} maxLength="255" /></label><label>Adjuntar archivo<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarMaterial(event, "nueva")} disabled={subiendoMaterial === "nueva"} /><small>{subiendoMaterial === "nueva" ? "Subiendo archivo…" : "Máximo 10 MB"}</small></label><button disabled={guardando || !usuario || Boolean(subiendoMaterial)}>{guardando ? "Publicando…" : "Publicar tarea"}</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando tareas…</p>}
    <section className={styles.assignmentBoard}><div className={styles.assignmentToolbar}><div><h2>Tareas publicadas</h2><p>{tareas.length} en total</p></div></div>{!cargando && !tareas.length && <p className={styles.panelEmpty}>Todavía no publicaste tareas.</p>}<div className={styles.assignmentList}>{tareas.map((t) => <article className={styles.assignmentRow} key={t.id_tarea}><div className={styles.assignmentMain}><span className={styles.subjectPill}>{t.materia}</span><div><h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p><small>{t.anio}° {t.division} · Límite: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha"}</small></div></div><div className={styles.assignmentStatus}><span className={`${styles.badge} ${t.estado === "ACTIVA" ? styles.badgeACTIVA : ""}`}>{t.estado}</span><small>{t.cantidad_entregas} entregas</small><div className={styles.workflowActions}><button type="button" onClick={() => alternarEntregas(t)}>{tareaRevision === t.id_tarea ? "Ocultar entregas" : `Ver entregas (${t.cantidad_entregas})`}</button><button type="button" onClick={() => iniciarEdicion(t)}>Editar</button><button type="button" className={t.estado === "ACTIVA" ? styles.closeTaskButton : styles.reopenTaskButton} disabled={guardando} onClick={() => cambiarEstado(t)}>{t.estado === "ACTIVA" ? "Cerrar tarea" : "Reabrir"}</button></div></div>{edicion?.id_tarea === t.id_tarea && <form className={styles.workflowEditForm} onSubmit={guardarEdicion}><h3>Editar tarea</h3><label>Título<input value={edicion.titulo} onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })} required maxLength="150" /></label><label>Fecha límite<input type="datetime-local" value={edicion.fecha_entrega} onChange={(e) => setEdicion({ ...edicion, fecha_entrega: e.target.value })} /></label><label>Descripción<textarea rows="3" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></label><label>Enlace al material adjunto<input value={edicion.archivo_adjunto} onChange={(e) => setEdicion({ ...edicion, archivo_adjunto: e.target.value })} maxLength="255" /></label><label>Adjuntar archivo<input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarMaterial(event, "edicion")} disabled={subiendoMaterial === "edicion"} /><small>{subiendoMaterial === "edicion" ? "Subiendo archivo…" : "Máximo 10 MB"}</small></label><div className={styles.workflowFormActions}><button type="button" onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando || Boolean(subiendoMaterial)}>{guardando ? "Guardando…" : "Guardar cambios"}</button></div></form>}{tareaRevision === t.id_tarea && <section className={styles.deliveryReview}><div className={styles.deliveryReviewHeading}><div><h3>Entregas recibidas</h3><p>{entregas.length} de {t.cantidad_entregas} entregas</p></div></div>{cargandoEntregas ? <p className={styles.panelEmpty}>Cargando entregas…</p> : !entregas.length ? <p className={styles.panelEmpty}>Todavía no hay entregas para esta tarea.</p> : <div className={styles.deliveryReviewList}>{entregas.map((entrega) => <article className={styles.deliveryReviewCard} key={entrega.id_entrega}><div className={styles.deliveryStudent}><div><strong>{entrega.apellido}, {entrega.nombre}</strong><small>Entregó {entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleString("es-AR") : ""}</small></div><span className={`${styles.badge} ${styles[`badge${entrega.estado}`] || ""}`}>{entrega.estado}</span></div>{entrega.archivo && <a className={styles.materialLink} href={entrega.archivo} target="_blank" rel="noreferrer">Abrir archivo enviado</a>}{entrega.comentario && <p className={styles.studentComment}><strong>Comentario del alumno</strong>{entrega.comentario}</p>}<form className={styles.feedbackForm} onSubmit={(event) => guardarDevolucion(event, entrega)}><label>Devolución para el alumno<textarea rows="3" required maxLength="5000" value={devoluciones[entrega.id_entrega] || ""} onChange={(event) => setDevoluciones({ ...devoluciones, [entrega.id_entrega]: event.target.value })} placeholder="Escribí tus observaciones sobre la entrega" /></label><button type="submit" disabled={guardandoEntrega === entrega.id_entrega}>{guardandoEntrega === entrega.id_entrega ? "Guardando…" : entrega.estado === "CORREGIDA" ? "Actualizar devolución" : "Guardar y marcar corregida"}</button></form></article>)}</div>}</section>}</article>)}</div></section>
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
    <section className={styles.panel}><div className={styles.filterBar}><SelectorMateria materias={materias} value={materiaId} onChange={setMateriaId} /><label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label><button className={styles.formButton} type="button" onClick={guardar} disabled={!alumnos.length}>Guardar asistencia</button><button className={styles.formButton} type="button" onClick={() => { const materia = materias.find((item) => Number(item.id_materia_dictada) === Number(materiaId)); descargarExcel(`asistencia-${materia?.nombre || "curso"}-${fecha}`, "Asistencia", ["DNI", "Apellido", "Nombre", "Fecha", "Estado", "Observación"], alumnos.map((alumno) => [alumno.dni || "", alumno.apellido, alumno.nombre, fecha, estado[alumno.id_alumno]?.estado || "PRESENTE", estado[alumno.id_alumno]?.observacion || ""])); }} disabled={!alumnos.length}>Descargar planilla Excel</button></div>
      {cargando && <p className={styles.panelEmpty}>Cargando alumnos…</p>}{error && <p className={styles.error} role="alert">{error}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}{!cargando && materiaId && alumnos.length === 0 && !error && <p className={styles.panelEmpty}>No hay alumnos activos en este curso.</p>}
      {alumnos.length > 0 && <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>DNI</th><th>Asistencia</th><th>Observación</th></tr></thead><tbody>{alumnos.map((al) => <tr key={al.id_alumno}><td><strong>{al.apellido}, {al.nombre}</strong></td><td>{al.dni || "—"}</td><td><select value={estado[al.id_alumno]?.estado || "PRESENTE"} onChange={(e) => setEstado({ ...estado, [al.id_alumno]: { ...estado[al.id_alumno], estado: e.target.value } })}>{["PRESENTE", "AUSENTE", "TARDE", "JUSTIFICADO"].map((s) => <option key={s}>{s}</option>)}</select></td><td><input value={estado[al.id_alumno]?.observacion || ""} onChange={(e) => setEstado({ ...estado, [al.id_alumno]: { ...estado[al.id_alumno], observacion: e.target.value } })} /></td></tr>)}</tbody></table></div>}
    </section>
  </AcademicLayout>;
}

export function CalificacionesDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: calificaciones, setItems: setCalificaciones, error, cargando } = useCarga("calificaciones/docente", "calificaciones", usuario);
  const [materiaId, setMateriaId] = useState(""); const [alumnos, setAlumnos] = useState([]); const [form, setForm] = useState({ id_alumno: "", tipo: "TRABAJO", nota: "", descripcion: "", fecha: fechaLocalActual() });
  const [edicion, setEdicion] = useState(null);
  const [mensaje, setMensaje] = useState(""); const [errorForm, setErrorForm] = useState(""); const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (!usuario || !materiaId) { setAlumnos([]); return; } let vigente = true; jsonFetch(`${API}/materias/docente/${usuario.id_usuario}/${materiaId}/alumnos`).then((d) => vigente && setAlumnos(d.alumnos || [])).catch((e) => vigente && setErrorForm(e.message)); return () => { vigente = false; }; }, [usuario, materiaId]);
  async function guardar(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), ...form, id_alumno: Number(form.id_alumno), nota: Number(form.nota) }) }); setMensaje(d.mensaje); window.location.reload(); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  function iniciarEdicion(calificacion) { setErrorForm(""); setMensaje(""); setEdicion({ id_calificacion: calificacion.id_calificacion, tipo: calificacion.tipo, nota: String(calificacion.nota), descripcion: calificacion.descripcion || "", fecha: String(calificacion.fecha).slice(0, 10) }); }
  async function guardarEdicion(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones/${edicion.id_calificacion}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edicion, id_usuario: usuario.id_usuario, nota: Number(edicion.nota) }) }); setCalificaciones((actuales) => actuales.map((item) => item.id_calificacion === edicion.id_calificacion ? { ...item, ...edicion, nota: Number(edicion.nota) } : item)); setMensaje(d.mensaje); setEdicion(null); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  return <AcademicLayout title="Calificaciones" description="Cargá notas y consultá las evaluaciones registradas." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={styles.form} onSubmit={guardar}><h2>Cargar calificación</h2><SelectorMateria materias={materias} value={materiaId} onChange={(v) => { setMateriaId(v); setForm({ ...form, id_alumno: "" }); }} /><label>Alumno<select required value={form.id_alumno} onChange={(e) => setForm({ ...form, id_alumno: e.target.value })}><option value="">Elegí un alumno</option>{alumnos.map((a) => <option key={a.id_alumno} value={a.id_alumno}>{a.apellido}, {a.nombre}</option>)}</select></label><label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Nota (0 a 10)<input type="number" min="0" max="10" step="0.01" required value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label><label>Fecha<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label><label>Descripción<input maxLength="150" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label><button disabled={guardando || !materiaId}>{guardando ? "Guardando…" : "Guardar calificación"}</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando calificaciones…</p>}
    {edicion && <form className={styles.form} onSubmit={guardarEdicion}><h2>Corregir calificación</h2><label>Tipo<select value={edicion.tipo} onChange={(e) => setEdicion({ ...edicion, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Nota (0 a 10)<input type="number" min="0" max="10" step="0.01" required value={edicion.nota} onChange={(e) => setEdicion({ ...edicion, nota: e.target.value })} /></label><label>Fecha<input type="date" required value={edicion.fecha} onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} /></label><label>Descripción<input maxLength="150" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></label><button type="button" className={styles.formButton} onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar corrección"}</button></form>}
    <section className={styles.tableCard}><div className={styles.tableTitle}><div><h2>Calificaciones registradas</h2><p>{calificaciones.length} registros</p></div><button className={styles.formButton} type="button" onClick={() => descargarExcel("calificaciones", "Calificaciones", ["Alumno", "Materia", "Curso", "Evaluación", "Descripción", "Nota", "Fecha"], calificaciones.map((c) => [`${c.alumno_apellido}, ${c.alumno_nombre}`, c.materia, `${c.anio}° ${c.division}`, c.tipo, c.descripcion || "", Number(c.nota), String(c.fecha).slice(0, 10)]))} disabled={!calificaciones.length}>Descargar Excel</button></div>{!cargando && !calificaciones.length ? <p className={styles.panelEmpty}>Todavía no cargaste calificaciones.</p> : <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Materia</th><th>Evaluación</th><th>Nota</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{calificaciones.map((c) => <tr key={c.id_calificacion}><td><strong>{c.alumno_apellido}, {c.alumno_nombre}</strong></td><td>{c.materia} · {c.anio}° {c.division}</td><td>{c.tipo}{c.descripcion ? ` · ${c.descripcion}` : ""}</td><td><span className={styles.gradePill}>{c.nota}</span></td><td>{String(c.fecha).slice(0, 10)}</td><td><button className={styles.editRecordButton} type="button" onClick={() => iniciarEdicion(c)}>Editar nota</button></td></tr>)}</tbody></table></div>}</section>
  </AcademicLayout>;
}
