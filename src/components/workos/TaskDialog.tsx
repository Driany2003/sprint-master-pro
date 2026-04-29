import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkOS, uid } from "@/store/workos-store";
import type { Subtask, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Crown, ListChecks, Lock, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/store/auth-store";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskId?: string | null;
  defaultSprintId?: string | null;
  defaultStatus?: TaskStatus;
}

const STATUSES: TaskStatus[] = ["pendiente","en_progreso","en_riesgo","bloqueada","completada"];
const PRIOS: TaskPriority[] = ["baja","media","alta","urgente"];
const POINTS = [1,2,3,5,8,13,21];

export function TaskDialog({ open, onOpenChange, taskId, defaultSprintId, defaultStatus }: Props) {
  const { state, dispatch } = useWorkOS();
  const { user } = useAuth();
  const editing = taskId ? state.tasks.find(t => t.id === taskId) ?? null : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaId, setAreaId] = useState(state.areas[0]?.id ?? "");
  const [status, setStatus] = useState<TaskStatus>("pendiente");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [progress, setProgress] = useState(0);
  const [points, setPoints] = useState(5);
  const [sprintId, setSprintId] = useState<string>("backlog");
  const [start, setStart] = useState<string>(new Date().toISOString().slice(0,10));
  const [end, setEnd] = useState<string>(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [assignees, setAssignees] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title); setDescription(editing.description);
      setAreaId(editing.areaId); setStatus(editing.status); setPriority(editing.priority);
      setProgress(editing.progress); setPoints(editing.storyPoints);
      setSprintId(editing.sprintId ?? "backlog");
      setStart(editing.startDate.slice(0,10)); setEnd(editing.endDate.slice(0,10));
      setAssignees(editing.assigneeIds);
      setOwnerId(editing.ownerId ?? editing.assigneeIds[0] ?? "");
      setSubtasks(editing.subtasks ?? []);
      setIsPrivate(!!editing.isPrivate);
    } else {
      setTitle(""); setDescription(""); setAreaId(state.areas[0]?.id ?? "");
      setStatus(defaultStatus ?? "pendiente"); setPriority("media");
      setProgress(0); setPoints(5);
      setSprintId(defaultSprintId ?? "backlog");
      setStart(new Date().toISOString().slice(0,10));
      setEnd(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
      setAssignees([]);
      setOwnerId(state.members[0]?.id ?? "");
      setSubtasks([]);
      setIsPrivate(false);
    }
    setNewSubtask("");
  }, [open, editing, defaultSprintId, defaultStatus, state.areas]);

  const sprintsActive = state.sprints.filter(s => s.status !== "completado");
  const hasSubs = subtasks.length > 0;
  const computedProgress = hasSubs
    ? Math.floor(100 * subtasks.filter(s => s.done).length / subtasks.length)
    : progress;

  function toggleAssignee(id: string) {
    setAssignees(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
    // Si añado un colaborador y no hay owner, lo promuevo
    if (!ownerId) setOwnerId(id);
  }

  function addSubtask() {
    const t = newSubtask.trim();
    if (!t) return;
    setSubtasks(s => [...s, { id: uid("sub"), title: t, done: false, createdAt: new Date().toISOString() }]);
    setNewSubtask("");
  }
  function toggleSub(id: string) {
    setSubtasks(s => s.map(x => x.id === id ? { ...x, done: !x.done } : x));
  }
  function removeSub(id: string) {
    setSubtasks(s => s.filter(x => x.id !== id));
  }
  function updateSubTitle(id: string, v: string) {
    setSubtasks(s => s.map(x => x.id === id ? { ...x, title: v } : x));
  }

  function submit() {
    if (!title.trim()) { toast.error("Falta el título"); return; }
    if (!areaId) { toast.error("Selecciona un área"); return; }
    if (!ownerId) { toast.error("Asigna un responsable"); return; }
    const sId = sprintId === "backlog" ? null : sprintId;
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();
    if (new Date(end) < new Date(start)) { toast.error("La fecha fin debe ser posterior al inicio"); return; }
    // owner siempre dentro de assignees (compat retro)
    const finalAssignees = assignees.includes(ownerId) ? assignees : [ownerId, ...assignees];
    const finalProgress = hasSubs ? computedProgress : (status === "completada" ? 100 : progress);

    if (editing) {
      dispatch({ type: "UPDATE_TASK", payload: { id: editing.id, patch: {
        title, description, areaId, status, priority,
        progress: finalProgress,
        storyPoints: points, sprintId: sId,
        startDate: startISO, endDate: endISO, assigneeIds: finalAssignees,
        ownerId, subtasks,
        isPrivate,
        completedAt: status === "completada" ? new Date().toISOString() : null,
      }}});
      toast.success("Tarea actualizada");
    } else {
      const task: Task = {
        id: uid("t"), title, description, projectId: state.activeProjectId,
        areaId, ownerId, assigneeIds: finalAssignees, status, priority,
        progress: finalProgress, storyPoints: points,
        sprintId: sId, startDate: startISO, endDate: endISO,
        subtasks,
        isPrivate,
        createdById: user?.id ?? null,
        createdAt: new Date().toISOString(),
        completedAt: status === "completada" ? new Date().toISOString() : null,
      };
      dispatch({ type: "ADD_TASK", payload: task });
      toast.success("Tarea creada");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editing ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>Completa los detalles para organizarla en tu sprint.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Migrar módulo de reportes" />
          </div>
          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto, criterios de aceptación..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.areas.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                        {a.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog (sin sprint)</SelectItem>
                  {sprintsActive.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Story points</Label>
              <Select value={String(points)} onValueChange={(v) => setPoints(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POINTS.map(p => <SelectItem key={p} value={String(p)}>{p} pts</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Inicio</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Fin</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              <span>Progreso · {hasSubs ? computedProgress : progress}%</span>
              {hasSubs && <span className="text-[10px] font-normal text-muted-foreground italic">Calculado desde subtareas</span>}
            </Label>
            <Slider value={[hasSubs ? computedProgress : progress]} max={100} step={5}
              onValueChange={(v) => setProgress(v[0])} disabled={hasSubs} />
          </div>

          {/* Owner */}
          <div className="grid gap-2">
            <Label className="inline-flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-warning" /> Responsable principal</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un responsable" /></SelectTrigger>
              <SelectContent>
                {state.members.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-semibold text-white" style={{ backgroundColor: m.color }}>{m.initials}</span>
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Colaboradores */}
          <div className="grid gap-2">
            <Label>Colaboradores</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-44 overflow-auto">
              {state.members.filter(m => m.id !== ownerId).map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-muted">
                  <Checkbox checked={assignees.includes(m.id)} onCheckedChange={() => toggleAssignee(m.id)} />
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: m.color }}>{m.initials}</span>
                  <span className="text-xs truncate">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Subtareas */}
          <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="inline-flex items-center gap-1.5 mb-0"><ListChecks className="h-3.5 w-3.5 text-primary" /> Subtareas {hasSubs && <span className="text-muted-foreground font-normal">· {subtasks.filter(s=>s.done).length}/{subtasks.length}</span>}</Label>
            </div>
            {subtasks.length > 0 && (
              <div className="space-y-1">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md bg-card border px-2 py-1.5 group">
                    <Checkbox checked={s.done} onCheckedChange={() => toggleSub(s.id)} />
                    <Input value={s.title} onChange={(e) => updateSubTitle(s.id, e.target.value)} className={`h-7 border-none bg-transparent shadow-none focus-visible:ring-0 px-1 text-sm ${s.done ? "line-through text-muted-foreground" : ""}`} />
                    <button type="button" onClick={() => removeSub(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition rounded p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Añadir subtarea y presiona Enter"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); }}}
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addSubtask} className="gap-1 h-8"><Plus className="h-3.5 w-3.5" />Añadir</Button>
            </div>
          </div>

          {/* Visibilidad */}
          <label className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 cursor-pointer hover:bg-muted/30 transition">
            <Checkbox checked={isPrivate} onCheckedChange={(v) => setIsPrivate(!!v)} className="mt-0.5" />
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 text-sm font-medium">
                <Lock className="h-3.5 w-3.5 text-primary" /> Tarea privada
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Solo tú podrás verla. Los demás miembros del proyecto no la verán en ninguna vista.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {editing ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
