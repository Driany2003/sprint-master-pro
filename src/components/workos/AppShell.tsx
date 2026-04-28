import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Boxes, GanttChartSquare, KanbanSquare, LayoutDashboard, Plus, Search, Sparkles, Flame, Lock } from "lucide-react";
import { useWorkOS } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import { TaskDialog } from "./TaskDialog";
import { PortfolioView } from "./views/PortfolioView";
import { TimelineView } from "./views/TimelineView";
import { BoardView } from "./views/BoardView";
import { SprintsView } from "./views/SprintsView";
import { DashboardView } from "./views/DashboardView";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { UserMenu } from "./UserMenu";
import type { TaskStatus } from "@/lib/types";
import { toast } from "sonner";

type Tab = "timeline" | "portfolio" | "board" | "sprints" | "dashboard";

const TABS: { id: Tab; label: string; Icon: any }[] = [
  { id: "timeline",  label: "Timeline",  Icon: GanttChartSquare },
  { id: "portfolio", label: "Portfolio", Icon: Boxes },
  { id: "board",     label: "Board",     Icon: KanbanSquare },
  { id: "sprints",   label: "Sprints",   Icon: Flame },
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
];

export function AppShell() {
  const { state, dispatch } = useWorkOS();
  const { user, can, visibleProjects, canAccessProject } = useAuth();
  const [tab, setTab] = useState<Tab>("sprints");
  const [search, setSearch] = useState("");
  const [taskDlg, setTaskDlg] = useState<{ open: boolean; id: string | null; status?: TaskStatus }>({ open: false, id: null });

  // Asegura que el usuario solo vea un proyecto al que tiene acceso
  useEffect(() => {
    if (!user) return;
    if (!canAccessProject(state.activeProjectId)) {
      const next = visibleProjects[0]?.id;
      if (next) dispatch({ type: "SET_ACTIVE_PROJECT", payload: { id: next } });
    }
  }, [user, state.activeProjectId, canAccessProject, visibleProjects, dispatch]);

  const project = state.projects.find(p => p.id === state.activeProjectId);
  const projectTasks = project ? state.tasks.filter(t => t.projectId === project.id) : [];
  const notif = projectTasks.filter(t => t.status === "en_riesgo" || t.status === "bloqueada").length;
  const canCreate = can("task.create");

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md shadow-soft">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft"><Sparkles className="h-4 w-4" /></div>
            <div className="hidden sm:block">
              <div className="font-display font-bold text-foreground leading-tight">WorkOS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5">Project OS</div>
            </div>
          </div>
          <div className="hidden md:block h-6 w-px bg-border" />
          <ProjectSwitcher />
          <div className="flex-1 max-w-md relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tareas o áreas…" className="pl-9 bg-background" />
          </div>
          <Button
            onClick={() => canCreate ? setTaskDlg({ open: true, id: null }) : toast.error("No tienes permisos para crear tareas")}
            disabled={!canCreate || !project}
            className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft"
          >
            <Plus className="h-4 w-4" /> Nueva tarea
          </Button>
          <button className="relative rounded-lg p-2 hover:bg-muted transition" aria-label="Notificaciones">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {notif > 0 && <span className="absolute top-1 right-1 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center px-1">{notif}</span>}
          </button>
          <UserMenu />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-[1400px] px-4 lg:px-6 pb-2">
          <div className="inline-flex items-center gap-1 rounded-xl border bg-background p-1 shadow-xs">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted"}`}
              >
                <t.Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 lg:px-6 py-5">
        {!project ? (
          <NoAccess />
        ) : (
          <div className="animate-fade-in" key={project.id /* fuerza remount al cambiar proyecto */}>
            {tab === "portfolio" && <PortfolioView onCreateTask={() => setTaskDlg({ open: true, id: null })} />}
            {tab === "timeline"  && <TimelineView onCreateTask={() => setTaskDlg({ open: true, id: null })} onEditTask={(id) => setTaskDlg({ open: true, id })} />}
            {tab === "board"     && <BoardView onCreateTask={(s) => setTaskDlg({ open: true, id: null, status: s })} onEdit={(id) => setTaskDlg({ open: true, id })} />}
            {tab === "sprints"   && <SprintsView />}
            {tab === "dashboard" && <DashboardView onCreateTask={() => setTaskDlg({ open: true, id: null })} onOpenControlTower={() => toast.info("Control Tower próximamente")} />}
          </div>
        )}
      </main>

      <TaskDialog
        open={taskDlg.open}
        onOpenChange={(o) => setTaskDlg(s => ({ ...s, open: o }))}
        taskId={taskDlg.id}
        defaultStatus={taskDlg.status}
      />
    </div>
  );
}

function NoAccess() {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-card/50 p-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3"><Lock className="h-5 w-5 text-muted-foreground" /></div>
      <h3 className="font-display text-lg font-semibold text-foreground">Sin proyectos asignados</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Tu cuenta no tiene acceso a ningún proyecto. Pide a un administrador que te añada como miembro.
      </p>
    </div>
  );
}
