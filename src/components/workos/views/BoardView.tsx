import { useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import { useProjectData } from "@/store/use-project-data";
import type { TaskStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { AlertOctagon, AlertTriangle, CalendarDays, CheckCircle2, Circle, CircleDot, Crown, Filter, ListChecks, Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AreaPill, PriorityBadge, ProgressBar } from "../Badges";
import { AvatarStack, MemberAvatar } from "../Avatar";
import { format } from "date-fns";
import { ConfirmDialog } from "../ConfirmDialog";
import { TaskDetailDialog } from "../TaskDetailDialog";
import { toast } from "sonner";

const COLUMNS: { status: TaskStatus; Icon: any; tone: string }[] = [
  { status: "pendiente",   Icon: Circle,         tone: "text-muted-foreground border-border" },
  { status: "en_progreso", Icon: CircleDot,      tone: "text-warning border-warning/30" },
  { status: "en_riesgo",   Icon: AlertTriangle,  tone: "text-primary border-primary/30" },
  { status: "bloqueada",   Icon: AlertOctagon,   tone: "text-destructive border-destructive/30" },
  { status: "completada",  Icon: CheckCircle2,   tone: "text-success border-success/30" },
];

export function BoardView({ onCreateTask, onEdit }: { onCreateTask: (status?: TaskStatus) => void; onEdit: (id: string) => void }) {
  const { state, dispatch } = useWorkOS();
  const { tasks: projectTasks } = useProjectData();
  const { can, user } = useAuth();
  const [dragId, setDragId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "mine" | "private">("all");

  const filteredTasks = projectTasks.filter(t => {
    if (!user) return true;
    if (scope === "mine") return t.assigneeIds.includes(user.id) || t.ownerId === user.id;
    if (scope === "private") return !!t.isPrivate && t.createdById === user.id;
    return true;
  });

  const counts = {
    all: projectTasks.length,
    mine: user ? projectTasks.filter(t => t.assigneeIds.includes(user.id) || t.ownerId === user.id).length : 0,
    private: user ? projectTasks.filter(t => t.isPrivate && t.createdById === user.id).length : 0,
  };

  function onDrop(status: TaskStatus) {
    if (!dragId) return;
    const task = state.tasks.find(t => t.id === dragId) || null;
    if (!can("task.moveStatus", { task })) {
      toast.error("Solo puedes mover tareas asignadas a ti");
      setDragId(null); return;
    }
    dispatch({ type: "MOVE_TASK_STATUS", payload: { id: dragId, status } });
    setDragId(null);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="h-3.5 w-3.5" /> Filtrar
        </span>
        <FilterChip active={scope === "all"}     onClick={() => setScope("all")}     Icon={Users} label="Todas"      count={counts.all} />
        <FilterChip active={scope === "mine"}    onClick={() => setScope("mine")}    Icon={Crown} label="Mis tareas" count={counts.mine} />
        <FilterChip active={scope === "private"} onClick={() => setScope("private")} Icon={Lock}  label="Privadas"   count={counts.private} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {COLUMNS.map(col => {
        const items = filteredTasks.filter(t => t.status === col.status);
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
                const owner = t.ownerId ? state.members.find(m => m.id === t.ownerId) : null;
                const collabs = t.assigneeIds.filter(id => id !== t.ownerId).map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
                const subs = t.subtasks ?? [];
                const subDone = subs.filter(s => s.done).length;
                const canEdit = can("task.editAny") || can("task.editOwn", { task: t });
                return (
                  <div
                    key={t.id}
                    draggable={can("task.moveStatus", { task: t })}
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => setDetailId(t.id)}
                    className="group rounded-lg border bg-card p-3 shadow-xs hover:shadow-md cursor-pointer transition animate-fade-in"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {area && <AreaPill name={area.name} color={area.color} />}
                      <div className="flex items-center gap-1">
                        {t.isPrivate && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5" title="Tarea privada">
                            <Lock className="h-2.5 w-2.5" /> PRIVADA
                          </span>
                        )}
                        <PriorityBadge priority={t.priority} />
                      </div>
                    </div>
                    <div className="mt-2 font-medium text-sm text-foreground leading-tight">{t.title}</div>
                    {t.description && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
                    {subs.length > 0 && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        <ListChecks className="h-3 w-3" /> {subDone}/{subs.length} subtareas
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ProgressBar value={t.progress} className="flex-1" />
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{t.progress}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {owner && (
                          <span className="relative inline-block" title={`Responsable: ${owner.name}`}>
                            <MemberAvatar initials={owner.initials} color={owner.color} size="xs" />
                            <Crown className="absolute -top-1 -right-1 h-2.5 w-2.5 text-warning fill-warning" />
                          </span>
                        )}
                        {collabs.length > 0 && <AvatarStack size="xs" members={collabs.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} />}
                        {!owner && collabs.length === 0 && <span className="text-[10px] italic text-muted-foreground">Sin asignar</span>}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />{format(new Date(t.endDate), "yyyy-MM-dd")}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition justify-end">
                      {canEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(t.id); }} className="rounded p-1 hover:bg-muted"><Pencil className="h-3 w-3" /></button>}
                      {can("task.editAny") && <button onClick={(e) => { e.stopPropagation(); setConfirmId(t.id); }} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3 w-3" /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {can("task.create") && <button onClick={() => onCreateTask(col.status)} className="m-2 mt-0 inline-flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition">
              <Plus className="h-3.5 w-3.5" /> Añadir tarea
            </button>}
          </div>
        );
      })}
      </div>
      <TaskDetailDialog
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        taskId={detailId}
        onEdit={(id) => { setDetailId(null); onEdit(id); }}
        onDelete={(id) => { setDetailId(null); setConfirmId(id); }}
      />
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Eliminar tarea"
        description="La tarea se eliminará permanentemente del board."
        confirmLabel="Eliminar"
        onConfirm={() => { if (confirmId) { dispatch({ type: "DELETE_TASK", payload: { id: confirmId } }); toast.success("Tarea eliminada"); } setConfirmId(null); }}
      />
    </div>
  );
}

function FilterChip({ active, onClick, Icon, label, count }: { active: boolean; onClick: () => void; Icon: any; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-gradient-primary text-primary-foreground border-transparent shadow-soft"
          : "bg-card text-muted-foreground hover:text-foreground hover:border-primary/50"
      }`}
    >
      <Icon className="h-3 w-3" /> {label}
      <span className={`tabular-nums rounded-full px-1.5 py-px text-[10px] font-bold ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>{count}</span>
    </button>
  );
}
