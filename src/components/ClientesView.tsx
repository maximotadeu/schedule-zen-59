import { useState, useMemo } from "react";
import {
  Users,
  Search,
  MessageSquare,
  DollarSign,
  CalendarDays,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CobrancaDialog } from "./CobrancaDialog";
import { type Agendamento, currency } from "@/lib/agendamentos";
import { getAdditionalServiceInfo, getAgendamentoTotalValue } from "@/lib/services-utils";

interface ClientesViewProps {
  items: Agendamento[];
}

interface ClientStats {
  nome: string;
  totalAgendamentos: number;
  totalPendentes: number;
  totalPagos: number;
  saldoPendente: number;
  saldoPago: number;
}

export function ClientesView({ items }: ClientesViewProps) {
  const [search, setSearch] = useState("");

  const clientStats = useMemo(() => {
    const map: Record<string, ClientStats> = {};

    items.forEach((item) => {
      const name = item.cliente.trim();
      if (!name) return;

      if (!map[name]) {
        map[name] = {
          nome: name,
          totalAgendamentos: 0,
          totalPendentes: 0,
          totalPagos: 0,
          saldoPendente: 0,
          saldoPago: 0,
        };
      }

      const val = getAgendamentoTotalValue(item);
      map[name].totalAgendamentos += 1;

      if (item.status === "em_aberto") {
        map[name].totalPendentes += 1;
        map[name].saldoPendente += val;
      } else {
        map[name].totalPagos += 1;
        map[name].saldoPago += val;
      }
    });

    return Object.values(map)
      .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.totalAgendamentos - a.totalAgendamentos); // list active clients first
  }, [items, search]);

  const initials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Nice colors for client avatars
  const avatarColors = [
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="shadow-card border border-border">
        <CardHeader className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-1.5">
              <Users className="h-5 w-5 text-primary" />
              Gestão de Clientes ({clientStats.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico de serviços, saldos devedores e contato rápido por solicitante.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clientStats.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto opacity-30" />
              <p className="mt-3 text-sm font-medium">Nenhum cliente localizado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5">
              {clientStats.map((client) => {
                const colorClass = getAvatarColor(client.nome);
                const hasPending = client.saldoPendente > 0;

                return (
                  <Card
                    key={client.nome}
                    className="shadow-card hover:shadow-md transition-all border border-border flex flex-col justify-between"
                  >
                    <CardContent className="p-4 flex flex-col gap-4 h-full justify-between">
                      {/* Top Info */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${colorClass}`}
                        >
                          {initials(client.nome)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-foreground truncate">
                            {client.nome}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {client.totalAgendamentos}{" "}
                            {client.totalAgendamentos === 1 ? "atendimento" : "atendimentos"} no
                            total
                          </p>
                        </div>
                      </div>

                      {/* Middle Stats Info */}
                      <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded-lg text-xs border">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground block font-medium">
                            Saldo Pendente
                          </span>
                          <span
                            className={`font-bold ${hasPending ? "text-amber-600" : "text-muted-foreground/60"}`}
                          >
                            {currency(client.saldoPendente)}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-right sm:text-left">
                          <span className="text-[10px] text-muted-foreground block font-medium">
                            Saldo Pago
                          </span>
                          <span className="font-semibold text-foreground/80">
                            {currency(client.saldoPago)}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Info details */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {client.totalPendentes} pendente{client.totalPendentes === 1 ? "" : "s"}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          {client.totalPagos} pago{client.totalPagos === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t flex items-center justify-end gap-2">
                        {hasPending ? (
                          <CobrancaDialog
                            items={items}
                            defaultClient={client.nome}
                            trigger={
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-1.5 text-green-600 border-green-500/20 hover:text-green-700 hover:bg-green-50 h-8 font-medium cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Cobrar WhatsApp</span>
                              </Button>
                            }
                          />
                        ) : (
                          <div className="w-full h-8 flex items-center justify-center text-xs text-green-600/70 font-semibold bg-green-50/50 border border-green-500/10 rounded-md">
                            Contas em Dia
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
