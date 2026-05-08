import { useMemo, useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import { useProjectData } from "@/store/use-project-data";
import { format, addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { ProgressBar, PriorityBadge, StatusBadge } from "../Badges";
import { AvatarStack, MemberAvatar } from "../Avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Activity, AlertOctagon, CheckCircle2, ChevronLeft, ChevronRight, ListChecks, Pencil, Plus, Trash2, Users, X, Zap, Flame, Route } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkOS as _ } from "@/store/workos-store";
import type { Task, TaskPriority, TaskStatus, Subtask } from "@/lib/types";
import { Bell } from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";
import { SubtaskDialog } from "../SubtaskDialog";

const PRIO_COLOR: Record<TaskPriority, string> = {
  urgente: "hsl(var(--prio-urgent))",
  alta:    "hsl(var(--prio-high))",
  media:   "hsl(var(--prio-medium))",
  baja:    "hsl(var(--prio-low))",
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  pendiente:   "hsl(var(--status-pending))",
  en_progreso: "hsl(var(--info))",
  en_riesgo:   "hsl(var(--status-risk))",
  bloqueada:   "hsl(var(--destructive))",
  completada:  "hsl(var(--success))",
};

export function TimelineView({ onCreateTask, onEditTask }: { onCreateTask: () => void; onEditTask: (id: string) => void }) {
  const { state, dispatch } = useWorkOS();
  const { tasks: projectTasks } = useProjectData();
  const { can } = useAuth();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [prioFilter, setPrioFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [subDlg, setSubDlg] = useState<{ open: boolean; subtaskId: string | null }>({ open: false, subtaskId: null });

  const DAYS = 28;
  const start = useMemo(() => addDays(startOfDay(new Date()), offset - 2), [offset]);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);

  const tasks = projectTasks.filter(t =>
    !t.parentTaskId &&
    (areaFilter === "all" || t.areaId === areaFilter) &&
    (prioFilter === "all" || t.priority === prioFilter)
  );

  const teams = state.areas
    .map(area => {
      const at = tasks.filter(t => t.areaId === area.id);
      if (at.length === 0) return null;
      const memberIds = Array.from(new Set(at.flatMap(t => t.assigneeIds)));
      const lead = state.members.find(m => memberIds.includes(m.id));
      const avg = Math.round(at.reduce((s, t) => s + t.progress, 0) / at.length);
      return { area, tasks: at, members: memberIds.map(id => state.members.find(m => m.id === id)!).filter(Boolean), lead, avg };
    })
    .filter(Boolean) as any[];

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === "completada").length;
  const risk = tasks.filter(t => t.status === "en_riesgo").length;
  const blocked = tasks.filter(t => t.status === "bloqueada").length;
  const progressGlobal = totalTasks ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;

  const selected = selectedId ? state.tasks.find(t => t.id === selectedId) : null;
  const selSubs = selected?.subtasks ?? [];
  const selSubDone = selSubs.filter(s => s.done).length;
  const selSubPct = selSubs.length ? Math.round((selSubDone / selSubs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-soft">
        <KPI icon={Users} label="Equipos" value={teams.length} />
        <KPI icon={Activity} label="Tareas" value={totalTasks} />
        <KPI icon={Activity} label="Progreso" value={`${progressGlobal}%`} accent="primary" />
        <KPI icon={CheckCircle2} label="Completadas" value={completed} accent="success" />
        <KPI icon={Zap} label="En riesgo" value={risk} accent="warning" />
        <KPI icon={AlertOctagon} label="Bloqueadas" value={blocked} accent="destructive" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Flame className="h-3.5 w-3.5" /> Heatmap</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Route className="h-3.5 w-3.5" /> Ruta crítica</Button>
          <button className="relative rounded-md p-1.5 hover:bg-muted">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {risk + blocked > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-1">{risk + blocked}</span>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Área</span>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las visibles</SelectItem>
              {state.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Prioridad</span>
          <Select value={prioFilter} onValueChange={setPrioFilter}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda prioridad</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setOffset(o => o - 7)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setOffset(0)}>Hoy</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setOffset(o => o + 7)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-xs text-muted-foreground">{totalTasks} tareas en vista</span>
        </div>
      </div>

      {/* Gantt */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="grid grid-cols-timeline" style={{ ['--days' as any]: DAYS }}>
              {/* Header */}
              <div className="border-b bg-muted/30 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Equipos</div>
              {days.map((d, i) => {
                const isToday = differenceInCalendarDays(d, startOfDay(new Date())) === 0;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} className={`border-b border-l text-center py-1.5 text-[10px] leading-tight ${isToday ? "bg-primary/10 text-primary font-bold" : isWeekend ? "bg-muted/40 text-muted-foreground" : "bg-muted/20 text-muted-foreground"}`}>
                    <div className="uppercase">{format(d, "EEE", { locale: es })}</div>
                    <div className="font-semibold">{format(d, "d MMM", { locale: es })}</div>
                  </div>
                );
              })}

              {teams.map(team => (
                <TeamRows
                  key={team.area.id}
                  team={team}
                  days={days}
                  start={start}
                  onSelect={setSelectedId}
                  onEditSubtask={(taskId, sid) => { setSelectedId(taskId); setSubDlg({ open: true, subtaskId: sid }); }}
                />
              ))}
            </div>
          </div>
          {teams.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">Sin tareas en el rango actual. Crea una nueva o ajusta los filtros.</div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <aside className="w-80 rounded-xl border bg-card shadow-elevated p-4 animate-slide-in-right">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-foreground leading-tight">{selected.title}</h3>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">ID: {selected.id}</div>
            <div className="mt-3 flex gap-2">
              {(can("task.editAny") || can("task.editOwn", { task: selected })) && (
                <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={() => onEditTask(selected.id)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
              )}
              {can("task.editAny") && (
                <Button size="icon" variant="outline" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2"><StatusBadge status={selected.status} /><PriorityBadge priority={selected.priority} /></div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Descripción</div>
              <p className="mt-1 text-sm">{selected.description || <span className="italic text-muted-foreground">Sin descripción</span>}</p>
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Asignado</div>
              <div className="mt-2 space-y-1.5">
                {selected.assigneeIds.length === 0 ? <div className="text-xs text-muted-foreground italic">Sin asignar</div> :
                  selected.assigneeIds.map(id => {
                    const m = state.members.find(x => x.id === id); if (!m) return null;
                    return <div key={id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                      <MemberAvatar initials={m.initials} color={m.color} />
                      <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{m.name}</div><div className="text-[10px] text-muted-foreground uppercase">{m.role}</div></div>
                    </div>;
                  })}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Progreso</span><span className="font-semibold">{selected.progress}%</span></div>
              <ProgressBar value={selected.progress} className="mt-1" />
            </div>
            {/* Subtareas */}
            <div className="mt-4 rounded-lg border-2 border-primary/15 bg-primary/5 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold inline-flex items-center gap-1"><ListChecks className="h-3 w-3" /> Subtareas</div>
                {selSubs.length > 0 && <span className="text-[10px] font-bold text-primary tabular-nums">{selSubDone}/{selSubs.length} · {selSubPct}%</span>}
              </div>
              {selSubs.length > 0 && <div className="mb-2"><ProgressBar value={selSubPct} /></div>}
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {selSubs.length === 0 && <div className="text-[11px] italic text-muted-foreground text-center py-1">Sin subtareas</div>}
                {selSubs.map(s => (
                  <div key={s.id} className="group flex items-center gap-1.5 rounded border bg-card px-1.5 py-1">
                    <Checkbox checked={s.done} onCheckedChange={() => dispatch({ type: "TOGGLE_SUBTASK", payload: { taskId: selected.id, subtaskId: s.id } })} />
                    <button
                      onClick={() => setSubDlg({ open: true, subtaskId: s.id })}
                      className={`flex-1 text-left text-xs hover:text-primary transition ${s.done ? "line-through text-muted-foreground" : ""}`}
                      title="Editar subtarea"
                    >
                      {s.title}
                      {s.checklist && s.checklist.length > 0 && (
                        <span className="ml-1 text-[9px] tabular-nums text-muted-foreground">
                          · {s.checklist.filter(c=>c.done).length}/{s.checklist.length}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setSubDlg({ open: true, subtaskId: s.id })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary" title="Editar">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => dispatch({ type: "DELETE_SUBTASK", payload: { taskId: selected.id, subtaskId: s.id } })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <Button size="sm" variant="outline" className="w-full h-7 gap-1 text-xs" onClick={() => setSubDlg({ open: true, subtaskId: null })}>
                  <Plus className="h-3 w-3" /> Nueva subtarea
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div><div className="text-muted-foreground">Inicio</div><div className="font-medium">{format(new Date(selected.startDate), "d MMM", { locale: es })}</div></div>
              <div><div className="text-muted-foreground">Fin</div><div className="font-medium">{format(new Date(selected.endDate), "d MMM", { locale: es })}</div></div>
              <div><div className="text-muted-foreground">Duración</div><div className="font-medium">{differenceInCalendarDays(new Date(selected.endDate), new Date(selected.startDate)) + 1} días</div></div>
            </div>
          </aside>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar tarea"
        description="La tarea se eliminará del timeline y de su sprint."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (selected) { dispatch({ type: "DELETE_TASK", payload: { id: selected.id } }); toast.success("Tarea eliminada"); setSelectedId(null); }
          setConfirmDelete(false);
        }}
      />
      <SubtaskDialog
        open={subDlg.open}
        onOpenChange={(o) => setSubDlg(s => ({ ...s, open: o }))}
        taskId={selectedId}
        subtaskId={subDlg.subtaskId}
      />
    </div>
  );
}

function TeamRows({ team, days, start, onSelect, onEditSubtask }: { team: any; days: Date[]; start: Date; onSelect: (id: string) => void; onEditSubtask: (taskId: string, subtaskId: string) => void }) {
  const { state, dispatch } = useWorkOS();

  // Calcula altura de la fila por tarea (parent + subtareas).
  const PARENT_H = 56;
  const SUB_H = 26;
  const tasksWithHeights = team.tasks.map((t: any) => {
    const subs = (t.subtasks ?? []) as Subtask[];
    return { task: t, subs, height: PARENT_H + subs.length * SUB_H };
  });
  const totalH = tasksWithHeights.reduce((s: number, x: any) => s + x.height, 0) + 12;

  function startDrag(
    e: React.PointerEvent<HTMLElement>,
    mode: "move" | "left" | "right",
    item: { startDate: string; endDate: string },
    onCommit: (newStartISO: string, newEndISO: string) => void,
  ) {
    e.stopPropagation(); e.preventDefault();
    const bar = e.currentTarget as HTMLElement;
    const container = bar.parentElement as HTMLElement;
    const rect = container.getBoundingClientRect();
    const dayPx = rect.width / days.length;
    const startX = e.clientX;
    const origStart = startOfDay(new Date(item.startDate));
    const origEnd = startOfDay(new Date(item.endDate));
    bar.setPointerCapture(e.pointerId);
    bar.style.cursor = mode === "move" ? "grabbing" : "ew-resize";
    bar.style.zIndex = "30";

    let dDays = 0;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      dDays = Math.round(dx / dayPx);
      if (mode === "move") {
        bar.style.transform = `translateX(${dDays * dayPx}px)`;
      } else if (mode === "right") {
        const newW = Math.max(dayPx - 4, parseFloat(bar.dataset.origW || "0") + dDays * dayPx);
        bar.style.width = `${newW}px`;
      } else {
        const newL = parseFloat(bar.dataset.origL || "0") + dDays * dayPx;
        const newW = Math.max(dayPx - 4, parseFloat(bar.dataset.origW || "0") - dDays * dayPx);
        bar.style.left = `${newL}px`;
        bar.style.width = `${newW}px`;
      }
    };
    const up = () => {
      bar.releasePointerCapture(e.pointerId);
      bar.style.removeProperty("transform");
      bar.style.removeProperty("cursor");
      bar.style.removeProperty("z-index");
      bar.removeEventListener("pointermove", move as any);
      bar.removeEventListener("pointerup", up);
      if (dDays === 0) return;
      let ns = origStart, ne = origEnd;
      if (mode === "move") { ns = addDays(origStart, dDays); ne = addDays(origEnd, dDays); }
      else if (mode === "right") { ne = addDays(origEnd, dDays); if (ne < ns) ne = ns; }
      else { ns = addDays(origStart, dDays); if (ns > ne) ns = ne; }
      onCommit(ns.toISOString(), ne.toISOString());
    };
    bar.addEventListener("pointermove", move as any);
    bar.addEventListener("pointerup", up);
  }

  return (
    <>
      <div className="border-b border-l-0 px-3 py-3 bg-card">
        <div className="font-semibold text-sm" style={{ color: team.area.color }}>{team.area.name}</div>
        <div className="mt-1 flex items-center gap-2">
          <AvatarStack size="xs" members={team.members.map((m: any) => ({ initials: m.initials, color: m.color, name: m.name }))} />
          <ProgressBar value={team.avg} className="w-16" />
          <span className="text-[10px] font-semibold tabular-nums">{team.avg}%</span>
        </div>
        {team.lead && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MemberAvatar initials={team.lead.initials} color={team.lead.color} size="xs" />
            <span className="truncate">{team.lead.name.split(" ").slice(0,2).join(" ")}</span>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wider">{team.lead.role}</span>
          </div>
        )}
      </div>
      {days.map((d, i) => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday = differenceInCalendarDays(d, startOfDay(new Date())) === 0;
        return <div key={i} className={`border-b border-l ${isToday ? "bg-primary/5" : isWeekend ? "bg-muted/30" : ""}`} />;
      })}
      {/* Bars row */}
      <div className="col-span-full relative" style={{ gridColumn: `1 / span ${days.length + 1}` }}>
        <div className="grid grid-cols-timeline" style={{ ['--days' as any]: days.length }}>
          <div className="border-b" />
          <div className="border-b col-span-full relative" style={{ gridColumn: `2 / span ${days.length}`, minHeight: totalH, padding: "6px 0" }}>
            {(() => {
              let yCursor = 6;
              const nodes: React.ReactNode[] = [];
              tasksWithHeights.forEach(({ task: t, subs }: any) => {
                const ts = startOfDay(new Date(t.startDate));
                const te = startOfDay(new Date(t.endDate));
                const dayStart = Math.max(0, differenceInCalendarDays(ts, start));
                const dayEnd = Math.min(days.length - 1, differenceInCalendarDays(te, start));
                const inView = !(dayEnd < 0 || dayStart > days.length - 1);
                const span = dayEnd - dayStart + 1;
                const color = PRIO_COLOR[t.priority as TaskPriority];
                const dayPct = 100 / days.length;
                const owner = t.ownerId ? state.members.find((m: any) => m.id === t.ownerId) : null;
                const sd = subs.filter((s: any) => s.done).length;
                const parentTop = yCursor;
                if (inView) nodes.push(
                  <div
                    key={t.id}
                    onPointerDown={(e) => startDrag(e, "move", t, (ns, ne) =>
                      dispatch({ type: "UPDATE_TASK", payload: { id: t.id, patch: { startDate: ns, endDate: ne } } })
                    )}
                    onClick={() => onSelect(t.id)}
                    data-orig-l={`${dayStart * (100 / days.length)}%`}
                    data-orig-w={`${span * (100 / days.length)}%`}
                    className="group absolute rounded-lg text-left overflow-hidden hover:ring-2 hover:ring-primary/40 transition-shadow shadow-soft border bg-card cursor-grab select-none"
                    style={{ left: `${dayStart * dayPct}%`, width: `calc(${span * dayPct}% - 4px)`, top: parentTop, height: 48, borderLeft: `4px solid ${color}` }}
                    title={`${t.title} — arrastra para mover`}
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0 pointer-events-none"
                      style={{ width: `${t.progress}%`, background: `linear-gradient(90deg, ${color}22, ${color}33)` }} />
                    {/* resize handles */}
                    <span
                      onPointerDown={(e) => startDrag(e as any, "left", t, (ns, ne) =>
                        dispatch({ type: "UPDATE_TASK", payload: { id: t.id, patch: { startDate: ns, endDate: ne } } }))}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/30" />
                    <span
                      onPointerDown={(e) => startDrag(e as any, "right", t, (ns, ne) =>
                        dispatch({ type: "UPDATE_TASK", payload: { id: t.id, patch: { startDate: ns, endDate: ne } } }))}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/30" />
                    <div className="relative flex flex-col h-full px-2 py-1 gap-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-[11px] font-semibold text-foreground">{t.title}</span>
                        <span className="ml-auto rounded px-1 text-[9px] font-bold tabular-nums text-white" style={{ backgroundColor: color }}>{t.progress}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                        {owner && <MemberAvatar initials={owner.initials} color={owner.color} size="xs" />}
                        {subs.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-semibold" style={{ backgroundColor: `${color}22`, color }} title={`${sd}/${subs.length} subtareas`}>
                            <ListChecks className="h-2.5 w-2.5" />{sd}/{subs.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
                yCursor += PARENT_H;

                // Subtask bars
                subs.forEach((s: Subtask) => {
                  const ssDate = s.startDate ?? t.startDate;
                  const seDate = s.endDate ?? s.dueDate ?? t.endDate;
                  const ss = startOfDay(new Date(ssDate));
                  const se = startOfDay(new Date(seDate));
                  const dS = Math.max(0, differenceInCalendarDays(ss, start));
                  const dE = Math.min(days.length - 1, differenceInCalendarDays(se, start));
                  const subTop = yCursor;
                  if (!(dE < 0 || dS > days.length - 1)) {
                    const sStatus: TaskStatus = s.status ?? (s.done ? "completada" : "pendiente");
                    const sColor = STATUS_COLOR[sStatus];
                    const sSpan = dE - dS + 1;
                    const subAssignee = s.assigneeId ? state.members.find(m => m.id === s.assigneeId) : null;
                    nodes.push(
                      <div
                        key={`${t.id}-${s.id}`}
                        onPointerDown={(e) => startDrag(e, "move", { startDate: ssDate, endDate: seDate }, (ns, ne) =>
                          dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: t.id, subtaskId: s.id, patch: { startDate: ns, endDate: ne } } }))}
                        onClick={() => onEditSubtask(t.id, s.id)}
                        className="group absolute rounded-md text-left overflow-hidden border bg-card shadow-xs hover:ring-2 hover:ring-primary/40 cursor-grab select-none"
                        style={{ left: `calc(${dS * dayPct}% + 16px)`, width: `calc(${sSpan * dayPct}% - 20px)`, top: subTop + 3, height: SUB_H - 6, borderLeft: `3px solid ${sColor}` }}
                        title={`${s.title} · ${sStatus}`}
                      >
                        <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, ${sColor}1a, ${sColor}26)` }} />
                        <span
                          onPointerDown={(e) => startDrag(e as any, "left", { startDate: ssDate, endDate: seDate }, (ns, ne) =>
                            dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: t.id, subtaskId: s.id, patch: { startDate: ns, endDate: ne } } }))}
                          className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/40" />
                        <span
                          onPointerDown={(e) => startDrag(e as any, "right", { startDate: ssDate, endDate: seDate }, (ns, ne) =>
                            dispatch({ type: "UPDATE_SUBTASK", payload: { taskId: t.id, subtaskId: s.id, patch: { startDate: ns, endDate: ne } } }))}
                          className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/40" />
                        <div className="relative flex items-center gap-1.5 h-full px-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 text-white" style={{ backgroundColor: sColor }}>↳</span>
                          <span className={`truncate text-[10px] font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                          {subAssignee && <span className="ml-auto inline-flex items-center justify-center h-4 w-4 rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: subAssignee.color }}>{subAssignee.initials}</span>}
                        </div>
                      </div>
                    );
                  }
                  yCursor += SUB_H;
                });
              });
              return nodes;
            })()}
          </div>
        </div>
      </div>
    </>
  );
}

function KPI({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: "primary" | "success" | "warning" | "destructive" }) {
  const tone = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : accent === "destructive" ? "text-destructive" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-muted/40 transition">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className={`text-sm font-semibold tabular-nums ${tone}`}>{value}</div>
      </div>
    </div>
  );
}
