"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useAcademicUser, AcademicLayout, API, styles, colorMateria } from "./AcademicPage";
import { subirArchivo } from "@/lib/subirArchivo";
import { descargarExcel } from "@/lib/crearExcel";
import { buscarColumna, fechaPlanilla, leerPlanilla } from "@/lib/importarPlanilla";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { calcularPromedioNotas } from "@/lib/notas";

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

function SelectorMateria({ materias, value, onChange, placeholder = "Elegí una materia" }) {
  return <label>Materia<select value={value} onChange={(e) => onChange(e.target.value)} required><option value="">{placeholder}</option>{materias.map((m) => <option value={m.id_materia_dictada} key={m.id_materia_dictada}>{m.nombre} · {m.anio}° {m.division}</option>)}</select></label>;
}

function esNotaNumerica(nota) {
  return /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(String(nota ?? "").trim());
}

function ListaAdjuntos({ archivos, quitar }) {
  if (!archivos?.length) return null;
  return <ul className={styles.fileList}>{archivos.map((archivo) => <li key={archivo.url}><MaterialCard url={archivo.url} nombre={archivo.nombre} /><button type="button" onClick={() => quitar(archivo.url)} aria-label={`Quitar ${archivo.nombre}`}>×</button></li>)}</ul>;
}

function StyledFilePicker({ className = "", accept, multiple = false, onChange, disabled = false, buttonText, status, statusTitle, inputLabel }) {
  const inputRef = useRef(null);
  return <span className={`${styles.styledFilePicker} ${className}`}>
    <input ref={inputRef} className={styles.styledFileInput} type="file" accept={accept} multiple={multiple} onChange={onChange} disabled={disabled} aria-label={inputLabel} tabIndex={-1} />
    <button className={styles.styledFileButton} type="button" onClick={() => inputRef.current?.click()} disabled={disabled}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m21.4 11.1-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>{buttonText}</button>
    <span className={styles.styledFileName} title={statusTitle || status}>{status}</span>
  </span>;
}

function RoleHome({ rol, title, links }) {
  const usuario = useAcademicUser(rol);
  const [nombreSaludo, setNombreSaludo] = useState("");
  const [datos, setDatos] = useState({ materias: [], tareas: [], notas: [], asistencias: [] });
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (rol !== "DOCENTE" || !usuario?.id_usuario) return undefined;
    let vigente = true;
    fetch(`${API}/usuarios/${usuario.id_usuario}/perfil`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data.perfil; })
      .then((perfil) => { if (vigente) setNombreSaludo(String(perfil?.nombre || "").trim()); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [rol, usuario]);
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
            siguiente[key] = key === "notas" ? (data.calificaciones || []) : (data[key] || []);
          }
        });
        setDatos(siguiente);
      })
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, rol]);

  const pendientes = datos.tareas.filter((t) => rol === "ALUMNO" ? !t.id_entrega && t.estado === "ACTIVA" : t.estado === "ACTIVA");
  const promedio = calcularPromedioNotas(datos.notas);
  const inasistencias = datos.asistencias.filter((asistencia) => asistencia.estado === "AUSENTE").length;
  const tarjetas = rol === "ALUMNO"
    ? [["Materias", datos.materias.length], ["Tareas pendientes", pendientes.length], ["Calificaciones", datos.notas.length], ["Promedio numérico", promedio], ["Inasistencias", inasistencias]]
    : [["Cursos asignados", datos.materias.length], ["Tareas activas", pendientes.length], ["Calificaciones", datos.notas.length]];

  const nombreBienvenida = rol === "DOCENTE" ? (nombreSaludo || usuario?.username) : usuario?.username;
  return <AcademicLayout title={title} description={`Hola${nombreBienvenida ? `, ${nombreBienvenida}` : ""}. Este es tu resumen académico.`} usuario={usuario} links={links}>
    {cargando && <LoadingSpinner label="Cargando tu resumen…" />}
    <section className={styles.stats}>{tarjetas.map(([label, value], index) => { const destino = label.toLowerCase().includes("materia") || label.toLowerCase().includes("curso") ? "materias" : label.toLowerCase().includes("tarea") ? "tareas" : label.toLowerCase().includes("promedio") || label.toLowerCase().includes("calific") ? "calificaciones" : "asistencias"; const tono = [styles.statToneBlue, styles.statToneGreen, styles.statTonePurple, styles.statToneOrange][index % 4]; return <motion.div className={styles.statCardMotion} key={label} initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -4, scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.28, delay: index * 0.065, ease: "easeOut" }}><Link className={`${styles.statCard} ${styles.statCardLink} ${tono}`} href={`/${rol.toLowerCase()}/${destino}`}><span>{label}</span><strong>{cargando ? "…" : value}</strong><span className={styles.cardHint}>Abrir sección <b>›</b></span></Link></motion.div>; })}</section>
    <div className={styles.dashboardSections}>
      <div className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Mis materias" : "Materias asignadas"}</h2><p>{datos.materias.length} cursos activos</p></div><a href={`/${rol.toLowerCase()}/materias`}>Ver todas <span>›</span></a></div>
        {datos.materias.length ? <div className={styles.dashboardRows}>{datos.materias.slice(0, 4).map((materia) => <Link href={rol === "ALUMNO" ? `/alumno/materias/${materia.id_materia_dictada}` : `/docente/materias/${materia.id_materia_dictada}`} className={styles.dashboardRow} key={materia.id_materia_dictada}><span className={`${styles.rowIcon} ${styles.subjectColor}`} style={colorMateria(materia.id_materia_dictada)}>▤</span><div><strong>{materia.nombre}</strong><small>{materia.anio}° {materia.division} · {materia.orientacion || materia.rol}</small></div><span className={styles.rowArrow}>›</span></Link>)}</div> : <p className={styles.panelEmpty}>{cargando ? <LoadingSpinner inline label="Cargando materias…" /> : "No hay materias para mostrar todavía."}</p>}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>{rol === "ALUMNO" ? "Próximas tareas" : "Actividad reciente"}</h2><p>{rol === "ALUMNO" ? "Entregas pendientes" : "Tareas que publicaste"}</p></div><a href={`/${rol.toLowerCase()}/tareas`}>Ver todas <span>›</span></a></div>
        {datos.tareas.length ? <div className={styles.dashboardRows}>{datos.tareas.slice(0, 4).map((tarea) => <Link href={`/${rol.toLowerCase()}/tareas`} className={styles.dashboardRow} key={tarea.id_tarea}><span className={`${styles.rowIcon} ${styles.rowIconAccent}`}>☷</span><div><strong>{tarea.titulo}</strong><small>{tarea.materia} · {tarea.fecha_entrega ? new Date(tarea.fecha_entrega).toLocaleDateString("es-AR") : "Sin fecha límite"}</small></div><span className={styles.rowArrow}>›</span></Link>)}</div> : <p className={styles.panelEmpty}>{cargando ? <LoadingSpinner inline label="Cargando tareas…" /> : "No hay tareas publicadas."}</p>}
      </div>
    </div>
  </AcademicLayout>;
}

export function AlumnoHome() { return <RoleHome rol="ALUMNO" title="Inicio" links={LINKS_ALUMNO} />; }
export function DocenteHome() { return <RoleHome rol="DOCENTE" title="Inicio" links={LINKS_DOCENTE} />; }

