import { useMemo, useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import type { Sprint, Task } from "@/lib/types";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { AvatarStack, MemberAvatar } from "../Avatar";
import { AreaPill, PriorityBadge, ProgressBar, StatusBadge } from "../Badges";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertOctagon, ArrowDown, ArrowRight, CalendarRange, CheckCircle2, ChevronDown, ChevronRight, Flag, Flame, Inbox, Pause, Pencil, Play, Plus, Sparkles, Target, Trash2, TrendingUp, Trophy, Users, Zap } from "lucide-react";
import { SprintDialog } from "./SprintDialog";
import { TaskDialog } from "../TaskDialog";
import { toast } from "sonner";
import { ConfirmDialog } from "../ConfirmDialog";
import { TaskDetailDialog } from "../TaskDetailDialog";

export function SprintsView() {
  const { state, dispatch } = useWorkOS();
  const [sprintDlg, setSprintDlg] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; id: string | null; sprintId: string | null }>({ open: false, id: null, sprintId: null });
  const [tab, setTab] = useState<"active" | "planning" | "backlog" | "completed">("active");
  const [openSprint, setOpenSprint] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmSprintId, setConfirmSprintId] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);

  const sprints = state.sprints;
  const active = sprints.filter(s => s.status === "activo");
  const planning = sprints.filter(s => s.status === "planificacion");
  const completed = sprints.filter(s => s.status === "completado");
  const backlog = state.tasks.filter(t => !t.sprintId && t.status !== "completada");

  // Velocity from completed sprints
  const velocityData = completed.slice().reverse().map(s => {
    const ts = state.tasks.filter(t => t.sprintId === s.id);
    return {
      name: s.name.split("·")[0].trim(),
      planificado: ts.reduce((a, t) => a + t.storyPoints, 0),
      completado: ts.filter(t => t.status === "completada").reduce((a, t) => a + t.storyPoints, 0),
    };
  });
  const avgVelocity = velocityData.length ? Math.round(velocityData.reduce((a, v) => a + v.completado, 0) / velocityData.length) : 0;

  function moveTaskToSprint(taskId: string, sprintId: string | null) {
    dispatch({ type: "MOVE_TASK_SPRINT", payload: { id: taskId, sprintId } });
    toast.success(sprintId ? "Tarea movida al sprint" : "Tarea devuelta al backlog");
  }

  function startSprint(s: Sprint) {
    dispatch({ type: "SET_SPRINT_STATUS", payload: { id: s.id, status: "activo" } });
    toast.success(`${s.name} iniciado`);
  }
  function completeSprint(s: Sprint) {
    dispatch({ type: "SET_SPRINT_STATUS", payload: { id: s.id, status: "completado" } });
    toast.success(`${s.name} completado`);
  }

  const tabs = [
    { id: "active" as const, label: "Activo", count: active.length, Icon: Flame },
    { id: "planning" as const, label: "Planning", count: planning.length, Icon: Target },
    { id: "backlog" as const, label: "Backlog", count: backlog.length, Icon: Inbox },
    { id: "completed" as const, label: "Completados", count: completed.length, Icon: Trophy },
  ];

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <SummaryCard
          tone="primary" Icon={Flame} label="Sprint activo"
          value={active[0]?.name ?? "Ninguno"}
          sub={active[0] ? `${differenceInCalendarDays(new Date(active[0].endDate), new Date())} días restantes` : "Inicia uno desde planning"}
        />
        <SummaryCard tone="info" Icon={Target} label="En planificación" value={planning.length} sub={planning.length ? "Listos para iniciar" : "Sin sprints planeados"} />
        <SummaryCard tone="warning" Icon={Inbox} label="Backlog" value={backlog.length} sub={`${backlog.reduce((a,t)=>a+t.storyPoints,0)} pts sin asignar`} />
        <SummaryCard tone="success" Icon={TrendingUp} label="Velocity promedio" value={`${avgVelocity} pts`} sub={`${completed.length} sprints completados`} />
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-1.5 shadow-soft">
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted"}`}
            >
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tab === t.id ? "bg-white/20" : "bg-muted-foreground/10"}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => setSprintDlg({ open: true, id: null })} className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft">
          <Plus className="h-4 w-4" /> Nuevo sprint
        </Button>
      </div>

      {/* Content per tab */}
      {tab === "active" && (
        <div className="space-y-4">
          {active.length === 0 ? (
            <EmptyState Icon={Flame} title="No hay sprint activo" description="Crea o promueve un sprint en planning para empezar." action={() => setTab("planning")} actionLabel="Ir a planning" />
          ) : active.map(s => (
            <ActiveSprintPanel key={s.id} sprint={s} onComplete={() => completeSprint(s)} onEdit={() => setSprintDlg({ open: true, id: s.id })} onAddTask={() => setTaskDlg({ open: true, id: null, sprintId: s.id })} onMoveTask={moveTaskToSprint} dragId={dragId} setDragId={setDragId} />
          ))}
        </div>
      )}

      {tab === "planning" && (
        <div className="space-y-4">
          {planning.length === 0 ? (
            <EmptyState Icon={Target} title="No hay sprints en planning" description="Crea uno y planifica tu próximo ciclo." action={() => setSprintDlg({ open: true, id: null })} actionLabel="Crear sprint" />
          ) : planning.map(s => (
            <PlanningSprintPanel key={s.id} sprint={s} backlog={backlog}
              onStart={() => startSprint(s)} onEdit={() => setSprintDlg({ open: true, id: s.id })}
              onDelete={() => setConfirmSprintId(s.id)}
              onAddTask={() => setTaskDlg({ open: true, id: null, sprintId: s.id })}
              onMoveTask={moveTaskToSprint} dragId={dragId} setDragId={setDragId}
              isOpen={openSprint === s.id} onToggle={() => setOpenSprint(openSprint === s.id ? null : s.id)}
              onOpenTask={(id: string) => setDetailTaskId(id)}
            />
          ))}
        </div>
      )}

      {tab === "backlog" && (
        <BacklogPanel
          backlog={backlog}
          onAddTask={() => setTaskDlg({ open: true, id: null, sprintId: null })}
          onMove={moveTaskToSprint}
          onEdit={(id) => setTaskDlg({ open: true, id, sprintId: null })}
          onOpenTask={(id: string) => setDetailTaskId(id)}
          dragId={dragId} setDragId={setDragId}
        />
      )}

      {tab === "completed" && (
        <div className="space-y-4">
          {velocityData.length > 1 && (
            <div className="rounded-xl border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-success" />
                <h3 className="font-display font-semibold">Velocity histórico</h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer>
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="planificado" fill="hsl(var(--muted-foreground))" radius={[6,6,0,0]} />
                    <Bar dataKey="completado" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {completed.length === 0 ? (
            <EmptyState Icon={Trophy} title="Aún sin sprints completados" description="Cuando cierres un sprint aparecerá aquí su retrospectiva." />
          ) : completed.map(s => <CompletedSprintCard key={s.id} sprint={s} />)}
        </div>
      )}

      <SprintDialog open={sprintDlg.open} onOpenChange={(o) => setSprintDlg(s => ({ ...s, open: o }))} sprintId={sprintDlg.id} />
      <TaskDialog open={taskDlg.open} onOpenChange={(o) => setTaskDlg(s => ({ ...s, open: o }))} taskId={taskDlg.id} defaultSprintId={taskDlg.sprintId} />
      <ConfirmDialog
        open={!!confirmSprintId}
        onOpenChange={(o) => !o && setConfirmSprintId(null)}
        title="Eliminar sprint"
        description="Las tareas del sprint volverán al backlog. Esta acción no se puede deshacer."
        confirmLabel="Eliminar sprint"
        onConfirm={() => { if (confirmSprintId) { dispatch({ type: "DELETE_SPRINT", payload: { id: confirmSprintId } }); toast.success("Sprint eliminado"); } setConfirmSprintId(null); }}
      />
      <TaskDetailDialog
        open={!!detailTaskId}
        onOpenChange={(o) => !o && setDetailTaskId(null)}
        taskId={detailTaskId}
        onEdit={(id) => { setDetailTaskId(null); setTaskDlg({ open: true, id, sprintId: null }); }}
        onDelete={(id) => { setDetailTaskId(null); setConfirmTaskId(id); }}
      />
      <ConfirmDialog
        open={!!confirmTaskId}
        onOpenChange={(o) => !o && setConfirmTaskId(null)}
        title="Eliminar tarea"
        confirmLabel="Eliminar"
        onConfirm={() => { if (confirmTaskId) { dispatch({ type: "DELETE_TASK", payload: { id: confirmTaskId } }); toast.success("Tarea eliminada"); } setConfirmTaskId(null); }}
      />
    </div>
  );
}

