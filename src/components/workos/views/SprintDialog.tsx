import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWorkOS, uid } from "@/store/workos-store";
import type { Sprint } from "@/lib/types";
import { toast } from "sonner";

export function SprintDialog({ open, onOpenChange, sprintId }: { open: boolean; onOpenChange: (o: boolean) => void; sprintId?: string | null; }) {
  const { state, dispatch } = useWorkOS();
  const editing = sprintId ? state.sprints.find(s => s.id === sprintId) ?? null : null;
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(40);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name); setGoal(editing.goal);
      setStart(editing.startDate.slice(0,10)); setEnd(editing.endDate.slice(0,10));
      setCapacity(editing.capacityPoints);
    } else {
      const today = new Date();
      const in14 = new Date(); in14.setDate(today.getDate() + 14);
      setName(`Sprint ${state.sprints.length + 1}`); setGoal("");
      setStart(today.toISOString().slice(0,10));
      setEnd(in14.toISOString().slice(0,10));
      setCapacity(40);
    }
  }, [open, editing, state.sprints.length]);

  function submit() {
    if (!name.trim()) { toast.error("Falta el nombre del sprint"); return; }
    if (new Date(end) < new Date(start)) { toast.error("Las fechas son inválidas"); return; }
    if (editing) {
      dispatch({ type: "UPDATE_SPRINT", payload: { id: editing.id, patch: {
        name, goal, startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(), capacityPoints: capacity
      }}});
      toast.success("Sprint actualizado");
    } else {
      const sprint: Sprint = {
        id: uid("s"), name, goal, projectId: state.activeProjectId,
        status: "planificacion",
        startDate: new Date(start).toISOString(), endDate: new Date(end).toISOString(),
        capacityPoints: capacity, createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_SPRINT", payload: sprint });
      toast.success("Sprint creado");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editing ? "Editar sprint" : "Nuevo sprint"}</DialogTitle>
          <DialogDescription>Define el ciclo de trabajo y su objetivo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-2"><Label>Objetivo (sprint goal)</Label><Textarea rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="¿Qué resultado clave queremos lograr?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Inicio</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Fin</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><Label>Capacidad (story points)</Label><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90">{editing ? "Guardar" : "Crear sprint"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
