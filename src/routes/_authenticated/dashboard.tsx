import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAgendamentos,
  listFolgas,
  setStatus,
  deleteAgendamento,
  deleteFolga,
  isFolga,
  currency,
} from "@/lib/agendamentos";
import { joinGrupo } from "@/lib/grupos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSidebar, type MainTab } from "@/components/DashboardSidebar";
import { DashboardMobileNav } from "@/components/DashboardMobileNav";
import { AccountSettings } from "@/components/AccountSettings";
import { FinancialView } from "@/components/FinancialView";
import { CalendarView } from "@/components/CalendarView";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { MarcarFolgaDialog } from "@/components/MarcarFolgaDialog";
import { ClientesView } from "@/components/ClientesView";
import { ProPlanModal } from "@/components/ProPlanModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, Plus, Palmtree } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isPro, avatarUrl, refresh } = useAuth();

  const [activeTab, setActiveTab] = useState<MainTab>("agenda");
  const [showProModal, setShowProModal] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: listAgendamentos,
  });

  const { data: folgas = [] } = useQuery({
    queryKey: ["folgas"],
    queryFn: listFolgas,
  });

  const realItems = useMemo(() => items.filter((i) => !isFolga(i)), [items]);

  const stats = useMemo(() => {
    const aReceber = realItems
      .filter((i) => i.status === "em_aberto")
      .reduce((s, i) => s + Number(i.valor), 0);
    const recebido = realItems
      .filter((i) => i.status === "pago")
      .reduce((s, i) => s + Number(i.valor), 0);
    return { aReceber, recebido, total: realItems.length };
  }, [realItems]);

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "em_aberto" | "pago" }) =>
      setStatus(id, status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success(v.status === "pago" ? "Marcado como pago" : "Revertido para Em Aberto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAgendamento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento removido");
    },
  });

  const handleRemoveFolga = async (dateStr: string) => {
    try {
      await deleteFolga(dateStr);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["folgas"] });
      toast.success("Folga removida!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover folga.");
    }
  };

  const handleAutoJoin = useCallback(
    async (codigo: string) => {
      try {
        toast.loading("Entrando na agenda compartilhada...");
        await joinGrupo(codigo);
        toast.dismiss();
        toast.success("Você entrou na agenda compartilhada!");
        qc.invalidateQueries({ queryKey: ["agendamentos"] });
        refresh();
      } catch (e) {
        toast.dismiss();
        toast.error(e instanceof Error ? e.message : "Erro ao entrar na agenda compartilhada.");
      }
    },
    [qc, refresh],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convite = params.get("convite");
    if (convite) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAutoJoin(convite);
    }
  }, [handleAutoJoin]);

  const signOut = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      localStorage.removeItem("dev_mode");
      localStorage.removeItem("dev_is_pro");
      localStorage.removeItem("dev_avatar");
      localStorage.removeItem("dev_display_name");
      navigate({ to: "/auth" });
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const getInitials = (emailStr?: string) => {
    if (!emailStr) return "U";
    return emailStr.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-16 md:pb-0">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isPro={isPro}
        avatarUrl={avatarUrl}
        user={user}
        onSignOut={signOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3.5 border-b bg-card w-full sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-primary">
              <CalendarClock className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground truncate">AgendaPro</span>
          </div>
          <div className="flex items-center gap-3">
            {isPro ? (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 font-bold"
              >
                PRO
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] px-1.5 font-bold">
                GRATIS
              </Badge>
            )}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-7 w-7 rounded-lg object-cover border"
              />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary">
                {getInitials(user?.email)}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {activeTab === "agenda" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-2">
                <NovoAgendamentoDialog
                  trigger={
                    <Button
                      size="default"
                      className="gradient-primary text-primary-foreground shadow-elevated hover:opacity-95 cursor-pointer w-full h-10 px-4 py-2 text-sm sm:h-9 sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Novo Agendamento</span>
                    </Button>
                  }
                />
                <MarcarFolgaDialog
                  trigger={
                    <Button
                      size="default"
                      variant="outline"
                      className="gap-2 cursor-pointer w-full h-10 px-4 py-2 text-sm sm:h-9 sm:w-auto border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <Palmtree className="h-4 w-4" />
                      <span>Marcar Folga</span>
                    </Button>
                  }
                />
              </div>
              <CalendarView
                items={items}
                folgas={folgas}
                onToggleStatus={(id, status) => toggle.mutate({ id, status })}
                onDeleteAgendamento={(id) => remove.mutate(id)}
                onRemoveFolga={handleRemoveFolga}
              />
            </div>
          )}

          {activeTab === "financeiro" && (
            <FinancialView
              items={items}
              realItems={realItems}
              stats={stats}
              isLoading={isLoading}
            />
          )}

          {activeTab === "clientes" && <ClientesView items={realItems} />}

          {activeTab === "configuracoes" && <AccountSettings onSignOut={signOut} />}
        </main>
      </div>

      <DashboardMobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      <ProPlanModal
        open={showProModal}
        onOpenChange={setShowProModal}
        onSuccess={() => {
          refresh();
        }}
      />
    </div>
  );
}