function extensionMaterial(url, nombre = "") {
  const valor = `${nombre} ${url}`.toLowerCase().split(/[?#]/)[0];
  return valor.match(/\.(pdf|xlsx?|csv|docx?|pptx?|png|jpe?g|txt)$/)?.[1] || "";
}

function nombreMaterial(url, nombre = "") {
  if (nombre) return nombre;
  const extension = extensionMaterial(url);
  let path = String(url || "").split(/[?#]/)[0];
  try { path = decodeURIComponent(new URL(path, "https://educalink.invalid").pathname); } catch {}
  const base = path.split("/").filter(Boolean).pop() || "";
  const sinExtension = base.replace(/\.[^.]+$/, "");
  const limpia = sinExtension.replace(/(?:^|[-_])[0-9a-f]{8}-[0-9a-f-]{20,}$/i, "").replace(/[-_]+/g, " ").trim();
  const esRutaInterna = !/^https?:\/\//i.test(String(url || "")) || /\/uploads\//i.test(String(url || ""));
  if (!esRutaInterna && !extension) {
    try { return `Enlace · ${new URL(url).hostname.replace(/^www\./, "")}`; } catch {}
  }
  if (limpia && !/^[0-9a-f-]{20,}$/i.test(limpia)) return `${limpia.replace(/\b\w/g, (letra) => letra.toUpperCase())}${extension ? `.${extension}` : ""}`;
  if (!esRutaInterna) {
    try { return `Enlace · ${new URL(url).hostname.replace(/^www\./, "")}`; } catch {}
  }
  return extension === "pdf" ? "Documento PDF" : ["xlsx", "xls", "csv"].includes(extension) ? "Planilla" : extension ? `Archivo ${extension.toUpperCase()}` : "Material adjunto";
}

function iconoMaterial(url, nombre = "") {
  const extension = extensionMaterial(url, nombre);
  if (extension === "pdf") return "PDF";
  if (["xlsx", "xls", "csv"].includes(extension)) return "XLS";
  if (["doc", "docx"].includes(extension)) return "DOC";
  if (["ppt", "pptx"].includes(extension)) return "PPT";
  if (/^https?:\/\//i.test(String(url || "")) && !/\/uploads\//i.test(String(url || ""))) return "↗";
  return "▤";
}

function MaterialCard({ url, nombre = "" }) {
  if (!url) return null;
  const texto = nombreMaterial(url, nombre);
  const esArchivo = Boolean(extensionMaterial(url, nombre)) || /\/uploads\//i.test(String(url));
  return <a className={styles.materialCard} href={url} target="_blank" rel="noreferrer" title={texto} download={esArchivo ? (nombre || undefined) : undefined}>
    <span className={styles.materialIcon} aria-hidden="true">{iconoMaterial(url, nombre)}</span><span className={styles.materialName}>{texto}</span><span className={styles.materialAction} aria-hidden="true">{esArchivo ? "↓" : "↗"}</span>
  </a>;
}

function MaterialesTarea({ tarea, compact = false }) {
  const materiales = [
    ...(tarea.archivo_adjunto ? [{ url: tarea.archivo_adjunto, nombre: "" }] : []),
    ...(tarea.archivos_adjunto || []),
  ];
  if (!materiales.length) return null;
  return <div className={`${styles.taskMaterials} ${compact ? styles.taskMaterialsCompact : ""}`} aria-label="Materiales adjuntos">
    {compact && <small>{materiales.length} {materiales.length === 1 ? "archivo adjunto" : "archivos adjuntos"}</small>}
    {!compact && <strong>Materiales del docente</strong>}
    <div>{materiales.map((archivo, index) => <MaterialCard key={`${archivo.url}-${index}`} url={archivo.url} nombre={archivo.nombre} />)}</div>
  </div>;
}

export function TareasAlumno() {
  const usuario = useAcademicUser("ALUMNO");
  const { items, error, cargando } = useCarga("tareas/alumno", "tareas", usuario);
  const [filtro, setFiltro] = useState("TODAS");
  const [filtroMateria, setFiltroMateria] = useState("");
  const materiasDisponibles = [...new Set(items.map((tarea) => tarea.materia).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const visibles = items.filter((t) => (filtro === "TODAS" || (filtro === "ENTREGADAS" ? Boolean(t.id_entrega) : !t.id_entrega)) && (!filtroMateria || t.materia === filtroMateria));
  return <AcademicLayout title="Tareas" description="Revisá las consignas y seguí el estado de tus entregas." usuario={usuario} links={LINKS_ALUMNO}>
    <section className={styles.assignmentBoard}>
      <div className={styles.assignmentToolbar}><div><h2>Mis tareas</h2><p>{visibles.length} de {items.length} tareas</p></div><div className={styles.assignmentFilters}><div className={styles.filterTabs}>{[["TODAS", "Todas"], ["PENDIENTES", "Pendientes"], ["ENTREGADAS", "Entregadas"]].map(([id, label]) => <button type="button" className={filtro === id ? styles.filterActive : ""} onClick={() => setFiltro(id)} key={id}>{label}</button>)}</div><select value={filtroMateria} onChange={(event) => setFiltroMateria(event.target.value)} aria-label="Filtrar tareas por materia"><option value="">Todas las materias</option>{materiasDisponibles.map((materia) => <option key={materia} value={materia}>{materia}</option>)}</select></div></div>
      {cargando && <LoadingSpinner label="Cargando tareas…" />}{error && <p className={styles.error} role="alert">{error}</p>}
      {!cargando && !error && !visibles.length && <p className={styles.panelEmpty}>{filtro === "TODAS" && !filtroMateria ? "No hay tareas asignadas a tus cursos por el momento." : "No hay tareas en este filtro."}</p>}
      <div className={styles.assignmentList}>{visibles.map((t) => {
        const estado = t.estado_entrega || (t.id_entrega ? "ENTREGADA" : t.estado);
        const cantidadMateriales = (t.archivos_adjunto || []).length + (t.archivo_adjunto ? 1 : 0);
        return <article className={`${styles.assignmentRow} ${styles.studentTaskRow}`} key={t.id_tarea}>
          <div className={styles.studentTaskBody}>
            <div className={styles.studentTaskTop}><span className={styles.subjectPill}>{t.materia}</span><span className={`${styles.badge} ${styles[`badge${estado}`] || ""}`}>{estado}</span></div>
            <h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p>
            <div className={styles.studentTaskMeta}><span>{t.anio}° {t.division}</span><span>Vence: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha límite"}</span><span className={styles.attachmentCount}>{cantidadMateriales ? `▤ ${cantidadMateriales} ${cantidadMateriales === 1 ? "archivo adjunto" : "archivos adjuntos"}` : "Sin materiales adjuntos"}</span></div>
          </div>
          <Link className={styles.viewTaskButton} href={`/alumno/tareas/${t.id_tarea}`}>Ver tarea y entregar <span aria-hidden="true">›</span></Link>
        </article>;
      })}</div>
    </section>
  </AcademicLayout>;
}

export function TareaAlumnoDetalle({ idTarea }) {
  const usuario = useAcademicUser("ALUMNO");
  const { items, setItems, error, cargando } = useCarga("tareas/alumno", "tareas", usuario);
  const [campos, setCampos] = useState({ archivo: "", comentario: "", archivos: [] });
  const [mensaje, setMensaje] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const tarea = items.find((item) => String(item.id_tarea) === String(idTarea));
  useEffect(() => {
    if (!tarea?.id_entrega) return;
    setCampos({ archivo: tarea.archivo_entregado || "", comentario: tarea.comentario_entrega || "", archivos: tarea.archivos_entregados || [] });
  }, [tarea?.id_entrega]);

  async function adjuntarEntrega(event) {
    const seleccionados = Array.from(event.target.files || []);
    if (!seleccionados.length || !usuario) return;
    if ((campos.archivos?.length || 0) + seleccionados.length > 20) {
      setErrorForm("Podés adjuntar hasta 20 archivos por entrega."); event.target.value = ""; return;
    }
    setErrorForm(""); setMensaje(""); setSubiendoArchivo(true);
    try {
      for (const file of seleccionados) {
        const data = await subirArchivo(file, { idUsuario: usuario.id_usuario, contexto: "entrega", idTarea: Number(idTarea) });
        setCampos((actuales) => ({ ...actuales, archivos: [...(actuales.archivos || []), { url: data.url, nombre: data.nombre }] }));
      }
      setMensaje(`${seleccionados.length} archivo${seleccionados.length === 1 ? "" : "s"} adjuntado${seleccionados.length === 1 ? "" : "s"}.`);
    } catch (e) { setErrorForm(e.message); }
    finally { setSubiendoArchivo(false); event.target.value = ""; }
  }

  async function entregar(event) {
    event.preventDefault(); setErrorForm(""); setMensaje(""); setGuardando(true);
    try {
      const resultado = await jsonFetch(`${API}/tareas/${idTarea}/entregas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, ...campos }) });
      setMensaje(resultado.mensaje);
      const actualizadas = await jsonFetch(`${API}/tareas/alumno/${usuario.id_usuario}`);
      setItems(actualizadas.tareas || []);
    } catch (e) { setErrorForm(e.message); }
    finally { setGuardando(false); }
  }

  function quitarArchivo(url) { setCampos((actuales) => ({ ...actuales, archivos: actuales.archivos.filter((archivo) => archivo.url !== url) })); }
  const estadoEntrega = tarea?.estado_entrega || (tarea?.id_entrega ? "ENTREGADA" : tarea?.estado);
  const materiales = tarea ? (tarea.archivos_adjunto || []).length + (tarea.archivo_adjunto ? 1 : 0) : 0;
  const fechaLimite = tarea?.fecha_entrega ? new Date(tarea.fecha_entrega).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha límite";

  return <AcademicLayout title="Detalle de tarea" description="Revisá la consigna y prepará tu entrega." usuario={usuario} links={LINKS_ALUMNO}>
    <Link className={styles.backLink} href="/alumno/tareas">‹ Volver a mis tareas</Link>
    {cargando && <LoadingSpinner label="Cargando tarea…" />}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!cargando && !error && !tarea && <p className={styles.panelEmpty}>No encontramos esta tarea en tus cursos.</p>}
    {tarea && <div className={styles.taskDetailLayout}>
      <section className={styles.taskDetailCard}>
        <div className={styles.taskDetailHeading}><div><span className={styles.subjectPill}>{tarea.materia} · {tarea.anio}° {tarea.division}</span><h2>{tarea.titulo}</h2></div><span className={`${styles.badge} ${styles[`badge${estadoEntrega}`] || ""}`}>{estadoEntrega}</span></div>
        <dl className={styles.taskFacts}><div><dt>Fecha límite</dt><dd>{fechaLimite}</dd></div><div><dt>Estado de la tarea</dt><dd>{tarea.estado}</dd></div></dl>
        <section className={styles.taskPrompt}><h3>Consigna</h3><p>{tarea.descripcion || "El docente no agregó una consigna adicional."}</p></section>
        <MaterialesTarea tarea={tarea} />
      </section>
      <section className={styles.taskDetailCard}>
        <div className={styles.taskDetailSectionHeading}><div><h2>Entrega</h2><p>{tarea.id_entrega ? "Podés actualizar tu entrega mientras la tarea siga activa." : "Completá los campos para enviar tu trabajo."}</p></div></div>
        {tarea.estado === "ACTIVA" ? <form className={`${styles.deliveryForm} ${styles.detailDeliveryForm}`} onSubmit={entregar}>
          <label>Enlace o ruta<input value={campos.archivo} onChange={(event) => setCampos({ ...campos, archivo: event.target.value })} placeholder="Pegá un enlace" /></label>
          <label>Adjuntar archivos<StyledFilePicker accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple onChange={adjuntarEntrega} disabled={subiendoArchivo} buttonText="Adjuntar archivos" inputLabel="Adjuntar archivos para la entrega" status={subiendoArchivo ? "Subiendo archivos…" : !campos.archivos.length ? "Ningún archivo seleccionado" : campos.archivos.length === 1 ? campos.archivos[0].nombre : `${campos.archivos.length} archivos adjuntos`} statusTitle={campos.archivos.map((archivo) => archivo.nombre).join(", ")} /><small>{subiendoArchivo ? <LoadingSpinner inline label="Subiendo archivos…" /> : "Hasta 10 MB por archivo"}</small><ListaAdjuntos archivos={campos.archivos} quitar={quitarArchivo} /></label>
          <label>Comentario<textarea rows="1" value={campos.comentario} onChange={(event) => setCampos({ ...campos, comentario: event.target.value })} placeholder="Escribí un comentario" /></label>
          <div className={styles.deliveryAction}><label className={styles.invisibleDeliveryLabel} aria-hidden="true">.</label><button type="submit" disabled={guardando || subiendoArchivo}>{guardando ? <LoadingSpinner inline label="Enviando…" /> : tarea.id_entrega ? "Volver a entregar" : "Entregar"}</button></div>
        </form> : <p className={styles.panelEmpty}>Esta tarea está cerrada y ya no acepta entregas.</p>}
        {errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{mensaje && <p className={styles.notice}>{mensaje}</p>}
      </section>
      <section className={styles.taskDetailCard}>
        <div className={styles.taskDetailSectionHeading}><div><h2>Historial de entrega</h2><p>Estado y archivos de tu último envío.</p></div><span className={`${styles.badge} ${styles[`badge${estadoEntrega}`] || ""}`}>{estadoEntrega}</span></div>
        {tarea.id_entrega ? <div className={styles.deliveryHistory}>
          <p><strong>Entregado</strong><span>{tarea.fecha_entrega_real ? new Date(tarea.fecha_entrega_real).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }) : "Fecha no disponible"}</span></p>
          {tarea.comentario_entrega && <p><strong>Comentario enviado</strong><span>{tarea.comentario_entrega}</span></p>}
          {tarea.archivo_entregado && <div><strong>Enlace o ruta enviada</strong><MaterialCard url={tarea.archivo_entregado} /></div>}
          {(tarea.archivos_entregados || []).length > 0 && <div><strong>Archivos entregados</strong><div className={styles.taskMaterialItems}>{tarea.archivos_entregados.map((archivo) => <MaterialCard key={archivo.url} url={archivo.url} nombre={archivo.nombre} />)}</div></div>}
          {tarea.devolucion_docente && <p className={styles.teacherFeedback}><strong>Devolución del docente</strong><span>{tarea.devolucion_docente}</span></p>}
        </div> : <p className={styles.panelEmpty}>Todavía no enviaste una entrega.</p>}
      </section>
    </div>}
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
  const [filtroCursoMateria, setFiltroCursoMateria] = useState("");
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

  const cursosMateria = [...new Map(tareas.map((tarea) => {
    const id = String(tarea.id_materia_dictada ?? `${tarea.materia}-${tarea.anio}-${tarea.division}`);
    return [id, { id, etiqueta: `${tarea.anio}° ${tarea.division} · ${tarea.materia}` }];
  })).values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  const tareasVisibles = filtroCursoMateria ? tareas.filter((tarea) => String(tarea.id_materia_dictada ?? `${tarea.materia}-${tarea.anio}-${tarea.division}`) === filtroCursoMateria) : tareas;

  return <AcademicLayout title="Tareas" description="Publicá consignas y revisá las entregas de tus cursos." usuario={usuario} links={LINKS_DOCENTE}>
    <form className={`${styles.form} ${styles.taskPublishForm}`} onSubmit={publicar}>
      <h2>Publicar tarea</h2>
      <SelectorMateria materias={materias} value={form.id_materia_dictada} onChange={(v) => setForm({ ...form, id_materia_dictada: v })} />
      <label>Título<input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength="150" placeholder="Ej: Trabajo Práctico N°1" /></label>
      <label>Fecha límite<input type="datetime-local" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} /></label>
      <label>Consigna y comentarios para el curso<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows="6" maxLength="10000" placeholder="Explicá la actividad, criterios y materiales que deben tener en cuenta…" /></label>
      <div className={styles.taskPublishBottomRow}>
        <label className={styles.taskPublishBottomLabel}>Enlace al material<input value={form.archivo_adjunto} onChange={(e) => setForm({ ...form, archivo_adjunto: e.target.value })} maxLength="255" placeholder="https://…" /></label>
        <label className={styles.taskPublishBottomLabel}>Adjuntar archivos
          <StyledFilePicker accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple onChange={(event) => adjuntarMaterial(event, "nueva")} disabled={subiendoMaterial === "nueva"} buttonText="Adjuntar archivos" inputLabel="Seleccionar archivos para la tarea" status={subiendoMaterial === "nueva" ? "Subiendo archivos…" : form.archivos_adjunto.length === 0 ? "Ningún archivo seleccionado" : form.archivos_adjunto.length === 1 ? form.archivos_adjunto[0].nombre : `${form.archivos_adjunto.length} archivos adjuntos`} statusTitle={form.archivos_adjunto.map((archivo) => archivo.nombre).join(", ")} />
          <small>{subiendoMaterial === "nueva" ? <LoadingSpinner inline label="Subiendo archivos…" /> : "Hasta 10 MB por archivo"}</small>
        </label>
        <div className={styles.taskPublishAction}>
          <label className={`${styles.taskPublishBottomLabel} invisible select-none text-sm font-medium mb-2`} aria-hidden="true">.</label>
          <button disabled={guardando || !usuario || Boolean(subiendoMaterial)}>{guardando ? <LoadingSpinner inline label="Publicando…" /> : "Publicar tarea"}</button>
        </div>
      </div>
      <ListaAdjuntos archivos={form.archivos_adjunto} quitar={(url) => quitarAdjuntoMaterial("nueva", url)} />
    </form>
    {mensaje && <p className={styles.notice}>{mensaje}</p>}{errorForm && <p className={styles.error} role="alert">{errorForm}</p>}{error && <p className={styles.error}>{error}</p>}{cargando && <LoadingSpinner label="Cargando tareas…" />}
    <section className={styles.assignmentBoard}>
      <div className={styles.assignmentToolbar}>
        <div><h2>Tareas publicadas</h2><p>{tareasVisibles.length} de {tareas.length} tareas</p></div>
        <label className={styles.assignmentCourseFilter}>Curso / Materia
          <select value={filtroCursoMateria} onChange={(event) => setFiltroCursoMateria(event.target.value)} aria-label="Filtrar tareas por curso o materia">
            <option value="">Todos los cursos</option>
            {cursosMateria.map((curso) => <option value={curso.id} key={curso.id}>{curso.etiqueta}</option>)}
          </select>
        </label>
      </div>
      {!cargando && !tareas.length && <p className={styles.panelEmpty}>Todavía no publicaste tareas.</p>}
      {!cargando && tareas.length > 0 && !tareasVisibles.length && <p className={styles.panelEmpty}>No hay tareas para el curso seleccionado.</p>}
      <div className={styles.assignmentList}>
        {tareasVisibles.map((t) => <article className={styles.assignmentRow} key={t.id_tarea}>
          <div className={styles.assignmentMain}><span className={styles.subjectPill}>{t.materia}</span><div>
            <h3>{t.titulo}</h3><p>{t.descripcion || "Sin descripción"}</p>
            <small>{t.anio}° {t.division} · Límite: {t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleString("es-AR") : "Sin fecha"}</small>
            <MaterialesTarea tarea={t} compact />
          </div></div>
          <div className={styles.assignmentStatus}>
            <span className={`${styles.badge} ${t.estado === "ACTIVA" ? styles.badgeACTIVA : ""}`}>{t.estado}</span><small>{t.cantidad_entregas} entregas</small>
            <div className={styles.workflowActions}>
              <button type="button" onClick={() => alternarEntregas(t)}>{tareaRevision === t.id_tarea ? "Ocultar entregas" : `Ver entregas (${t.cantidad_entregas})`}</button>
              <button type="button" onClick={() => iniciarEdicion(t)}>Editar</button>
              <button type="button" className={t.estado === "ACTIVA" ? styles.closeTaskButton : styles.reopenTaskButton} disabled={guardando} onClick={() => cambiarEstado(t)}>{t.estado === "ACTIVA" ? "Cerrar tarea" : "Reabrir"}</button>
            </div>
          </div>
          {edicion?.id_tarea === t.id_tarea && <form className={styles.workflowEditForm} onSubmit={guardarEdicion}>
            <h3>Editar tarea</h3>
            <label>Título<input value={edicion.titulo} onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })} required maxLength="150" /></label>
            <label>Fecha límite<input type="datetime-local" value={edicion.fecha_entrega} onChange={(e) => setEdicion({ ...edicion, fecha_entrega: e.target.value })} /></label>
            <label>Descripción<textarea rows="6" maxLength="10000" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} /></label>
            <label>Enlace al material adjunto<input value={edicion.archivo_adjunto} onChange={(e) => setEdicion({ ...edicion, archivo_adjunto: e.target.value })} maxLength="255" /></label>
            <label>Adjuntar archivos<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={(event) => adjuntarMaterial(event, "edicion")} disabled={subiendoMaterial === "edicion"} /><small>{subiendoMaterial === "edicion" ? <LoadingSpinner inline label="Subiendo archivos…" /> : "Hasta 10 MB por archivo"}</small></label>
            <ListaAdjuntos archivos={edicion.archivos_adjunto || []} quitar={(url) => quitarAdjuntoMaterial("edicion", url)} />
            <div className={styles.workflowFormActions}><button type="button" onClick={() => setEdicion(null)}>Cancelar</button><button type="submit" disabled={guardando || Boolean(subiendoMaterial)}>{guardando ? <LoadingSpinner inline label="Guardando…" /> : "Guardar cambios"}</button></div>
          </form>}
          {tareaRevision === t.id_tarea && <section className={styles.deliveryReview}>
            <div className={styles.deliveryReviewHeading}><div><h3>Entregas recibidas</h3><p>{entregas.length} de {t.cantidad_entregas} entregas</p></div></div>
            {cargandoEntregas ? <p className={styles.panelEmpty}><LoadingSpinner inline label="Cargando entregas…" /></p> : !entregas.length ? <p className={styles.panelEmpty}>Todavía no hay entregas para esta tarea.</p> : <div className={styles.deliveryReviewList}>
              {entregas.map((entrega) => <article className={styles.deliveryReviewCard} key={entrega.id_entrega}>
                <div className={styles.deliveryStudent}><div><strong>{entrega.apellido}, {entrega.nombre}</strong><small>Entregó {entrega.fecha_entrega ? new Date(entrega.fecha_entrega).toLocaleString("es-AR") : ""}</small></div><span className={`${styles.badge} ${styles[`badge${entrega.estado}`] || ""}`}>{entrega.estado}</span></div>
                {entrega.archivo && <MaterialCard url={entrega.archivo} />}
                {(entrega.archivos || []).map((archivo) => <MaterialCard key={archivo.url} url={archivo.url} nombre={archivo.nombre} />)}
                {entrega.comentario && <p className={styles.studentComment}><strong>Comentario del alumno</strong>{entrega.comentario}</p>}
                <form className={styles.feedbackForm} onSubmit={(event) => guardarDevolucion(event, entrega)}><label>Devolución para el alumno<textarea rows="5" required maxLength="5000" value={devoluciones[entrega.id_entrega] || ""} onChange={(event) => setDevoluciones({ ...devoluciones, [entrega.id_entrega]: event.target.value })} placeholder="Escribí tus observaciones sobre la entrega" /></label><button type="submit" disabled={guardandoEntrega === entrega.id_entrega}>{guardandoEntrega === entrega.id_entrega ? <LoadingSpinner inline label="Guardando devolución…" /> : entrega.estado === "CORREGIDA" ? "Actualizar devolución" : "Guardar y marcar corregida"}</button></form>
              </article>)}
            </div>}
          </section>}
        </article>)}
      </div>
    </section>
  </AcademicLayout>;
}

export function AsistenciasDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const [materiaId, setMateriaId] = useState("");
  const [fecha, setFecha] = useState(fechaLocalActual());
  const [fechaExcelDesde, setFechaExcelDesde] = useState("");
  const [fechaExcelHasta, setFechaExcelHasta] = useState("");
  const [alumnos, setAlumnos] = useState([]);
  const [estado, setEstado] = useState({});
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [seccionAsistencia, setSeccionAsistencia] = useState("cargar");
  const [historialAsistencias, setHistorialAsistencias] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [archivoAsistenciaNombre, setArchivoAsistenciaNombre] = useState("");
  const [importandoAsistencia, setImportandoAsistencia] = useState(false);

  useEffect(() => {
    if (!usuario || !materiaId || !fecha) {
      setAlumnos([]);
      setEstado({});
      setCargando(false);
      return;
    }
    let vigente = true;
    setAlumnos([]);
    setEstado({});
    setCargando(true);
    setError("");
    jsonFetch(`${API}/asistencias/docente/${usuario.id_usuario}/materia/${materiaId}/alumnos?fecha=${fecha}`)
      .then((data) => {
        if (vigente) {
          setAlumnos(data.alumnos || []);
          setEstado(Object.fromEntries((data.alumnos || []).map((alumno) => [alumno.id_alumno, { estado: alumno.estado || "PRESENTE", observacion: alumno.observacion || "" }])));
        }
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [usuario, materiaId, fecha]);

  useEffect(() => {
    if (seccionAsistencia !== "planilla" || !materiaId || !usuario?.id_usuario) {
      setHistorialAsistencias([]);
      setCargandoHistorial(false);
      return undefined;
    }
    if (fechaExcelDesde && fechaExcelHasta && fechaExcelDesde > fechaExcelHasta) {
      setHistorialAsistencias([]);
      setCargandoHistorial(false);
      return undefined;
    }
    let vigente = true;
    const parametros = new URLSearchParams();
    if (fechaExcelDesde) parametros.set("desde", fechaExcelDesde);
    if (fechaExcelHasta) parametros.set("hasta", fechaExcelHasta);
    const query = parametros.toString();
    setCargandoHistorial(true);
    setError("");
    jsonFetch(`${API}/asistencias/docente/${usuario.id_usuario}/materia/${materiaId}/reporte${query ? `?${query}` : ""}`)
      .then((data) => vigente && setHistorialAsistencias(data.asistencias || []))
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargandoHistorial(false));
    return () => { vigente = false; };
  }, [seccionAsistencia, materiaId, usuario, fechaExcelDesde, fechaExcelHasta]);

  async function guardar() {
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      const data = await jsonFetch(`${API}/asistencias/lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_materia_dictada: Number(materiaId),
          fecha,
          asistencias: alumnos.map((alumno) => ({ id_alumno: alumno.id_alumno, ...(estado[alumno.id_alumno] || {}) })),
        }),
      });
      setMensaje(data.mensaje || "Asistencias guardadas.");
    } catch (e) {
      setError(e instanceof TypeError && e.message === "Failed to fetch"
        ? "No se pudo conectar con el servidor para guardar las asistencias. Verificá que la API esté disponible e intentá nuevamente."
        : e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function exportarAsistencias() {
    setError("");
    setMensaje("");
    if (fechaExcelDesde && fechaExcelHasta && fechaExcelDesde > fechaExcelHasta) {
      setError("La fecha Desde no puede ser posterior a Hasta.");
      return;
    }
    setExportando(true);
    try {
      const parametros = new URLSearchParams();
      if (fechaExcelDesde) parametros.set("desde", fechaExcelDesde);
      if (fechaExcelHasta) parametros.set("hasta", fechaExcelHasta);
      const query = parametros.toString();
      const data = await jsonFetch(`${API}/asistencias/docente/${usuario.id_usuario}/materia/${materiaId}/reporte${query ? `?${query}` : ""}`);
      const asistencias = data.asistencias || [];
      if (!asistencias.length) {
        setMensaje("No hay registros de Asistencia del usuario");
        return;
      }
      const materia = materias.find((item) => Number(item.id_materia_dictada) === Number(materiaId));
      const periodo = fechaExcelDesde || fechaExcelHasta ? `${fechaExcelDesde || "inicio"}-${fechaExcelHasta || "actualidad"}` : "todas-las-fechas";
      const faltasPorAlumno = new Map(alumnos.map((alumno) => [Number(alumno.id_alumno), {
        alumno: `${alumno.apellido}, ${alumno.nombre}`,
        faltas: 0,
        justificadas: 0,
      }]));
      asistencias.forEach((item) => {
        const idAlumno = Number(item.id_alumno);
        const acumulado = faltasPorAlumno.get(idAlumno) || { alumno: `${item.apellido}, ${item.nombre}`, faltas: 0, justificadas: 0 };
        if (item.estado === "TARDE") acumulado.faltas += 0.25;
        if (item.estado === "AUSENTE" || item.estado === "JUSTIFICADO") acumulado.faltas += 1;
        if (item.estado === "JUSTIFICADO") acumulado.justificadas += 1;
        faltasPorAlumno.set(idAlumno, acumulado);
      });
      const resumenDerecho = {
        encabezados: ["Resumen de faltas", "Faltas equivalentes", "Faltas justificadas"],
        filas: [...faltasPorAlumno.values()]
          .sort((a, b) => a.alumno.localeCompare(b.alumno, "es"))
          .map((item) => [item.alumno, Number(item.faltas.toFixed(2)), item.justificadas]),
      };
      descargarExcel(`asistencia-${materia?.nombre || "curso"}-${periodo}`, "Asistencia", ["Fecha", "DNI", "Apellido", "Nombre", "Materia", "Curso", "Estado", "Observación"], asistencias.map((item) => [String(item.fecha).slice(0, 10), item.dni || "", item.apellido, item.nombre, item.materia, `${item.anio}° ${item.division}`, item.estado, item.observacion || ""]), resumenDerecho);
      setMensaje(`Se exportaron ${asistencias.length} registros de asistencia y el resumen de faltas de ${faltasPorAlumno.size} alumnos.`);
    } catch (e) { setError(e.message); }
    finally { setExportando(false); }
  }

  function descargarPlantillaAsistencia() {
    const materia = materias.find((item) => Number(item.id_materia_dictada) === Number(materiaId));
    if (!materia || !alumnos.length) {
      setError("Elegí una materia con alumnos antes de descargar la plantilla.");
      return;
    }
    const curso = `${materia.anio}° ${materia.division}`;
    const filas = [...alumnos]
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
      .map((alumno) => [fecha, alumno.dni || "", alumno.apellido, alumno.nombre, materia.nombre, curso, "", ""]);
    descargarExcel(
      `plantilla-asistencia-${materia.nombre}-${fecha}`,
      "Asistencia",
      ["Fecha", "DNI", "Apellido", "Nombre", "Materia", "Curso", "Estado", "Observación"],
      filas,
      undefined,
      [{ rango: `G2:G${filas.length + 1}`, valores: ["Presente", "Tarde", "Ausente", "Justificado"] }],
    );
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
    if (fechaArchivo && fechaArchivo !== fecha) throw new Error("La fecha de la planilla no coincide con la elegida arriba. Cambiala en la pantalla y volvé a importar.");
    setEstado((actual) => ({ ...actual, ...nuevas }));
    setMensaje(`Se cargaron ${vistos.size} asistencias en la pantalla. Revisalas y tocá “Guardar asistencia”.`);
    setError("");
    setSeccionAsistencia("cargar");
  }

  async function seleccionarArchivoAsistencia(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setArchivoAsistenciaNombre(file.name);
    setImportandoAsistencia(true);
    try {
      if (!materiaId) throw new Error("Elegí una materia antes de importar.");
      if (!alumnos.length) throw new Error("No hay alumnos cargados para la materia elegida.");
      await importarAsistencia(file);
    } catch (e) {
      setError(e.message);
    } finally {
      input.value = "";
      setImportandoAsistencia(false);
    }
  }

  return <AcademicLayout title="Asistencias" description="Registrá, importá y exportá la asistencia de tus cursos." usuario={usuario} links={LINKS_DOCENTE}>
    <section className={styles.panel}>
      <div className={styles.filterBar}>
        <SelectorMateria materias={materias} value={materiaId} onChange={setMateriaId} />
        <label>Fecha de asistencia<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      </div>
      <div className={styles.workflowSectionTabs} role="tablist" aria-label="Secciones de asistencia">
        {[["cargar", "Cargar asistencia"], ["planilla", "Planilla y exportación"], ["importar", "Importar desde Excel"]].map(([id, titulo]) => <button key={id} type="button" role="tab" aria-selected={seccionAsistencia === id} className={seccionAsistencia === id ? styles.workflowSectionTabActive : ""} onClick={() => setSeccionAsistencia(id)}>{titulo}</button>)}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {mensaje && <p className={styles.notice} role="status">{mensaje}</p>}
      {cargando && <LoadingSpinner label="Cargando alumnos…" />}
      {!cargando && materiaId && alumnos.length === 0 && !error && <p className={styles.panelEmpty}>No hay alumnos activos en este curso.</p>}

      {seccionAsistencia === "cargar" && <div className={styles.workflowPanel} role="tabpanel">
        <div className={styles.tableTitle}>
          <div><h2>Asistencia del curso</h2><p>{alumnos.length} alumnos · {fecha}</p></div>
          <button className={styles.formButton} type="button" onClick={guardar} disabled={!materiaId || !alumnos.length || cargando || guardando}>{guardando ? <LoadingSpinner inline label="Guardando…" /> : "Guardar asistencia"}</button>
        </div>
        {!materiaId ? <p className={styles.attendanceEmptyState}>Seleccioná una materia arriba para cargar la asistencia.</p> : alumnos.length > 0 && <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>DNI</th><th>Estado</th><th>Observación</th></tr></thead><tbody>{alumnos.map((alumno) => <tr key={alumno.id_alumno}><td><strong>{alumno.apellido}, {alumno.nombre}</strong></td><td>{alumno.dni || "—"}</td><td><select value={estado[alumno.id_alumno]?.estado || "PRESENTE"} onChange={(e) => setEstado({ ...estado, [alumno.id_alumno]: { ...estado[alumno.id_alumno], estado: e.target.value } })}>{[["PRESENTE", "Presente"], ["TARDE", "Tarde"], ["AUSENTE", "Ausente"], ["JUSTIFICADO", "Justificado"]].map(([valorEstado, etiquetaEstado]) => <option key={valorEstado} value={valorEstado}>{etiquetaEstado}</option>)}</select></td><td><input value={estado[alumno.id_alumno]?.observacion || ""} onChange={(e) => setEstado({ ...estado, [alumno.id_alumno]: { ...estado[alumno.id_alumno], observacion: e.target.value } })} /></td></tr>)}</tbody></table></div>}
      </div>}

      {seccionAsistencia === "planilla" && <div className={styles.workflowPanel} role="tabpanel">
        <div className={styles.excelExportBar}>
          <div className={styles.excelExportHeading}><strong>Exportar asistencias registradas</strong><small>Elegí una fecha puntual o un período. Dejá ambas fechas vacías para incluir todo el historial de esta materia.</small></div>
          <label>Desde<input type="date" value={fechaExcelDesde} onChange={(e) => setFechaExcelDesde(e.target.value)} /></label>
          <label>Hasta<input type="date" value={fechaExcelHasta} onChange={(e) => setFechaExcelHasta(e.target.value)} /></label>
          <div className={styles.excelExportAction}><label className="invisible select-none text-sm font-medium mb-2" aria-hidden="true">.</label><button className={styles.formButton} type="button" onClick={exportarAsistencias} disabled={!materiaId || exportando}>{exportando ? <LoadingSpinner inline label="Preparando Excel…" /> : "Exportar Excel"}</button></div>
        </div>
        <section className={styles.attendanceHistory} aria-label="Historial de asistencia">
          <div className={styles.tableTitle}><div><h2>Historial de asistencias</h2><p>{historialAsistencias.length} registros en la materia seleccionada</p></div></div>
          {fechaExcelDesde && fechaExcelHasta && fechaExcelDesde > fechaExcelHasta ? <p className={styles.panelEmpty}>La fecha Desde no puede ser posterior a Hasta.</p> : cargandoHistorial ? <p className={styles.panelEmpty}><LoadingSpinner inline label="Cargando historial…" /></p> : !materiaId ? <p className={styles.panelEmpty}>Seleccioná una materia para consultar el historial.</p> : !historialAsistencias.length ? <p className={styles.panelEmpty}>No hay registros de Asistencia del usuario</p> : <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Fecha</th><th>Estado</th><th>Observación</th></tr></thead><tbody>{historialAsistencias.map((registro) => <tr key={registro.id_asistencia}><td><strong>{registro.apellido}, {registro.nombre}</strong></td><td>{String(registro.fecha).slice(0, 10).split("-").reverse().join("/")}</td><td><span className={`${styles.badge} ${styles[`badge${registro.estado}`] || ""}`}>{registro.estado}</span></td><td>{registro.observacion || "—"}</td></tr>)}</tbody></table></div>}
        </section>
      </div>}

      {seccionAsistencia === "importar" && <div className={styles.workflowPanel} role="tabpanel">
        <div className={styles.importPlanilla}>
          <strong className={styles.importTitle}>Plantilla para completar</strong>
          <p className={styles.importInstructions}>Descargá el Excel con la fecha, materia, curso y datos de los alumnos. Completá Estado y Observación y luego importalo en esta pestaña.</p>
          <button className={`${styles.formButton} ${styles.templateDownloadButton}`} type="button" onClick={descargarPlantillaAsistencia} disabled={!materiaId || !alumnos.length || cargando}>{cargando ? <LoadingSpinner inline label="Cargando alumnos…" /> : "Descargar plantilla Excel"}</button>
        </div>
        <div className={styles.importPlanilla}>
          <strong className={styles.importTitle}>Importar asistencia desde Excel o CSV</strong>
          <p className={styles.importInstructions}>Seleccioná la planilla completada para cargar los estados. La fecha y la materia del archivo deben coincidir con las elegidas arriba.</p>
          <p className={styles.importColumns}><b>Columnas:</b> Fecha, DNI, Apellido, Nombre, Materia, Curso, Estado y Observación. El estado debe ser Presente, Tarde, Ausente o Justificado.</p>
          <label className={styles.gradeImportFileField}>Adjuntar archivo Excel / CSV
            <StyledFilePicker accept=".xlsx,.csv" onChange={seleccionarArchivoAsistencia} disabled={!alumnos.length || cargando || importandoAsistencia} buttonText="Adjuntar archivo Excel / CSV" inputLabel="Adjuntar archivo Excel o CSV con asistencias" status={importandoAsistencia ? "Procesando archivo…" : archivoAsistenciaNombre || "Ningún archivo seleccionado"} />
          </label>
          <small>Una fecha por archivo. Máximo 10 MB. Al terminar, podrás revisar las filas en “Cargar asistencia” antes de guardarlas.</small>
        </div>
      </div>}
    </section>
  </AcademicLayout>;
}
export function CalificacionesDocente() {
  const usuario = useAcademicUser("DOCENTE");
  const { items: materias } = useCarga("materias/docente", "materias", usuario);
  const { items: calificaciones, setItems: setCalificaciones, error, cargando } = useCarga("calificaciones/docente", "calificaciones", usuario);
  const [materiaId, setMateriaId] = useState(""); const [alumnos, setAlumnos] = useState([]); const [cargandoAlumnos, setCargandoAlumnos] = useState(false); const [form, setForm] = useState({ id_alumno: "", tipo: "TRABAJO", nota: "", descripcion: "", fecha: fechaLocalActual() });
  const [edicion, setEdicion] = useState(null);
  const [mensaje, setMensaje] = useState(""); const [errorForm, setErrorForm] = useState(""); const [guardando, setGuardando] = useState(false);
  const [importadas, setImportadas] = useState([]);
  const [archivoCalificacionesNombre, setArchivoCalificacionesNombre] = useState("");
  const [importandoCalificaciones, setImportandoCalificaciones] = useState(false);
  const [seccionCalificaciones, setSeccionCalificaciones] = useState("cargar");
  const [modoCargaNotas, setModoCargaNotas] = useState("individual");
  const [notasCurso, setNotasCurso] = useState({});
  const [buscarNota, setBuscarNota] = useState("");
  const [tipoNotaFiltro, setTipoNotaFiltro] = useState("");
  const [fechaNotaDesde, setFechaNotaDesde] = useState("");
  const [fechaNotaHasta, setFechaNotaHasta] = useState("");
  const [fechaPlantillaNotas, setFechaPlantillaNotas] = useState(fechaLocalActual());
  useEffect(() => {
    if (!usuario || !materiaId) { setAlumnos([]); setCargandoAlumnos(false); return; }
    let vigente = true;
    setAlumnos([]);
    setCargandoAlumnos(true);
    jsonFetch(`${API}/materias/docente/${usuario.id_usuario}/${materiaId}/alumnos`)
      .then((d) => vigente && setAlumnos(d.alumnos || []))
      .catch((e) => vigente && setErrorForm(e.message))
      .finally(() => vigente && setCargandoAlumnos(false));
    return () => { vigente = false; };
  }, [usuario, materiaId]);
  async function guardar(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), ...form, id_alumno: Number(form.id_alumno), nota: form.nota }) }); setMensaje(d.mensaje); window.location.reload(); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  async function guardarNotasCurso(event) {
    event.preventDefault();
    const calificaciones = alumnos.filter((alumno) => String(notasCurso[alumno.id_alumno]?.nota || "").trim()).map((alumno) => ({
      id_alumno: alumno.id_alumno,
      tipo: form.tipo,
      nota: String(notasCurso[alumno.id_alumno].nota).trim(),
      fecha: form.fecha,
      descripcion: String(notasCurso[alumno.id_alumno]?.descripcion || "").trim(),
    }));
    if (!materiaId) { setErrorForm("Elegí una materia antes de cargar las calificaciones."); return; }
    if (!form.fecha) { setErrorForm("Elegí una fecha para las calificaciones del curso."); return; }
    if (!calificaciones.length) { setErrorForm("Completá la nota de al menos un alumno."); return; }
    setGuardando(true); setErrorForm(""); setMensaje("");
    try {
      const data = await jsonFetch(`${API}/calificaciones/lote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_usuario: usuario.id_usuario, id_materia_dictada: Number(materiaId), calificaciones }) });
      const actualizadas = await jsonFetch(`${API}/calificaciones/docente/${usuario.id_usuario}`);
      setCalificaciones(actualizadas.calificaciones || []);
      setNotasCurso({});
      setMensaje(data.mensaje || `Se guardaron ${calificaciones.length} calificaciones.`);
    } catch (e) {
      setErrorForm(e instanceof TypeError && e.message === "Failed to fetch" ? "No se pudo conectar con el servidor para guardar las calificaciones. Verificá que la API esté disponible e intentá nuevamente." : e.message);
    } finally { setGuardando(false); }
  }
  async function importarCalificaciones(file) {
    const filas = await leerPlanilla(file);
    const tipos = ["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"];
    const filasImportadas = filas.map((fila) => {
      const alumno = buscarAlumnoPlanilla(fila, alumnos);
      const tipo = String(buscarColumna(fila, "Tipo", "Evaluacion", "Evaluación")).trim().toUpperCase();
      const notaOriginal = String(buscarColumna(fila, "Nota")).trim();
      const notaTexto = notaOriginal.replace(",", ".");
      const coincideNumero = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(notaTexto);
      const notaNumero = coincideNumero ? Number(notaTexto) : null;
      const nota = coincideNumero ? notaNumero : notaOriginal.toLocaleUpperCase("es");
      const fecha = fechaPlanilla(buscarColumna(fila, "Fecha"));
      const descripcion = buscarColumna(fila, "Descripcion", "Descripción", "Devolucion", "Devolución");
      const idCalificacionTexto = buscarColumna(fila, "ID calificacion", "ID evaluación");
      const existente = idCalificacionTexto ? calificaciones.find((item) => Number(item.id_calificacion) === Number(idCalificacionTexto)) : null;
      if (!alumno) throw new Error(`Fila ${fila.__fila}: no encuentro un alumno único. Revisá el DNI o el apellido y nombre.`);
      if (idCalificacionTexto && (!existente || Number(existente.id_alumno) !== Number(alumno.id_alumno) || Number(existente.id_materia_dictada) !== Number(materiaId))) throw new Error(`Fila ${fila.__fila}: el ID de calificación no pertenece a este alumno y materia.`);
      if (!tipos.includes(tipo)) throw new Error(`Fila ${fila.__fila}: tipo inválido. Usá EXAMEN, TRABAJO, TP, PARCIAL u OTRO.`);
      if (!notaOriginal) throw new Error(`Fila ${fila.__fila}: falta completar la nota.`);
      if (coincideNumero && (!Number.isFinite(notaNumero) || notaNumero < 0 || notaNumero > 10)) throw new Error(`Fila ${fila.__fila}: una nota numérica debe estar entre 0 y 10.`);
      if (notaOriginal.length > 50) throw new Error(`Fila ${fila.__fila}: la nota de texto no puede superar los 50 caracteres.`);
      if (!descripcion.trim()) throw new Error(`Fila ${fila.__fila}: completá la descripción de la calificación.`);
      if (!fecha) throw new Error(`Fila ${fila.__fila}: falta una fecha válida con formato AAAA-MM-DD o DD/MM/AAAA.`);
      if (descripcion.length > 5000) throw new Error(`Fila ${fila.__fila}: la devolución supera los 5000 caracteres.`);
      return { alumno, tipo, nota, fecha, descripcion, id_calificacion: existente?.id_calificacion || null, guardada: false };
    });
    setImportadas(filasImportadas);
    setMensaje(`${filasImportadas.length} calificaciones listas para revisar. Todavía no se guardaron.`);
    setErrorForm("");
  }
  async function seleccionarArchivoCalificaciones(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setArchivoCalificacionesNombre(file.name);
    setImportandoCalificaciones(true);
    try {
      if (!materiaId) throw new Error("Elegí una materia antes de importar.");
      if (!alumnos.length) throw new Error("No hay alumnos cargados para la materia elegida.");
      await importarCalificaciones(file);
    } catch (e) {
      setErrorForm(e.message);
    } finally {
      input.value = "";
      setImportandoCalificaciones(false);
    }
  }
  async function guardarImportadas() {
    setGuardando(true); setErrorForm(""); setMensaje("");
    try {
      const pendientes = importadas.filter((fila) => !fila.guardada);
      if (!pendientes.length) return;
      const data = await jsonFetch(`${API}/calificaciones/lote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_materia_dictada: Number(materiaId),
          calificaciones: pendientes.map((fila) => ({
            id_calificacion: fila.id_calificacion,
            id_alumno: fila.alumno.id_alumno,
            tipo: fila.tipo,
            nota: fila.nota,
            fecha: fila.fecha,
            descripcion: fila.descripcion,
          })),
        }),
      });
      const actualizadas = await jsonFetch(`${API}/calificaciones/docente/${usuario.id_usuario}`);
      setCalificaciones(actualizadas.calificaciones || []);
      setMensaje(data.mensaje || `Se guardaron ${pendientes.length} calificaciones.`);
      setImportadas([]);
    } catch (e) {
      setErrorForm(e instanceof TypeError && e.message === "Failed to fetch"
        ? "No se pudo conectar con el servidor para guardar las calificaciones. Verificá que la API esté disponible e intentá nuevamente."
        : e.message);
    } finally { setGuardando(false); }
  }
  function iniciarEdicion(calificacion) { setErrorForm(""); setMensaje(""); setEdicion({ id_calificacion: calificacion.id_calificacion, tipo: calificacion.tipo, nota: String(calificacion.nota), descripcion: calificacion.descripcion || "", fecha: String(calificacion.fecha).slice(0, 10) }); }
  async function guardarEdicion(event) { event.preventDefault(); setGuardando(true); setErrorForm(""); setMensaje(""); try { const d = await jsonFetch(`${API}/calificaciones/${edicion.id_calificacion}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edicion, id_usuario: usuario.id_usuario, nota: edicion.nota }) }); setCalificaciones((actuales) => actuales.map((item) => item.id_calificacion === edicion.id_calificacion ? { ...item, ...edicion, nota: edicion.nota } : item)); setMensaje(d.mensaje); setEdicion(null); } catch (e) { setErrorForm(e.message); } finally { setGuardando(false); } }
  const periodoNotasInvalido = Boolean(fechaNotaDesde && fechaNotaHasta && fechaNotaDesde > fechaNotaHasta);
  const calificacionesFiltradas = calificaciones.filter((item) => {
    if (periodoNotasInvalido) return false;
    if (materiaId && Number(item.id_materia_dictada) !== Number(materiaId)) return false;
    if (tipoNotaFiltro && item.tipo !== tipoNotaFiltro) return false;
    const fechaNota = String(item.fecha).slice(0, 10);
    if (fechaNotaDesde && fechaNota < fechaNotaDesde) return false;
    if (fechaNotaHasta && fechaNota > fechaNotaHasta) return false;
    return !claveNombre(buscarNota) || claveNombre(`${item.alumno_apellido} ${item.alumno_nombre}`).includes(claveNombre(buscarNota));
  });
  function descargarPlantillaCalificaciones() {
    setErrorForm("");
    const materia = materias.find((item) => Number(item.id_materia_dictada) === Number(materiaId));
    if (!materia || !alumnos.length || cargandoAlumnos) {
      setErrorForm("Elegí una materia con alumnos antes de descargar la plantilla.");
      return;
    }
    const filas = [...alumnos]
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"))
      .map((alumno) => ["", alumno.dni || "", alumno.apellido, alumno.nombre, materia.nombre, `${materia.anio}° ${materia.division}`, "", "", "", fechaPlantillaNotas]);
    descargarExcel(
      `plantilla-calificaciones-${materia.nombre}-${fechaPlantillaNotas}`,
      "Calificaciones",
      ["ID calificación", "DNI", "Apellido", "Nombre", "Materia", "Curso", "Tipo", "Descripción", "Nota", "Fecha"],
      filas,
      undefined,
      [
        { rango: `G2:G${filas.length + 1}`, valores: ["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"], allowBlank: false },
        { tipo: "custom", rango: `I2:I${filas.length + 1}`, formula: "OR(ISBLANK(I2),AND(ISNUMBER(I2),I2>=0,I2<=10),ISTEXT(I2))", allowBlank: true },
      ],
    );
  }

  function exportarCalificaciones() {
    setErrorForm("");
    if (periodoNotasInvalido) { setErrorForm("La fecha Desde no puede ser posterior a Hasta."); return; }
    const exportadas = calificacionesFiltradas.filter((item) => Number(item.id_materia_dictada) === Number(materiaId));
    if (!exportadas.length) { setErrorForm("No hay calificaciones para exportar con los filtros elegidos."); return; }
    const periodo = fechaNotaDesde || fechaNotaHasta ? `${fechaNotaDesde || "inicio"}-${fechaNotaHasta || "actualidad"}` : "todas-las-fechas";
    descargarExcel(`calificaciones-${periodo}`, "Calificaciones", ["ID calificación", "DNI", "Apellido", "Nombre", "Materia", "Curso", "Tipo", "Descripción", "Nota", "Fecha"], exportadas.map((item) => [item.id_calificacion, item.alumno_dni || "", item.alumno_apellido, item.alumno_nombre, item.materia, `${item.anio}° ${item.division}`, item.tipo, item.descripcion || "", item.nota, String(item.fecha).slice(0, 10)]));
  }
  return <AcademicLayout title="Calificaciones" description="Cargá notas, consultá la planilla e importá evaluaciones." usuario={usuario} links={LINKS_DOCENTE}>
    <div className={styles.filterBar}>
      <SelectorMateria materias={materias} value={materiaId} placeholder={seccionCalificaciones === "planilla" ? "Todas las materias" : "Elegí una materia"} onChange={(v) => { setMateriaId(v); setAlumnos([]); setCargandoAlumnos(Boolean(v)); setForm({ ...form, id_alumno: "" }); setNotasCurso({}); setImportadas([]); setArchivoCalificacionesNombre(""); setEdicion(null); setErrorForm(""); }} />
    </div>
    {mensaje && <p className={styles.notice} role="status">{mensaje}</p>}
    {errorForm && <p className={styles.error} role="alert">{errorForm}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {cargando && <LoadingSpinner label="Cargando calificaciones…" />}
    <div className={styles.workflowSectionTabs} role="tablist" aria-label="Secciones de calificaciones">
      {[['cargar', 'Cargar notas'], ['planilla', 'Planilla y exportación'], ['importar', 'Importar desde Excel']].map(([id, titulo]) => <button key={id} type="button" role="tab" aria-selected={seccionCalificaciones === id} className={seccionCalificaciones === id ? styles.workflowSectionTabActive : ""} onClick={() => setSeccionCalificaciones(id)}>{titulo}</button>)}
    </div>

    {seccionCalificaciones === "cargar" && <div className={styles.workflowPanel} role="tabpanel">
      <div className={styles.gradeEntryHeading}>
        <div><h2>Cargar calificación</h2><p>Admite números del 0 al 10 o una valoración textual, por ejemplo AV, S, EP+ o EP.</p></div>
        <div className={styles.gradeModeSwitch} role="group" aria-label="Modo de carga de calificaciones">
          <button type="button" className={modoCargaNotas === "individual" ? styles.gradeModeActive : ""} aria-pressed={modoCargaNotas === "individual"} onClick={() => setModoCargaNotas("individual")}>Individual (1x1)</button>
          <button type="button" className={modoCargaNotas === "curso" ? styles.gradeModeActive : ""} aria-pressed={modoCargaNotas === "curso"} onClick={() => setModoCargaNotas("curso")}>Todo el curso</button>
        </div>
      </div>
      {!materiaId ? <p className={styles.attendanceEmptyState}>Seleccioná una materia arriba para cargar las calificaciones.</p> : cargandoAlumnos ? <p className={styles.panelEmpty}><LoadingSpinner inline label="Cargando alumnos…" /></p> : modoCargaNotas === "individual" ? <form className={`${styles.form} ${styles.gradeEntryForm}`} onSubmit={guardar}>
        <label>Alumno<select required value={form.id_alumno} onChange={(e) => setForm({ ...form, id_alumno: e.target.value })}><option value="">Elegí un alumno</option>{alumnos.map((a) => <option key={a.id_alumno} value={a.id_alumno}>{a.apellido}, {a.nombre}</option>)}</select></label>
        <label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Nota (0 a 10 o texto)<input type="text" maxLength="50" required placeholder="8,5 o EP+" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} /></label>
        <label>Fecha<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
        <label>Devolución / descripción para el alumno<textarea rows="5" maxLength="5000" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Agregá comentarios que ayuden al alumno a entender la calificación…" /></label>
        <button disabled={guardando || !materiaId || !alumnos.length}>{guardando ? <LoadingSpinner inline label="Guardando…" /> : "Guardar calificación"}</button>
      </form> : <div className={styles.gradeGroupPanel}>
        <div className={styles.gradeGroupFields}>
          <label>Tipo de evaluación<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Fecha<input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
        </div>
        {alumnos.length ? <><div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Nota (0 a 10 o texto)</th><th>Devolución / comentarios</th></tr></thead><tbody>{alumnos.map((alumno) => <tr key={alumno.id_alumno}><td><strong>{alumno.apellido}, {alumno.nombre}</strong></td><td><input type="text" maxLength="50" value={notasCurso[alumno.id_alumno]?.nota || ""} onChange={(event) => setNotasCurso((actual) => ({ ...actual, [alumno.id_alumno]: { ...actual[alumno.id_alumno], nota: event.target.value } }))} placeholder="8,5 o EP+" aria-label={`Nota de ${alumno.nombre} ${alumno.apellido}`} /></td><td><input maxLength="5000" value={notasCurso[alumno.id_alumno]?.descripcion || ""} onChange={(event) => setNotasCurso((actual) => ({ ...actual, [alumno.id_alumno]: { ...actual[alumno.id_alumno], descripcion: event.target.value } }))} placeholder="Comentario opcional" aria-label={`Devolución para ${alumno.nombre} ${alumno.apellido}`} /></td></tr>)}</tbody></table></div><button className={styles.formButton} type="button" onClick={guardarNotasCurso} disabled={guardando || !alumnos.length}>{guardando ? <LoadingSpinner inline label="Guardando calificaciones…" /> : "Guardar calificaciones del curso"}</button></> : <p className={styles.panelEmpty}>No hay alumnos activos en esta materia.</p>}
      </div>}
    </div>}

    {seccionCalificaciones === "planilla" && <div className={styles.workflowPanel} role="tabpanel">
      {edicion && <form className={styles.form} onSubmit={guardarEdicion}>
        <h2>Corregir calificación</h2>
        <label>Tipo<select value={edicion.tipo} onChange={(e) => setEdicion({ ...edicion, tipo: e.target.value })}>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Nota (0 a 10 o texto)<input type="text" maxLength="50" required placeholder="8,5 o EP+" value={edicion.nota} onChange={(e) => setEdicion({ ...edicion, nota: e.target.value })} /></label>
        <label>Fecha<input type="date" required value={edicion.fecha} onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} /></label>
        <label>Devolución / descripción<textarea rows="5" maxLength="5000" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} placeholder="Agregá una devolución para el alumno…" /></label>
        <button type="button" className={styles.formButton} onClick={() => setEdicion(null)}>Cancelar</button>
        <button type="submit" disabled={guardando}>{guardando ? <LoadingSpinner inline label="Guardando…" /> : "Guardar corrección"}</button>
      </form>}
      <div className={`${styles.filterBar} ${styles.gradeFilters}`}>
        <label>Buscar alumno<input type="search" value={buscarNota} onChange={(e) => setBuscarNota(e.target.value)} placeholder="Apellido o nombre" /></label>
        <label>Tipo de evaluación<select value={tipoNotaFiltro} onChange={(e) => setTipoNotaFiltro(e.target.value)}><option value="">Todos los tipos</option>{["EXAMEN", "TRABAJO", "TP", "PARCIAL", "OTRO"].map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
        <label>Fecha desde<input type="date" value={fechaNotaDesde} onChange={(e) => { setFechaNotaDesde(e.target.value); setErrorForm(""); }} /></label>
        <label>Fecha hasta<input type="date" value={fechaNotaHasta} onChange={(e) => { setFechaNotaHasta(e.target.value); setErrorForm(""); }} /></label>
        <div className={styles.gradeClearAction}>
          <label className={`${styles.gradeClearSpacer} invisible select-none text-sm font-medium mb-2`} aria-hidden="true">.</label>
          <button className={`${styles.formButton} ${styles.gradeClearFilters}`} type="button" onClick={() => { setBuscarNota(""); setTipoNotaFiltro(""); setFechaNotaDesde(""); setFechaNotaHasta(""); setErrorForm(""); }}>Limpiar filtros</button>
        </div>
        <small className={styles.dateRangeHint}>Para una fecha puntual, elegí el mismo día en Desde y Hasta.</small>
        {periodoNotasInvalido && <small className={styles.error} role="alert">La fecha Desde no puede ser posterior a Hasta.</small>}
      </div>
      <section className={styles.tableCard}>
        <div className={styles.tableTitle}><div><h2>Calificaciones registradas</h2><p>{calificacionesFiltradas.length} de {calificaciones.length} registros</p></div><button className={`${styles.formButton} ${styles.gradeExportButton}`} type="button" onClick={exportarCalificaciones} disabled={!calificacionesFiltradas.length || !materiaId}>Exportar Excel</button></div>
        {!cargando && !calificaciones.length ? <p className={styles.panelEmpty}>Todavía no cargaste calificaciones.</p> : !calificacionesFiltradas.length ? <p className={styles.panelEmpty}>No hay calificaciones que coincidan con los filtros elegidos.</p> : <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th>{!materiaId && <th>Materia</th>}<th>Evaluación</th><th>Nota</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{calificacionesFiltradas.map((c) => { const aprobada = esNotaNumerica(c.nota) && Number(String(c.nota).replace(",", ".")) >= 6; const desaprobada = esNotaNumerica(c.nota) && !aprobada; return <tr key={c.id_calificacion}><td><strong>{c.alumno_apellido}, {c.alumno_nombre}</strong></td>{!materiaId && <td>{c.materia} · {c.anio}° {c.division}</td>}<td>{c.tipo}{c.descripcion ? ` · ${c.descripcion}` : ""}</td><td><span className={`${styles.gradePill} ${aprobada ? styles.gradeApproved : desaprobada ? styles.gradeFailed : styles.gradeText}`}>{c.nota}</span></td><td>{String(c.fecha).slice(0, 10)}</td><td><button className={styles.editRecordButton} type="button" onClick={() => iniciarEdicion(c)}>Editar nota</button></td></tr>; })}</tbody></table></div>}
      </section>
    </div>}

    {seccionCalificaciones === "importar" && <div className={styles.workflowPanel} role="tabpanel">
      <div className={styles.importPlanilla}>
        <strong className={styles.importTitle}>Plantilla para cargar calificaciones</strong>
        <p className={styles.importInstructions}>Descargá una fila por alumno con la materia y el curso ya completos. Agregá Tipo, Descripción y Nota; la fecha elegida también queda precargada en el archivo.</p>
        <div className={styles.gradeTemplateActions}>
          <label>Fecha para la plantilla<input type="date" value={fechaPlantillaNotas} onChange={(e) => setFechaPlantillaNotas(e.target.value)} /></label>
          <div className={styles.gradeTemplateAction}>
            <label className="invisible select-none text-sm font-medium mb-2" aria-hidden="true">.</label>
            <button className={styles.formButton} type="button" onClick={descargarPlantillaCalificaciones} disabled={!materiaId || !alumnos.length || cargandoAlumnos}>{cargandoAlumnos ? <LoadingSpinner inline label="Cargando alumnos…" /> : "Descargar plantilla Excel"}</button>
          </div>
        </div>
      </div>
      <div className={styles.importPlanilla}>
        <strong className={styles.importTitle}>Importar calificaciones desde Excel o CSV</strong>
        <p className={styles.importInstructions}>La fila 1 debe tener los encabezados. Después, cargá una calificación por fila; si un alumno tiene varias notas, repetí sus datos en filas distintas.</p>
        <p className={styles.importColumns}><b>Columnas:</b> DNI, Tipo, Nota, Fecha. También podés usar Apellido y Nombre en lugar de DNI. Descripción e ID calificación son opcionales.</p>
        <p className={styles.importExample}><b>Ejemplo:</b> DNI | Tipo | Nota | Fecha<br />49121527 | EXAMEN | 8,50 | 2026-11-15</p>
        <label className={styles.gradeImportFileField}>Adjuntar archivo Excel / CSV
          <StyledFilePicker className={styles.gradeImportFilePicker} accept=".xlsx,.csv" onChange={seleccionarArchivoCalificaciones} disabled={guardando || importandoCalificaciones || cargandoAlumnos || !materiaId || !alumnos.length} buttonText="Adjuntar archivo Excel / CSV" inputLabel="Adjuntar archivo Excel o CSV con calificaciones" status={importandoCalificaciones ? "Procesando archivo…" : archivoCalificacionesNombre || "Ningún archivo seleccionado"} />
        </label>
        <small>Completá Tipo, Descripción y Nota; la Fecha ya viene cargada y podés cambiarla en la plantilla. Para corregir una calificación existente, completá también ID calificación; si lo dejás vacío, se crea una nueva. Las hojas de Google se deben descargar como .xlsx o .csv. Límite: 10 MB.</small>
      </div>
      {importadas.length > 0 && <>
        <p className={styles.notice}>{importadas.length} calificaciones listas para revisar. El guardado aplica todas las filas juntas.</p>
        <div className={styles.tableWrap}><table className={styles.workflowTable}><thead><tr><th>Alumno</th><th>Tipo</th><th>Nota</th><th>Fecha</th><th>Devolución</th><th>Acción</th></tr></thead><tbody>{importadas.map((fila, index) => <tr key={`${fila.alumno.id_alumno}-${index}`}><td>{fila.alumno.apellido}, {fila.alumno.nombre} · {fila.alumno.dni || "Sin DNI"}</td><td>{fila.tipo}</td><td>{fila.nota}</td><td>{fila.fecha}</td><td>{fila.descripcion || "—"}</td><td>{fila.id_calificacion ? `Actualizar #${fila.id_calificacion}` : "Crear"}</td></tr>)}</tbody></table></div>
        <button className={styles.formButton} type="button" onClick={guardarImportadas} disabled={guardando}>{guardando ? <LoadingSpinner inline label="Guardando calificaciones…" /> : "Guardar calificaciones importadas"}</button>
      </>}
    </div>}
  </AcademicLayout>;
}
