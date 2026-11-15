import { TareaAlumnoDetalle } from "@/components/academic/AcademicWorkflows";

export default function TareaAlumnoDetallePage({ params }) {
  return <TareaAlumnoDetalle idTarea={params.id} />;
}
