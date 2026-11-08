"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ComingSoonPage({ title }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  useEffect(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      if (!guardado) router.replace("/login");
      else setUsuario(guardado);
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [router]);
  const inicio = usuario?.rol === "ADMIN" ? "/admin" : usuario?.rol === "DOCENTE" ? "/docente" : "/alumno";
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f6fa", color: "#17233c", fontFamily: "Arial, sans-serif", padding: 24 }}><section style={{ width: "min(520px, 100%)", padding: 32, borderRadius: 16, background: "white", boxShadow: "0 8px 32px #15264a12" }}><a href={inicio} style={{ color: "#1f3a93", fontWeight: 700, textDecoration: "none" }}>← Volver al inicio</a><h1>{title}</h1><p style={{ color: "#64748b" }}>Esta sección todavía no está conectada. Podés seguir usando el resto de EducaLink.</p></section></main>;
}