/* -------------------- Pieces -------------------- */

function SummaryCard({ Icon, label, value, sub, tone }: { Icon: any; label: string; value: any; sub: string; tone: "primary"|"info"|"warning"|"success" }) {
  const map = {
    primary: "from-primary/15 to-primary/0 text-primary",
    info: "from-info/15 to-info/0 text-info",
    warning: "from-warning/15 to-warning/0 text-warning",
    success: "from-success/15 to-success/0 text-success",
  } as const;
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-soft">
      <div className={`absolute inset-0 bg-gradient-to-br ${map[tone]} opacity-100 pointer-events-none`} />
      <div className="relative flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg bg-card border flex items-center justify-center ${map[tone].split(" ").pop()}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="font-display text-xl font-bold text-foreground truncate">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ Icon, title, description, action, actionLabel }: { Icon: any; title: string; description: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed bg-card/50 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3"><Icon className="h-5 w-5 text-muted-foreground" /></div>
      <h3 className="font-display font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      {action && <Button onClick={action} className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5"><Sparkles className="h-4 w-4" />{actionLabel}</Button>}
    </div>
  );
}

function useSprintMetrics(sprint: Sprint) {
  const { state } = useWorkOS();
  const tasks = state.tasks.filter(t => t.sprintId === sprint.id);
  const totalPts = tasks.reduce((a, t) => a + t.storyPoints, 0);
  const donePts = tasks.filter(t => t.status === "completada").reduce((a, t) => a + t.storyPoints, 0);
  const inProgress = tasks.filter(t => t.status === "en_progreso").length;
  const blocked = tasks.filter(t => t.status === "bloqueada").length;
  const risk = tasks.filter(t => t.status === "en_riesgo").length;
  const done = tasks.filter(t => t.status === "completada").length;
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(sprint.endDate), new Date(sprint.startDate)) + 1);
  const elapsed = Math.max(0, Math.min(totalDays, differenceInCalendarDays(new Date(), new Date(sprint.startDate)) + 1));
  const remaining = Math.max(0, differenceInCalendarDays(new Date(sprint.endDate), new Date()));
  const completion = totalPts ? Math.round((donePts / totalPts) * 100) : 0;

  // Burndown ideal vs real (synthetic real curve based on completedAt)
  const burndown = Array.from({ length: totalDays + 1 }, (_, i) => {
    const day = new Date(sprint.startDate); day.setDate(day.getDate() + i);
    const ideal = Math.max(0, Math.round(totalPts - (totalPts / totalDays) * i));
    const completedByDay = tasks.filter(t => t.completedAt && new Date(t.completedAt) <= day).reduce((a, t) => a + t.storyPoints, 0);
    const real = i <= elapsed ? Math.max(0, totalPts - completedByDay) : null;
    return { day: format(day, "d MMM", { locale: es }), ideal, real };
  });
  return { tasks, totalPts, donePts, inProgress, blocked, risk, done, totalDays, elapsed, remaining, completion, burndown };
}

