import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Member, Role, Project, Task } from "@/lib/types";
import { useWorkOS } from "./workos-store";

const KEY = "workos-auth-v1";

interface AuthCtx {
  user: Member | null;
  login: (memberId: string) => void;
  logout: () => void;
  isAdmin: boolean;
  // permisos
  can: (action: Action, ctx?: Ctx) => boolean;
  visibleProjects: Project[];
  canAccessProject: (projectId: string) => boolean;
}

export type Action =
  | "project.manage"        // crear/editar/borrar proyecto
  | "area.manage"           // crear/editar/borrar área
  | "sprint.manage"         // crear/editar/borrar/iniciar/cerrar sprint
  | "task.create"
  | "task.editAny"          // editar/borrar cualquier tarea del proyecto
  | "task.editOwn"          // editar tarea asignada
  | "task.moveStatus"       // mover en board
  | "task.viewDetail";      // ver detalle / comentar

interface Ctx { task?: Task | null; }

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { state } = useWorkOS();
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(KEY); } catch { return null; }
  });

  useEffect(() => {
    try {
      if (userId) localStorage.setItem(KEY, userId);
      else localStorage.removeItem(KEY);
    } catch {}
  }, [userId]);

  const user = useMemo(() => state.members.find(m => m.id === userId) ?? null, [state.members, userId]);
  const isAdmin = !!user && (user.role === "ADMIN" || user.role === "SUPERADMIN");

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return state.projects;
    return state.projects.filter(p => p.memberIds.includes(user.id) || p.leadIds.includes(user.id));
  }, [state.projects, user, isAdmin]);

  const canAccessProject = useCallback((projectId: string) => {
    if (!user) return false;
    if (isAdmin) return true;
    const p = state.projects.find(x => x.id === projectId);
    return !!p && (p.memberIds.includes(user.id) || p.leadIds.includes(user.id));
  }, [state.projects, user, isAdmin]);

  const can = useCallback<AuthCtx["can"]>((action, ctx) => {
    if (!user) return false;
    const role: Role = user.role;
    const isMonitor = role === "MONITOR";

    switch (action) {
      case "project.manage":
      case "area.manage":
      case "sprint.manage":
      case "task.editAny":
        return isAdmin;

      case "task.create":
        if (isAdmin) return true;
        if (isMonitor) return false;
        return true; // LEALTAD, MIEMBRO

      case "task.editOwn": {
        if (isAdmin) return true;
        if (isMonitor) return false;
        const t = ctx?.task;
        return !!t && t.assigneeIds.includes(user.id);
      }

      case "task.moveStatus": {
        if (isAdmin) return true;
        if (isMonitor) return false;
        const t = ctx?.task;
        return !!t && t.assigneeIds.includes(user.id);
      }

      case "task.viewDetail":
        return true;
    }
  }, [user, isAdmin]);

  function login(memberId: string) { setUserId(memberId); }
  function logout() { setUserId(null); }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, can, visibleProjects, canAccessProject }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Super admin",
  ADMIN: "Administrador",
  MONITOR: "Monitor",
  LEALTAD: "Lealtad",
  MIEMBRO: "Miembro",
};
