import { useMemo, useState } from "react";
import { useWorkOS } from "@/store/workos-store";
import { useProjectData } from "@/store/use-project-data";
import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, ListChecks, Plus } from "lucide-react";
import { TaskDialog } from "@/components/workos/TaskDialog";
import type { TaskStatus } from "@/lib/types";

const DOW = ["dom","lun","mar","mié","jue","vie","sáb"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

export function CalendarView({ onOpenActas }: { onOpenActas: () => void }) {
  const { state } = useWorkOS();
  const { project, tasks } = useProjectData();
  const { can } = useAuth();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [taskOpen, setTaskOpen] = useState(false);

  const projectActas = useMemo(
    () => (state.actas ?? []).filter(a => a.projectId === project?.id && a.status !== "Dada de baja"),
    [state.actas, project?.id]
  );

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("es", { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase());

  function actasOn(day: Date) {
    return projectActas.filter(a => isSameDay(new Date(a.date), day));
  }
  function tasksDueOn(day: Date) {
    return tasks.filter(t => isSameDay(new Date(t.endDate), day));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card shadow-soft p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg capitalize">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, -1))} className="h-9 w-9 border-primary/40 text-primary"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { const t = new Date(); setCursor(startOfMonth(t)); setSelected(t); }} className="border-primary/40 text-primary">Hoy</Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))} className="h-9 w-9 border-primary/40 text-primary"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {DOW.map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            if (!d) return <div key={i} />;
            const isToday = isSameDay(d, new Date());
            const isSelected = selected && isSameDay(d, selected);
            const dayActas = actasOn(d);
            const dayTasks = tasksDueOn(d);
            const dotCount = dayActas.length + dayTasks.length;
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={`min-h-[80px] rounded-lg border p-2 text-left transition relative
                  ${isSelected ? "border-info ring-2 ring-info/30" : isToday ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"}`}
              >
                <div className="font-medium text-sm">{d.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {dayActas.slice(0,2).map(a => (
                    <div key={a.id} className="text-[9px] truncate px-1 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1 max-w-full">
                      <FileText className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{a.title}</span>
                    </div>
                  ))}
                  {dayTasks.slice(0, Math.max(0, 2 - dayActas.length)).map(t => (
                    <div key={t.id} className="text-[9px] truncate px-1 py-0.5 rounded bg-info/10 text-info inline-flex items-center gap-1 max-w-full">
                      <ListChecks className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {dotCount > 2 && <div className="text-[9px] text-muted-foreground">+{dotCount - 2} más</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border bg-card shadow-soft p-4">
          <div className="text-sm text-muted-foreground mb-3 capitalize">
            {selected.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-2 mb-4">
            {can("task.create") && (
              <Button size="sm" onClick={() => setTaskOpen(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Nueva tarea
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onOpenActas} className="border-primary/40 text-primary gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Nueva acta
            </Button>
          </div>

          <DayList day={selected} />
        </div>
      )}

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} taskId={null} />
    </div>
  );
}

function DayList({ day }: { day: Date }) {
  const { state } = useWorkOS();
  const { project, tasks } = useProjectData();
  const dayActas = (state.actas ?? []).filter(a => a.projectId === project?.id && isSameDay(new Date(a.date), day));
  const dayTasks = tasks.filter(t => isSameDay(new Date(t.endDate), day));

  if (dayActas.length === 0 && dayTasks.length === 0) {
    return <div className="text-xs text-muted-foreground italic py-2">Sin eventos para este día.</div>;
  }
  return (
    <div className="space-y-2">
      {dayActas.map(a => (
        <div key={a.id} className="flex items-center gap-2 text-sm rounded-lg border bg-primary/5 px-3 py-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium">{a.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-muted ml-auto">{a.type}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded ${a.status === "Abierta" ? "bg-info/15 text-info" : "bg-success/15 text-success"}`}>{a.status}</span>
        </div>
      ))}
      {dayTasks.map(t => (
        <div key={t.id} className="flex items-center gap-2 text-sm rounded-lg border bg-info/5 px-3 py-2">
          <ListChecks className="h-4 w-4 text-info" />
          <span className="font-medium truncate">{t.title}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">vence hoy</span>
        </div>
      ))}
    </div>
  );
}