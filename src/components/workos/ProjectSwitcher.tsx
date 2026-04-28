import { useWorkOS } from "@/store/workos-store";
import { useAuth } from "@/store/auth-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, FolderKanban, Lock } from "lucide-react";

export function ProjectSwitcher() {
  const { state, dispatch } = useWorkOS();
  const { visibleProjects, isAdmin } = useAuth();
  const active = state.projects.find(p => p.id === state.activeProjectId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 hover:bg-muted transition text-left max-w-[260px]">
          <span className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: active?.color || "hsl(var(--primary))" }}>
            <FolderKanban className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">Proyecto</div>
            <div className="text-sm font-semibold text-foreground truncate leading-tight">{active?.name ?? "—"}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Mis proyectos</span>
          <span className="text-[10px] text-muted-foreground">{visibleProjects.length}{isAdmin ? " (admin)" : ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visibleProjects.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Lock className="h-4 w-4 mx-auto mb-2" />
            No tienes proyectos asignados.
          </div>
        )}
        {visibleProjects.map(p => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => dispatch({ type: "SET_ACTIVE_PROJECT", payload: { id: p.id } })}
            className="gap-2"
          >
            <span className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: p.color || "hsl(var(--primary))" }}>
              <FolderKanban className="h-3 w-3" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
            </div>
            {p.id === state.activeProjectId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
