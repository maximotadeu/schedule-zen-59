import { useState, useRef, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ImagePlus,
  Send,
  X,
  Copy,
  Check,
  Camera,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

interface FotosDialogProps {
  agendamento: Agendamento;
  trigger?: React.ReactNode;
}

interface PhotoPreview {
  id: string;
  url: string;
  name: string;
}

export function FotosDialog({ agendamento, trigger }: FotosDialogProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [message, setMessage] = useState<string>(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    return `${greeting}!\nSegue as fotos de hoje!\nObrigado!`;
  });
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateLabel = (() => {
    try {
      return format(parseISO(agendamento.data_servico), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return agendamento.data_servico;
    }
  })();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews: PhotoPreview[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setPhotos((prev) => [...prev, ...newPreviews]);
    // reset input so the same file can be re-selected
    e.target.value = "";
  }, []);

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Mensagem copiada!");
    } catch {
      toast.error("Falha ao copiar a mensagem.");
    }
  };

  const handleOpenWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    if (photos.length > 0) {
      setTimeout(() => {
        toast.info(
          "Mensagem aberta no WhatsApp! Lembre-se de anexar as fotos manualmente.",
          { duration: 5000 }
        );
      }, 800);
    }
  };

  const handleClose = () => {
    // clean up blob URLs
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setMessage(`${getGreeting()}!\nSegue as fotos de hoje!\nObrigado!`);
    setCopied(false);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else setOpen(true);
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 font-medium cursor-pointer">
            <Camera className="h-4 w-4" />
            Fotos
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            Enviar Fotos do Serviço
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{agendamento.cliente}</span>
            {" — "}
            {agendamento.descricao || "Serviço"} · {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* Photo upload area */}
          <div className="space-y-3">
            <Label>1. Selecione as fotos do serviço</Label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 rounded-xl p-8 cursor-pointer transition-all"
            >
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <ImagePlus className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Clique para selecionar fotos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, HEIC, WEBP — múltiplas fotos permitidas
                </p>
              </div>
              <Button variant="outline" size="sm" type="button" className="pointer-events-none">
                <ImagePlus className="h-4 w-4 mr-1.5" />
                Escolher Fotos
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Photo previews */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{photos.length} foto{photos.length !== 1 ? "s" : ""} selecionada{photos.length !== 1 ? "s" : ""}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-6 px-2"
                  onClick={() => {
                    photos.forEach((p) => URL.revokeObjectURL(p.url));
                    setPhotos([]);
                  }}
                >
                  Remover todas
                </Button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="photo-message" className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                2. Mensagem para o cliente
              </Label>
              <span className="text-[10px] text-muted-foreground">(Você pode editar)</span>
            </div>
            <Textarea
              id="photo-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="font-mono text-sm h-28 resize-none bg-muted/10"
            />
          </div>

          {photos.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
              <span>💡</span>
              <span>
                O WhatsApp Web não permite enviar arquivos por link. Ao clicar em{" "}
                <strong>"Enviar via WhatsApp"</strong>, a mensagem será aberta no WhatsApp.
                Você precisará <strong>anexar as fotos manualmente</strong> na conversa.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={handleCopyMessage}
              className="gap-2 font-medium cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar Mensagem"}
            </Button>
            <Button
              type="button"
              onClick={handleOpenWhatsApp}
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
