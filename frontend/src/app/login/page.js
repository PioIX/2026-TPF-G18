"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login-page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
 const router = useRouter();
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [remember, setRemember] = useState(true);
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);

 async function handleSubmit(event) {
 event.preventDefault();
 setError("");
 setLoading(true);

 try {
 const response = await fetch(API_URL + "/login", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ email: email.trim(), password }),
 });
 const data = await response.json();

 if (!response.ok) {
 setError(data.error || "No se pudo iniciar sesión. Revisá tus datos.");
 return;
 }
 if (!data.usuario) {
 setError("El servidor respondió sin los datos del usuario.");
 return;
 }

 localStorage.removeItem("educalink_usuario");
 sessionStorage.removeItem("educalink_usuario");
 const storage = remember ? localStorage : sessionStorage;
 storage.setItem("educalink_usuario", JSON.stringify(data.usuario));
 router.push("/dashboard");
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
 <input id="email" name="email" type="email" autoComplete="username"
 placeholder="Ingresá tu correo electrónico" value={email}
 onChange={(event) => setEmail(event.target.value)} required />
 </div>

 <label className={styles.label} htmlFor="password">Contraseña</label>
 <div className={styles.inputWrap}>
 <span className={styles.inputIcon} aria-hidden="true">▣</span>
 <input id="password" name="password" type="password" autoComplete="current-password"
 placeholder="Ingresá tu contraseña" value={password}
 onChange={(event) => setPassword(event.target.value)} required />
 </div>

 <div className={styles.options}>
 <label className={styles.remember}>
 <input type="checkbox" checked={remember}
 onChange={(event) => setRemember(event.target.checked)} />
 <span>Recordarme</span>
 </label>
 <button className={styles.forgot} type="button"
 onClick={() => setError("Para restablecer la contraseña, contactá al administrador.")}>
 ¿Olvidaste tu contraseña?
 </button>
 </div>

 <button className={styles.submit} type="submit" disabled={loading}>
 {loading ? "Ingresando…" : "Iniciar sesión"}
 </button>
 </form>
 </div>
 <p className={styles.footer}>© EducaLink · Comunidad educativa</p>
 </section>
 </section>
 </main>
 );
}