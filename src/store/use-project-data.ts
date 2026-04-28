import { useMemo } from "react";
import { useWorkOS } from "./workos-store";

/** Devuelve tareas y sprints filtrados al proyecto activo. */
export function useProjectData() {
  const { state } = useWorkOS();
  const projectId = state.activeProjectId;
  return useMemo(() => ({
    projectId,
    project: state.projects.find(p => p.id === projectId),
    tasks: state.tasks.filter(t => t.projectId === projectId),
    sprints: state.sprints.filter(s => s.projectId === projectId),
  }), [state, projectId]);
}
