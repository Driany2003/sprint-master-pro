import { useMemo } from "react";
import { useWorkOS } from "./workos-store";
import { useAuth } from "./auth-store";

/** Devuelve tareas y sprints filtrados al proyecto activo. */
export function useProjectData() {
  const { state } = useWorkOS();
  const { user } = useAuth();
  const projectId = state.activeProjectId;
  return useMemo(() => ({
    projectId,
    project: state.projects.find(p => p.id === projectId),
    tasks: state.tasks.filter(t => {
      if (t.projectId !== projectId) return false;
      // Tareas privadas: solo visibles para su creador.
      if (t.isPrivate && t.createdById && t.createdById !== user?.id) return false;
      return true;
    }),
    sprints: state.sprints.filter(s => s.projectId === projectId),
  }), [state, projectId, user?.id]);
}
