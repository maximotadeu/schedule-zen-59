import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palmtree, Loader2 } from "lucide-react";
import { createFolga } from "@/lib/agendamentos";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface MarcarFolgaDialogProps {
  defaultDate?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function MarcarFolgaDialog({ defaultDate, trigger, onSuccess }: MarcarFolgaDialogProps) {
  const [open, setOpen] = useState(false);
  const [dataFolga, setDataFolga] = useState(defaultDate || "");
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataFolga) {
      toast.error("Selecione uma data para a folga.");
      return;
    }
    setLoading(true);
    try {
      await createFolga(dataFolga);
      toast.success("Folga marcada com sucesso!");
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["folgas"] });
      setOpen(false);
      setDataFolga("");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao marcar folga.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && defaultDate) setDataFolga(defaultDate); }}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 cursor-pointer">
            <Palmtree className="h-4 w-4" />
            Marcar Folga
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
            <Palmtree className="h-6 w-6 text-slate-500" />
          </div>
          <DialogTitle className="text-center">Marcar Folga</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Escolha a data em que não haverá atendimentos. O dia será indicado visualmente no calendário.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="data-folga">Data da Folga</Label>
            <Input
              id="data-folga"
              type="date"
              required
              value={dataFolga}
              onChange={(e) => setDataFolga(e.target.value)}
              className="h-10"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer bg-slate-700 hover:bg-slate-800 text-white">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar Folga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
