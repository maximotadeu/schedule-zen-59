import { useState, useMemo } from "react";
import {
  TrendingUp,
  Wallet,
  MessageSquare,
  Search,
  Users,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CobrancaDialog } from "./CobrancaDialog";
import { type Agendamento, currency } from "@/lib/agendamentos";
import { getAdditionalServiceInfo, getAgendamentoTotalValue } from "@/lib/services-utils";

interface RelatoriosViewProps {
  items: Agendamento[];
}

interface ClientSummary {
  cliente: string;
  totalAReceber: number;
  totalRecebido: number;
  servicosPendentes: number;
  servicosPagos: number;
}

export function RelatoriosView({ items }: RelatoriosViewProps) {
  const [search, setSearch] = useState("");

  // Group and calculate financial statistics per client
  const clientSummaries = useMemo(() => {
    const map: Record<string, ClientSummary> = {};

    items.forEach((item) => {
      const client = item.cliente;
      if (!map[client]) {
        map[client] = {
          cliente: client,
          totalAReceber: 0,
          totalRecebido: 0,
          servicosPendentes: 0,
          servicosPagos: 0,
        };
      }

      const totalValue = getAgendamentoTotalValue(item);
      if (item.status === "em_aberto") {
        map[client].totalAReceber += totalValue;
        map[client].servicosPendentes += 1;
      } else {
        map[client].totalRecebido += totalValue;
        map[client].servicosPagos += 1;
      }
    });

    // Convert to array and filter/sort
    return Object.values(map)
      .filter((summary) => summary.cliente.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.totalAReceber - a.totalAReceber); // highest debt first
  }, [items, search]);

  // Overall financial sums (incorporating additional services)
  const totals = useMemo(() => {
    let aReceber = 0;
    let recebido = 0;

    items.forEach((item) => {
      const val = getAgendamentoTotalValue(item);
      if (item.status === "em_aberto") {
        aReceber += val;
      } else {
        recebido += val;
      }
    });

    return {
      aReceber,
      recebido,
      total: aReceber + recebido,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Sub-header Cards with complete totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border border-border">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Geral a Receber
              </span>
              <p className="text-xl sm:text-2xl font-bold text-amber-600">
                {currency(totals.aReceber)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Total Geral Recebido
              </span>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {currency(totals.recebido)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium">
                Faturamento Estimado
              </span>
              <p className="text-xl sm:text-2xl font-bold text-primary">{currency(totals.total)}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main reports grid */}
      <Card className="shadow-card border border-border">
        <CardHeader className="p-4 sm:p-5 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-primary" />
              Valores a Receber por Solicitante
            </CardTitle>
            <CardDescription className="text-xs">
              Relatório consolidado de valores pendentes e pagos agrupados por cliente.
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
          {clientSummaries.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto opacity-30" />
              <p className="mt-3 text-sm font-medium">Nenhum solicitante localizado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clientSummaries.map((summary) => {
                const totalServicos = summary.servicosPendentes + summary.servicosPagos;
                const hasPending = summary.totalAReceber > 0;

                return (
                  <div
                    key={summary.cliente}
                    className="p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/5 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <h4 className="font-semibold text-base text-foreground truncate">
                        {summary.cliente}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge
                          variant="secondary"
                          className="font-normal text-muted-foreground bg-muted/40 border"
                        >
                          {totalServicos} {totalServicos === 1 ? "trabalho" : "trabalhos"}
                        </Badge>
                        {summary.servicosPendentes > 0 && (
                          <Badge
                            variant="outline"
                            className="border-warning/40 text-amber-700 bg-warning/5 font-normal"
                          >
                            {summary.servicosPendentes} pendente
                            {summary.servicosPendentes === 1 ? "" : "s"}
                          </Badge>
                        )}
                        {summary.servicosPagos > 0 && (
                          <Badge
                            variant="outline"
                            className="border-success/40 text-green-700 bg-success/5 font-normal"
                          >
                            {summary.servicosPagos} pago{summary.servicosPagos === 1 ? "" : "s"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 border-t pt-3 sm:border-0 sm:pt-0">
                      {/* Financial info block */}
                      <div className="flex gap-6 sm:gap-8">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-medium block">
                            A Receber
                          </span>
                          <span
                            className={`text-sm sm:text-base font-bold ${hasPending ? "text-amber-600" : "text-muted-foreground/50"}`}
                          >
                            {currency(summary.totalAReceber)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-medium block">
                            Recebido
                          </span>
                          <span className="text-sm sm:text-base font-semibold text-foreground/80">
                            {currency(summary.totalRecebido)}
                          </span>
                        </div>
                      </div>

                      {/* WhatsApp trigger button */}
                      {hasPending ? (
                        <CobrancaDialog
                          items={items}
                          defaultClient={summary.cliente}
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-green-600 border-green-500/20 hover:text-green-700 hover:bg-green-50 h-9 font-medium cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Cobrar</span>
                            </Button>
                          }
                        />
                      ) : (
                        <div className="w-[84px] h-9 flex items-center justify-center text-xs text-green-600/60 font-semibold bg-green-50/40 border border-green-500/10 rounded-md">
                          Quitado
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
