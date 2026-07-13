import { useState } from "react";
import { Sparkles, Check, Zap, ShieldCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProPlanModal({ open, onOpenChange, onSuccess }: ProPlanModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        localStorage.setItem("dev_is_pro", "true");
        toast.success("Plano Pro ativado com sucesso (Modo Dev)!");
        if (onSuccess) onSuccess();
        onOpenChange(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { is_pro: true },
      });

      if (error) throw error;

      toast.success("Parabéns! Plano Pro ativado com sucesso!");
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assinar plano Pro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 rounded-2xl border-none">
        <div className="relative h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
        <div className="p-6 space-y-6">
          <DialogHeader className="text-center pt-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-2 animate-pulse">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground">
              Upgrade para o Plano Pro
            </DialogTitle>
            <DialogDescription className="text-xs">
              Libere todo o potencial da sua agenda e faturamento.
            </DialogDescription>
          </DialogHeader>

          {/* Features list */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-xs text-foreground block">
                  Serviços Adicionais Ilimitados
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Cadastre e edite múltiplos serviços dinamicamente.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-xs text-foreground block">
                  Compartilhamento de Agenda
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Sincronize a agenda com o cônjuge ou equipe.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-xs text-foreground block">
                  Valores Editáveis no Checkout
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Ajuste o valor final dos adicionais no momento do serviço.
                </span>
              </div>
            </div>
          </div>

          {/* Price Block */}
          <div className="text-center py-4 bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/10 rounded-xl border border-purple-100 dark:border-purple-900/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
              Plano Mensal
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-extrabold text-foreground">$19,90</span>
              <span className="text-xs text-muted-foreground">/ mês</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center justify-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              Sem fidelidade, cancele quando quiser.
            </p>
          </div>

          {/* Action button */}
          <Button
            type="button"
            disabled={loading}
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold h-11 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01]"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Zap className="h-4.5 w-4.5 mr-2 fill-white" />
            )}
            Ativar Assinatura Pro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
