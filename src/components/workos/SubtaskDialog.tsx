import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkOS, uid } from "@/store/workos-store";
import type { SubChecklistItem, Subtask, TaskStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { Calendar, Crown, ListChecks, Plus, Target, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  taskId: string | null;
  subtaskId: string | null;          // null => crear nueva
}

export function SubtaskDialog({ open, onOpenChange, taskId, subtaskId }: Props) {
  const { state, dispatch } = useWorkOS();
  const task = taskId ? state.tasks.find(t => t.id === taskId) : null;
  const editing = task && subtaskId ? task.subtasks?.find(s => s.id === subtaskId) ?? null : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState<TaskStatus>("pendiente");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [checklist, setChecklist] = useState<SubChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (!open || !task) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setObjective(editing.objective ?? "");
      setAreaId(editing.areaId ?? task.areaId);
      setProjectId(editing.projectId ?? task.projectId);
      setAssigneeId(editing.assigneeId ?? task.ownerId ?? "");
      setDueDate(editing.dueDate ? editing.dueDate.slice(0,10) : (task.endDate?.slice(0,10) ?? ""));
      setStatus(editing.status ?? (editing.done ? "completada" : "pendiente"));
      setStartDate((editing.startDate ?? task.startDate)?.slice(0,10) ?? "");
      setEndDate((editing.endDate ?? editing.dueDate ?? task.endDate)?.slice(0,10) ?? "");
      setChecklist(editing.checklist ?? []);
    } else {
      setTitle("");
      setDescription("");
      setObjective("");
      setAreaId(task.areaId);
      setProjectId(task.projectId);
      setAssigneeId(task.ownerId ?? "");
      setDueDate(task.endDate?.slice(0,10) ?? "");
      setStatus("pendiente");
      setStartDate(task.startDate?.slice(0,10) ?? "");
      setEndDate(task.endDate?.slice(0,10) ?? "");
      setChecklist([]);
    }
    setNewItem("");
  }, [open, task, editing]);

  if (!task) return null;

  function addItem() {
    const v = newItem.trim(); if (!v) return;
    setChecklist(c => [...c, { id: uid("ci"), text: v, done: false }]);
    setNewItem("");
  }

  function submit() {
    if (!title.trim()) { toast.error("Falta el título"); return; }
    const patch: Partial<Subtask> = {
      title: title.trim(),
      description: description.trim() || undefined,
      objective: objective.trim() || undefined,
      areaId, projectId,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      status,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      done: status === "completada",
      checklist,
    };
    if (editing) {
      dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: task!.id, subtaskId: editing.id, patch } });
      toast.success("Subtarea actualizada");
    } else {
      const sub: Subtask = {
        id: uid("st"),
        title: patch.title!,
        done: false,
        createdAt: new Date().toISOString(),
        ...patch,
      };
      dispatch({ type: "ADD_SUBTASK", payload: { taskId: task!.id, subtask: sub } });
      toast.success("Subtarea creada");
    }
    onOpenChange(false);
  }

  const done = checklist.filter(i => i.done).length;
  const pct = checklist.length ? Math.round(done * 100 / checklist.length) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {editing ? "Editar subtarea" : "Nueva subtarea"}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">De: <span className="font-medium text-foreground">{task.title}</span></p>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label className="text-xs">Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la subtarea" autoFocus />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle opcional" />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Objetivos</Label>
            <Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Qué se pretende lograr con esta subtarea" />
          </div>

          {/* Checklist */}
          <div className="rounded-lg border-2 border-primary/15 bg-primary/5 p-2.5">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs inline-flex items-center gap-1.5 mb-0">
                <ListChecks className="h-3.5 w-3.5 text-primary" /> Checklist
                {checklist.length > 0 && (
                  <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] tabular-nums font-semibold">{done}/{checklist.length} · {pct}%</span>
                )}
              </Label>
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1" onClick={() => { addItem(); }}>
                <Plus className="h-3 w-3" /> Ítem
              </Button>
            </div>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {checklist.length === 0 && (
                <div className="text-[11px] italic text-muted-foreground py-2 text-center">Sin ítems. Añade pasos concretos.</div>
              )}
              {checklist.map((it, idx) => (
                <div key={it.id} className="group flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground w-5 text-center tabular-nums">{String(idx+1).padStart(2,"0")}</span>
                  <Checkbox checked={it.done} onCheckedChange={() => setChecklist(c => c.map(x => x.id === it.id ? { ...x, done: !x.done } : x))} />
                  <input
                    value={it.text}
                    onChange={(e) => setChecklist(c => c.map(x => x.id === it.id ? { ...x, text: e.target.value } : x))}
                    className={`flex-1 bg-transparent text-sm outline-none rounded px-1 focus:ring-1 focus:ring-primary ${it.done ? "line-through text-muted-foreground" : ""}`}
                  />
                  <button type="button" onClick={() => setChecklist(c => c.filter(x => x.id !== it.id))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                placeholder="Añadir paso y pulsar Enter…"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
            <div className="grid gap-1.5">
              <Label className="text-xs">Proyecto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs inline-flex items-center gap-1.5"><Crown className="h-3 w-3 text-warning" /> Responsable</Label>
              <Select value={assigneeId || "_none"} onValueChange={(v) => setAssigneeId(v === "_none" ? "" : v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin responsable</SelectItem>
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
            <div className="grid gap-1.5">
              <Label className="text-xs inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Fecha objetivo</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Inicio en Timeline</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Fin en Timeline</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button type="button" variant="outline" className="text-destructive hover:text-destructive gap-1.5 mr-auto"
              onClick={() => { dispatch({ type: "DELETE_SUBTASK", payload: { taskId: task!.id, subtaskId: editing.id } }); toast.success("Subtarea eliminada"); onOpenChange(false); }}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
