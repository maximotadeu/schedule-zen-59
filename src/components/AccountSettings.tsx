import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdditionalServices } from "@/hooks/useAdditionalServices";
import { supabase } from "@/integrations/supabase/client";
import { getGrupo } from "@/lib/grupos";
import { currency } from "@/lib/agendamentos";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GrupoSetup } from "@/components/GrupoSetup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  UserCircle,
  KeyRound,
  ShieldCheck,
  ListChecks,
  Edit,
  Trash2,
  Plus,
  Upload,
  Loader2,
  LogOut,
} from "lucide-react";

interface AccountSettingsProps {
  onSignOut: () => void;
}

function getInitials(emailStr?: string) {
  if (!emailStr) return "U";
  return emailStr.substring(0, 2).toUpperCase();
}

export function AccountSettings({ onSignOut }: AccountSettingsProps) {
  const { user, isPro, avatarUrl, displayName, refresh } = useAuth();
  const qc = useQueryClient();
  const { servicos: servicosAdicionais, refetch: fetchServices } = useAdditionalServices();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [localDisplayName, setLocalDisplayName] = useState(displayName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [novoServicoNome, setNovoServicoNome] = useState("");
  const [novoServicoPreco, setNovoServicoPreco] = useState("");
  const [editandoServicoId, setEditandoServicoId] = useState<string | null>(null);
  const [editandoServicoNome, setEditandoServicoNome] = useState("");
  const [editandoServicoPreco, setEditandoServicoPreco] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const toggleProMutation = useMutation({
    mutationFn: async (nextProState: boolean) => {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        localStorage.setItem("dev_is_pro", nextProState ? "true" : "false");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        data: { is_pro: nextProState },
      });
      if (error) throw error;
    },
    onSuccess: (_d, nextProState) => {
      refresh();
      toast.success(nextProState ? "Modo Pro ativado!" : "Modo Pro desativado.");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao alternar Modo Pro."),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ser menor que 2MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          localStorage.setItem("dev_avatar", base64);
          toast.success("Foto de perfil atualizada!");
          refresh();
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userData.user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const { error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: base64 },
          });
          if (updateError) {
            toast.error(updateError.message);
          } else {
            toast.success("Foto de perfil atualizada!");
            refresh();
          }
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      toast.success("Foto de perfil atualizada com sucesso!");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localDisplayName.trim()) {
      toast.error("Digite um nome.");
      return;
    }
    setSavingName(true);
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        localStorage.setItem("dev_display_name", localDisplayName.trim());
        toast.success("Nome atualizado!");
        refresh();
        return;
      }
      const { error } = await supabase.auth.updateUser({
        data: { display_name: localDisplayName.trim() },
      });
      if (error) throw error;
      toast.success("Nome atualizado com sucesso!");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setUpdatingPassword(true);
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        toast.success("Senha alterada com sucesso (Simulação Dev)!");
        setNewPassword("");
        setConfirmPassword("");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar a senha.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleAddService = async () => {
    if (!novoServicoNome.trim() || !novoServicoPreco.trim()) {
      toast.error("Preencha todos os campos do serviço.");
      return;
    }
    const preco = Number(novoServicoPreco.replace(",", "."));
    if (isNaN(preco)) {
      toast.error("Preço padrão inválido.");
      return;
    }

    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const stored = localStorage.getItem("local_servicos_adicionais");
      const list = stored ? JSON.parse(stored) : [];
      const newService = {
        id: "local-" + Math.random().toString(36).substring(2, 9),
        nome: novoServicoNome.trim(),
        preco_padrao: preco,
      };
      list.push(newService);
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(list));
      setNovoServicoNome("");
      setNovoServicoPreco("");
      toast.success("Serviço adicionado!");
      fetchServices();
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");
      const group = await getGrupo();
      const { error } = await supabase.from("servicos_adicionais").insert({
        nome: novoServicoNome.trim(),
        preco_padrao: preco,
        user_id: userData.user.id,
        grupo_id: group ? group.id : null,
      });
      if (error) throw error;
      toast.success("Serviço adicionado com sucesso!");
      setNovoServicoNome("");
      setNovoServicoPreco("");
      fetchServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar serviço.");
    }
  };

  const handleUpdateService = async (id: string) => {
    if (!editandoServicoNome.trim() || !editandoServicoPreco.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const preco = Number(editandoServicoPreco.replace(",", "."));
    if (isNaN(preco)) {
      toast.error("Preço padrão inválido.");
      return;
    }

    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const stored = localStorage.getItem("local_servicos_adicionais");
      const list = stored ? JSON.parse(stored) : [];
      const updated = list.map((s: Record<string, unknown>) =>
        s.id === id ? { ...s, nome: editandoServicoNome.trim(), preco_padrao: preco } : s,
      );
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(updated));
      setEditandoServicoId(null);
      toast.success("Serviço atualizado!");
      fetchServices();
      return;
    }

    try {
      const { error } = await supabase
        .from("servicos_adicionais")
        .update({ nome: editandoServicoNome.trim(), preco_padrao: preco })
        .eq("id", id);
      if (error) throw error;
      toast.success("Serviço atualizado com sucesso!");
      setEditandoServicoId(null);
      fetchServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar serviço.");
    }
  };

  const confirmDeleteService = (id: string) => {
    setServiceToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeleteConfirmOpen(false);

    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const stored = localStorage.getItem("local_servicos_adicionais");
      const list = stored ? JSON.parse(stored) : [];
      const filtered = list.filter((s: Record<string, unknown>) => s.id !== serviceToDelete);
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(filtered));
      setServiceToDelete(null);
      toast.success("Serviço excluído!");
      fetchServices();
      return;
    }

    try {
      const { error } = await supabase
        .from("servicos_adicionais")
        .delete()
        .eq("id", serviceToDelete);
      if (error) throw error;
      toast.success("Serviço excluído com sucesso!");
      setServiceToDelete(null);
      fetchServices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir serviço.");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="shadow-card border border-border">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Minha Conta
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie sua foto de perfil, nome e senha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 bg-muted/20 border rounded-xl">
              <div className="relative self-center sm:self-auto">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-lg text-primary border-2 border-dashed border-primary/20">
                    {getInitials(user?.email)}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-background/70 rounded-2xl flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1.5 flex-1">
                <span className="font-bold text-sm text-foreground block">Foto de Perfil</span>
                <span className="text-[10px] text-muted-foreground block">
                  JPG, PNG ou WebP. Máximo 2MB.
                </span>
                <div className="flex justify-center sm:justify-start pt-1">
                  <label className="h-8 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Escolher Imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-3 border-t pt-4">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <UserCircle className="h-4.5 w-4.5 text-primary" />
                Nome de Exibição
              </span>
              <div className="flex gap-2">
                <Input
                  placeholder="Seu nome..."
                  value={localDisplayName}
                  onChange={(e) => setLocalDisplayName(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingName}
                  className="h-9 cursor-pointer"
                >
                  {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Salvar
                </Button>
              </div>
            </form>

            <form onSubmit={handlePasswordChange} className="space-y-4 border-t pt-4">
              <span className="font-bold text-sm text-foreground block flex items-center gap-1.5">
                <KeyRound className="h-4.5 w-4.5 text-primary" />
                Alterar Senha
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs"
                    minLength={6}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-xs"
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingPassword}
                  className="cursor-pointer"
                >
                  {updatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Atualizar Senha
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-card border border-border">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Serviços Adicionais Cadastrados
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie o catálogo de serviços extras oferecidos no seu checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-2 bg-muted/10 p-3.5 rounded-xl border border-dashed">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="crud-nome">Nome do Serviço</Label>
                <Input
                  id="crud-nome"
                  placeholder="Ex: Limpeza Churrasqueira"
                  value={novoServicoNome}
                  onChange={(e) => setNovoServicoNome(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid gap-1.5 w-full sm:w-28">
                <Label htmlFor="crud-preco">Preço Padrão ($)</Label>
                <Input
                  id="crud-preco"
                  type="number"
                  placeholder="15.00"
                  value={novoServicoPreco}
                  onChange={(e) => setNovoServicoPreco(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddService}
                className="sm:self-end h-9 cursor-pointer gap-1"
              >
                <Plus className="h-4 w-4" />
                Cadastrar
              </Button>
            </div>

            <div className="border rounded-xl divide-y bg-muted/5 max-h-[300px] overflow-y-auto">
              {servicosAdicionais.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-medium">
                  Nenhum serviço adicional cadastrado.
                </div>
              ) : (
                servicosAdicionais.map((s) => {
                  const isEditing = editandoServicoId === s.id;
                  return (
                    <div key={s.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      {isEditing ? (
                        <div className="flex flex-1 gap-2">
                          <Input
                            value={editandoServicoNome}
                            onChange={(e) => setEditandoServicoNome(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Input
                            type="number"
                            value={editandoServicoPreco}
                            onChange={(e) => setEditandoServicoPreco(e.target.value)}
                            className="h-8 text-xs w-20 text-center"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateService(s.id)}
                            className="h-8 cursor-pointer"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditandoServicoId(null)}
                            className="h-8 cursor-pointer"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground">{s.nome}</span>
                          </div>
                          <div className="flex items-center gap-3.5">
                            <span className="font-bold text-amber-600">
                              {currency(s.preco_padrao)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditandoServicoId(s.id);
                                  setEditandoServicoNome(s.nome);
                                  setEditandoServicoPreco(String(s.preco_padrao));
                                }}
                                className="h-7 w-7 p-0 cursor-pointer hover:bg-muted"
                              >
                                <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => confirmDeleteService(s.id)}
                                className="h-7 w-7 p-0 cursor-pointer hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <GrupoSetup onGroupChange={() => qc.invalidateQueries({ queryKey: ["agendamentos"] })} />

        <Card className="shadow-card border border-border overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500 w-full" />
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              Assinatura e Recursos Pro
            </CardTitle>
            <CardDescription className="text-xs">
              Verifique seu plano ou simule o status Pro para testar os bloqueios freemium.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Plano Atual</span>
              <p className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                {isPro ? (
                  <>
                    <Badge
                      variant="outline"
                      className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 font-bold"
                    >
                      Plano Pro Ativo
                    </Badge>
                    <span className="text-xs font-normal text-muted-foreground">
                      Acesso ilimitado
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="font-bold">
                      Plano Gratuito
                    </Badge>
                    <span className="text-xs font-normal text-muted-foreground">
                      Recursos limitados
                    </span>
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={() => toggleProMutation.mutate(!isPro)}
              disabled={toggleProMutation.isPending}
              className="h-9 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm shrink-0"
            >
              {toggleProMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {isPro ? "Mudar para Plano Gratuito (Testar)" : "Assinar Plano Pro (Simular)"}
            </Button>
          </CardContent>
        </Card>

        <div className="block md:hidden">
          <Button
            onClick={onSignOut}
            className="w-full bg-destructive/10 text-destructive hover:bg-destructive/15 h-10 gap-2 border-none"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sair da Conta</span>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir serviço adicional"
        description="Tem certeza que deseja excluir este serviço adicional?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDeleteService}
      />
    </>
  );
}
