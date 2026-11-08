import { AcademicListPage } from "@/components/academic/AcademicPage";
export default function AsistenciasAlumnoPage() {
  return <AcademicListPage rol="ALUMNO" title="Mis asistencias" description="Registro de asistencia por materia." endpoint="asistencias/alumno" dataKey="asistencias" emptyMessage="Todavía no hay asistencias cargadas." display="table" summaryType="asistencias" fields={[
    { label: "Materia", key: "materia" }, { label: "Fecha", key: "fecha" }, { label: "Estado", key: "estado" }, { label: "Observación", key: "observacion" },
  ]} />;
}
