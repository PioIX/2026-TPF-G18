import { AcademicListPage } from "@/components/academic/AcademicPage";
export default function MateriasDocentePage() {
  return <AcademicListPage rol="DOCENTE" title="Mis materias" description="Cursos y materias que tenés asignados." endpoint="materias/docente" dataKey="materias" emptyMessage="No tenés materias asignadas." fields={[
    { label: "Materia", key: "nombre" }, { label: "Curso", format: "curso" },
    { label: "Ciclo lectivo", key: "ciclo_lectivo" }, { label: "Horas semanales", key: "horas_semanales" }, { label: "Función", key: "rol" }, { label: "Alumnos", key: "cantidad_alumnos" },
  ]} />;
}
