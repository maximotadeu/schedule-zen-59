import { Calendar, BarChart3, Users, Settings } from "lucide-react";
import { type MainTab } from "./DashboardSidebar";

interface DashboardMobileNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const MOBILE_NAV_ITEMS: { tab: MainTab; label: string; icon: React.ElementType }[] = [
  { tab: "agenda", label: "Agenda", icon: Calendar },
  { tab: "financeiro", label: "Financeiro", icon: BarChart3 },
  { tab: "clientes", label: "Clientes", icon: Users },
  { tab: "configuracoes", label: "Ajustes", icon: Settings },
];

export function DashboardMobileNav({ activeTab, onTabChange }: DashboardMobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur-md pb-safe-bottom z-20 flex items-center justify-around h-16 shadow-lg">
      {MOBILE_NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          aria-label={label}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === tab ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Icon className="h-5.5 w-5.5" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
