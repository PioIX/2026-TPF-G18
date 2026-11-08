import { AcademicListPage } from "@/components/academic/AcademicPage";
export default function MateriasAlumnoPage() {
  return <AcademicListPage rol="ALUMNO" title="Mis materias" description="Materias correspondientes a tus cursos activos." endpoint="materias/alumno" dataKey="materias" emptyMessage="Todavía no tenés materias asociadas." fields={[
    { label: "Materia", key: "nombre" }, { label: "Curso", format: "curso" },
    { label: "Ciclo lectivo", key: "ciclo_lectivo" }, { label: "Horas semanales", key: "horas_semanales" }, { label: "Docentes", key: "docentes" },
  ]} />;
}
