import { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  Plus,
  ArrowRight,
  LogOut,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGrupo, createGrupo, joinGrupo, leaveGrupo, type Grupo } from "@/lib/grupos";
import { toast } from "sonner";

interface GrupoSetupProps {
  onGroupChange: () => void;
}

export function GrupoSetup({ onGroupChange }: GrupoSetupProps) {
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchGrupo();
  }, []);

  async function fetchGrupo() {
    try {
      setLoading(true);
      const g = await getGrupo();
      setGrupo(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!nomeGrupo.trim()) {
      toast.error("Por favor, digite um nome para o grupo");
      return;
    }
    try {
      setSubmitting(true);
      const newGroup = await createGrupo(nomeGrupo.trim());
      setGrupo(newGroup);
      setNomeGrupo("");
      toast.success("Agenda compartilhada criada com sucesso!");
      onGroupChange();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar grupo");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!codigoConvite.trim()) {
      toast.error("Por favor, insira o código de convite");
      return;
    }
    try {
      setSubmitting(true);
      const joined = await joinGrupo(codigoConvite.trim());
      setGrupo(joined);
      setCodigoConvite("");
      toast.success("Você entrou na agenda compartilhada!");
      onGroupChange();
    } catch (e: any) {
      toast.error(e.message || "Erro ao entrar no grupo");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave() {
    if (!grupo) return;
    const isOwner = grupo.dono_id === "mock-user-id" || localStorage.getItem("dev_mode") === "true" || confirm("Você é o dono deste grupo. Se sair, o grupo será excluído para todos. Tem certeza?");
    if (!isOwner && !confirm("Deseja mesmo sair desta agenda compartilhada?")) return;

    try {
      setSubmitting(true);
      await leaveGrupo(grupo.id);
      setGrupo(null);
      toast.success(isOwner ? "Grupo excluído" : "Você saiu do grupo");
      onGroupChange();
    } catch (e: any) {
      toast.error(e.message || "Erro ao sair do grupo");
    } finally {
      setSubmitting(false);
    }
  }

  const handleCopyCode = async () => {
    if (!grupo) return;
    try {
      await navigator.clipboard.writeText(grupo.codigo_convite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Código de convite copiado!");
    } catch {
      toast.error("Falha ao copiar o código.");
    }
  };

  if (loading) return null;

  return (
    <Card className="border border-border shadow-card overflow-hidden">
      <div className="h-1.5 gradient-primary w-full" />
      <CardContent className="p-5 sm:p-6">
        {grupo ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="font-semibold text-base">Agenda Compartilhada: {grupo.nome}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa que usar o código abaixo terá acesso a ler e editar esta mesma agenda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <div className="flex items-center border rounded-lg bg-muted/40 px-3 py-1.5 text-xs font-mono select-all">
                <span className="text-muted-foreground mr-1.5">Código:</span>
                <span className="font-bold text-foreground">{grupo.codigo_convite}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="h-8 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1.5">{copied ? "Copiado!" : "Copiar"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeave}
                disabled={submitting}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="ml-1.5">Sair da Agenda</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  Compartilhar Agenda
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Novo</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gostaria de ver e gerenciar os mesmos agendamentos com sua esposa ou outro membro da equipe? Escolha uma das opções abaixo:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Create Group */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/5">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Opção A: Criar novo compartilhamento</h4>
                  <p className="text-xs text-muted-foreground">
                    Crie um código de convite para permitir que outros acessem esta agenda.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Agenda Casal"
                    value={nomeGrupo}
                    onChange={(e) => setNomeGrupo(e.target.value)}
                    className="h-9 text-xs"
                    disabled={submitting}
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={submitting}
                    size="sm"
                    className="h-9 cursor-pointer gap-1 text-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar Grupo
                  </Button>
                </div>
              </div>

              {/* Option 2: Join Group */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/5">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Opção B: Entrar em agenda existente</h4>
                  <p className="text-xs text-muted-foreground">
                    Insira o código de convite enviado por quem criou o grupo.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: AGENDA-H2B4"
                    value={codigoConvite}
                    onChange={(e) => setCodigoConvite(e.target.value)}
                    className="h-9 text-xs font-mono uppercase"
                    disabled={submitting}
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={submitting}
                    size="sm"
                    variant="secondary"
                    className="h-9 cursor-pointer gap-1 text-xs shrink-0"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Entrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
