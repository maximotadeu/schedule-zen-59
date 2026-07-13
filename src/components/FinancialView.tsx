import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  listAgendamentos,
  setStatus,
  deleteAgendamento,
  isFolga,
  currency,
  type Agendamento,
} from "@/lib/agendamentos";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { CobrancaDialog } from "@/components/CobrancaDialog";
import { FotosDialog } from "@/components/FotosDialog";
import { RelatoriosView } from "@/components/RelatoriosView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  TrendingUp,
  ListChecks,
  Search,
  List,
  CalendarClock,
  MessageSquare,
  CheckCircle2,
  Undo2,
  Trash2,
  MoreHorizontal,
  Pencil,
  Camera,
  MapPin,
  Clock,
  Calendar,
} from "lucide-react";

type Filter = "all" | "em_aberto" | "pago";
const ITEMS_PER_PAGE = 10;

interface FinancialViewProps {
  items: Agendamento[];
  realItems: Agendamento[];
  stats: { aReceber: number; recebido: number; total: number };
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "warning";
}

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-amber-600",
  };

  return (
    <Card className="shadow-card border border-border">
      <CardContent className="p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

interface AgendamentoRowProps {
  a: Agendamento;
  onToggle: (status: "em_aberto" | "pago") => void;
  onDelete: () => void;
}

export function AgendamentoRow({ a, onToggle, onDelete }: AgendamentoRowProps) {
  const isPago = a.status === "pago";

  return (
    <Card className="shadow-card border border-border hover:border-muted-foreground/20 transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-foreground">{a.cliente}</h3>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold px-1.5 ${
                  isPago
                    ? "border-success text-success bg-success/5"
                    : "border-warning text-amber-600 bg-warning/5"
                }`}
              >
                {isPago ? "Pago" : "Em aberto"}
              </Badge>
            </div>

            <div className="grid gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {format(parseISO(a.data_servico), "dd/MM/yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {a.hora_inicio.slice(0, 5)} - {a.hora_fim.slice(0, 5)}
              </span>
              {a.descricao && (
                <span className="flex items-center gap-1.5 truncate max-w-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {a.descricao}
                </span>
              )}
            </div>

            {a.servicos_adicionais && a.servicos_adicionais.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {a.servicos_adicionais.map((s, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-[10px] font-normal px-2 py-0.5 border bg-muted/40"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t pt-3 sm:border-0 sm:pt-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-muted-foreground font-medium block">Valor</span>
              <span className="font-extrabold text-lg text-foreground">{currency(a.valor)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {isPago ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggle("em_aberto")}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onToggle("pago")}
                  className="h-8 w-8 p-0 bg-success text-success-foreground hover:bg-success/90 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <NovoAgendamentoDialog
                    agendamento={a}
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    }
                  />
                  <FotosDialog
                    agendamento={a}
                    trigger={
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-pointer gap-2"
                      >
                        <Camera className="h-4 w-4 text-blue-500" />
                        Fotos
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialView({ items, realItems, stats, isLoading }: FinancialViewProps) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [agendamentoToDelete, setAgendamentoToDelete] = useState<string | null>(null);

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

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const filtered = useMemo(() => {
    const list = realItems.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (search && !i.cliente.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return list.sort((a, b) => {
      const dateDiff = b.data_servico.localeCompare(a.data_servico);
      if (dateDiff !== 0) return dateDiff;
      return b.hora_inicio.localeCompare(a.hora_inicio);
    });
  }, [realItems, filter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    return filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filtered, page]);

  const confirmDelete = (id: string) => {
    setAgendamentoToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmedDelete = () => {
    if (agendamentoToDelete) {
      remove.mutate(agendamentoToDelete);
    }
    setDeleteConfirmOpen(false);
    setAgendamentoToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
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

        <RelatoriosView items={realItems} />

        <Card className="shadow-card border border-border">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Histórico de Serviços
            </CardTitle>
            <CardDescription className="text-xs">
              Lista detalhada de todos os agendamentos com filtros e busca.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="all" className="flex-1 sm:flex-none">
                    Todos
                  </TabsTrigger>
                  <TabsTrigger value="em_aberto" className="flex-1 sm:flex-none">
                    Em Aberto
                  </TabsTrigger>
                  <TabsTrigger value="pago" className="flex-1 sm:flex-none">
                    Pagos
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full h-9"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <CobrancaDialog
                items={realItems}
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-green-500/30 text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Cobrar via WhatsApp</span>
                  </Button>
                }
              />
            </div>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Carregando…</p>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-3 font-medium">Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedItems.map((a) => (
                  <AgendamentoRow
                    key={a.id}
                    a={a}
                    onToggle={(status) => toggle.mutate({ id: a.id, status })}
                    onDelete={() => confirmDelete(a.id)}
                  />
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="cursor-pointer"
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground font-medium">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="cursor-pointer"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir agendamento"
        description="Tem certeza que deseja excluir este agendamento?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmedDelete}
      />
    </>
  );
}
