import { CalendarClock, Calendar, BarChart3, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MainTab = "agenda" | "financeiro" | "clientes" | "configuracoes";

interface DashboardSidebarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  isPro: boolean;
  avatarUrl: string | null;
  user: { email?: string } | null;
  onSignOut: () => void;
}

const NAV_ITEMS: { tab: MainTab; label: string; icon: React.ElementType }[] = [
  { tab: "agenda", label: "Agenda", icon: Calendar },
  { tab: "financeiro", label: "Financeiro", icon: BarChart3 },
  { tab: "clientes", label: "Clientes", icon: Users },
  { tab: "configuracoes", label: "Configurações", icon: Settings },
];

function getInitials(emailStr?: string) {
  if (!emailStr) return "U";
  return emailStr.substring(0, 2).toUpperCase();
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  isPro,
  avatarUrl,
  user,
  onSignOut,
}: DashboardSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card p-6 gap-6 shrink-0 h-screen sticky top-0">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
          <CalendarClock className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground truncate">AgendaPro</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {isPro ? "Plano Pro" : "Plano Gratuito"}
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            aria-label={label}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === tab
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-9 w-9 rounded-xl object-cover border" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
              {getInitials(user?.email)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              {user?.email || "Carregando..."}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          aria-label="Sair"
          className="w-full justify-start gap-2 h-9 border border-border"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">Sair</span>
        </Button>
      </div>
    </aside>
  );
}
