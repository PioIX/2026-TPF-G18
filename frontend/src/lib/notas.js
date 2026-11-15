export function valorNotaNumerica(valor) {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(texto)) return null;
  const nota = Number(texto);
  return Number.isFinite(nota) && nota >= 0 && nota <= 10 ? nota : null;
}

export function calcularPromedioNotas(calificaciones) {
  const notasNumericas = calificaciones.map((calificacion) => valorNotaNumerica(calificacion.nota)).filter((nota) => nota !== null);
  return notasNumericas.length
    ? (notasNumericas.reduce((total, nota) => total + nota, 0) / notasNumericas.length).toFixed(2)
    : "—";
}
