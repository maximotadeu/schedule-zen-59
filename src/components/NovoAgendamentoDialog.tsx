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
import { Plus, Loader2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAgendamento, updateAgendamento, type Agendamento } from "@/lib/agendamentos";
import { toast } from "sonner";

const SUGESTOES = [
  "BBQ cleaning",
  "Handyman",
  "Lawn mowing",
  "Pressure wash",
  "Window cleaning",
];

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

  useEffect(() => {
    if (open) {
      setForm({
        cliente: agendamento?.cliente || "",
        data_servico: agendamento?.data_servico || defaultDate || new Date().toISOString().split("T")[0],
        hora_inicio: agendamento?.hora_inicio ? agendamento.hora_inicio.slice(0, 5) : "10:00",
        hora_fim: agendamento?.hora_fim ? agendamento.hora_fim.slice(0, 5) : "16:00",
        descricao: agendamento?.descricao || "",
        valor: agendamento?.valor ? String(agendamento.valor) : "",
      });
      setServicos(agendamento?.servicos_adicionais || []);
    }
  }, [open, defaultDate, agendamento]);

  const [servicos, setServicos] = useState<string[]>(() => agendamento?.servicos_adicionais || []);
  const [novoServico, setNovoServico] = useState("");
  const qc = useQueryClient();

  const addServico = (s: string) => {
    const t = s.trim();
    if (!t) return;
    if (servicos.includes(t)) return;
    setServicos([...servicos, t]);
    setNovoServico("");
  };

  const removeServico = (s: string) => setServicos(servicos.filter((x) => x !== s));

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
        setForm({ cliente: "", data_servico: "", hora_inicio: "10:00", hora_fim: "16:00", descricao: "", valor: "" });
        setServicos([]);
      }
      setNovoServico("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="lg" className="gradient-primary text-primary-foreground shadow-elevated hover:opacity-95">
            <Plus className="h-5 w-5" />
            Novo Agendamento
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agendamento ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          <DialogDescription>
            {agendamento ? "Altere os dados do serviço cadastrado." : "Preencha os dados do serviço prestado."}
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
            <Input id="cliente" required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="data">Data do serviço</Label>
            <Input id="data" type="date" required value={form.data_servico} onChange={(e) => setForm({ ...form, data_servico: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ini">Início</Label>
              <Input id="ini" type="time" required value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fim">Fim</Label>
              <Input id="fim" type="time" required value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição / Local</Label>
            <Textarea id="desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>

          <div className="grid gap-2">
            <Label>Serviços adicionais</Label>
            {servicos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {servicos.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeServico(s)}
                      className="rounded-full p-0.5 hover:bg-background/60"
                      aria-label={`Remover ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Limpeza de churrasqueira"
                value={novoServico}
                onChange={(e) => setNovoServico(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addServico(novoServico);
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={() => addServico(novoServico)}>
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGESTOES.filter((s) => !servicos.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addServico(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="valor">Valor (US$)</Label>
            <Input id="valor" required inputMode="decimal" placeholder="0.00" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
