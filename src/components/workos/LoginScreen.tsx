import { useWorkOS } from "@/store/workos-store";
import { useAuth, ROLE_LABEL } from "@/store/auth-store";
import { Sparkles, ShieldCheck, Eye, Heart, User, Crown } from "lucide-react";
import type { Role } from "@/lib/types";

const ROLE_ICON: Record<Role, any> = {
  SUPERADMIN: Crown,
  ADMIN: ShieldCheck,
  MONITOR: Eye,
  LEALTAD: Heart,
  MIEMBRO: User,
};

const ROLE_TONE: Record<Role, string> = {
  SUPERADMIN: "bg-primary/10 text-primary border-primary/20",
  ADMIN: "bg-info/10 text-info border-info/20",
  MONITOR: "bg-warning/10 text-warning border-warning/20",
  LEALTAD: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  MIEMBRO: "bg-muted text-muted-foreground border-border",
};

export function LoginScreen() {
  const { state } = useWorkOS();
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground shadow-soft mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Bienvenido a WorkOS</h1>
          <p className="text-sm text-muted-foreground mt-1">Selecciona tu cuenta para continuar (entorno demo)</p>
        </div>

        <div className="rounded-2xl border bg-card shadow-elevated overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuentas disponibles</span>
            <span className="text-xs text-muted-foreground">{state.members.length} usuarios</span>
          </div>
          <ul className="divide-y">
            {state.members.map(m => {
              const Icon = ROLE_ICON[m.role];
              const projects = state.projects.filter(p => p.memberIds.includes(m.id) || p.leadIds.includes(m.id));
              const isAdmin = m.role === "ADMIN" || m.role === "SUPERADMIN";
              return (
                <li key={m.id}>
                  <button
                    onClick={() => login(m.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition text-left group"
                  >
                    <span className="inline-flex items-center justify-center h-11 w-11 rounded-full text-sm font-bold text-white shadow-soft" style={{ backgroundColor: m.color }}>
                      {m.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {isAdmin ? "Acceso a todos los proyectos" : `${projects.length} proyecto${projects.length !== 1 ? "s" : ""}: ${projects.map(p => p.name).join(", ") || "Sin asignación"}`}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_TONE[m.role]}`}>
                      <Icon className="h-3 w-3" />
                      {ROLE_LABEL[m.role]}
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition">Entrar →</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Demo · La sesión se guarda en este navegador. Puedes cerrar sesión desde el menú de usuario.
        </p>
      </div>
    </div>
  );
}
