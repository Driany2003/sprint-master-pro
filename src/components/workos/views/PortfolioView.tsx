import { useMemo, useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import { ChevronDown, ChevronRight, FolderKanban, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { ProgressBar } from "../Badges";
import { AvatarStack } from "../Avatar";
import { Button } from "@/components/ui/button";
import { AreaDialog } from "../AreaDialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { TaskDetailDialog } from "../TaskDetailDialog";
import { TaskDialog } from "../TaskDialog";
import { toast } from "sonner";

export function PortfolioView({ onCreateTask }: { onCreateTask: () => void }) {
  const { state, dispatch } = useWorkOS();
  const project = state.projects.find(p => p.id === state.activeProjectId)!;
  const [openProj, setOpenProj] = useState(true);
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({});

  const [areaDlg, setAreaDlg] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [confirmArea, setConfirmArea] = useState<string | null>(null);
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; id: string | null; areaId?: string | null }>({ open: false, id: null });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<string | null>(null);

  const projectTasks = state.tasks.filter(t => t.projectId === project.id);
  const projectProgress = projectTasks.length
    ? Math.round(projectTasks.reduce((s, t) => s + t.progress, 0) / projectTasks.length)
    : 0;
  const projectDone = projectTasks.filter(t => t.status === "completada").length;

  const byArea = useMemo(() => {
    const m = new Map<string, typeof projectTasks>();
    state.areas.forEach(a => m.set(a.id, []));
    projectTasks.forEach(t => m.get(t.areaId)?.push(t));
    return m;
  }, [projectTasks, state.areas]);

  const leads = project.leadIds.map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];

  return (
    <div className="space-y-3">
      {/* Project header actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{state.areas.length} áreas · {projectTasks.length} tareas</div>
        <Button size="sm" onClick={() => setAreaDlg({ open: true, id: null })} className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Nueva área
        </Button>
      </div>

      {/* Project row */}
      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition cursor-pointer" onClick={() => setOpenProj(o => !o)}>
          {openProj ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft">
            <FolderKanban className="h-4 w-4" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-display font-semibold text-foreground">{project.name}</div>
            <div className="text-xs text-muted-foreground">{project.description}</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {leads.length} líder{leads.length !== 1 ? "es" : ""}</span>
            <span>{projectDone}/{projectTasks.length}</span>
            <div className="w-32"><ProgressBar value={projectProgress} /></div>
            <span className="font-semibold text-foreground tabular-nums">{projectProgress}%</span>
          </div>
        </div>
        {openProj && (
          <div className="border-t bg-muted/30 px-12 py-4 text-sm text-muted-foreground">
            {leads.length === 0
              ? "No hay líderes asignados a este proyecto."
              : <div className="flex items-center gap-3">
                  <AvatarStack members={leads.map(l => ({ initials: l.initials, color: l.color, name: l.name }))} />
                  <span>{leads.map(l => l.name).join(", ")}</span>
                </div>
            }
          </div>
        )}
      </div>

      {/* Areas */}
      {state.areas.map(area => {
        const tasks = byArea.get(area.id) || [];
        const done = tasks.filter(t => t.status === "completada").length;
        const prog = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0;
        const open = openAreas[area.id];
        const members = Array.from(new Set(tasks.flatMap(t => t.assigneeIds)))
          .map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
        return (
          <div key={area.id} className="rounded-xl border bg-card shadow-soft overflow-hidden hover:shadow-md transition">
            <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition cursor-pointer" onClick={() => setOpenAreas(s => ({ ...s, [area.id]: !s[area.id] }))}>
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
              <span className="font-medium text-foreground flex-1 text-left">{area.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{done}/{tasks.length}</span>
              <div className="w-28"><ProgressBar value={prog} /></div>
              <span className="text-xs text-foreground font-semibold tabular-nums w-9 text-right">{prog}%</span>
              <button title="Añadir tarea al área" className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setTaskDlg({ open: true, id: null, areaId: area.id }); }}><Plus className="h-4 w-4" /></button>
              <button title="Editar área" className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setAreaDlg({ open: true, id: area.id }); }}><Pencil className="h-3.5 w-3.5" /></button>
              <button title="Eliminar área" className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmArea(area.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {open && (
              <div className="border-t bg-muted/20 px-12 py-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">Sin tareas aún en esta área.</div>
                ) : tasks.map(t => {
                  const tMembers = t.assigneeIds.map(id => state.members.find(m => m.id === id)).filter(Boolean) as any[];
                  return (
                    <button key={t.id} onClick={() => setDetailId(t.id)} className="w-full flex items-center gap-3 rounded-lg bg-card px-3 py-2 border hover:border-primary hover:shadow-sm transition text-left">
                      <span className="text-sm font-medium flex-1 truncate">{t.title}</span>
                      <AvatarStack size="xs" members={tMembers.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} />
                      <div className="w-24"><ProgressBar value={t.progress} /></div>
                      <span className="text-xs tabular-nums w-9 text-right text-muted-foreground">{t.progress}%</span>
                    </button>
                  );
                })}
                {members.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                    <span>Equipo:</span>
                    <AvatarStack members={members.map(m => ({ initials: m.initials, color: m.color, name: m.name }))} max={6} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <AreaDialog open={areaDlg.open} onOpenChange={(o) => setAreaDlg(s => ({ ...s, open: o }))} areaId={areaDlg.id} />
      <ConfirmDialog
        open={!!confirmArea}
        onOpenChange={(o) => !o && setConfirmArea(null)}
        title="Eliminar área"
        description="Las tareas de esta área se reasignarán al área restante."
        confirmLabel="Eliminar"
        onConfirm={() => { if (confirmArea) { dispatch({ type: "DELETE_AREA", payload: { id: confirmArea } } as any); toast.success("Área eliminada"); } setConfirmArea(null); }}
      />
      <TaskDialog open={taskDlg.open} onOpenChange={(o) => setTaskDlg(s => ({ ...s, open: o }))} taskId={taskDlg.id} />
      <TaskDetailDialog
        open={!!detailId}
        onOpenChange={(o) => !o && setDetailId(null)}
        taskId={detailId}
        onEdit={(id) => { setDetailId(null); setTaskDlg({ open: true, id }); }}
        onDelete={(id) => { setDetailId(null); setConfirmTask(id); }}
      />
      <ConfirmDialog
        open={!!confirmTask}
        onOpenChange={(o) => !o && setConfirmTask(null)}
        title="Eliminar tarea"
        confirmLabel="Eliminar"
        onConfirm={() => { if (confirmTask) { dispatch({ type: "DELETE_TASK", payload: { id: confirmTask } }); toast.success("Tarea eliminada"); } setConfirmTask(null); }}
      />
    </div>
  );
}
