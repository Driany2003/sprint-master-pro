import { useMemo, useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import { useProjectData } from "@/store/use-project-data";
import { ProgressBar } from "../Badges";
import { Activity, AlertOctagon, AlertTriangle, BarChart3, CheckCircle2, Circle, CircleDot, Clock, FolderKanban, Radio, TrendingUp, Zap, Plus, ExternalLink, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isBefore, startOfDay } from "date-fns";
import { TaskDetailDialog } from "../TaskDetailDialog";
import { TaskDialog } from "../TaskDialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { toast } from "sonner";

export function DashboardView({ onCreateTask, onOpenControlTower }: { onCreateTask: () => void; onOpenControlTower: () => void }) {
  const { state, dispatch } = useWorkOS();
  const { project, tasks: projectTasks } = useProjectData();
  const { isAdmin, can } = useAuth();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const tasks = projectTasks;
  const total = tasks.length;
  const today = startOfDay(new Date());

  const counts = useMemo(() => ({
    pendiente: tasks.filter(t => t.status === "pendiente").length,
    en_progreso: tasks.filter(t => t.status === "en_progreso").length,
    en_riesgo: tasks.filter(t => t.status === "en_riesgo").length,
    bloqueada: tasks.filter(t => t.status === "bloqueada").length,
    completada: tasks.filter(t => t.status === "completada").length,
  }), [tasks]);

  const prio = useMemo(() => ({
    urgente: tasks.filter(t => t.priority === "urgente").length,
    alta: tasks.filter(t => t.priority === "alta").length,
    media: tasks.filter(t => t.priority === "media").length,
    baja: tasks.filter(t => t.priority === "baja").length,
  }), [tasks]);

  const overdue = tasks.filter(t => t.status !== "completada" && isBefore(new Date(t.endDate), today));
  const urgentActive = tasks.filter(t => t.priority === "urgente" && t.status !== "completada");
  const completedRecent = tasks.filter(t => t.status === "completada").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")).slice(0, 5);
  const globalProgress = total ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;

  const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard Icon={TrendingUp} label="Progreso global" value={`${globalProgress}%`} sub={`0 de ${total} tareas completadas`} tone="primary" />
        <KpiCard Icon={FolderKanban} label="Proyecto activo" value={project?.name ?? "—"} sub={`${state.areas.length} áreas`} tone="info" />
        <KpiCard Icon={Clock} label="Vencidas" value={overdue.length} sub="tareas sin completar" tone="warning" />
        <KpiCard Icon={Zap} label="Urgentes activas" value={urgentActive.length} sub="sin completar" tone="destructive" />
      </div>

      {/* Distribuciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel Icon={BarChart3} title="Estado de tareas">
          <Row Icon={CircleDot} color="text-warning" label="En curso" value={counts.en_progreso} pct={pct(counts.en_progreso)} barTone="warning" />
          <Row Icon={Circle} color="text-muted-foreground" label="Pendiente" value={counts.pendiente} pct={pct(counts.pendiente)} />
          <Row Icon={CheckCircle2} color="text-success" label="Completada" value={counts.completada} pct={pct(counts.completada)} barTone="success" />
          <Row Icon={AlertTriangle} color="text-primary" label="En riesgo" value={counts.en_riesgo} pct={pct(counts.en_riesgo)} barTone="primary" />
          <Row Icon={AlertOctagon} color="text-destructive" label="Bloqueada" value={counts.bloqueada} pct={pct(counts.bloqueada)} barTone="warning" />
        </Panel>
        <Panel Icon={Flag} title="Distribución por prioridad">
          <Row Icon={Flag} color="text-destructive" label="Urgente" value={prio.urgente} pct={pct(prio.urgente)} barTone="warning" />
          <Row Icon={Flag} color="text-warning" label="Alta" value={prio.alta} pct={pct(prio.alta)} barTone="warning" />
          <Row Icon={Flag} color="text-info" label="Media" value={prio.media} pct={pct(prio.media)} barTone="primary" />
          <Row Icon={Flag} color="text-muted-foreground" label="Baja" value={prio.baja} pct={pct(prio.baja)} />
        </Panel>
        <Panel Icon={FolderKanban} title={isAdmin ? "Progreso por proyecto" : "Mis proyectos"}>
          {(isAdmin ? state.projects : state.projects.filter(p => p.id === project?.id)).map(p => {
            const pt = state.tasks.filter(t => t.projectId === p.id);
            const done = pt.filter(t => t.status === "completada").length;
            const prog = pt.length ? Math.round(pt.reduce((s, t) => s + t.progress, 0) / pt.length) : 0;
            return (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm"><span className="font-medium">{p.name}</span><span className="text-xs text-muted-foreground tabular-nums">{done}/{pt.length} · {prog}%</span></div>
                <ProgressBar value={prog} />
              </div>
            );
          })}
        </Panel>
      </div>

      {/* Vencidas */}
      <div className="rounded-xl border bg-warning/5 border-warning/20 p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-warning" /><h3 className="font-display font-semibold">Tareas vencidas ({overdue.length})</h3></div>
        {overdue.length === 0 ? <p className="text-sm text-muted-foreground italic">Sin tareas vencidas 🎉</p> :
          <div className="divide-y">
            {overdue.map(t => {
              const area = state.areas.find(a => a.id === t.areaId);
              return (
                <button key={t.id} onClick={() => setDetailId(t.id)} className="w-full flex items-center gap-3 py-1.5 text-sm text-left hover:bg-warning/10 rounded px-2 -mx-2 transition">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area?.color }} />
                  <span className="font-medium flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{area?.name}</span>
                  <span className="text-xs font-mono text-warning tabular-nums">{format(new Date(t.endDate), "yyyy-MM-dd")}</span>
                </button>
              );
            })}
          </div>}
      </div>

      {/* Recientes */}
      <Panel Icon={CheckCircle2} title="Completadas recientes">
        {completedRecent.length === 0 ? <p className="text-sm text-center text-muted-foreground italic py-4">Sin tareas completadas aún</p> :
          <div className="divide-y">
            {completedRecent.map(t => (
              <button key={t.id} onClick={() => setDetailId(t.id)} className="w-full flex items-center gap-3 py-2 text-sm text-left hover:bg-muted rounded px-2 -mx-2 transition">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium flex-1 truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{t.completedAt ? format(new Date(t.completedAt), "yyyy-MM-dd") : "—"}</span>
              </button>
            ))}
          </div>}
      </Panel>

      {/* Control tower */}
      <div className="rounded-xl border bg-card p-4 shadow-soft flex flex-wrap items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Radio className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold">Control Tower</div>
          <p className="text-xs text-muted-foreground">Enlace rápido a operaciones. Si ves una incidencia, regístrala como tarea aquí mismo.</p>
        </div>
        <span className="text-xs text-warning font-semibold">{overdue.length} vencida(s)</span>
        <Button variant="outline" size="sm" onClick={onOpenControlTower} className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />Abrir Control Tower</Button>
        {can("task.create") && <Button onClick={onCreateTask} size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" />Nueva tarea</Button>}
      </div>

      <TaskDetailDialog
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        taskId={detailId}
        onEdit={(id) => { setDetailId(null); setEditId(id); }}
        onDelete={(id) => { setDetailId(null); setConfirmId(id); }}
      />
      <TaskDialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)} taskId={editId} />
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Eliminar tarea"
        confirmLabel="Eliminar"
        onConfirm={() => { if (confirmId) { dispatch({ type: "DELETE_TASK", payload: { id: confirmId } }); toast.success("Tarea eliminada"); } setConfirmId(null); }}
      />
    </div>
  );
}

function KpiCard({ Icon, label, value, sub, tone }: { Icon: any; label: string; value: any; sub: string; tone: "primary"|"info"|"warning"|"destructive" }) {
  const map = { primary: "text-primary bg-primary/10", info: "text-info bg-info/10", warning: "text-warning bg-warning/10", destructive: "text-destructive bg-destructive/10" } as const;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2"><div className={`h-8 w-8 rounded-lg flex items-center justify-center ${map[tone]}`}><Icon className="h-4 w-4" /></div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span></div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Panel({ Icon, title, children }: { Icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-3"><Icon className="h-4 w-4 text-foreground" /><h3 className="font-display font-semibold text-sm">{title}</h3></div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ Icon, color, label, value, pct, barTone }: { Icon: any; color: string; label: string; value: number; pct: number; barTone?: "primary"|"success"|"warning" }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm"><Icon className={`h-3.5 w-3.5 ${color}`} /><span className={`font-medium ${color}`}>{label}</span><span className="ml-auto text-xs text-muted-foreground tabular-nums">{value} ({pct}%)</span></div>
      <ProgressBar value={pct} tone={barTone} />
    </div>
  );
}
