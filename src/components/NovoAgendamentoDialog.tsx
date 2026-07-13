import { useState, useEffect } from "react";
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
import { Plus, Loader2, X, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAgendamento, updateAgendamento, type Agendamento } from "@/lib/agendamentos";
import { supabase } from "@/integrations/supabase/client";
import { ProPlanModal } from "./ProPlanModal";
import { toast } from "sonner";
import { type ServicoAdicional, getAdditionalServiceInfo } from "@/lib/services-utils";

interface NovoAgendamentoDialogProps {
  defaultDate?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  agendamento?: Agendamento;
}

export function NovoAgendamentoDialog({
  defaultDate = "",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  agendamento,
}: NovoAgendamentoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [form, setForm] = useState({
    cliente: agendamento?.cliente || "",
    data_servico: agendamento?.data_servico || defaultDate || "",
    hora_inicio: agendamento?.hora_inicio ? agendamento.hora_inicio.slice(0, 5) : "10:00",
    hora_fim: agendamento?.hora_fim ? agendamento.hora_fim.slice(0, 5) : "16:00",
    descricao: agendamento?.descricao || "",
    valor: agendamento?.valor ? String(agendamento.valor) : "",
  });

  const [servicos, setServicos] = useState<string[]>(() => agendamento?.servicos_adicionais || []);
  const [novoServico, setNovoServico] = useState("");
  const [disponiveis, setDisponiveis] = useState<ServicoAdicional[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setForm({
        cliente: agendamento?.cliente || "",
        data_servico:
          agendamento?.data_servico || defaultDate || new Date().toISOString().split("T")[0],
        hora_inicio: agendamento?.hora_inicio ? agendamento.hora_inicio.slice(0, 5) : "10:00",
        hora_fim: agendamento?.hora_fim ? agendamento.hora_fim.slice(0, 5) : "16:00",
        descricao: agendamento?.descricao || "",
        valor: agendamento?.valor ? String(agendamento.valor) : "",
      });
      setServicos(agendamento?.servicos_adicionais || []);
      loadDisponiveis();
      checkPro();
    }
  }, [open, defaultDate, agendamento]);

  const checkPro = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      setIsPro(localStorage.getItem("dev_is_pro") === "true");
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setIsPro(!!userData.user.user_metadata?.is_pro);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDisponiveis = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const stored = localStorage.getItem("local_servicos_adicionais");
      if (stored) {
        setDisponiveis(JSON.parse(stored));
      } else {
        const defaults = [
          { id: "d1", nome: "Limpeza de Churrasqueira", preco_padrao: 15 },
          { id: "d2", nome: "Janelas", preco_padrao: 30 },
          { id: "d3", nome: "Lawn mowing", preco_padrao: 40 },
          { id: "d4", nome: "Pressure wash", preco_padrao: 50 },
          { id: "d5", nome: "Handyman", preco_padrao: 50 },
        ];
        localStorage.setItem("local_servicos_adicionais", JSON.stringify(defaults));
        setDisponiveis(defaults);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("servicos_adicionais")
        .select("id, nome, preco_padrao")
        .order("nome", { ascending: true });
      if (error) throw error;
      setDisponiveis(data || []);
    } catch (e) {
      console.error("Erro ao carregar servicos adicionais:", e);
    }
  };

  const addServicoObj = (s: ServicoAdicional) => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }
    const formatted = `${s.nome} ($${s.preco_padrao})`;
    if (servicos.some((x) => x.startsWith(s.nome))) {
      toast.error("Este serviço adicional já foi selecionado.");
      return;
    }
    setServicos([...servicos, formatted]);
  };

  const addServico = (name: string) => {
    if (!isPro) {
      setShowProModal(true);
      return;
    }
    const t = name.trim();
    if (!t) return;
    const formatted = `${t} ($15)`; // Default fallback price
    if (servicos.some((x) => x.startsWith(t))) return;
    setServicos([...servicos, formatted]);
    setNovoServico("");
  };

  const updateServicePrice = (index: number, newPrice: string) => {
    const s = servicos[index];
    const match = s.match(/^(.*?)\s*\(\$?([\d.,]+)\)$/);
    let name = s;
    if (match) {
      name = match[1];
    }
    const updated = [...servicos];
    updated[index] = `${name} ($${newPrice || "0"})`;
    setServicos(updated);
  };

  const removeServico = (s: string) => setServicos(servicos.filter((x) => x !== s));

  const getServiceParts = (s: string) => {
    const match = s.match(/^(.*?)\s*\(\$?([\d.,]+)\)$/);
    if (match) {
      return { name: match[1], price: match[2] };
    }
    const info = getAdditionalServiceInfo(s);
    return { name: info.label, price: String(info.preco) };
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        cliente: form.cliente.trim(),
        data_servico: form.data_servico,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        descricao: form.descricao.trim() || undefined,
        valor: Number(form.valor.replace(",", ".")) || 0,
        servicos_adicionais: servicos,
      };

      if (agendamento) {
        return updateAgendamento(agendamento.id, payload);
      } else {
        return createAgendamento(payload);
      }
    },
    onSuccess: () => {
      toast.success(agendamento ? "Agendamento atualizado" : "Agendamento criado");
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      setOpen(false);
      if (!agendamento) {
        setForm({
          cliente: "",
          data_servico: "",
          hora_inicio: "10:00",
          hora_fim: "16:00",
          descricao: "",
          valor: "",
        });
        setServicos([]);
      }
      setNovoServico("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="gradient-primary text-primary-foreground shadow-elevated hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{agendamento ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            <DialogDescription>
              {agendamento
                ? "Altere os dados do serviço cadastrado."
                : "Preencha os dados do serviço prestado."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="cliente">Cliente / Contratante</Label>
              <Input
                id="cliente"
                required
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="data">Data do serviço</Label>
              <Input
                id="data"
                type="date"
                required
                value={form.data_servico}
                onChange={(e) => setForm({ ...form, data_servico: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ini">Início</Label>
                <Input
                  id="ini"
                  type="time"
                  required
                  value={form.hora_inicio}
                  onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fim">Fim</Label>
                <Input
                  id="fim"
                  type="time"
                  required
                  value={form.hora_fim}
                  onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição / Local</Label>
              <Textarea
                id="desc"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            {/* Dynamic Services Selector Block */}
            <div className="grid gap-2.5 border-t pt-3">
              <Label className="flex items-center gap-1.5 font-bold">
                Serviços adicionais
                {!isPro && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 flex items-center gap-0.5 font-semibold"
                  >
                    <Sparkles className="h-2.5 w-2.5 fill-purple-600 dark:fill-purple-400" />
                    Pro
                  </Badge>
                )}
              </Label>

              {/* Selector dropdown */}
              <div className="grid gap-2">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const found = disponiveis.find((x) => x.id === id);
                    if (found) addServicoObj(found);
                    e.target.value = ""; // reset
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                  aria-label="Serviço adicional"
                >
                  <option value="">Selecione um serviço adicional...</option>
                  {disponiveis.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} (${item.preco_padrao})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom addition text input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ou crie um serviço personalizado..."
                  value={novoServico}
                  onChange={(e) => setNovoServico(e.target.value)}
                  className="h-9 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addServico(novoServico);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs cursor-pointer"
                  onClick={() => addServico(novoServico)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Criar
                </Button>
              </div>

              {/* Selected List with editable price */}
              {servicos.length > 0 && (
                <div className="border rounded-xl p-3 bg-muted/20 space-y-2 mt-1">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    Serviços Selecionados e Ajuste de Preço
                  </span>
                  <div className="grid gap-2">
                    {servicos.map((s, index) => {
                      const { name, price } = getServiceParts(s);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-3 bg-card p-2 rounded-lg border text-xs"
                        >
                          <span className="font-semibold text-foreground truncate max-w-[180px]">
                            {name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              value={price}
                              onChange={(e) => updateServicePrice(index, e.target.value)}
                              className="h-7 w-16 text-center font-bold px-1 py-0.5 text-xs"
                              placeholder="0"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeServico(s)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer rounded-full"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2 border-t pt-3">
              <Label htmlFor="valor">Valor do Serviço Principal (US$)</Label>
              <Input
                id="valor"
                required
                inputMode="decimal"
                placeholder="0.00"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pro upgrade intercept pop-up */}
      <ProPlanModal
        open={showProModal}
        onOpenChange={setShowProModal}
        onSuccess={() => {
          setIsPro(true);
        }}
      />
    </>
  );
}
