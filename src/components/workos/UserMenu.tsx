import { useAuth, ROLE_LABEL } from "@/store/auth-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LogOut, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted transition">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-white" style={{ backgroundColor: user.color }}>
            {user.initials}
          </span>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold leading-none">{user.name.split(" ")[0]}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{ROLE_LABEL[user.role]}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{ROLE_LABEL[user.role]}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { logout(); toast.success("Sesión cerrada"); }} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
