"use client";

import { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

const CLAVE_TEMA = "educalink_tema";

export function aplicarTema(tema) {
  if (typeof document === "undefined") return;
  const valor = tema === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = valor;
  try { localStorage.setItem(CLAVE_TEMA, valor); } catch { /* El tema sigue activo en esta página. */ }
  window.dispatchEvent(new CustomEvent("educalink:cambiar-tema", { detail: valor }));
}

export default function ThemeToggle() {
  const [tema, setTema] = useState("light");

  useEffect(() => {
    let guardado = "light";
    try { guardado = localStorage.getItem(CLAVE_TEMA) === "dark" ? "dark" : "light"; } catch { /* Usa el tema claro por defecto. */ }
    setTema(guardado);
    document.documentElement.dataset.theme = guardado;
    const sincronizar = (event) => setTema(event.detail === "dark" ? "dark" : "light");
    window.addEventListener("educalink:cambiar-tema", sincronizar);
    return () => window.removeEventListener("educalink:cambiar-tema", sincronizar);
  }, []);

  function alternarTema() {
    const nuevoTema = tema === "dark" ? "light" : "dark";
    setTema(nuevoTema);
    aplicarTema(nuevoTema);
  }

  return <button className={styles.toggle} type="button" onClick={alternarTema} aria-label={`Cambiar a modo ${tema === "dark" ? "claro" : "oscuro"}`} aria-pressed={tema === "dark"} title={`Cambiar a modo ${tema === "dark" ? "claro" : "oscuro"}`}>
    <span className={styles.icon} aria-hidden="true">{tema === "dark" ? "☀" : "☾"}</span><span className={styles.label}>{tema === "dark" ? "Modo claro" : "Modo oscuro"}</span>
  </button>;
}
