import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare,
  Copy,
  Send,
  Check,
  Calendar,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Agendamento } from "@/lib/agendamentos";
import { toast } from "sonner";

const SERVICOS_ADICIONAIS_MAP: Record<string, { label: string; preco: number }> = {
  "BBQ cleaning": { label: "Churrasqueira", preco: 15 },
  "Churrasqueira": { label: "Churrasqueira", preco: 15 },
  "Window cleaning": { label: "Janelas", preco: 30 },
  "Janelas": { label: "Janelas", preco: 30 },
  "Pressure wash": { label: "Pressure wash", preco: 50 },
  "Lawn mowing": { label: "Jardim", preco: 40 },
  "Handyman": { label: "Manutenção", preco: 50 },
};

function getAdditionalServiceInfo(serviceName: string): { label: string; preco: number } {
  const normalized = serviceName.trim();
  if (SERVICOS_ADICIONAIS_MAP[normalized]) {
    return SERVICOS_ADICIONAIS_MAP[normalized];
  }
  const match = normalized.match(/\$?(\d+)/);
  if (match) {
    return { label: normalized, preco: Number(match[1]) };
  }
  return { label: normalized, preco: 15 }; // default fallback price
}

interface CobrancaDialogProps {
  items: Agendamento[];
  trigger?: React.ReactNode;
}

