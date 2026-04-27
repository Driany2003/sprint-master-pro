import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkOS, uid } from "@/store/workos-store";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title); setDescription(editing.description);
      setAreaId(editing.areaId); setStatus(editing.status); setPriority(editing.priority);
      setProgress(editing.progress); setPoints(editing.storyPoints);
      setSprintId(editing.sprintId ?? "backlog");
      setStart(editing.startDate.slice(0,10)); setEnd(editing.endDate.slice(0,10));
      setAssignees(editing.assigneeIds);
    } else {
      setTitle(""); setDescription(""); setAreaId(state.areas[0]?.id ?? "");
      setStatus(defaultStatus ?? "pendiente"); setPriority("media");
      setProgress(0); setPoints(5);
      setSprintId(defaultSprintId ?? "backlog");
      setStart(new Date().toISOString().slice(0,10));
      setEnd(new Date(Date.now()+7*86400000).toISOString().slice(0,10));
      setAssignees([]);
    }
  }, [open, editing, defaultSprintId, defaultStatus, state.areas]);

  const sprintsActive = state.sprints.filter(s => s.status !== "completado");

  function toggleAssignee(id: string) {
    setAssignees(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  }

  function submit() {
    if (!title.trim()) { toast.error("Falta el título"); return; }
    if (!areaId) { toast.error("Selecciona un área"); return; }
    const sId = sprintId === "backlog" ? null : sprintId;
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();
    if (new Date(end) < new Date(start)) { toast.error("La fecha fin debe ser posterior al inicio"); return; }

    if (editing) {
      dispatch({ type: "UPDATE_TASK", payload: { id: editing.id, patch: {
        title, description, areaId, status, priority,
        progress: status === "completada" ? 100 : progress,
        storyPoints: points, sprintId: sId,
        startDate: startISO, endDate: endISO, assigneeIds: assignees,
        completedAt: status === "completada" ? new Date().toISOString() : null,
      }}});
      toast.success("Tarea actualizada");
    } else {
      const task: Task = {
        id: uid("t"), title, description, projectId: state.activeProjectId,
        areaId, assigneeIds: assignees, status, priority,
        progress: status === "completada" ? 100 : progress, storyPoints: points,
        sprintId: sId, startDate: startISO, endDate: endISO,
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
      <DialogContent className="max-w-2xl">
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
            <Label>Progreso · {progress}%</Label>
            <Slider value={[progress]} max={100} step={5} onValueChange={(v) => setProgress(v[0])} />
          </div>

          <div className="grid gap-2">
            <Label>Asignados</Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 max-h-44 overflow-auto">
              {state.members.map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded-md p-1.5 hover:bg-muted">
                  <Checkbox checked={assignees.includes(m.id)} onCheckedChange={() => toggleAssignee(m.id)} />
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: m.color }}>{m.initials}</span>
                  <span className="text-xs truncate">{m.name}</span>
                </label>
              ))}
            </div>
          </div>
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
