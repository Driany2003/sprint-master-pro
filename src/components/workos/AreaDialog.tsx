import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useWorkOS, uid } from "@/store/workos-store";
import { toast } from "sonner";

const PALETTE = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#06b6d4","#0ea5e9","#6366f1","#a855f7","#ec4899"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  areaId?: string | null;
}

export function AreaDialog({ open, onOpenChange, areaId }: Props) {
  const { state, dispatch } = useWorkOS();
  const editing = areaId ? state.areas.find(a => a.id === areaId) ?? null : null;
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  useEffect(() => {
    if (!open) return;
    if (editing) { setName(editing.name); setColor(editing.color); }
    else { setName(""); setColor(PALETTE[Math.floor(Math.random()*PALETTE.length)]); }
  }, [open, editing]);

  function submit() {
    if (!name.trim()) { toast.error("Falta el nombre"); return; }
    if (editing) {
      dispatch({ type: "UPDATE_AREA", payload: { id: editing.id, patch: { name, color } } } as any);
      toast.success("Área actualizada");
    } else {
      dispatch({ type: "ADD_AREA", payload: { id: uid("a"), name, color } });
      toast.success("Área creada");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editing ? "Editar área" : "Nueva área"}</DialogTitle>
          <DialogDescription>Las áreas agrupan tareas por equipo o disciplina.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Diseño" /></div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-lg border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            {editing ? "Guardar" : "Crear área"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
