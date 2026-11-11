"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useAcademicUser, AcademicLayout, API, styles, colorMateria } from "./AcademicPage";
import { subirArchivo } from "@/lib/subirArchivo";
import { descargarExcel } from "@/lib/crearExcel";
import { buscarColumna, fechaPlanilla, leerPlanilla } from "@/lib/importarPlanilla";

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

function claveNombre(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buscarAlumnoPlanilla(fila, alumnos) {
  const dni = String(buscarColumna(fila, "DNI")).replace(/\D/g, "");
  if (dni) return alumnos.find((alumno) => String(alumno.dni || "").replace(/\D/g, "") === dni) || null;
  const apellido = claveNombre(buscarColumna(fila, "Apellido"));
  const nombre = claveNombre(buscarColumna(fila, "Nombre"));
  if (!apellido || !nombre) return null;
  const coincidencias = alumnos.filter((alumno) => claveNombre(alumno.apellido) === apellido && claveNombre(alumno.nombre) === nombre);
  return coincidencias.length === 1 ? coincidencias[0] : null;
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

function ListaAdjuntos({ archivos, quitar }) {
  if (!archivos?.length) return null;
  return <ul className={styles.fileList}>{archivos.map((archivo) => <li key={archivo.url}><a href={archivo.url} target="_blank" rel="noreferrer">{archivo.nombre}</a><button type="button" onClick={() => quitar(archivo.url)} aria-label={`Quitar ${archivo.nombre}`}>×</button></li>)}</ul>;
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
    <section className={styles.stats}>{tarjetas.map(([label, value, icon], index) => { const destino = label.toLowerCase().includes("materia") || label.toLowerCase().includes("curso") ? "materias" : label.toLowerCase().includes("tarea") ? "tareas" : label.toLowerCase().includes("promedio") || label.toLowerCase().includes("calific") ? "calificaciones" : "asistencias"; const tono = [styles.statToneBlue, styles.statToneGreen, styles.statTonePurple, styles.statToneOrange][index % 4]; return <motion.div className={styles.statCardMotion} key={label} initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.28, delay: index * 0.065, ease: "easeOut" }}><Link className={`${styles.statCard} ${styles.statCardLink} ${tono}`} href={`/${rol.toLowerCase()}/${destino}`}><span className={styles.statIcon}>{icon}</span><span>{label}</span><strong>{cargando ? "…" : value}</strong><span className={styles.cardHint}>Abrir sección <b>›</b></span></Link></motion.div>; })}</section>
    <section className={styles.dashboardGrid}>
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Mis materias" : "Materias asignadas"}</h2><p>{datos.materias.length} cursos activos</p></div><a href={`/${rol.toLowerCase()}/materias`}>Ver todas <span>›</span></a></div>
        {datos.materias.length ? <div className={styles.dashboardRows}>{datos.materias.slice(0, 4).map((materia) => <Link href={rol === "ALUMNO" ? `/alumno/materias/${materia.id_materia_dictada}` : "/docente/materias"} className={styles.dashboardRow} key={materia.id_materia_dictada}><span className={`${styles.rowIcon} ${styles.subjectColor}`} style={colorMateria(materia.id_materia_dictada)}>▤</span><div><strong>{materia.nombre}</strong><small>{materia.anio}° {materia.division} · {materia.orientacion || materia.rol}</small></div><span className={styles.rowArrow}>›</span></Link>)}</div> : <p className={styles.panelEmpty}>{cargando ? "Cargando materias…" : "No hay materias para mostrar todavía."}</p>}
      </article>
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Próximas tareas" : "Actividad reciente"}</h2><p>{rol === "ALUMNO" ? "Entregas pendientes" : "Tareas que publicaste"}</p></div><a href={`/${rol.toLowerCase()}/tareas`}>Ver todas <span>›</span></a></div>
        {datos.tareas.length ? <div className={styles.dashboardRows}>{datos.tareas.slice(0, 4).map((tarea) => <Link href={`/${rol.toLowerCase()}/tareas`} className={styles.dashboardRow} key={tarea.id_tarea}><span className={`${styles.rowIcon} ${styles.rowIconAccent}`}>☷</span><div><strong>{tarea.titulo}</strong><small>{tarea.materia} · {tarea.fecha_entrega ? new Date(tarea.fecha_entrega).toLocaleDateString("es-AR") : "Sin fecha límite"}</small></div><span className={styles.rowArrow}>›</span></Link>)}</div> : <p className={styles.panelEmpty}>{cargando ? "Cargando tareas…" : "No hay tareas publicadas."}</p>}
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
    const seleccionados = Array.from(event.target.files || []);
    if (!seleccionados.length || !usuario) return;
    if ((campos[idTarea]?.archivos?.length || 0) + seleccionados.length > 20) {
      setErrorForm("Podés adjuntar hasta 20 archivos por entrega."); event.target.value = ""; return;
    }
    setErrorForm(""); setMensaje(""); setSubiendoArchivo(idTarea);
    try {
      const archivos = [];
      for (const file of seleccionados) {
        const data = await subirArchivo(file, { idUsuario: usuario.id_usuario, contexto: "entrega", idTarea });
        const archivo = { url: data.url, nombre: data.nombre };
        archivos.push(archivo);
        setCampos((actuales) => ({ ...actuales, [idTarea]: { ...actuales[idTarea], archivos: [...(actuales[idTarea]?.archivos || []), archivo] } }));
      }
      setMensaje(`${archivos.length} archivo${archivos.length === 1 ? "" : "s"} adjuntado${archivos.length === 1 ? "" : "s"}.`);
    } catch (e) { setErrorForm(e.message); }
    finally { setSubiendoArchivo(null); event.target.value = ""; }
  }
  function quitarArchivoEntrega(idTarea, url) {
    setCampos((actuales) => ({ ...actuales, [idTarea]: { ...actuales[idTarea], archivos: (actuales[idTarea]?.archivos || []).filter((archivo) => archivo.url !== url) } }));
  }
  const visibles = items.filter((t) => filtro === "TODAS" || (filtro === "ENTREGADAS" ? Boolean(t.id_entrega) : !t.id_entrega));
  return <AcademicLayout title="Tareas" description="Revisá las consignas y seguí el estado de tus entregas." usuario={usuario} links={LINKS_ALUMNO}>
    <section className={styles.assignmentBoard}>
      <div className={styles.assignmentToolbar}><div><h2>Mis tareas</h2><p>{items.length} tareas asignadas</p></div><div className={styles.filterTabs}>{[["TODAS", "Todas"], ["PENDIENTES", "Pendientes"], ["ENTREGADAS", "Entregadas"]].map(([id, label]) => <button type="button" className={filtro === id ? styles.filterActive : ""} onClick={() => setFiltro(id)} key={id}>{label}</button>)}</div></div>
      {cargando && <p className={styles.panelEmpty}>Cargando tareas…</p>}{error && <p className={styles.error} role="alert">{error}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}
      {!cargando && !error && !visibles.length && <p className={styles.panelEmpty}>{filtro === "TODAS" ? "No hay tareas asignadas a tus cursos por el momento." : "No hay tareas en este filtro."}</p>}
      <div className={styles.assignmentList}>{visibles.map((t) => <article className={styles.assignmentRow} key={t.id_tarea}>
        <div className={styles.assignmentMain}><span className={styles.subjectPill}>{t.materia}</span><div><h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p><small>{t.anio}° {t.division} · Vence: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha límite"}</small>{t.archivo_adjunto && <a className={styles.materialLink} href={t.archivo_adjunto} target="_blank" rel="noreferrer">Abrir enlace al material ↗</a>}{(t.archivos_adjunto || []).map((archivo) => <a className={styles.materialLink} href={archivo.url} target="_blank" rel="noreferrer" key={archivo.url}>{archivo.nombre} ↗</a>)}</div></div>
        <div className={styles.assignmentStatus}><span className={`${styles.badge} ${styles[`badge${t.estado_entrega || (t.id_entrega ? "ENTREGADA" : t.estado)}`] || ""}`}>{t.estado_entrega || (t.id_entrega ? "ENTREGADA" : t.estado)}</span>{t.id_entrega && <div className={styles.deliveryFeedback}><small><strong>Tu entrega:</strong> {t.comentario_entrega || "Enviada"}</small>{t.archivo_entregado && <a className={styles.materialLink} href={t.archivo_entregado} target="_blank" rel="noreferrer">Abrir enlace enviado ↗</a>}{(t.archivos_entregados || []).map((archivo) => <a className={styles.materialLink} href={archivo.url} target="_blank" rel="noreferrer" key={archivo.url}>{archivo.nombre} ↗</a>)}{t.devolucion_docente && <p><strong>Devolución del docente</strong><span>{t.devolucion_docente}</span></p>}</div>}</div>
        {t.estado === "ACTIVA" && <form className={styles.deliveryForm} onSubmit={(e) => entregar(e, t.id_tarea)}><label>Enlace o ruta<input value={campos[t.id_tarea]?.archivo || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], archivo: e.target.value } })} /></label><label>Adjuntar archivos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarEntrega(event, t.id_tarea)} disabled={subiendoArchivo === t.id_tarea} /><small>{subiendoArchivo === t.id_tarea ? "Subiendo archivos…" : "Hasta 10 MB por archivo"}</small><ListaAdjuntos archivos={campos[t.id_tarea]?.archivos || []} quitar={(url) => quitarArchivoEntrega(t.id_tarea, url)} /></label><label>Comentario<textarea rows="2" value={campos[t.id_tarea]?.comentario || ""} onChange={(e) => setCampos({ ...campos, [t.id_tarea]: { ...campos[t.id_tarea], comentario: e.target.value } })} /></label><button type="submit" disabled={guardando === t.id_tarea || subiendoArchivo === t.id_tarea}>{guardando === t.id_tarea ? "Enviando…" : t.id_entrega ? "Volver a entregar" : "Entregar"}</button></form>}
      </article>)}</div>
    </section>
  </AcademicLayout>;
}