export function CobrancaDialog({ items, trigger }: CobrancaDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [zelleKey, setZelleKey] = useState(() => {
    return localStorage.getItem("zelle_key") || "(407)488-2824";
  });
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Save Zelle Key in localStorage
  useEffect(() => {
    localStorage.setItem("zelle_key", zelleKey);
  }, [zelleKey]);

  // Extract unique clients
  const clients = useMemo(() => {
    const list = items.map((item) => item.cliente);
    const unique = Array.from(new Set(list));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Filter agendamentos for selected client (sorted by date)
  const clientAgendamentos = useMemo(() => {
    if (!selectedClient) return [];
    return items
      .filter((item) => item.cliente === selectedClient)
      .sort((a, b) => {
        const dateDiff = a.data_servico.localeCompare(b.data_servico);
        if (dateDiff !== 0) return dateDiff;
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });
  }, [selectedClient, items]);

  // Reset/Set initial selection (unpaid checked by default, paid unchecked)
  useEffect(() => {
    if (!selectedClient) {
      setCheckedIds({});
      return;
    }
    const initialChecked: Record<string, boolean> = {};
    clientAgendamentos.forEach((item) => {
      initialChecked[item.id] = item.status === "em_aberto";
    });
    setCheckedIds(initialChecked);
  }, [selectedClient, clientAgendamentos]);

  // Selected items list
  const selectedItems = useMemo(() => {
    return clientAgendamentos.filter((item) => checkedIds[item.id]);
  }, [clientAgendamentos, checkedIds]);

  // Dynamic template generator
  const generatedMessage = useMemo(() => {
    if (!selectedClient) return "";

    const lines: string[] = [];
    let total = 0;

    selectedItems.forEach((item) => {
      const label = item.descricao || "Serviço";
      let dateStr = "";
      try {
        dateStr = format(parseISO(item.data_servico), "dd/MM");
      } catch (e) {
        const parts = item.data_servico.split("-");
        dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.data_servico;
      }
      
      lines.push(`${label} ${dateStr} - $${item.valor}`);
      total += Number(item.valor);

      if (item.servicos_adicionais && item.servicos_adicionais.length > 0) {
        item.servicos_adicionais.forEach((s) => {
          const info = getAdditionalServiceInfo(s);
          lines.push(`${info.label} ${dateStr} - $${info.preco}`);
          total += info.preco;
        });
      }
    });

    return `Olá ${selectedClient}!

Hoje fechamos mais uma semana!

Conforme combinamos os pagamentos de forma semanal! 
Segue o resumo da semana e meu Zelle!

${lines.join("\n")}

Total - $${total}
Zelle ${zelleKey}

Obrigado`;
  }, [selectedClient, selectedItems, zelleKey]);

  // Update textarea whenever generatedMessage changes
  useEffect(() => {
    setCustomMessage(generatedMessage);
  }, [generatedMessage]);

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setCheckedIds((prev) => ({
      ...prev,
      [id]: checked,
    }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Mensagem de cobrança copiada!");
    } catch (err) {
      toast.error("Falha ao copiar a mensagem.");
    }
  };

  const handleSendWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(customMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="gap-2 border-green-500/30 text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer">
            <MessageSquare className="h-5 w-5" />
            Cobrar via WhatsApp
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Gerar Cobrança WhatsApp
          </DialogTitle>
          <DialogDescription>
            Selecione o cliente e os agendamentos desejados para gerar a mensagem formatada de cobrança.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step 1: Select Client */}
            <div className="space-y-2">
              <Label htmlFor="client-select">1. Selecionar Cliente</Label>
              <select
                id="client-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Zelle Key */}
            <div className="space-y-2">
              <Label htmlFor="zelle-input">2. Informações de Pagamento (Zelle)</Label>
              <Input
                id="zelle-input"
                value={zelleKey}
                onChange={(e) => setZelleKey(e.target.value)}
                placeholder="Ex: (407)488-2824"
              />
            </div>
          </div>

          {selectedClient ? (
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
              {/* Step 3: Select Services */}
              <div className="space-y-3">
                <Label>3. Selecione os serviços para incluir</Label>
                <div className="border rounded-lg divide-y bg-muted/10 max-h-[260px] overflow-y-auto">
                  {clientAgendamentos.map((a) => {
                    const isChecked = !!checkedIds[a.id];
                    const isPago = a.status === "pago";

                    return (
                      <div
                        key={a.id}
                        className={`flex items-start gap-3 p-3 transition-colors hover:bg-muted/30 ${
                          isChecked ? "bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`check-${a.id}`}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(a.id, e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <label
                          htmlFor={`check-${a.id}`}
                          className="flex-1 text-sm leading-none cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="truncate pr-2">{a.descricao || "Serviço"}</span>
                            <span className="shrink-0 text-foreground">${a.valor}</span>
                          </div>

                          {a.servicos_adicionais && a.servicos_adicionais.length > 0 && (
                            <div className="text-[11px] text-muted-foreground pl-1.5 mt-1 border-l border-primary/30 space-y-0.5 font-normal">
                              {a.servicos_adicionais.map((s) => {
                                const info = getAdditionalServiceInfo(s);
                                return (
                                  <div key={s} className="flex justify-between">
                                    <span>+ {info.label}</span>
                                    <span>+${info.preco}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(a.data_servico), "dd/MM/yyyy")}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${
                                isPago ? "border-success text-success bg-success/5" : "border-warning text-amber-600 bg-warning/5"
                              }`}
                            >
                              {isPago ? "Pago" : "Em aberto"}
                            </Badge>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="preview-textarea">4. Pré-visualização da Mensagem</Label>
                  <span className="text-[10px] text-muted-foreground">(Você pode editar o texto abaixo)</span>
                </div>
                <Textarea
                  id="preview-textarea"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="font-mono text-xs h-[260px] leading-relaxed resize-none bg-muted/10 border-border"
                />
              </div>
            </div>
          ) : (
            <div className="py-12 border border-dashed rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center gap-2 bg-muted/5">
              <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">Por favor, selecione um cliente no menu acima para listar seus serviços.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={handleCopy}
              disabled={!selectedClient || selectedItems.length === 0}
              className="gap-2 font-medium cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar Texto"}
            </Button>
            <Button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!selectedClient || selectedItems.length === 0}
              className="gap-2 bg-green-600 text-white hover:bg-green-700 font-medium cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
