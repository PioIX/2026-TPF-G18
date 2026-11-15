"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login-page.module.css";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const RUTAS_POR_ROL = { ALUMNO: "/alumno", DOCENTE: "/docente", ADMIN: "/admin" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarAdministradores, setMostrarAdministradores] = useState(false);
  const [correosAdministradores, setCorreosAdministradores] = useState([]);
  const [cargandoAdministradores, setCargandoAdministradores] = useState(false);
  const [errorAdministradores, setErrorAdministradores] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function mostrarContactosAdministradores() {
    setMostrarAdministradores(true);
    setErrorAdministradores("");
    if (correosAdministradores.length || cargandoAdministradores) return;
    setCargandoAdministradores(true);
    try {
      const response = await fetch(`${API_URL}/auth/administradores`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los correos de contacto.");
      setCorreosAdministradores(data.correos || []);
    } catch (err) {
      setErrorAdministradores(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setCargandoAdministradores(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo iniciar sesión. Revisá tus datos.");
        return;
      }
      const ruta = RUTAS_POR_ROL[data.usuario?.rol];
      if (!data.usuario || !ruta) {
        setError("El servidor respondió con un rol de usuario no válido.");
        return;
      }
      sessionStorage.setItem("educalink_usuario", JSON.stringify(data.usuario));
      router.push(ruta);
    } catch {
      setError("No se pudo conectar con el servidor. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Inicio de sesión de EducaLink">
        <aside className={styles.welcomePanel}>
          <div className={styles.brand}>
            <Image src="/images/educalink-logo-dark.png" alt="EducaLink" width={174} height={53} priority className={styles.logo} />
          </div>
          <div className={styles.welcomeCopy}>
            <h1>Conectamos tu comunidad educativa</h1>
            <p>Un espacio para aprender, compartir y acompañar cada paso de tu recorrido escolar.</p>
          </div>
        </aside>
        <section className={styles.formPanel}>
          <div className={styles.formContent}>
            <div className={styles.mobileBrand}>
              <Image src="/images/educalink-logo-light.png" alt="EducaLink" width={174} height={53} priority className={styles.logo} />
            </div>
            <header className={styles.heading}>
              <h2>¡Bienvenido!</h2>
              <p>Iniciá sesión para continuar</p>
            </header>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="email">Correo electrónico</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">✉</span>
                <input id="email" name="email" type="email" autoComplete="username" placeholder="Ingresá tu correo electrónico" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <label className={styles.label} htmlFor="password">Contraseña</label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">▣</span>
                <input id="password" name="password" type={mostrarPassword ? "text" : "password"} autoComplete="current-password" placeholder="Ingresá tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <div className={styles.options}>
                <label className={styles.remember} htmlFor="mostrar-password"><input id="mostrar-password" type="checkbox" checked={mostrarPassword} onChange={(event) => setMostrarPassword(event.target.checked)} />Mostrar contraseña</label>
                <button className={styles.forgot} type="button" onClick={mostrarContactosAdministradores}>¿Olvidaste tu contraseña?</button>
              </div>
              {mostrarAdministradores && <section className={styles.adminContacts} aria-live="polite" aria-label="Contactos de administración">
                <strong>Contactá a un administrador para recuperar tu contraseña</strong>
                {cargandoAdministradores ? <span>Cargando correos…</span> : errorAdministradores ? <span role="alert">{errorAdministradores}</span> : correosAdministradores.length ? <ul>{correosAdministradores.map((correo) => <li key={correo}><a href={`mailto:${correo}`}>{correo}</a></li>)}</ul> : <span>No hay correos de administradores disponibles.</span>}
              </section>}
              <button className={styles.submit} type="submit" disabled={loading}>{loading ? <LoadingSpinner inline label="Ingresando…" /> : "Iniciar sesión"}</button>
            </form>
          </div>
          <p className={styles.footer}>© EducaLink · Comunidad educativa</p>
        </section>
      </section>
    </main>
  );
}
