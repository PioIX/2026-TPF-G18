"use client";

import { useEffect, useMemo, useState } from "react";
import { AcademicLayout, API } from "@/components/academic/AcademicPage";
import styles from "./admin.module.css";

const LINKS_ADMIN = [
  { href: "/admin", label: "Inicio" },
  { href: "/notificaciones", label: "Notificaciones" },
];

const FORMULARIO_VACIO = {
  username: "", mail: "", password: "", nombre: "", apellido: "", dni: "",
  fecha_nacimiento: "", especialidad: "",
};

export default function AdminPage() {
  const [usuario, setUsuario] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("TODOS");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [rolNuevo, setRolNuevo] = useState("ALUMNO");
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      if (!guardado) {
        window.location.replace("/login");
        return;
      }
      if (guardado.rol !== "ADMIN") {
        window.location.replace(guardado.rol === "ALUMNO" ? "/alumno" : guardado.rol === "DOCENTE" ? "/docente" : "/login");
        return;
      }
      setUsuario(guardado);
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      window.location.replace("/login");
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    cargarUsuarios();
  }, [usuario]);

  async function cargarUsuarios(termino = "") {
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch(`${API}/usuarios?q=${encodeURIComponent(termino)}`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudieron cargar los usuarios.");
      setUsuarios(datos.usuarios || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  const conteos = useMemo(() => ({
    total: usuarios.length,
    ALUMNO: usuarios.filter((item) => item.rol === "ALUMNO").length,
    DOCENTE: usuarios.filter((item) => item.rol === "DOCENTE").length,
    ADMIN: usuarios.filter((item) => item.rol === "ADMIN").length,
    activos: usuarios.filter((item) => Boolean(Number(item.activo))).length,
  }), [usuarios]);

  const filasVisibles = useMemo(() => {
    const filtrados = filtroRol === "TODOS" ? usuarios : usuarios.filter((item) => item.rol === filtroRol);
    return mostrarTodos ? filtrados : filtrados.slice(0, 8);
  }, [filtroRol, mostrarTodos, usuarios]);

  function actualizarCampo(event) {
    setFormulario((actual) => ({ ...actual, [event.target.name]: event.target.value }));
  }

  function abrirCrear(rol = "ALUMNO") {
    setUsuarioEditando(null);
    setRolNuevo(rol);
    setFormulario(FORMULARIO_VACIO);
    setError("");
    setModalAbierto(true);
  }

  function abrirEdicion(persona) {
    setUsuarioEditando(persona);
    setRolNuevo(persona.rol);
    setFormulario({
      ...FORMULARIO_VACIO,
      username: persona.username || "",
      mail: persona.mail || "",
      nombre: persona.nombre === persona.username ? "" : persona.nombre || "",
      apellido: persona.apellido || "",
      dni: persona.dni || "",
      fecha_nacimiento: persona.fecha_nacimiento ? String(persona.fecha_nacimiento).slice(0, 10) : "",
      especialidad: persona.especialidad || "",
    });
    setError("");
    setModalAbierto(true);
  }

  async function crearUsuario(event) {
    event.preventDefault();
    setError("");
    setMensaje("");
    setGuardando(true);
    try {
      const respuesta = await fetch(usuarioEditando ? `${API}/usuarios/${usuarioEditando.id_usuario}` : `${API}/usuarios`, {
        method: usuarioEditando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formulario, rol: rolNuevo }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo crear el usuario.");
      setFormulario(FORMULARIO_VACIO);
      setRolNuevo("ALUMNO");
      if (usuarioEditando && Number(usuarioEditando.id_usuario) === Number(usuario.id_usuario)) {
        const actualizada = { ...usuario, username: formulario.username.trim(), mail: formulario.mail.trim() };
        sessionStorage.setItem("educalink_usuario", JSON.stringify(actualizada));
        setUsuario(actualizada);
      }
      setUsuarioEditando(null);
      setModalAbierto(false);
      setMensaje(datos.mensaje || (usuarioEditando ? "La cuenta se actualizó correctamente." : "La cuenta se creó correctamente."));
      await cargarUsuarios(busqueda);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(persona) {
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(`${API}/usuarios/${persona.id_usuario}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: Number(persona.activo) ? 0 : 1 }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo actualizar el estado.");
      setMensaje(datos.mensaje || "El estado de la cuenta se actualizó.");
      await cargarUsuarios(busqueda);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!usuario) return null;

  return (
    <AcademicLayout title="Panel de administración" description="Un resumen de las cuentas y accesos de EducaLink." usuario={usuario} links={LINKS_ADMIN}>
      <div className={styles.dashboard}>
        <section className={styles.welcome}>
          <div><span className={styles.overline}>CENTRO DE CONTROL</span><h2>¡Hola, {usuario?.username || "administrador"}!</h2><p>Desde acá podés organizar las cuentas de la comunidad educativa.</p></div>
          <button type="button" className={styles.primaryButton} onClick={() => abrirCrear()}>＋ Crear usuario</button>
        </section>

        {error && <p className={styles.alertError} role="alert">{error}</p>}
        {mensaje && <p className={styles.alertSuccess} role="status">{mensaje}</p>}

        <section className={styles.stats} aria-label="Resumen de usuarios">
          <article className={`${styles.statCard} ${styles.statMain}`}><span>Cuentas registradas</span><strong>{cargando ? "—" : conteos.total}</strong><small>En la base de datos</small><i aria-hidden="true">▤</i></article>
          <article className={styles.statCard}><span>Alumnos</span><strong>{cargando ? "—" : conteos.ALUMNO}</strong><small>Comunidad estudiantil</small><i aria-hidden="true">♙</i></article>
          <article className={styles.statCard}><span>Docentes</span><strong>{cargando ? "—" : conteos.DOCENTE}</strong><small>Equipo docente</small><i aria-hidden="true">▣</i></article>
          <article className={styles.statCard}><span>Cuentas activas</span><strong>{cargando ? "—" : conteos.activos}</strong><small>{cargando || !conteos.total ? "Estado de acceso" : `${Math.round((conteos.activos / conteos.total) * 100)}% del total`}</small><i aria-hidden="true">✓</i></article>
        </section>

        <section className={styles.overviewGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>GESTIÓN RÁPIDA</span><h2>Accesos directos</h2></div></div>
            <div className={styles.quickActions}>
              <button type="button" className={styles.actionCard} onClick={() => abrirCrear()}><span className={`${styles.actionIcon} ${styles.blueIcon}`}>＋</span><span><strong>Crear una cuenta</strong><small>Dar de alta alumno, docente o admin</small></span><b>›</b></button>
              <a className={styles.actionCard} href="/notificaciones"><span className={`${styles.actionIcon} ${styles.goldIcon}`}>♧</span><span><strong>Notificaciones</strong><small>Consultar avisos del sistema</small></span><b>›</b></a>
              <button type="button" className={styles.actionCard} onClick={() => { setFiltroRol("TODOS"); setBusqueda(""); cargarUsuarios(""); document.getElementById("usuarios")?.scrollIntoView({ behavior: "smooth" }); }}><span className={`${styles.actionIcon} ${styles.greenIcon}`}>⌕</span><span><strong>Buscar usuarios</strong><small>Revisar y actualizar accesos</small></span><b>›</b></button>
            </div>
          </article>
          <article className={`${styles.panel} ${styles.rolesPanel}`}>
            <div className={styles.panelHeading}><div><span className={styles.overline}>COMUNIDAD</span><h2>Distribución por rol</h2></div><span className={styles.totalPill}>{cargando ? "—" : conteos.total} cuentas</span></div>
            <div className={styles.roleList}>
              {[{ rol: "ALUMNO", label: "Alumnos", color: "studentBar" }, { rol: "DOCENTE", label: "Docentes", color: "teacherBar" }, { rol: "ADMIN", label: "Administradores", color: "adminBar" }].map((item) => <div className={styles.roleRow} key={item.rol}><div className={styles.roleLabel}><span>{item.label}</span><strong>{cargando ? "—" : conteos[item.rol]}</strong></div><div className={styles.progressTrack}><span className={styles[item.color]} style={{ width: `${conteos.total ? (conteos[item.rol] / conteos.total) * 100 : 0}%` }} /></div></div>)}
            </div>
            <div className={styles.systemNote}><span>✓</span><p><strong>Gestión centralizada</strong><small>Las cuentas se crean desde este panel y pueden activarse o desactivarse.</small></p></div>
          </article>
        </section>

        <section className={styles.usersPanel} id="usuarios">
          <div className={styles.usersHeading}><div><span className={styles.overline}>DIRECTORIO</span><h2>Usuarios registrados</h2><p>Administrá las cuentas y su acceso a la plataforma.</p></div><span className={styles.totalPill}>{conteos.total} en total</span></div>
          <form className={styles.toolbar} onSubmit={(event) => { event.preventDefault(); setMostrarTodos(false); cargarUsuarios(busqueda); }}>
            <label className={styles.searchBox}><span aria-hidden="true">⌕</span><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por usuario, nombre o correo" aria-label="Buscar usuarios" /></label>
            <select className={styles.roleSelect} value={filtroRol} onChange={(event) => { setFiltroRol(event.target.value); setMostrarTodos(false); }} aria-label="Filtrar por rol"><option value="TODOS">Todos los roles</option><option value="ALUMNO">Alumnos</option><option value="DOCENTE">Docentes</option><option value="ADMIN">Administradores</option></select>
            <button className={styles.searchButton} type="submit">Buscar</button>
          </form>
          {cargando ? <div className={styles.emptyState}>Cargando usuarios…</div> : usuarios.length === 0 ? <div className={styles.emptyState}>No se encontraron usuarios con esos datos.</div> : filasVisibles.filter((item) => filtroRol === "TODOS" || item.rol === filtroRol).length === 0 ? <div className={styles.emptyState}>No hay cuentas con ese rol.</div> : (
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Usuario</th><th>Correo electrónico</th><th>Rol</th><th>Estado</th><th><span className={styles.srOnly}>Acciones</span></th></tr></thead><tbody>
              {filasVisibles.filter((item) => filtroRol === "TODOS" || item.rol === filtroRol).map((persona) => <tr key={persona.id_usuario}><td><div className={styles.personCell}><span className={styles.personAvatar}>{(persona.username || persona.mail || "U").slice(0, 1).toUpperCase()}</span><span><strong>{[persona.nombre, persona.apellido].filter(Boolean).join(" ") || persona.username}</strong><small>@{persona.username}</small></span></div></td><td className={styles.emailCell}>{persona.mail}</td><td><span className={`${styles.roleBadge} ${styles[`role${persona.rol}`] || ""}`}>{persona.rol === "ALUMNO" ? "Alumno" : persona.rol === "DOCENTE" ? "Docente" : "Administrador"}</span></td><td><span className={`${styles.status} ${Number(persona.activo) ? styles.active : styles.inactive}`}><i />{Number(persona.activo) ? "Activo" : "Inactivo"}</span></td><td className={styles.actionCell}><div className={styles.rowActions}><button type="button" className={styles.editButton} onClick={() => abrirEdicion(persona)}>Editar</button><button type="button" className={Number(persona.activo) ? styles.disableButton : styles.enableButton} onClick={() => cambiarEstado(persona)}>{Number(persona.activo) ? "Desactivar" : "Activar"}</button></div></td></tr>)}
            </tbody></table></div>
          )}
          {!cargando && conteos.total > 8 && filtroRol === "TODOS" && <button type="button" className={styles.showMore} onClick={() => setMostrarTodos((actual) => !actual)}>{mostrarTodos ? "Mostrar menos" : `Ver todos (${conteos.total})`}</button>}
        </section>
      </div>

      {modalAbierto && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalAbierto(false); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-title"><header className={styles.modalHeader}><div><span className={styles.overline}>{usuarioEditando ? "ACTUALIZAR CUENTA" : "NUEVA CUENTA"}</span><h2 id="create-title">{usuarioEditando ? "Editar usuario" : "Crear usuario"}</h2><p>{usuarioEditando ? "Actualizá los datos de la cuenta seleccionada." : "Completá los datos para habilitar un nuevo acceso."}</p></div><button type="button" className={styles.closeButton} onClick={() => setModalAbierto(false)} aria-label="Cerrar">×</button></header>
        <form className={styles.createForm} onSubmit={crearUsuario}>
          <label>Nombre de usuario<input name="username" value={formulario.username} onChange={actualizarCampo} required maxLength={100} autoComplete="off" /></label>
          <label>Correo electrónico<input name="mail" type="email" value={formulario.mail} onChange={actualizarCampo} required maxLength={100} autoComplete="off" /></label>
          {!usuarioEditando && <label>Contraseña<input name="password" type="password" value={formulario.password} onChange={actualizarCampo} required maxLength={255} autoComplete="new-password" /></label>}
          <label>Rol<select value={rolNuevo} disabled={Boolean(usuarioEditando)} onChange={(event) => setRolNuevo(event.target.value)}><option value="ALUMNO">Alumno</option><option value="DOCENTE">Docente</option><option value="ADMIN">Administrador</option></select></label>
          {rolNuevo !== "ADMIN" && <><label>Nombre<input name="nombre" value={formulario.nombre} onChange={actualizarCampo} required maxLength={50} /></label><label>Apellido<input name="apellido" value={formulario.apellido} onChange={actualizarCampo} required maxLength={50} /></label><label>DNI<input name="dni" value={formulario.dni} onChange={actualizarCampo} maxLength={20} /></label></>}
          {rolNuevo === "ALUMNO" && <label>Fecha de nacimiento<input name="fecha_nacimiento" type="date" value={formulario.fecha_nacimiento} onChange={actualizarCampo} /></label>}
          {rolNuevo === "DOCENTE" && <label>Especialidad<input name="especialidad" value={formulario.especialidad} onChange={actualizarCampo} maxLength={100} /></label>}
          {error && <p className={styles.alertError} role="alert">{error}</p>}
          {usuarioEditando && <p className={styles.formHint}>El rol y la contraseña no se pueden cambiar desde esta edición.</p>}
          <div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={() => setModalAbierto(false)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={guardando}>{guardando ? "Guardando…" : usuarioEditando ? "Guardar cambios" : "Crear cuenta"}</button></div>
        </form>
      </section></div>}
    </AcademicLayout>
  );
}