function ActiveSprintPanel({ sprint, onComplete, onEdit, onAddTask, onMoveTask, dragId, setDragId }: any) {
  const { state, dispatch } = useWorkOS();
  const m = useSprintMetrics(sprint);
  const memberLoad = useMemo(() => {
    const map = new Map<string, { member: any; pts: number; done: number }>();
    m.tasks.forEach((t: Task) => {
      t.assigneeIds.forEach(id => {
        const member = state.members.find(x => x.id === id); if (!member) return;
        const cur = map.get(id) ?? { member, pts: 0, done: 0 };
        cur.pts += t.storyPoints; if (t.status === "completada") cur.done += t.storyPoints;
        map.set(id, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.pts - a.pts);
  }, [m.tasks, state.members]);

  return (
    <div className="rounded-xl border bg-gradient-sprint shadow-soft overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-card/60 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-lg text-foreground truncate">{sprint.name}</h2>
              <span className="rounded-md bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />Activo</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{sprint.goal || <em>Sin objetivo definido</em>}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{format(new Date(sprint.startDate),"d MMM",{locale:es})} → {format(new Date(sprint.endDate),"d MMM",{locale:es})}</span>
              <span>·</span>
              <span>{m.totalDays} días total</span>
              <span>·</span>
              <span className="text-foreground font-semibold">{m.remaining} días restantes</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1"><Pencil className="h-3.5 w-3.5" />Editar</Button>
            <Button onClick={onComplete} size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90"><CheckCircle2 className="h-3.5 w-3.5" />Cerrar sprint</Button>
          </div>
        </div>

        {/* Macro bars */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Progreso" value={`${m.completion}%`} sub={`${m.donePts}/${m.totalPts} pts`} tone="primary" progress={m.completion} />
          <Stat label="Capacidad" value={`${m.totalPts}/${sprint.capacityPoints}`} sub={m.totalPts > sprint.capacityPoints ? "Sobreasignado" : "Dentro de capacidad"} tone={m.totalPts > sprint.capacityPoints ? "warning" : "info"} progress={Math.min(100, Math.round(m.totalPts / Math.max(1, sprint.capacityPoints) * 100))} />
          <Stat label="Tiempo" value={`${Math.round((m.elapsed/m.totalDays)*100)}%`} sub={`Día ${m.elapsed} de ${m.totalDays}`} tone="info" progress={Math.round((m.elapsed/m.totalDays)*100)} />
          <Stat label="Riesgos" value={`${m.blocked + m.risk}`} sub={`${m.blocked} bloq · ${m.risk} riesgo`} tone={(m.blocked+m.risk)>0?"destructive":"success"} progress={m.totalPts ? Math.round((m.blocked + m.risk) / m.tasks.length * 100) : 0} />
        </div>
      </div>

      {/* Burndown + Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b">
        <div className="lg:col-span-2 p-4 border-r bg-card/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><ArrowDown className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold font-display">Burndown</h3></div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-3 border-t-2 border-dashed border-muted-foreground" />Ideal</span>
              <span className="inline-flex items-center gap-1 text-primary"><span className="h-2 w-3 bg-primary rounded-sm" />Real</span>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer>
              <AreaChart data={m.burndown} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs><linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" fill="transparent" dot={false} />
                <Area type="monotone" dataKey="real" stroke="hsl(var(--primary))" fill="url(#bd)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="p-4 bg-card/40">
          <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-info" /><h3 className="text-sm font-semibold font-display">Capacidad por persona</h3></div>
          {memberLoad.length === 0 ? <p className="text-xs text-muted-foreground italic">Sin asignaciones</p> :
            <div className="space-y-2 max-h-44 overflow-auto pr-1 scrollbar-thin">
              {memberLoad.map(({ member, pts, done }) => (
                <div key={member.id} className="flex items-center gap-2">
                  <MemberAvatar initials={member.initials} color={member.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate">{member.name.split(" ")[0]} {member.name.split(" ")[1]?.[0] ?? ""}.</span>
                      <span className="tabular-nums text-muted-foreground"><span className="text-foreground font-semibold">{done}</span>/{pts} pts</span>
                    </div>
                    <ProgressBar value={pts ? (done/pts)*100 : 0} className="mt-0.5" />
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* Mini board by status */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold font-display">Tareas del sprint</h3>
          <span className="text-xs text-muted-foreground">· {m.tasks.length} tareas</span>
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={onAddTask}><Plus className="h-3.5 w-3.5" />Añadir</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["pendiente","en_progreso","en_riesgo","bloqueada"] as const).map(st => {
            const items = m.tasks.filter((t: Task) => t.status === st);
            return (
              <div key={st}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) { dispatch({ type: "MOVE_TASK_STATUS", payload: { id: dragId, status: st } }); setDragId(null); }}}
                className="rounded-lg border bg-card/60 p-2 min-h-[120px]">
                <div className="flex items-center justify-between mb-2 px-1"><StatusBadge status={st} /><span className="text-[10px] tabular-nums text-muted-foreground">{items.length}</span></div>
                <div className="space-y-1.5">
                  {items.map((t: Task) => <SprintTaskCard key={t.id} task={t} onDragStart={() => setDragId(t.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlanningSprintPanel({ sprint, backlog, onStart, onEdit, onDelete, onAddTask, onMoveTask, dragId, setDragId, isOpen, onToggle }: any) {
  const m = useSprintMetrics(sprint);
  const overCapacity = m.totalPts > sprint.capacityPoints;
  return (
    <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition text-left">
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <div className="h-10 w-10 rounded-lg bg-info/10 text-info flex items-center justify-center"><Target className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2"><span className="font-display font-semibold">{sprint.name}</span>
            <span className="rounded-md bg-info/10 text-info border border-info/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Planning</span>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">{sprint.goal || <em>Sin objetivo</em>}</div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs">
          <span className="text-muted-foreground"><CalendarRange className="inline h-3 w-3 mr-1" />{format(new Date(sprint.startDate),"d MMM")} → {format(new Date(sprint.endDate),"d MMM")}</span>
          <div className="text-right"><div className="text-[10px] text-muted-foreground">Carga</div><div className={`font-semibold tabular-nums ${overCapacity ? "text-destructive" : "text-foreground"}`}>{m.totalPts}/{sprint.capacityPoints} pts</div></div>
          <div className="w-24"><ProgressBar value={Math.min(100, m.totalPts / Math.max(1, sprint.capacityPoints) * 100)} tone={overCapacity ? "warning" : "primary"} /></div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1"><Pencil className="h-3.5 w-3.5" />Editar</Button>
          <Button onClick={onStart} size="sm" className="gap-1 bg-gradient-primary text-primary-foreground hover:opacity-90"><Play className="h-3.5 w-3.5" />Iniciar</Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </button>

      {isOpen && (
        <div className="border-t bg-muted/20 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) { onMoveTask(dragId, sprint.id); setDragId(null); }}} className="rounded-lg border-2 border-dashed border-primary/30 bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h4 className="text-sm font-semibold">En este sprint</h4><span className="text-[10px] text-muted-foreground tabular-nums">{m.tasks.length} · {m.totalPts} pts</span></div>
              <Button size="sm" variant="ghost" onClick={onAddTask} className="h-7 gap-1 text-xs"><Plus className="h-3 w-3" />Nueva</Button>
            </div>
            {m.tasks.length === 0 ? <div className="py-8 text-center text-xs text-muted-foreground italic">Arrastra tareas del backlog aquí →</div> :
              <div className="space-y-1.5 max-h-80 overflow-auto scrollbar-thin">
                {m.tasks.map((t: Task) => <SprintTaskCard key={t.id} task={t} onDragStart={() => setDragId(t.id)} onRemove={() => onMoveTask(t.id, null)} showRemove />)}
              </div>}
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><Inbox className="h-4 w-4 text-muted-foreground" /><h4 className="text-sm font-semibold">Backlog disponible</h4><span className="text-[10px] text-muted-foreground tabular-nums">{backlog.length} tareas</span></div>
            </div>
            {backlog.length === 0 ? <div className="py-8 text-center text-xs text-muted-foreground italic">Backlog vacío 🎉</div> :
              <div className="space-y-1.5 max-h-80 overflow-auto scrollbar-thin">
                {backlog.map((t: Task) => <SprintTaskCard key={t.id} task={t} onDragStart={() => setDragId(t.id)} onAdd={() => onMoveTask(t.id, sprint.id)} showAdd />)}
              </div>}
          </div>
        </div>
      )}
    </div>
  );
}

function BacklogPanel({ backlog, onAddTask, onMove, onEdit, dragId, setDragId }: any) {
  const { state } = useWorkOS();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [prioFilter, setPrioFilter] = useState<string>("all");
  const filtered = backlog.filter((t: Task) =>
    (areaFilter === "all" || t.areaId === areaFilter) &&
    (prioFilter === "all" || t.priority === prioFilter)
  );
  const sprintsAvail = state.sprints.filter(s => s.status !== "completado");
  const totalPts = filtered.reduce((a: number, t: Task) => a + t.storyPoints, 0);

  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center"><Inbox className="h-4 w-4" /></div>
        <div>
          <h3 className="font-display font-semibold">Backlog</h3>
          <p className="text-xs text-muted-foreground">{filtered.length} tareas · {totalPts} story points</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas las áreas</SelectItem>{state.areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={prioFilter} onValueChange={setPrioFilter}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="urgente">Urgente</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent>
          </Select>
          <Button onClick={onAddTask} size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" />Nueva tarea</Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Backlog vacío. ¡Buen trabajo!</div>
      ) : (
        <div className="divide-y">
          {filtered.map((t: Task) => {
            const area = state.areas.find(a => a.id === t.areaId);
            const members = t.assigneeIds.map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
            return (
              <div key={t.id} draggable onDragStart={() => setDragId(t.id)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition">
                <PriorityBadge priority={t.priority} />
                {area && <AreaPill name={area.name} color={area.color} />}
                <div className="flex-1 min-w-0">
                  <button onClick={() => onEdit(t.id)} className="font-medium text-sm text-foreground hover:text-primary text-left truncate block w-full">{t.title}</button>
                  {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                </div>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums">{t.storyPoints} pts</span>
                {members.length > 0 && <AvatarStack size="xs" members={members.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} />}
                <Select onValueChange={(v) => onMove(t.id, v)}>
                  <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue placeholder="Mover a sprint…" /></SelectTrigger>
                  <SelectContent>{sprintsAvail.length === 0 ? <SelectItem value="-" disabled>No hay sprints</SelectItem> : sprintsAvail.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompletedSprintCard({ sprint }: { sprint: Sprint }) {
  const m = useSprintMetrics(sprint);
  const completed = m.tasks.filter((t: Task) => t.status === "completada").length;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center"><Trophy className="h-5 w-5" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2"><span className="font-display font-semibold">{sprint.name}</span>
            <span className="rounded-md bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Completado</span>
          </div>
          <div className="text-xs text-muted-foreground">{format(new Date(sprint.startDate),"d MMM",{locale:es})} → {format(new Date(sprint.endDate),"d MMM yyyy",{locale:es})}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Velocity</div>
          <div className="font-display text-2xl font-bold text-success tabular-nums">{m.donePts}<span className="text-sm text-muted-foreground"> / {m.totalPts} pts</span></div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Tareas</div><div className="font-semibold">{completed} / {m.tasks.length}</div></div>
        <div className="rounded-lg bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Cumplimiento</div><div className="font-semibold">{m.completion}%</div></div>
        <div className="rounded-lg bg-muted/30 px-3 py-2"><div className="text-muted-foreground">Duración</div><div className="font-semibold">{m.totalDays} días</div></div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone, progress }: { label: string; value: any; sub: string; tone: "primary"|"info"|"warning"|"destructive"|"success"; progress: number }) {
  const map = {
    primary: "text-primary", info: "text-info", warning: "text-warning",
    destructive: "text-destructive", success: "text-success"
  } as const;
  return (
    <div className="rounded-lg bg-card border p-3">
      <div className="flex items-baseline justify-between"><span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <span className={`font-display font-bold tabular-nums ${map[tone]}`}>{value}</span></div>
      <ProgressBar value={progress} className="mt-2" tone={tone === "warning" ? "warning" : tone === "success" ? "success" : "primary"} />
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function SprintTaskCard({ task, onDragStart, onRemove, onAdd, showRemove, showAdd }: { task: Task; onDragStart: () => void; onRemove?: () => void; onAdd?: () => void; showRemove?: boolean; showAdd?: boolean }) {
  const { state } = useWorkOS();
  const area = state.areas.find(a => a.id === task.areaId);
  const members = task.assigneeIds.map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
  return (
    <div draggable onDragStart={onDragStart} className="group rounded-md border bg-card p-2 shadow-xs hover:shadow-soft cursor-grab active:cursor-grabbing transition">
      <div className="flex items-center gap-2">
        <span className="rounded bg-muted text-foreground px-1.5 py-0.5 text-[10px] font-bold tabular-nums">{task.storyPoints}</span>
        <span className="text-xs font-medium flex-1 truncate">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {area && <AreaPill name={area.name} color={area.color} className="text-[10px]" />}
        <div className="flex items-center gap-1.5">
          {members.length > 0 && <AvatarStack size="xs" members={members.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} max={3} />}
          {showRemove && <button onClick={onRemove} className="rounded p-0.5 hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100" title="Mover a backlog"><ArrowDown className="h-3 w-3" /></button>}
          {showAdd && <button onClick={onAdd} className="rounded p-0.5 hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100" title="Añadir al sprint"><ArrowRight className="h-3 w-3" /></button>}
        </div>
      </div>
      {task.progress > 0 && <ProgressBar value={task.progress} className="mt-1.5" />}
    </div>
  );
}
