import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWorkOS } from "@/store/workos-store";
import { StatusBadge, PriorityBadge, AreaPill, ProgressBar } from "./Badges";
import { MemberAvatar } from "./Avatar";
import { CalendarRange, Crown, Flame, ListChecks, Pencil, Plus, Trash2, Users, X, Zap } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { SubtaskDialog } from "./SubtaskDialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailDialog({ open, onOpenChange, taskId, onEdit, onDelete }: Props) {
  const { state, dispatch } = useWorkOS();
  const [subDlg, setSubDlg] = useState<{ open: boolean; subtaskId: string | null }>({ open: false, subtaskId: null });
  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
  if (!task) return null;
  const area = state.areas.find(a => a.id === task.areaId);
  const sprint = task.sprintId ? state.sprints.find(s => s.id === task.sprintId) : null;
  const owner = task.ownerId ? state.members.find(m => m.id === task.ownerId) : null;
  const collaborators = task.assigneeIds
    .filter(id => id !== task.ownerId)
    .map(id => state.members.find(m => m.id === id))
    .filter(Boolean) as any[];
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter(s => s.done).length;
  const subPct = subtasks.length ? Math.round((subDone / subtasks.length) * 100) : 0;
  const days = differenceInCalendarDays(new Date(task.endDate), new Date(task.startDate)) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl pr-6">{task.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap pt-1">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {area && <AreaPill name={area.name} color={area.color} />}
            {sprint && <span className="inline-flex items-center gap-1 text-[11px] rounded-md border bg-primary/5 text-primary border-primary/20 px-2 py-0.5 font-medium"><Flame className="h-3 w-3" />{sprint.name}</span>}
            <span className="inline-flex items-center gap-1 text-[11px] rounded-md border px-2 py-0.5 font-medium"><Zap className="h-3 w-3" />{task.storyPoints} pts</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Descripción</div>
            <p className="text-sm">{task.description || <span className="italic text-muted-foreground">Sin descripción</span>}</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground inline-flex items-center gap-1">Progreso {subtasks.length > 0 && <span className="italic">(auto desde subtareas)</span>}</span>
              <span className="font-semibold tabular-nums">{task.progress}%</span>
            </div>
            <ProgressBar value={task.progress} />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs rounded-lg border bg-muted/30 p-3">
            <div><div className="text-muted-foreground inline-flex items-center gap-1"><CalendarRange className="h-3 w-3" />Inicio</div><div className="font-semibold mt-0.5">{format(new Date(task.startDate), "d MMM yyyy", { locale: es })}</div></div>
            <div><div className="text-muted-foreground inline-flex items-center gap-1"><CalendarRange className="h-3 w-3" />Fin</div><div className="font-semibold mt-0.5">{format(new Date(task.endDate), "d MMM yyyy", { locale: es })}</div></div>
            <div><div className="text-muted-foreground">Duración</div><div className="font-semibold mt-0.5">{days} día{days !== 1 ? "s" : ""}</div></div>
          </div>

          {/* Owner */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5"><Crown className="h-3 w-3 text-warning" /> Responsable</div>
            {owner ? (
              <div className="flex items-center gap-2 rounded-lg border-2 border-warning/30 bg-warning/5 p-2">
                <div className="relative">
                  <MemberAvatar initials={owner.initials} color={owner.color} size="md" />
                  <Crown className="absolute -top-1.5 -right-1 h-3.5 w-3.5 text-warning fill-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{owner.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{owner.role}</div>
                </div>
              </div>
            ) : <div className="text-xs italic text-muted-foreground">Sin responsable</div>}
          </div>

          {/* Colaboradores */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5"><Users className="h-3 w-3" /> Colaboradores ({collaborators.length})</div>
            {collaborators.length === 0 ? <div className="text-xs italic text-muted-foreground">Sin colaboradores</div> :
              <div className="grid grid-cols-2 gap-2">
                {collaborators.map(m => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
                    <MemberAvatar initials={m.initials} color={m.color} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>}
          </div>

          {/* Subtareas */}
          <div className="rounded-xl border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider text-primary font-bold inline-flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Subtareas
                {subtasks.length > 0 && <span className="ml-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] tabular-nums">{subDone}/{subtasks.length}</span>}
              </div>
              {subtasks.length > 0 && <span className="text-[11px] font-bold tabular-nums text-primary">{subPct}%</span>}
            </div>
            {subtasks.length > 0 && (
              <div className="mb-2"><ProgressBar value={subPct} /></div>
            )}
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {subtasks.length === 0 && <div className="text-xs italic text-muted-foreground py-2 text-center">Aún no hay subtareas. Añade la primera abajo.</div>}
              {subtasks.map((s, i) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 hover:border-primary/40 hover:shadow-xs transition">
                  <span className="text-[10px] font-mono text-muted-foreground w-5 text-center tabular-nums">{String(i+1).padStart(2,"0")}</span>
                  <Checkbox checked={s.done} onCheckedChange={() => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId: task.id, subtaskId: s.id } })} />
                  <button
                    onClick={() => setSubDlg({ open: true, subtaskId: s.id })}
                    className={`flex-1 text-left bg-transparent text-sm outline-none rounded px-1 hover:text-primary transition ${s.done ? "line-through text-muted-foreground" : ""}`}
                    title="Editar subtarea"
                  >
                    {s.title}
                    <span className="ml-2 inline-flex items-center gap-2 text-[10px] text-muted-foreground">
                      {s.objective && <span className="rounded bg-primary/10 text-primary px-1 py-0.5">obj</span>}
                      {s.checklist && s.checklist.length > 0 && (
                        <span className="tabular-nums">{s.checklist.filter(c=>c.done).length}/{s.checklist.length}</span>
                      )}
                    </span>
                  </button>
                  <button onClick={() => setSubDlg({ open: true, subtaskId: s.id })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => dispatch({ type: "DELETE_SUBTASK", payload: { taskId: task.id, subtaskId: s.id } })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition" title="Eliminar">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Button size="sm" onClick={() => setSubDlg({ open: true, subtaskId: null })} className="w-full gap-1 bg-gradient-primary text-primary-foreground hover:opacity-90 h-8">
                <Plus className="h-3.5 w-3.5" />Nueva subtarea
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}><Trash2 className="h-3.5 w-3.5" />Eliminar</Button>
          <Button size="sm" onClick={() => onEdit(task.id)} className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90"><Pencil className="h-3.5 w-3.5" />Editar</Button>
        </div>
        <SubtaskDialog open={subDlg.open} onOpenChange={(o) => setSubDlg(s => ({ ...s, open: o }))} taskId={task.id} subtaskId={subDlg.subtaskId} />
      </DialogContent>
    </Dialog>
  );
}
