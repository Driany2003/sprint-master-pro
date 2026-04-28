import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { seed } from "@/lib/seed";
import type { State, Task, Sprint, Area, Project, TaskStatus, SprintStatus } from "@/lib/types";

const KEY = "workos-state-v4";

type Action =
  | { type: "HYDRATE"; payload: State }
  | { type: "SET_ACTIVE_PROJECT"; payload: { id: string } }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "UPDATE_PROJECT"; payload: { id: string; patch: Partial<Project> } }
  | { type: "DELETE_PROJECT"; payload: { id: string } }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: { id: string; patch: Partial<Task> } }
  | { type: "DELETE_TASK"; payload: { id: string } }
  | { type: "MOVE_TASK_STATUS"; payload: { id: string; status: TaskStatus } }
  | { type: "MOVE_TASK_SPRINT"; payload: { id: string; sprintId: string | null } }
  | { type: "ADD_SPRINT"; payload: Sprint }
  | { type: "UPDATE_SPRINT"; payload: { id: string; patch: Partial<Sprint> } }
  | { type: "SET_SPRINT_STATUS"; payload: { id: string; status: SprintStatus } }
  | { type: "DELETE_SPRINT"; payload: { id: string } }
  | { type: "ADD_AREA"; payload: Area }
  | { type: "UPDATE_AREA"; payload: { id: string; patch: Partial<Area> } }
  | { type: "DELETE_AREA"; payload: { id: string } }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE": return action.payload;
    case "SET_ACTIVE_PROJECT": return { ...state, activeProjectId: action.payload.id };
    case "ADD_PROJECT": return { ...state, projects: [...state.projects, action.payload] };
    case "UPDATE_PROJECT": return {
      ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload.patch } : p)
    };
    case "DELETE_PROJECT": {
      const remaining = state.projects.filter(p => p.id !== action.payload.id);
      const fallback = remaining[0]?.id ?? "";
      return {
        ...state,
        projects: remaining,
        activeProjectId: state.activeProjectId === action.payload.id ? fallback : state.activeProjectId,
        tasks: state.tasks.filter(t => t.projectId !== action.payload.id),
        sprints: state.sprints.filter(s => s.projectId !== action.payload.id),
      };
    }
    case "ADD_TASK": return { ...state, tasks: [action.payload, ...state.tasks] };
    case "UPDATE_TASK": return {
      ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload.patch } : t)
    };
    case "DELETE_TASK": return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload.id) };
    case "MOVE_TASK_STATUS": return {
      ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? {
        ...t, status: action.payload.status,
        progress: action.payload.status === "completada" ? 100 : t.progress,
        completedAt: action.payload.status === "completada" ? new Date().toISOString() : null,
      } : t)
    };
    case "MOVE_TASK_SPRINT": return {
      ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, sprintId: action.payload.sprintId } : t)
    };
    case "ADD_SPRINT": return { ...state, sprints: [action.payload, ...state.sprints] };
    case "UPDATE_SPRINT": return {
      ...state, sprints: state.sprints.map(s => s.id === action.payload.id ? { ...s, ...action.payload.patch } : s)
    };
    case "SET_SPRINT_STATUS": {
      let sprints = state.sprints.map(s => s.id === action.payload.id ? { ...s, status: action.payload.status } : s);
      // sólo un sprint activo a la vez
      if (action.payload.status === "activo") {
        sprints = sprints.map(s => s.id === action.payload.id ? s : (s.status === "activo" ? { ...s, status: "completado" as SprintStatus } : s));
      }
      return { ...state, sprints };
    }
    case "DELETE_SPRINT": return {
      ...state,
      sprints: state.sprints.filter(s => s.id !== action.payload.id),
      tasks: state.tasks.map(t => t.sprintId === action.payload.id ? { ...t, sprintId: null } : t),
    };
    case "ADD_AREA": return { ...state, areas: [...state.areas, action.payload] };
    case "UPDATE_AREA": return {
      ...state, areas: state.areas.map(a => a.id === action.payload.id ? { ...a, ...action.payload.patch } : a)
    };
    case "DELETE_AREA": {
      const remaining = state.areas.filter(a => a.id !== action.payload.id);
      const fallback = remaining[0]?.id ?? "";
      return {
        ...state,
        areas: remaining,
        tasks: state.tasks.map(t => t.areaId === action.payload.id ? { ...t, areaId: fallback } : t),
      };
    }
    case "RESET": return seed;
    default: return state;
  }
}

interface Ctx { state: State; dispatch: React.Dispatch<Action>; }
const WorkOSContext = createContext<Ctx | null>(null);

export function WorkOSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seed, (s) => {
    if (typeof window === "undefined") return s;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as State;
    } catch {}
    return s;
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <WorkOSContext.Provider value={value}>{children}</WorkOSContext.Provider>;
}

export function useWorkOS() {
  const ctx = useContext(WorkOSContext);
  if (!ctx) throw new Error("useWorkOS must be used within WorkOSProvider");
  return ctx;
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
