export type Role = "SUPERADMIN" | "ADMIN" | "MONITOR" | "LEALTAD" | "MIEMBRO";

export interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  area: string;
  color: string;
}

export interface Area {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  leadIds: string[];
  memberIds: string[]; // miembros con acceso al proyecto (además de admins)
  color?: string;
}

export type TaskStatus = "pendiente" | "en_progreso" | "en_riesgo" | "bloqueada" | "completada";
export type TaskPriority = "baja" | "media" | "alta" | "urgente";

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  areaId: string;
  assigneeIds: string[];
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // 0-100
  startDate: string; // ISO
  endDate: string;   // ISO
  storyPoints: number;
  sprintId: string | null;
  createdAt: string;
  completedAt?: string | null;
  blockedReason?: string;
}

export type SprintStatus = "planificacion" | "activo" | "completado";

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  projectId: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  capacityPoints: number;
  createdAt: string;
}

export interface State {
  members: Member[];
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  activeProjectId: string;
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  en_riesgo: "En riesgo",
  bloqueada: "Bloqueada",
  completada: "Completada",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};
