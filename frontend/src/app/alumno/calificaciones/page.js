import { AcademicListPage } from "@/components/academic/AcademicPage";
export default function CalificacionesAlumnoPage() {
  return <AcademicListPage rol="ALUMNO" title="Mis calificaciones" description="Notas registradas en tus materias." endpoint="calificaciones/alumno" dataKey="calificaciones" emptyMessage="Todavía no hay calificaciones cargadas." fields={[
    { label: "Materia", key: "materia" }, { label: "Evaluación", key: "tipo" }, { label: "Descripción", key: "descripcion" }, { label: "Nota", key: "nota" }, { label: "Fecha", key: "fecha" },
  ]} />;
}
