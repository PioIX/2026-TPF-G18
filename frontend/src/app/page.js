"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RUTAS_POR_ROL = {
  ALUMNO: "/alumno",
  DOCENTE: "/docente",
  ADMIN: "/admin",
};

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const usuario = JSON.parse(sessionStorage.getItem("educalink_usuario") || "null");
      router.replace(RUTAS_POR_ROL[usuario?.rol] || "/login");
    } catch {
      sessionStorage.removeItem("educalink_usuario");
      router.replace("/login");
    }
  }, [router]);

  return <main aria-live="polite" style={{ padding: 32, color: "#64748b", fontFamily: "Arial, sans-serif" }}>Abriendo EducaLink…</main>;
}
