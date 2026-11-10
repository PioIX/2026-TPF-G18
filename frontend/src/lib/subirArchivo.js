const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function subirArchivo(file, { idUsuario, contexto, idTarea }) {
  const parametros = new URLSearchParams({ id_usuario: String(idUsuario), contexto });
  if (idTarea) parametros.set("id_tarea", String(idTarea));
  const response = await fetch(`${API}/archivos?${parametros}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo subir el archivo.");
  return data;
}
