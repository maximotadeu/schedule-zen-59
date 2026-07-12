import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAgendamentos,
  setStatus,
  deleteAgendamento,
  currency,
  type Agendamento,
} from "@/lib/agendamentos";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { CalendarView } from "@/components/CalendarView";
import { CobrancaDialog } from "@/components/CobrancaDialog";
import { FotosDialog } from "@/components/FotosDialog";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Search,
  Wallet,
  TrendingUp,
  ListChecks,
  LogOut,
  Undo2,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  List,
  Pencil,
  Camera,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Filter = "all" | "em_aberto" | "pago";

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: listAgendamentos,
  });

  const stats = useMemo(() => {
    const aReceber = items.filter((i) => i.status === "em_aberto").reduce((s, i) => s + Number(i.valor), 0);
    const recebido = items.filter((i) => i.status === "pago").reduce((s, i) => s + Number(i.valor), 0);
    return { aReceber, recebido, total: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (search && !i.cliente.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, search]);

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "em_aberto" | "pago" }) => setStatus(id, status),
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

  const signOut = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      localStorage.removeItem("dev_mode");
      navigate({ to: "/auth" });
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen gradient-surface">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
              <CalendarClock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">AgendaPro</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Agenda & controle financeiro</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total a Receber"
            value={currency(stats.aReceber)}
            icon={<Wallet className="h-5 w-5" />}
            accent="warning"
          />
          <StatCard
            label="Total Recebido"
            value={currency(stats.recebido)}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="success"
          />
          <StatCard
            label="Total de Agendamentos"
            value={String(stats.total)}
            icon={<ListChecks className="h-5 w-5" />}
            accent="primary"
          />
        </section>

        {/* Toolbar */}
        <section className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="em_aberto">Em Aberto</TabsTrigger>
                <TabsTrigger value="pago">Pagos</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-1.5">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Calendário
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <CobrancaDialog items={items} />
            <NovoAgendamentoDialog />
          </div>
        </section>

        {/* List / Calendar View content */}
        {viewMode === "list" ? (
          <section className="grid gap-3">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Carregando…</p>
            ) : filtered.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-16 text-center">
                  <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-3 font-medium">Nenhum agendamento encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em "Novo Agendamento" para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((a) => (
                <AgendamentoRow
                  key={a.id}
                  a={a}
                  onToggle={(status) => toggle.mutate({ id: a.id, status })}
                  onDelete={() => {
                    if (confirm(`Excluir agendamento de ${a.cliente}?`)) remove.mutate(a.id);
                  }}
                />
              ))
            )}
          </section>
        ) : (
          <CalendarView
            items={filtered}
            onToggleStatus={(id, status) => toggle.mutate({ id, status })}
            onDeleteAgendamento={(id) => remove.mutate(id)}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "warning";
}) {
  const accentClass =
    accent === "success"
      ? "bg-success/10 text-success"
      : accent === "warning"
      ? "bg-warning/15 text-accent-foreground"
      : "bg-primary/10 text-primary";
  return (
    <Card className="shadow-card overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">{value}</p>
          </div>
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accentClass}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgendamentoRow({
  a,
  onToggle,
  onDelete,
}: {
  a: Agendamento;
  onToggle: (status: "em_aberto" | "pago") => void;
  onDelete: () => void;
}) {
  const isPago = a.status === "pago";
  const dateLabel = format(parseISO(a.data_servico), "EEE, dd MMM yyyy", { locale: ptBR });
  return (
    <Card className="shadow-card hover:shadow-elevated transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base truncate">{a.cliente}</h3>
              {isPago ? (
                <Badge className="bg-success text-success-foreground hover:bg-success">Pago</Badge>
              ) : (
                <Badge variant="outline" className="border-warning text-accent-foreground bg-warning/15">
                  Em Aberto
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                {dateLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {a.hora_inicio.slice(0, 5)} – {a.hora_fim.slice(0, 5)}
              </span>
              {a.descricao && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{a.descricao}</span>
                </span>
              )}
            </div>
            {a.servicos_adicionais && a.servicos_adicionais.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {a.servicos_adicionais.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {isPago && a.data_pagamento && (
              <p className="text-xs text-success">
                Pago em {format(parseISO(a.data_pagamento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-lg sm:text-xl font-bold">{currency(Number(a.valor))}</span>
            <div className="flex items-center gap-1">
              {isPago ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggle("em_aberto")}
                  title="Reverter para Em Aberto"
                >
                  <Undo2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Reverter</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onToggle("pago")}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Marcar Pago</span>
                </Button>
              )}

              <NovoAgendamentoDialog
                agendamento={a}
                trigger={
                  <Button size="sm" variant="ghost" title="Editar" className="cursor-pointer">
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                }
              />

              <FotosDialog
                agendamento={a}
                trigger={
                  <Button size="sm" variant="ghost" title="Enviar fotos" className="cursor-pointer">
                    <Camera className="h-4 w-4 text-blue-500" />
                    <span className="hidden sm:inline">Fotos</span>
                  </Button>
                }
              />

              <Button size="sm" variant="ghost" onClick={onDelete} title="Excluir">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
