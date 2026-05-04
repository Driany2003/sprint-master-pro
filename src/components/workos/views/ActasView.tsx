import { useMemo, useState } from "react";
import { useWorkOS, uid } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import { useProjectData } from "@/store/use-project-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ChevronRight, FileText, Plus, ArrowLeft, Pencil, Trash2, ClipboardPaste, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { Acta, ActaItem, ActaItemStatus, ActaStatus, ActaType, Task } from "@/lib/types";
import { ConfirmDialog } from "@/components/workos/ConfirmDialog";

const TYPES: ActaType[] = ["Operativa", "Estratégica", "Táctica", "Otra"];
const STATUSES: ActaStatus[] = ["Abierta", "Cerrada", "Dada de baja"];
const ITEM_STATUSES: ActaItemStatus[] = ["Pendiente", "En curso", "Completado", "Acción"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return { day: d.getDate().toString().padStart(2, "0"), month: d.toLocaleDateString("es", { month: "short" }).toUpperCase().replace(".",""), year: d.getFullYear() };
}

export function ActasView() {
  const { state } = useWorkOS();
  const { project } = useProjectData();
  const { can } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("__all");
  const [filterType, setFilterType] = useState<string>("__all");

  const projectActas = useMemo(
    () => (state.actas ?? []).filter(a => a.projectId === project?.id),
    [state.actas, project?.id]
  );

  const filtered = projectActas.filter(a =>
    (filterStatus === "__all" || a.status === filterStatus) &&
    (filterType === "__all" || a.type === filterType)
  );

  if (openId) {
    return <ActaDetail actaId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-lg">Actas de reunión</h2>
            <p className="text-xs text-muted-foreground">{projectActas.length} {projectActas.length === 1 ? "registro" : "registros"}</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los estados</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos los tipos</SelectItem>
              {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {can("task.create") && (
            <Button onClick={() => setNewOpen(true)} className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Nueva acta
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No hay actas que coincidan con los filtros.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map(a => {
              const total = a.items.length;
              const converted = a.items.filter(i => i.convertedTaskId).length;
              const completed = a.items.filter(i => i.estado === "Completado").length;
              const pct = total === 0 ? 0 : Math.round(100 * completed / total);
              const d = fmtDate(a.date);
              return (
                <li key={a.id}>
                  <button onClick={() => setOpenId(a.id)} className="w-full text-left px-4 py-3 hover:bg-muted/40 transition flex items-center gap-4">
                    <div className="text-center w-16 shrink-0">
                      <div className="font-display font-bold text-2xl leading-none">{d.day}</div>
                      <div className="text-[10px] text-muted-foreground tracking-wider mt-1">{d.month} {d.year}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted">{a.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md ${a.status === "Abierta" ? "bg-info/15 text-info" : a.status === "Cerrada" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{a.status}</span>
                        {converted > 0 && <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary">{converted} convertidos</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs w-40 shrink-0">
                      <div className="text-muted-foreground">{total} {total === 1 ? "ítem" : "ítems"}</div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-muted-foreground">{pct}% avance</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ActaFormDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

/* ===========================================================
 * Detail with Excel-like editor
 * =========================================================== */

function ActaDetail({ actaId, onBack }: { actaId: string; onBack: () => void }) {
  const { state, dispatch } = useWorkOS();
  const { user, can } = useAuth();
  const acta = (state.actas ?? []).find(a => a.id === actaId);
  const [editHeader, setEditHeader] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [convertItem, setConvertItem] = useState<ActaItem | null>(null);

  if (!acta) return <div className="p-12 text-center text-muted-foreground">Acta no encontrada.</div>;

  const items = acta.items;
  const total = items.length;
  const converted = items.filter(i => i.convertedTaskId).length;
  const pendingNoTask = items.filter(i => !i.convertedTaskId && !i.situacion.startsWith("##")).length;
  const completed = items.filter(i => i.estado === "Completado").length;
  const pct = total === 0 ? 0 : Math.round(100 * completed / total);
  const d = fmtDate(acta.date);

  function addRow() {
    const empty: ActaItem = {
      id: uid("ai"),
      areaId: null, situacion: "", tarea: "", responsableId: null,
      startDate: null, endDate: null, estado: "Pendiente",
    };
    dispatch({ type: "ADD_ACTA_ITEM", payload: { actaId, item: empty } });
  }
  function patchItem(id: string, patch: Partial<ActaItem>) {
    dispatch({ type: "UPDATE_ACTA_ITEM", payload: { actaId, itemId: id, patch } });
  }
  function delItem(id: string) {
    dispatch({ type: "DELETE_ACTA_ITEM", payload: { actaId, itemId: id } });
  }
  function setStatus(s: ActaStatus) {
    dispatch({ type: "UPDATE_ACTA", payload: { id: actaId, patch: { status: s } } });
    toast.success(`Acta ${s.toLowerCase()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Listado</Button>
        <FileText className="h-4 w-4 text-muted-foreground ml-2" />
        <h2 className="font-display font-bold text-lg uppercase tracking-wide">{acta.title}</h2>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border bg-card shadow-soft p-4 grid grid-cols-1 md:grid-cols-[120px_1fr_220px] gap-4 items-start">
        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <div className="font-display font-bold text-3xl leading-none">{d.day}</div>
          <div className="text-[10px] text-muted-foreground tracking-wider mt-2">{d.month} {d.year}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted">{acta.type}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${acta.status === "Abierta" ? "bg-info/15 text-info" : acta.status === "Cerrada" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{acta.status}</span>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2 text-sm whitespace-pre-line min-h-[60px]">
            {acta.notes || <span className="text-muted-foreground italic">Sin notas</span>}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Estado del acta</Label>
          <Select value={acta.status} onValueChange={(v) => setStatus(v as ActaStatus)} disabled={!can("task.create")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full gap-1.5 border-primary/40 text-primary" onClick={() => setEditHeader(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar cabecera
          </Button>
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Dar de baja
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="ÍTEMS" value={total} bar="info" />
        <KPI label="CONVERTIDOS" value={converted} bar="primary" />
        <KPI label="PTE. SIN TAREA" value={pendingNoTask} bar="warning" />
        <KPI label="COMPLETITUD" value={`${pct}%`} bar="success" />
      </div>

      {/* Excel-like table */}
      <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-display font-semibold">Puntos del acta</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Columnas como en el comité: Área · Situación · Tarea · Responsable · Inicio · Fecha fin. Edición en celda; fila «+» al final. Bloques: situación que empiece por <code className="px-1 rounded bg-muted">##</code> sin texto en Tarea.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)} className="gap-1.5 border-primary/40 text-primary">
            <ClipboardPaste className="h-3.5 w-3.5" /> Pegar filas
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[hsl(220_45%_18%)] text-white text-xs">
                <th className="px-2 py-2 text-left w-10">N°</th>
                <th className="px-2 py-2 text-left w-44">Área</th>
                <th className="px-2 py-2 text-left">Situación</th>
                <th className="px-2 py-2 text-left">Tarea</th>
                <th className="px-2 py-2 text-left w-48">Responsable</th>
                <th className="px-2 py-2 text-left w-36">Inicio</th>
                <th className="px-2 py-2 text-left w-36">Fecha fin</th>
                <th className="px-2 py-2 text-left w-32">Estado</th>
                <th className="px-2 py-2 text-left w-28">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-8 italic text-xs">
                    Aún no hay ítems. Usa la fila «+» de abajo para añadir uno.
                  </td>
                </tr>
              )}
              {items.map((it, idx) => (
                <ItemRow key={it.id} index={idx + 1} item={it} onPatch={(p) => patchItem(it.id, p)} onDelete={() => delItem(it.id)} onConvert={() => setConvertItem(it)} />
              ))}
              {/* Fila «+» */}
              <tr className="border-t-2 border-dashed border-warning/50 bg-warning/5">
                <td className="px-2 py-2 text-warning font-bold text-center">+</td>
                <td colSpan={7} className="px-2 py-2 text-xs text-muted-foreground">
                  <button onClick={addRow} className="text-primary hover:underline font-medium">Nueva fila</button>
                  <span className="ml-2">Ctrl+Enter o salir del campo Fecha fin</span>
                </td>
                <td className="px-2 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {editHeader && <ActaFormDialog open={editHeader} onOpenChange={setEditHeader} actaId={acta.id} />}
      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="¿Dar de baja esta acta?"
        description="El acta se marcará como Dada de baja y dejará de contar en métricas."
        confirmLabel="Dar de baja"
        onConfirm={() => { dispatch({ type: "UPDATE_ACTA", payload: { id: acta.id, patch: { status: "Dada de baja" } } }); setConfirmDel(false); }}
      />
      {pasteOpen && <PasteRowsDialog open={pasteOpen} onOpenChange={setPasteOpen} actaId={acta.id} />}
      {convertItem && <ConvertItemDialog open={!!convertItem} onOpenChange={(o) => !o && setConvertItem(null)} acta={acta} item={convertItem} />}
    </div>
  );
}

function KPI({ label, value, bar }: { label: string; value: number | string; bar: "info" | "primary" | "warning" | "success" }) {
  const colors = {
    info: "bg-info", primary: "bg-primary", warning: "bg-warning", success: "bg-success",
  } as const;
  return (
    <div className="rounded-xl border bg-card shadow-xs p-4 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors[bar]}`} />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="font-display font-bold text-3xl mt-1">{value}</div>
    </div>
  );
}

function ItemRow({ index, item, onPatch, onDelete, onConvert }: {
  index: number; item: ActaItem;
  onPatch: (p: Partial<ActaItem>) => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const { state } = useWorkOS();
  const isBlock = item.situacion.trim().startsWith("##");
  const alreadyConverted = !!item.convertedTaskId;

  return (
    <tr className={`border-t ${isBlock ? "bg-info/5" : "hover:bg-muted/30"}`}>
      <td className="px-2 py-2 text-center text-muted-foreground text-xs align-top pt-3">{index}</td>
      <td className="px-1 py-1 align-top">
        <Select value={item.areaId ?? "__none"} onValueChange={(v) => onPatch({ areaId: v === "__none" ? null : v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— Elegir equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— Elegir equipo</SelectItem>
            {state.areas.map(a => (
              <SelectItem key={a.id} value={a.id}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />{a.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea value={item.textoActa ?? ""} onChange={(e) => onPatch({ textoActa: e.target.value })} placeholder="Texto en acta (opc.)" className="mt-1 min-h-[28px] h-7 text-xs resize-none" />
      </td>
      <td className="px-1 py-1 align-top">
        <Textarea value={item.situacion} onChange={(e) => onPatch({ situacion: e.target.value })} placeholder={"Situación (## para bloque sin tarea)"} className="min-h-[60px] text-xs resize-y" />
      </td>
      <td className="px-1 py-1 align-top">
        <Textarea value={item.tarea} onChange={(e) => onPatch({ tarea: e.target.value })} placeholder={isBlock ? "(no aplica para bloque)" : "Tarea"} className="min-h-[60px] text-xs resize-y" disabled={isBlock} />
      </td>
      <td className="px-1 py-1 align-top">
        <Select value={item.responsableId ?? "__none"} onValueChange={(v) => onPatch({ responsableId: v === "__none" ? null : v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— Elegir responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">— Elegir responsable</SelectItem>
            {state.members.map(m => (
              <SelectItem key={m.id} value={m.id}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-4 w-4 rounded-full text-[8px] items-center justify-center text-white font-bold" style={{ backgroundColor: m.color }}>{m.initials}</span>
                  {m.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={item.responsableTexto ?? ""} onChange={(e) => onPatch({ responsableTexto: e.target.value })} placeholder="Varios / texto acta (opc.)" className="mt-1 h-7 text-xs" />
      </td>
      <td className="px-1 py-1 align-top">
        <Input type="date" value={item.startDate ?? ""} onChange={(e) => onPatch({ startDate: e.target.value || null })} className="h-8 text-xs" />
      </td>
      <td className="px-1 py-1 align-top">
        <Input type="date" value={item.endDate ?? ""} onChange={(e) => onPatch({ endDate: e.target.value || null })} className="h-8 text-xs" />
      </td>
      <td className="px-1 py-1 align-top">
        <Select value={item.estado} onValueChange={(v) => onPatch({ estado: v as ActaItemStatus })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{ITEM_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-1 py-1 align-top">
        <div className="flex flex-col gap-1">
          {alreadyConverted ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium px-2 py-1 rounded bg-success/10">
              <CheckCircle2 className="h-3 w-3" /> Convertido
            </span>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/40 text-primary" onClick={onConvert} disabled={isBlock || !item.tarea.trim()}>
              Convertir
            </Button>
          )}
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1 self-start">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ===========================================================
 * Acta form dialog (create / edit header)
 * =========================================================== */

function ActaFormDialog({ open, onOpenChange, actaId }: { open: boolean; onOpenChange: (o: boolean) => void; actaId?: string }) {
  const { state, dispatch } = useWorkOS();
  const { user } = useAuth();
  const editing = actaId ? (state.actas ?? []).find(a => a.id === actaId) ?? null : null;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [date, setDate] = useState((editing?.date ?? new Date().toISOString()).slice(0,10));
  const [type, setType] = useState<ActaType>(editing?.type ?? "Operativa");
  const [notes, setNotes] = useState(editing?.notes ?? "");

  function submit() {
    if (!title.trim()) { toast.error("Falta el título"); return; }
    if (editing) {
      dispatch({ type: "UPDATE_ACTA", payload: { id: editing.id, patch: { title, date: new Date(date).toISOString(), type, notes } } });
      toast.success("Acta actualizada");
    } else {
      const acta: Acta = {
        id: uid("acta"), projectId: state.activeProjectId, title,
        date: new Date(date).toISOString(), type, status: "Abierta",
        notes, createdById: user?.id ?? null, createdAt: new Date().toISOString(),
        items: [],
      };
      dispatch({ type: "ADD_ACTA", payload: acta });
      toast.success("Acta creada");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">{editing ? "Editar cabecera" : "Nueva acta de reunión"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Comité semanal..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as ActaType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Notas / contexto</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resumen, asistentes, acuerdos generales..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5">
            <Save className="h-4 w-4" />{editing ? "Guardar" : "Crear acta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Paste-rows: tab-separated text → multiple items
 * =========================================================== */

function PasteRowsDialog({ open, onOpenChange, actaId }: { open: boolean; onOpenChange: (o: boolean) => void; actaId: string }) {
  const { state, dispatch } = useWorkOS();
  const [text, setText] = useState("");

  function parse() {
    const rows = text.split(/\r?\n/).filter(r => r.trim());
    if (rows.length === 0) { toast.error("Pega al menos una fila"); return; }
    const items: ActaItem[] = rows.map(r => {
      const cols = r.split("\t");
      // Area | Situación | Tarea | Responsable | Inicio | Fin
      const areaName = (cols[0] ?? "").trim();
      const responsableName = (cols[3] ?? "").trim();
      const area = state.areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
      const member = state.members.find(m => m.name.toLowerCase() === responsableName.toLowerCase());
      const parseDate = (s?: string) => {
        if (!s) return null;
        const m = s.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
          const [_, dd, mm, yy] = m;
          const year = yy.length === 2 ? "20" + yy : yy;
          return `${year}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
      };
      return {
        id: uid("ai"),
        areaId: area?.id ?? null,
        situacion: (cols[1] ?? "").trim(),
        tarea: (cols[2] ?? "").trim(),
        responsableId: member?.id ?? null,
        responsableTexto: member ? "" : responsableName,
        startDate: parseDate(cols[4]),
        endDate: parseDate(cols[5]),
        estado: "Pendiente",
      };
    });
    dispatch({ type: "BULK_ADD_ACTA_ITEMS", payload: { actaId, items } });
    toast.success(`${items.length} filas añadidas`);
    onOpenChange(false); setText("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-display">Pegar filas (TSV)</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Pega contenido desde Excel o Sheets. Columnas esperadas separadas por TAB:<br/><code className="text-[11px]">Área ⇥ Situación ⇥ Tarea ⇥ Responsable ⇥ Inicio (dd/mm/aaaa) ⇥ Fin (dd/mm/aaaa)</code></p>
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tecnología&#9;Falta integración&#9;Definir API&#9;Paola Dayana&#9;01/05/2026&#9;15/05/2026" className="font-mono text-xs" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={parse} className="bg-gradient-primary text-primary-foreground hover:opacity-90">Importar filas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===========================================================
 * Convert item -> task
 * =========================================================== */

function ConvertItemDialog({ open, onOpenChange, acta, item }: { open: boolean; onOpenChange: (o: boolean) => void; acta: Acta; item: ActaItem }) {
  const { state, dispatch } = useWorkOS();
  const { user } = useAuth();
  const [title, setTitle] = useState(item.tarea.split("\n")[0] || "Tarea sin título");
  const [areaId, setAreaId] = useState(item.areaId ?? state.areas[0]?.id ?? "");
  const [ownerId, setOwnerId] = useState(item.responsableId ?? state.members[0]?.id ?? "");
  const [start, setStart] = useState(item.startDate ?? new Date().toISOString().slice(0,10));
  const [end, setEnd] = useState(item.endDate ?? new Date(Date.now() + 7*86400000).toISOString().slice(0,10));
  const sprintsActive = state.sprints.filter(s => s.projectId === acta.projectId && s.status !== "completado");
  const [sprintId, setSprintId] = useState<string>("backlog");

  function submit() {
    if (!title.trim()) { toast.error("Falta el título"); return; }
    if (!areaId) { toast.error("Selecciona un área"); return; }
    if (!ownerId) { toast.error("Selecciona un responsable"); return; }
    const task: Task = {
      id: uid("t"), title,
      description: `Generada desde acta «${acta.title}»\n\nSituación:\n${item.situacion}\n\nTarea:\n${item.tarea}`,
      projectId: acta.projectId, areaId, ownerId, assigneeIds: [ownerId],
      status: "pendiente", priority: "media", progress: 0, storyPoints: 5,
      sprintId: sprintId === "backlog" ? null : sprintId,
      startDate: new Date(start).toISOString(),
      endDate: new Date(end).toISOString(),
      createdById: user?.id ?? null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    dispatch({ type: "ADD_TASK", payload: task });
    dispatch({ type: "UPDATE_ACTA_ITEM", payload: { actaId: acta.id, itemId: item.id, patch: { convertedTaskId: task.id, estado: "Acción" } } });
    toast.success("Ítem convertido en tarea");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Convertir ítem en tarea</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Título de la tarea</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{state.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Responsable</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{state.members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5"><Label>Sprint</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog (sin sprint)</SelectItem>
                {sprintsActive.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Inicio</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Fin</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground hover:opacity-90">Crear tarea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}