export function TareasDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: tareas, setItems: setTareas, error, cargando } = useCarga("tareas/docente", "tareas", usuario);
  const [form, setForm] = useState({ id_materia_dictada: "", titulo: "", descripcion: "", fecha_entrega: "", archivo_adjunto: "", archivos_adjunto: [] });
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
    try { const data = await jsonFetch(`${API}/tareas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id_usuario: usuario.id_usuario, id_materia_dictada: Number(form.id_materia_dictada), fecha_entrega: form.fecha_entrega || null }) }); setMensaje(data.mensaje); const actualizadas = await jsonFetch(`${API}/tareas/docente/${usuario.id_usuario}`); setTareas(actualizadas.tareas || []); setForm({ id_materia_dictada: "", titulo: "", descripcion: "", fecha_entrega: "", archivo_adjunto: "", archivos_adjunto: [] }); }
    catch (e) { setErrorForm(e.message); } finally { setGuardando(false); }
  }

  async function adjuntarMaterial(event, destino) {
    const seleccionados = Array.from(event.target.files || []);
    if (!seleccionados.length || !usuario) return;
    const yaAdjuntos = destino === "nueva" ? form.archivos_adjunto.length : (edicion?.archivos_adjunto || []).length;
    if (yaAdjuntos + seleccionados.length > 20) {
      setErrorForm("Podés adjuntar hasta 20 archivos por tarea."); event.target.value = ""; return;
    }
    setErrorForm(""); setMensaje(""); setSubiendoMaterial(destino);
    try {
      const archivos = [];
      for (const file of seleccionados) {
        const data = await subirArchivo(file, { idUsuario: usuario.id_usuario, contexto: "material" });
        const archivo = { url: data.url, nombre: data.nombre };
        archivos.push(archivo);
        if (destino === "nueva") setForm((actual) => ({ ...actual, archivos_adjunto: [...actual.archivos_adjunto, archivo] }));
        else setEdicion((actual) => ({ ...actual, archivos_adjunto: [...(actual.archivos_adjunto || []), archivo] }));
      }
      setMensaje(`${archivos.length} material${archivos.length === 1 ? "" : "es"} adjuntado${archivos.length === 1 ? "" : "s"}.`);
    } catch (e) { setErrorForm(e.message); }
    finally { setSubiendoMaterial(""); event.target.value = ""; }
  }

  function quitarAdjuntoMaterial(destino, url) {
    if (destino === "nueva") setForm((actual) => ({ ...actual, archivos_adjunto: actual.archivos_adjunto.filter((archivo) => archivo.url !== url) }));
    else setEdicion((actual) => ({ ...actual, archivos_adjunto: (actual.archivos_adjunto || []).filter((archivo) => archivo.url !== url) }));
  }

  function iniciarEdicion(tarea) {
    setErrorForm(""); setMensaje("");
    setEdicion({ id_tarea: tarea.id_tarea, titulo: tarea.titulo, descripcion: tarea.descripcion || "", fecha_entrega: tarea.fecha_entrega ? String(tarea.fecha_entrega).replace(" ", "T").slice(0, 16) : "", archivo_adjunto: tarea.archivo_adjunto || "", archivos_adjunto: tarea.archivos_adjunto || [] });
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
    <form className={`${styles.form} ${styles.taskPublishForm}`} onSubmit={publicar}><h2>Publicar tarea</h2><SelectorMateria materias={materias} value={form.id_materia_dictada} onChange={(v) => setForm({ ...form, id_materia_dictada: v })} /><label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength="150" /></label><label>Fecha límite<input type="datetime-local" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} /></label><label>Consigna y comentarios para el curso<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="6" maxLength="10000" placeholder="Explicá la actividad, criterios y materiales que deben tener en cuenta…" /></label><label>Enlace al material<input value={form.archivo_adjunto} onChange={(e) => setForm({ ...form, archivo_adjunto: e.target.value })} maxLength="255" /></label><label>Adjuntar archivos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarMaterial(event, "nueva")} disabled={subiendoMaterial === "nueva"} /><small>{subiendoMaterial === "nueva" ? "Subiendo archivos…" : "Hasta 10 MB por archivo"}</small></label><ListaAdjuntos archivos={form.archivos_adjunto} quitar={(url) => quitarAdjuntoMaterial("nueva", url)} /><button disabled={guardando || !usuario || Boolean(subiendoMaterial)}>{guardando ? "Publicando…" : "Publicar tarea"}</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando tareas…</p>}
    <section className={styles.assignmentBoard}><div className={styles.assignmentToolbar}><div><h2>Tareas publicadas</h2><p>{tareas.length} en total</p></div></div>{!cargando && !tareas.length && <p className={styles.panelEmpty}>Todavía no publicaste tareas.</p>}<div className={styles.assignmentList}>{tareas.map((t) => <article className={styles.assignmentRow} key={t.id_tarea}><div className={styles.assignmentMain}><span className={styles.subjectPill}>{t.materia}</span><div><h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p><small>{t.anio}° {t.division} · Límite: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha"}</small>{t.archivo_adjunto && <a className={styles.materialLink} href={t.archivo_adjunto} target="_blank" rel="noreferrer">Abrir enlace al material ↗</a>}{(t.archivos_adjunto || []).map((archivo) => <a className={styles.materialLink} href={archivo.url} target="_blank" rel="noreferrer" key={archivo.url}>{archivo.nombre} ↗</a>)}</div></div><div className={styles.assignmentStatus}><span className={`${styles.badge} ${t.estado === "ACTIVA" ? styles.badgeACTIVA : ""}`}>{t.estado}</span><small>{t.cantidad_entregas} entregas</small><div className={styles.workflowActions}><button type="button" onClick={() => alternarEntregas(t)}>{tareaRevision === t.id_tarea ? "Ocultar entregas" : `Ver entregas (${t.cantidad_entregas})`}</button><button type="button" onClick={() => iniciarEdicion(t)}>Editar</button><button type="button" className={t.estado === "ACTIVA" ? styles.closeTaskButton : styles.reopenTaskButton} disabled={guardando} onClick={() => cambiarEstado(t)}>{t.estado === "ACTIVA" ? "Cerrar tarea" : "Reabrir"}</button></div></div>{edicion?.id_tarea === t.id_tarea && <form className={styles.workflowEditForm} onSubmit={guardarEdicion}><h3>Editar tarea</h3><label>Título<input value={edicion.titulo} onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })} required maxLength="150" /></label><label>Fecha límite<input type="datetime-local" value={edicion.fecha_entrega} onChange={(e) => setEdicion({ ...edicion, fecha_entrega: e.target.value })} /></label><label>Descripción<textarea rows="6" maxLength="10000" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></label><label>Enlace al material adjunto<input value={edicion.archivo_adjunto} onChange={(e) => setEdicion({ ...edicion, archivo_adjunto: e.target.value })} maxLength="255" /></label><label>Adjuntar archivos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarMaterial(event, "edicion")} disabled={subiendoMaterial === "edicion"} /><small>{subiendoMaterial === "edicion" ? "Subiendo archivos…" : "Hasta 10 MB por archivo"}</small></label><ListaAdjuntos archivos={edicion.archivos_adjunto || []} quitar={(url) => quitarAdjuntoMaterial("edicion", url)} /><div className={styles.workflowFormActions}><button type="button" onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando || Boolean(subiendoMaterial)}>{guardando ? "Guardando…" : "Guardar cambios"}</button></div></form>}{tareaRevision === t.id_tarea && <section className={styles.deliveryReview}><div className={styles.deliveryReviewHeading}><div><h3>Entregas recibidas</h3><p>{entregas.length} de {t.cantidad_entregas} entregas</p></div></div>{cargandoEntregas ? <p className={styles.panelEmpty}>Cargando entregas…</p> : !entregas.length ? <p className={styles.panelEmpty}>Todavía no hay entregas para esta tarea.</p> : <div className={styles.deliveryReviewList}>{entregas.map((entrega) => <article className={styles.deliveryReviewCard} key={entrega.id_entrega}><div className={styles.deliveryStudent}><div><strong>{entrega.apellido}, {entrega.nombre}</strong><small>Entregó {entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleString("es-AR") : ""}</small></div><span className={`${styles.badge} ${styles[`badge${entrega.estado}`] || ""}`}>{entrega.estado}</span></div>{entrega.archivo && <a className={styles.materialLink} href={entrega.archivo} target="_blank" rel="noreferrer">Abrir enlace enviado ↗</a>}{(entrega.archivos || []).map((archivo) => <a className={styles.materialLink} href={archivo.url} target="_blank" rel="noreferrer" key={archivo.url}>{archivo.nombre} ↗</a>)}{entrega.comentario && <p className={styles.studentComment}><strong>Comentario del alumno</strong>{entrega.comentario}</p>}<form className={styles.feedbackForm} onSubmit={(event) => guardarDevolucion(event, entrega)}><label>Devolución para el alumno<textarea rows="5" required maxLength="5000" value={devoluciones[entrega.id_entrega] || ""} onChange={(event) => setDevoluciones({ ...devoluciones, [entrega.id_entrega]: event.target.value })} placeholder="Escribí tus observaciones sobre la entrega" /></label><button type="submit" disabled={guardandoEntrega === entrega.id_entrega}>{guardandoEntrega === entrega.id_entrega ? "Guardando…" : entrega.estado === "CORREGIDA" ? "Actualizar devolución" : "Guardar y marcar corregida"}</button></form></article>)}</div>}</section>}</article>)}</div></section>
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
  async function importarAsistencia(file) {
    const filas = await leerPlanilla(file);
    const nuevas = {};
    let fechaArchivo = "";
    const vistos = new Set();
    for (const fila of filas) {
      const alumno = buscarAlumnoPlanilla(fila, alumnos);
      const valorEstado = String(buscarColumna(fila, "Estado", "Asistencia")).trim().toUpperCase();
      const observacion = buscarColumna(fila, "Observacion", "Comentario");
      const fechaFila = fechaPlanilla(buscarColumna(fila, "Fecha"));
      if (!alumno) throw new Error(`Fila ${fila.__fila}: no encuentro un alumno único. Revisá el DNI o el apellido y nombre.`);
      if (vistos.has(alumno.id_alumno)) throw new Error(`Fila ${fila.__fila}: el alumno aparece más de una vez en la planilla.`);
      if (!["PRESENTE", "AUSENTE", "TARDE", "JUSTIFICADO"].includes(valorEstado)) throw new Error(`Fila ${fila.__fila}: estado inválido. Usá PRESENTE, AUSENTE, TARDE o JUSTIFICADO.`);
      if (fechaFila && fechaArchivo && fechaFila !== fechaArchivo) throw new Error("La planilla tiene varias fechas. Importá una fecha por vez.");
      if (fechaFila) fechaArchivo = fechaFila;
      vistos.add(alumno.id_alumno);
      nuevas[alumno.id_alumno] = { estado: valorEstado, observacion };
    }
    if (fechaArchivo && fechaArchivo !== fecha) throw new Error("La fecha de la planilla no coincide con la fecha elegida arriba. Cambiala en la pantalla y volvé a importar.");
    setEstado((actual) => ({ ...actual, ...nuevas }));
    setMensaje(`Se cargaron ${vistos.size} asistencias en la pantalla. Revisalas y tocá “Guardar asistencia”.`);
    setError("");
  }
  return <AcademicLayout title="Asistencias" description="Elegí una materia y registrá la asistencia del curso." usuario={usuario} links={LINKS_DOCENTE}>
    <section className={styles.panel}><div className={styles.filterBar}><SelectorMateria materias={materias} value={materiaId} onChange={setMateriaId} /><label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label><button className={styles.formButton} type="button" onClick={guardar} disabled={!alumnos.length}>Guardar asistencia</button><button className={styles.formButton} type="button" onClick={() => { const materia = materias.find((item) => Number(item.id_materia_dictada) === Number(materiaId)); descargarExcel(`asistencia-${materia?.nombre || "curso"}-${fecha}`, "Asistencia", ["DNI", "Apellido", "Nombre", "Fecha", "Estado", "Observación"], alumnos.map((alumno) => [alumno.dni || "", alumno.apellido, alumno.nombre, fecha, estado[alumno.id_alumno]?.estado || "PRESENTE", estado[alumno.id_alumno]?.observacion || ""])); }} disabled={!alumnos.length}>Descargar para editar en Excel / Sheets</button><label className={styles.importPlanilla}>Importar Excel/CSV<input type="file" accept=".xlsx,.csv" onChange={async (event) => { try { await importarAsistencia(event.target.files?.[0]); } catch (e) { setError(e.message); } finally { event.target.value = ""; } }} disabled={!alumnos.length} /><small>Columnas: DNI, Estado y opcionalmente Fecha/Observación. La fecha debe coincidir con la elegida arriba. Google Sheets: descargalo como Excel o CSV. Máximo 10 MB.</small></label></div>
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
  const [importadas, setImportadas] = useState([]);
  useEffect(() => { if (!usuario || !materiaId) { setAlumnos([]); return; } let vigente = true; jsonFetch(`${API}/materias/docente/${usuario.id_usuario}/${materiaId}/alumnos`).then((d) => vigente && setAlumnos(d.alumnos || [])).catch((e) => vigente && setErrorForm(e.message)); return () => { vigente = false; }; }, [usuario, materiaId]);
  async function guardar(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), ...form, id_alumno: Number(form.id_alumno), nota: Number(form.nota) }) }); setMensaje(d.mensaje); window.location.reload(); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  async function importarCalificaciones(file) {
    const filas = await leerPlanilla(file);
    const tipos = ["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"];
    const filasImportadas = filas.map((fila) => {
      const alumno = buscarAlumnoPlanilla(fila, alumnos);
      const tipo = String(buscarColumna(fila, "Tipo", "Evaluacion", "Evaluación")).trim().toUpperCase();
      const notaTexto = String(buscarColumna(fila, "Nota")).replace(",", ".");
      const nota = Number(notaTexto);
      const fecha = fechaPlanilla(buscarColumna(fila, "Fecha"));
      const descripcion = buscarColumna(fila, "Descripcion", "Descripción", "Devolucion", "Devolución");
      const idCalificacionTexto = buscarColumna(fila, "ID calificacion", "ID evaluación");
      const existente = idCalificacionTexto ? calificaciones.find((item) => Number(item.id_calificacion) === Number(idCalificacionTexto)) : null;
      if (!alumno) throw new Error(`Fila ${fila.__fila}: no encuentro un alumno único. Revisá el DNI o el apellido y nombre.`);
      if (idCalificacionTexto && (!existente || Number(existente.id_alumno) !== Number(alumno.id_alumno) || Number(existente.id_materia_dictada) !== Number(materiaId))) throw new Error(`Fila ${fila.__fila}: el ID de calificación no pertenece a este alumno y materia.`);
      if (!tipos.includes(tipo)) throw new Error(`Fila ${fila.__fila}: tipo inválido. Usá EXAMEN, TRABAJO, TP, PARCIAL u OTRO.`);
      if (!Number.isFinite(nota) || nota < 0 || nota > 10) throw new Error(`Fila ${fila.__fila}: la nota debe estar entre 0 y 10.`);
      if (!fecha) throw new Error(`Fila ${fila.__fila}: falta una fecha válida con formato AAAA-MM-DD o DD/MM/AAAA.`);
      if (descripcion.length > 5000) throw new Error(`Fila ${fila.__fila}: la devolución supera los 5000 caracteres.`);
      return { alumno, tipo, nota, fecha, descripcion, id_calificacion: existente?.id_calificacion || null, guardada: false };
    });
    setImportadas(filasImportadas);
    setMensaje(`${filasImportadas.length} calificaciones listas para revisar. Todavía no se guardaron.`);
    setErrorForm("");
  }
  async function guardarImportadas() {
    setGuardando(true); setErrorForm(""); setMensaje("");
    let guardadas = 0;
    try {
      for (let indice = 0; indice < importadas.length; indice += 1) {
        const fila = importadas[indice];
        if (fila.guardada) continue;
        const actualizado = Boolean(fila.id_calificacion);
        const data = await jsonFetch(`${API}/calificaciones${actualizado ? `/${fila.id_calificacion}` : ""}`, { method: actualizado ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), id_alumno: fila.alumno.id_alumno, tipo: fila.tipo, nota: fila.nota, fecha: fila.fecha, descripcion: fila.descripcion }) });
        guardadas += 1;
        setImportadas((actuales) => actuales.map((item, i) => i === indice ? { ...item, guardada: true, id_calificacion: item.id_calificacion || data.id_calificacion } : item));
      }
      const data = await jsonFetch(`${API}/calificaciones/docente/${usuario.id_usuario}`);
      setCalificaciones(data.calificaciones || []);
      setMensaje(`Se guardaron ${guardadas} calificaciones.`);
      setImportadas([]);
    } catch (e) { setErrorForm(`${e.message}${guardadas ? ` Se guardaron ${guardadas}; podés reintentar las filas pendientes.` : ""}`); }
    finally { setGuardando(false); }
  }
  function iniciarEdicion(calificacion) { setErrorForm(""); setMensaje(""); setEdicion({ id_calificacion: calificacion.id_calificacion, tipo: calificacion.tipo, nota: String(calificacion.nota), descripcion: calificacion.descripcion || "", fecha: String(calificacion.fecha).slice(0, 10) }); }
  async function guardarEdicion(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones/${edicion.id_calificacion}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edicion, id_usuario: usuario.id_usuario, nota: Number(edicion.nota) }) }); setCalificaciones((actuales) => actuales.map((item) => item.id_calificacion === edicion.id_calificacion ? { ...item, ...edicion, nota: Number(edicion.nota) } : item)); setMensaje(d.mensaje); setEdicion(null); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  return <AcademicLayout title="Calificaciones" description="Cargá notas y consultá las evaluaciones registradas." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={styles.form} onSubmit={guardar}><h2>Cargar calificación</h2><SelectorMateria materias={materias} value={materiaId} onChange={(v) => { setMateriaId(v); setForm({ ...form, id_alumno: "" }); setImportadas([]); }} /><label>Alumno<select required value={form.id_alumno} onChange={(e) => setForm({ ...form, id_alumno: e.target.value })}><option value="">Elegí un alumno</option>{alumnos.map((a) => <option key={a.id_alumno} value={a.id_alumno}>{a.apellido}, {a.nombre}</option>)}</select></label><label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Nota (0 a 10)<input type="number" min="0" max="10" step="0.01" required value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label><label>Fecha<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label><label>Devolución / descripción para el alumno<textarea rows="5" maxLength="5000" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Agregá comentarios que ayuden al alumno a entender la calificación…" /></label><button disabled={guardando || !materiaId}>{guardando ? "Guardando…" : "Guardar calificación"}</button></form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <p className={styles.notice}>Cargando calificaciones…</p>}
    {edicion && <form className={styles.form} onSubmit={guardarEdicion}><h2>Corregir calificación</h2><label>Tipo<select value={edicion.tipo} onChange={(e) => setEdicion({ ...edicion, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label><label>Nota (0 a 10)<input type="number" min="0" max="10" step="0.01" required value={edicion.nota} onChange={(e) => setEdicion({ ...edicion, nota: e.target.value })} /></label><label>Fecha<input type="date" required value={edicion.fecha} onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} /></label><label>Devolución / descripción<textarea rows="5" maxLength="5000" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></label><button type="button" className={styles.formButton} onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar corrección"}</button></form>}
    <section className={styles.tableCard}><div className={styles.tableTitle}><div><h2>Calificaciones registradas</h2><p>{calificaciones.length} registros</p></div><button className={styles.formButton} type="button" onClick={() => { const deMateria = calificaciones.filter((c) => Number(c.id_materia_dictada) === Number(materiaId)); descargarExcel("calificaciones", "Calificaciones", ["ID calificación", "DNI", "Apellido", "Nombre", "Materia", "Curso", "Tipo", "Descripción", "Nota", "Fecha"], deMateria.map((c) => [c.id_calificacion, c.alumno_dni || "", c.alumno_apellido, c.alumno_nombre, c.materia, `${c.anio}° ${c.division}`, c.tipo, c.descripcion || "", Number(c.nota), String(c.fecha).slice(0, 10)])); }} disabled={!calificaciones.length || !materiaId}>Descargar planilla de la materia</button></div><div className={styles.importPlanilla}><label>Importar calificaciones desde Excel/CSV<input type="file" accept=".xlsx,.csv" onChange={async (event) => { try { if (!materiaId) throw new Error("Elegí una materia antes de importar."); if (!alumnos.length) throw new Error("No hay alumnos cargados para la materia elegida."); await importarCalificaciones(event.target.files?.[0]); } catch (e) { setErrorForm(e.message); } finally { event.target.value = ""; } }} disabled={guardando} /></label><small>Usá DNI (o Apellido y Nombre), Tipo, Nota y Fecha. Descripción es opcional. El ID permite actualizar una nota existente; si está vacío se crea una nueva. Google Sheets: descargalo como Excel o CSV. Máximo 10 MB.</small></div>{importadas.length > 0 && <><p className={styles.notice}>{importadas.filter((fila) => fila.guardada).length} de {importadas.length} filas guardadas.</p><div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Tipo</th><th>Nota</th><th>Fecha</th><th>Devolución</th><th>Estado</th></tr></thead><tbody>{importadas.map((fila, index) => <tr key={`${fila.alumno.id_alumno}-${index}`}><td>{fila.alumno.apellido}, {fila.alumno.nombre} · {fila.alumno.dni || "Sin DNI"}</td><td>{fila.tipo}</td><td>{fila.nota}</td><td>{fila.fecha}</td><td>{fila.descripcion || "—"}</td><td>{fila.guardada ? "Guardada" : "Pendiente"}</td></tr>)}</tbody></table></div><button className={styles.formButton} type="button" onClick={guardarImportadas} disabled={guardando || importadas.every((fila) => fila.guardada)}>{guardando ? "Guardando…" : "Guardar calificaciones importadas"}</button></>}{!cargando && !calificaciones.length ? <p className={styles.panelEmpty}>Todavía no cargaste calificaciones.</p> : <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Materia</th><th>Evaluación</th><th>Nota</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{calificaciones.map((c) => <tr key={c.id_calificacion}><td><strong>{c.alumno_apellido}, {c.alumno_nombre}</strong></td><td>{c.materia} · {c.anio}° {c.division}</td><td>{c.tipo}{c.descripcion ? ` · ${c.descripcion}` : ""}</td><td><span className={styles.gradePill}>{c.nota}</span></td><td>{String(c.fecha).slice(0, 10)}</td><td><button className={styles.editRecordButton} type="button" onClick={() => iniciarEdicion(c)}>Editar nota</button></td></tr>)}</tbody></table></div>}</section>
  </AcademicLayout>;
}
