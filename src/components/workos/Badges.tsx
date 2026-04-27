import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Circle, CircleDot, Flag, Octagon, Pause, Zap } from "lucide-react";

const statusConfig: Record<TaskStatus, { label: string; cls: string; Icon: any }> = {
  pendiente:   { label: "Pendiente",   cls: "bg-muted text-muted-foreground border-border",       Icon: Circle },
  en_progreso: { label: "En curso",    cls: "bg-warning/10 text-warning border-warning/20",       Icon: CircleDot },
  en_riesgo:   { label: "En riesgo",   cls: "bg-primary/10 text-primary border-primary/20",       Icon: AlertTriangle },
  bloqueada:   { label: "Bloqueada",   cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: Octagon },
  completada:  { label: "Completada",  cls: "bg-success/10 text-success border-success/20",       Icon: CheckCircle2 },
};

const prioConfig: Record<TaskPriority, { label: string; cls: string; Icon: any }> = {
  baja:    { label: "Baja",    cls: "bg-muted text-muted-foreground border-border",                Icon: Flag },
  media:   { label: "Media",   cls: "bg-info/10 text-info border-info/20",                          Icon: Flag },
  alta:    { label: "Alta",    cls: "bg-warning/10 text-warning border-warning/20",                 Icon: Flag },
  urgente: { label: "Urgente", cls: "bg-destructive/10 text-destructive border-destructive/20",     Icon: Zap },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const c = statusConfig[status];
  const Icon = c.Icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
      c.cls, className
    )}>
      <Icon className="h-3 w-3" /> {c.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const c = prioConfig[priority];
  const Icon = c.Icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
      c.cls, className
    )}>
      <Icon className="h-3 w-3" /> {c.label}
    </span>
  );
}

export function AreaPill({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", className)}
      style={{ backgroundColor: `${color}18`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "success" | "warning" }) {
  const v = Math.max(0, Math.min(100, value));
  const bg = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-gradient-primary";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all duration-500", bg)} style={{ width: `${v}%` }} />
    </div>
  );
}

export { Pause };
