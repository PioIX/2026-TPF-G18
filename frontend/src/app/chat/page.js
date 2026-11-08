"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSocket from "@/hooks/useSocket";
import styles from "./chat-page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const avatar = "/images/default-avatar.png";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createType, setCreateType] = useState("direct");
  const [email, setEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupEmails, setGroupEmails] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const activeRef = useRef(null);
  const { socket, conectado } = useSocket(user?.id_usuario);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("educalink_usuario");
      if (!saved) { router.replace("/login"); return; }
      setUser(JSON.parse(saved));
    } catch { router.replace("/login"); }
  }, [router]);

  const loadChats = useCallback(async () => {
    if (!user?.id_usuario) return;
    try {
      const response = await fetch(`${API}/chats/${user.id_usuario}`);
      const data = await response.json();
      if (response.ok) setChats(data);
    } catch { setError("No se pudo conectar con el servidor de EducaLink."); }
  }, [user]);

  useEffect(() => { loadChats(); }, [loadChats]);
  useEffect(() => { activeRef.current = active?.id || null; }, [active]);
  useEffect(() => {
    if (!socket) return undefined;
    const receive = (message) => {
      if (Number(activeRef.current) === Number(message.chat_id)) setMessages((items) => [...items, message]);
      loadChats();
    };
    const updateMessage = (message) => {
      if (Number(activeRef.current) === Number(message.chat_id)) {
        setMessages((items) => items.map((item) => Number(item.id) === Number(message.id) ? message : item));
      }
      loadChats();
    };
    const removeMessage = ({ id, chat_id: chatId }) => {
      if (Number(activeRef.current) === Number(chatId)) {
        setMessages((items) => items.filter((item) => Number(item.id) !== Number(id)));
        setEditingMessageId((current) => Number(current) === Number(id) ? null : current);
      }
      loadChats();
    };
    socket.on("nuevo_mensaje", receive);
    socket.on("mensaje_editado", updateMessage);
    socket.on("mensaje_eliminado", removeMessage);
    return () => {
      socket.off("nuevo_mensaje", receive);
      socket.off("mensaje_editado", updateMessage);
      socket.off("mensaje_eliminado", removeMessage);
    };
  }, [socket, loadChats]);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function selectChat(chat) {
    if (active && socket) socket.emit("leave_chat", active.id);
    setActive(chat); activeRef.current = chat.id; setMessages([]);
    try {
      const response = await fetch(`${API}/chats/${chat.id}/mensajes?usuarioId=${user.id_usuario}`);
      const data = await response.json();
      if (response.ok) setMessages(data); else setError(data.error || "No se pudieron cargar los mensajes.");
    } catch { setError("No se pudo conectar con el servidor."); }
    socket?.emit("join_chat", chat.id);
  }

  async function createChat(event) {
    event.preventDefault(); setError("");
    try {
      const response = await fetch(`${API}/chats/nuevo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuarioId: user.id_usuario, emailOtro: email.trim() }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo crear el chat."); return; }
      setCreating(false); setEmail(""); await loadChats();
      const refreshed = await fetch(`${API}/chats/${user.id_usuario}`).then((r) => r.json());
      setChats(refreshed);
      const created = refreshed.find((chat) => Number(chat.id) === Number(data.chatId));
      if (created) selectChat(created);
    } catch { setError("No se pudo conectar con el servidor."); }
  }

  async function createGroup(event) {
    event.preventDefault(); setError("");
    const emails = [...new Set(groupEmails.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean))];
    try {
      const response = await fetch(`${API}/chats/grupo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuarioId: user.id_usuario, emails, nombreGrupo: groupName.trim() }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo crear el grupo."); return; }
      setCreating(false); setCreateType("direct"); setGroupName(""); setGroupEmails("");
      const refreshed = await fetch(`${API}/chats/${user.id_usuario}`).then((r) => r.json());
      setChats(refreshed);
      const created = refreshed.find((chat) => Number(chat.id) === Number(data.chatId));
      if (created) selectChat(created);
    } catch { setError("No se pudo conectar con el servidor."); }
  }

  function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !active || !socket || !conectado) return;
    socket.emit("enviar_mensaje", { chat_id: active.id, contenido: content });
    setDraft("");
  }

  function beginEdit(message) {
    setEditingMessageId(message.id);
    setEditingContent(message.contenido);
    setError("");
  }

  async function saveMessage(event, message) {
    event.preventDefault();
    const contenido = editingContent.trim();
    if (!contenido || savingMessage) return;
    setSavingMessage(true);
    setError("");
    try {
      const response = await fetch(`${API}/chats/${active.id}/mensajes/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: user.id_usuario, contenido }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo editar el mensaje.");
        return;
      }
      setMessages((items) => items.map((item) => Number(item.id) === Number(data.id) ? data : item));
      setEditingMessageId(null);
      setEditingContent("");
      await loadChats();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingMessage(false);
    }
  }

  async function deleteMessage(message) {
    if (!window.confirm("¿Eliminar este mensaje para todos en el chat?")) return;
    setError("");
    try {
      const response = await fetch(`${API}/chats/${active.id}/mensajes/${message.id}?usuarioId=${user.id_usuario}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo eliminar el mensaje.");
        return;
      }
      setMessages((items) => items.filter((item) => Number(item.id) !== Number(message.id)));
      await loadChats();
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
  }

  const filtered = chats.filter((chat) => (chat.nombre || "").toLowerCase().includes(search.toLowerCase()));
  if (!user) return <main className={styles.loading}>Cargando EducaLink…</main>;

  return <main className={styles.layout}>
    <aside className={styles.listPanel}>
      <header className={styles.listHeader}><a className={styles.brand} href="/alumno">Educa<span>Link</span></a><div className={styles.profile}><img src={user.foto || avatar} alt=""/><div><strong>{user.username}</strong><small>Mensajes de tu comunidad</small></div></div><div className={styles.listTitle}><h1>Chats</h1><button onClick={() => { setCreating(true); setError(""); }} aria-label="Nuevo chat">＋</button></div><label className={styles.search}>⌕<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar conversación"/></label></header>
      <div className={styles.chatList}>{filtered.map((chat) => <button key={chat.id} onClick={() => selectChat(chat)} className={`${styles.chatRow} ${active?.id === chat.id ? styles.selected : ""}`}><img src={chat.foto || avatar} alt=""/><span><strong>{chat.nombre || "Conversación"}</strong><small>{chat.ultimo_mensaje?.contenido || (chat.es_grupo ? "Grupo de EducaLink" : "Empezá una conversación")}</small></span><time>{chat.ultimo_mensaje?.fecha_envio ? new Date(chat.ultimo_mensaje.fecha_envio).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : ""}</time></button>)}{!filtered.length && <p className={styles.emptyList}>Todavía no hay conversaciones. Creá un chat para empezar.</p>}</div>
      <button className={styles.back} onClick={() => router.push("/alumno")}>← Volver al inicio</button>
    </aside>
    <section className={styles.conversation}>
      {active ? <><header className={styles.conversationHeader}><img src={active.foto || avatar} alt=""/><div><strong>{active.nombre}</strong><small><i className={conectado ? styles.online : ""}/> {conectado ? "Conectado" : "Reconectando…"}</small></div><button onClick={loadChats} aria-label="Actualizar chats">↻</button></header><div className={styles.messageArea}>{messages.map((message) => { const own = Number(message.usuario_id) === Number(user.id_usuario); const editing = Number(editingMessageId) === Number(message.id); return <article key={message.id} className={`${styles.message} ${own ? styles.own : ""}`}><strong>{own ? "Vos" : message.remitente_nombre || "Usuario"}</strong>{editing ? <form className={styles.editForm} onSubmit={(event) => saveMessage(event, message)}><textarea autoFocus value={editingContent} onChange={(event) => setEditingContent(event.target.value)} maxLength={4000} rows={2} /><div><button type="button" onClick={() => { setEditingMessageId(null); setEditingContent(""); }}>Cancelar</button><button type="submit" disabled={!editingContent.trim() || savingMessage}>{savingMessage ? "Guardando…" : "Guardar"}</button></div></form> : <><p>{message.contenido}</p><div className={styles.messageMeta}><time>{new Date(message.fecha_envio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}{message.editado ? " · editado" : ""}</time>{own && <span className={styles.messageActions}><button type="button" onClick={() => beginEdit(message)}>Editar</button><button type="button" onClick={() => deleteMessage(message)}>Eliminar</button></span>}</div></>}</article>; })}<div ref={endRef}/>{!messages.length && <p className={styles.emptyConversation}>Todavía no hay mensajes. ¡Mandá el primero!</p>}</div><form className={styles.composer} onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribí un mensaje…" maxLength={4000}/><button disabled={!conectado || !draft.trim()}>Enviar <span>↑</span></button></form></> : <div className={styles.welcome}><div className={styles.welcomeIcon}>✉</div><h2>Tu comunidad, más cerca</h2><p>Elegí una conversación para ver los mensajes o iniciá un chat con alguien de EducaLink.</p><button onClick={() => setCreating(true)}>＋ Nuevo chat</button></div>}
      {error && <div className={styles.toast} role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
    </section>
      {creating && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false); }}><form className={styles.modal} onSubmit={createType === "direct" ? createChat : createGroup}><button type="button" className={styles.close} onClick={() => setCreating(false)}>×</button><span className={styles.modalIcon}>{createType === "direct" ? "✉" : "◉"}</span><h2>{createType === "direct" ? "Nuevo chat" : "Nuevo grupo"}</h2><div className={styles.modeSwitch}><button type="button" className={createType === "direct" ? styles.modeActive : ""} onClick={() => { setCreateType("direct"); setError(""); }}>Individual</button><button type="button" className={createType === "group" ? styles.modeActive : ""} onClick={() => { setCreateType("group"); setError(""); }}>Grupal</button></div>{createType === "direct" ? <><p>Ingresá el correo de la persona con quien querés conversar.</p><label>Correo electrónico<input autoFocus type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="alguien@pioix.edu.ar"/></label></> : <><p>Creá una conversación para tu equipo o grupo de clase.</p><label>Nombre del grupo<input autoFocus required maxLength={100} value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Ej.: Grupo de estudio"/></label><label className={styles.secondLabel}>Correos de participantes<input required value={groupEmails} onChange={(event) => setGroupEmails(event.target.value)} placeholder="Separá los correos con coma"/><small>Agregá al menos dos personas además de vos.</small></label></>}{error && <small className={styles.formError}>{error}</small>}<button className={styles.createButton}>{createType === "direct" ? "Iniciar conversación" : "Crear grupo"}</button></form></div>}
  </main>;
}
