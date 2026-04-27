import { useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import type { TaskStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { AlertOctagon, AlertTriangle, CalendarDays, CheckCircle2, Circle, CircleDot, Pencil, Plus, Trash2 } from "lucide-react";
import { AreaPill, PriorityBadge, ProgressBar } from "../Badges";
import { AvatarStack } from "../Avatar";
import { format } from "date-fns";

const COLUMNS: { status: TaskStatus; Icon: any; tone: string }[] = [
  { status: "pendiente",   Icon: Circle,         tone: "text-muted-foreground border-border" },
  { status: "en_progreso", Icon: CircleDot,      tone: "text-warning border-warning/30" },
  { status: "en_riesgo",   Icon: AlertTriangle,  tone: "text-primary border-primary/30" },
  { status: "bloqueada",   Icon: AlertOctagon,   tone: "text-destructive border-destructive/30" },
  { status: "completada",  Icon: CheckCircle2,   tone: "text-success border-success/30" },
];

export function BoardView({ onCreateTask, onEdit }: { onCreateTask: (status?: TaskStatus) => void; onEdit: (id: string) => void }) {
  const { state, dispatch } = useWorkOS();
  const [dragId, setDragId] = useState<string | null>(null);

  function onDrop(status: TaskStatus) {
    if (!dragId) return;
    dispatch({ type: "MOVE_TASK_STATUS", payload: { id: dragId, status } });
    setDragId(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {COLUMNS.map(col => {
        const items = state.tasks.filter(t => t.status === col.status);
        const Icon = col.Icon;
        return (
          <div
            key={col.status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.status)}
            className="flex flex-col rounded-xl border bg-card shadow-soft min-h-[400px]"
          >
            <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${col.tone} border-t-2 rounded-t-xl bg-muted/30`}>
              <Icon className="h-4 w-4" />
              <span className="text-sm font-semibold text-foreground">{STATUS_LABEL[col.status]}</span>
              <span className="ml-auto text-xs font-semibold tabular-nums rounded-full bg-background border px-2 py-0.5">{items.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-auto">
              {items.length === 0 ? (
                <button onClick={() => onCreateTask(col.status)} className="w-full text-center text-xs text-muted-foreground py-8 border border-dashed rounded-lg hover:border-primary hover:text-primary transition">
                  Sin tareas · Click para añadir
                </button>
              ) : items.map(t => {
                const area = state.areas.find(a => a.id === t.areaId);
                const members = t.assigneeIds.map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    className="group rounded-lg border bg-card p-3 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition animate-fade-in"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {area && <AreaPill name={area.name} color={area.color} />}
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-2 font-medium text-sm text-foreground leading-tight">{t.title}</div>
                    {t.description && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ProgressBar value={t.progress} className="flex-1" />
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{t.progress}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {members.length ? (
                        <AvatarStack size="xs" members={members.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} />
                      ) : <span className="text-[10px] italic text-muted-foreground">Sin asignar</span>}
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />{format(new Date(t.endDate), "yyyy-MM-dd")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                      <button onClick={() => onEdit(t.id)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => dispatch({ type: "DELETE_TASK", payload: { id: t.id } })} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => onCreateTask(col.status)} className="m-2 mt-0 inline-flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition">
              <Plus className="h-3.5 w-3.5" /> Añadir tarea
            </button>
          </div>
        );
      })}
    </div>
  );
}
