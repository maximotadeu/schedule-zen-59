import { useState, useEffect } from "react";
import {
  Users,
  Copy,
  Check,
  Plus,
  ArrowRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getGrupo, createGrupo, joinGrupo, leaveGrupo, type Grupo } from "@/lib/grupos";
import { supabase } from "@/integrations/supabase/client";
import { ProPlanModal } from "./ProPlanModal";
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
  const [isPro, setIsPro] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    fetchGrupo();
    checkPro();
  }, []);

  const checkPro = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      setIsPro(localStorage.getItem("dev_is_pro") === "true");
      setCurrentUserId("mock-user-id");
      return;
    }
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setCurrentUserId(userData.user.id);
        setIsPro(!!userData.user.user_metadata?.is_pro);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
    if (!isPro) {
      setShowProModal(true);
      return;
    }
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
    if (!isPro) {
      setShowProModal(true);
      return;
    }
    if (!codigoConvite.trim()) {
      toast.error("Por favor, insira o código de convite ou ID de perfil");
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
    const isOwner = grupo.dono_id === currentUserId || localStorage.getItem("dev_mode") === "true";
    
    if (isOwner) {
      if (!confirm("Você é o dono deste grupo. Se sair, o grupo será excluído para todos. Tem certeza?")) return;
    } else {
      if (!confirm("Deseja mesmo sair desta agenda compartilhada?")) return;
    }

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

  const handleCopyLink = async () => {
    if (!grupo) return;
    try {
      const inviteUrl = `${window.location.origin}/dashboard?convite=${grupo.codigo_convite}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link de convite copiado!");
    } catch {
      toast.error("Falha ao copiar o link.");
    }
  };

  if (loading) return null;

  return (
    <>
      <Card className="border border-border shadow-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 w-full" />
        <CardContent className="p-5 sm:p-6">
          {grupo ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Users className="h-4.5 w-4.5 text-indigo-600" />
                  </div>
                  <span className="font-semibold text-base">Agenda Compartilhada: {grupo.nome}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Copie o link abaixo para compartilhar o acesso de leitura e edição com outra pessoa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 cursor-pointer gap-1.5 border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Link Copiado!" : "Copiar Link de Convite"}</span>
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
                <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-1.5">
                    Compartilhar Agenda
                    {!isPro && (
                      <Badge variant="outline" className="text-[9px] px-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 flex items-center gap-0.5 font-semibold">
                        <Sparkles className="h-2.5 w-2.5 fill-purple-600 dark:fill-purple-400" />
                        Pro
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compartilhe a mesma agenda com sua esposa ou outro membro da equipe. Escolha uma das opções abaixo:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Option A */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/5">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Opção A: Criar novo compartilhamento</h4>
                    <p className="text-xs text-muted-foreground">
                      Cria uma agenda compartilhada e gera um link de convite.
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
                      className="h-9 cursor-pointer gap-1 text-xs shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar Grupo
                    </Button>
                  </div>
                </div>

                {/* Option B */}
                <div className="border rounded-lg p-4 space-y-3 bg-muted/5">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Opção B: Entrar em agenda existente</h4>
                    <p className="text-xs text-muted-foreground">
                      Insira o link de convite, código de convite ou ID de perfil.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: AGENDA-XXXX ou UUID"
                      value={codigoConvite}
                      onChange={(e) => setCodigoConvite(e.target.value)}
                      className="h-9 text-xs"
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

      <ProPlanModal
        open={showProModal}
        onOpenChange={setShowProModal}
        onSuccess={() => {
          setIsPro(true);
          toast.success("Plano Pro ativado! Você já pode compartilhar sua agenda.");
        }}
      />
    </>
  );
}
