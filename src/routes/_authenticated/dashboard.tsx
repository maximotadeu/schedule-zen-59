import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAgendamentos,
  listFolgas,
  setStatus,
  deleteAgendamento,
  deleteFolga,
  isFolga,
  currency,
  type Agendamento,
} from "@/lib/agendamentos";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NovoAgendamentoDialog } from "@/components/NovoAgendamentoDialog";
import { CalendarView } from "@/components/CalendarView";
import { CobrancaDialog } from "@/components/CobrancaDialog";
import { FotosDialog } from "@/components/FotosDialog";
import { GrupoSetup } from "@/components/GrupoSetup";
import { RelatoriosView } from "@/components/RelatoriosView";
import { ClientesView } from "@/components/ClientesView";
import { ProPlanModal } from "@/components/ProPlanModal";
import { MarcarFolgaDialog } from "@/components/MarcarFolgaDialog";
import { getGrupo, joinGrupo } from "@/lib/grupos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Search,
  Wallet,
  TrendingUp,
  ListChecks,
  LogOut,
  Undo2,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  List,
  Pencil,
  Camera,
  MoreHorizontal,
  Plus,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  User,
  UserCircle,
  KeyRound,
  ShieldCheck,
  Edit,
  Upload,
  Loader2,
  Palmtree,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Filter = "all" | "em_aberto" | "pago";
type MainTab = "agenda" | "financeiro" | "clientes" | "configuracoes";

interface ServicoAdicional {
  id: string;
  nome: string;
  preco_padrao: number;
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<MainTab>("agenda");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Profile metadata states
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Dynamic services CRUD states
  const [servicosAdicionais, setServicosAdicionais] = useState<ServicoAdicional[]>([]);
  const [novoServicoNome, setNovoServicoNome] = useState("");
  const [novoServicoPreco, setNovoServicoPreco] = useState("");
  const [editandoServicoId, setEditandoServicoId] = useState<string | null>(null);
  const [editandoServicoNome, setEditandoServicoNome] = useState("");
  const [editandoServicoPreco, setEditandoServicoPreco] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: listAgendamentos,
  });

  const { data: folgas = [] } = useQuery({
    queryKey: ["folgas"],
    queryFn: listFolgas,
  });

  // Filter out folga items for financial/list views
  const realItems = useMemo(() => items.filter((i) => !isFolga(i)), [items]);

  const stats = useMemo(() => {
    const aReceber = realItems.filter((i) => i.status === "em_aberto").reduce((s, i) => s + Number(i.valor), 0);
    const recebido = realItems.filter((i) => i.status === "pago").reduce((s, i) => s + Number(i.valor), 0);
    return { aReceber, recebido, total: realItems.length };
  }, [realItems]);

  const filtered = useMemo(() => {
    const list = realItems.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (search && !i.cliente.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return list.sort((a, b) => {
      const dateDiff = b.data_servico.localeCompare(a.data_servico);
      if (dateDiff !== 0) return dateDiff;
      return b.hora_inicio.localeCompare(a.hora_inicio);
    });
  }, [realItems, filter, search]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    return filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filtered, page]);

  // Handle invite links (?convite=CODIGO) automatically
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convite = params.get("convite");
    if (convite) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleAutoJoin(convite);
    }
  }, []);

  const handleAutoJoin = async (codigo: string) => {
    try {
      toast.loading("Entrando na agenda compartilhada...");
      await joinGrupo(codigo);
      toast.dismiss();
      toast.success("Você entrou na agenda compartilhada!");
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      loadUserInfo();
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Erro ao entrar na agenda compartilhada.");
    }
  };

  const loadUserInfo = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      setUser({ email: "dev@local.com", user_metadata: {} });
      setIsPro(localStorage.getItem("dev_is_pro") === "true");
      setAvatarUrl(localStorage.getItem("dev_avatar"));
      setDisplayName(localStorage.getItem("dev_display_name") || "");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setUser(userData.user);
        setIsPro(!!userData.user.user_metadata?.is_pro);
        setAvatarUrl(userData.user.user_metadata?.avatar_url || null);
        setDisplayName(userData.user.user_metadata?.display_name || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchServices = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const stored = localStorage.getItem("local_servicos_adicionais");
      if (stored) {
        setServicosAdicionais(JSON.parse(stored));
      } else {
        const defaults = [
          { id: "d1", nome: "Limpeza de Churrasqueira", preco_padrao: 15 },
          { id: "d2", nome: "Janelas", preco_padrao: 30 },
          { id: "d3", nome: "Lawn mowing", preco_padrao: 40 },
          { id: "d4", nome: "Pressure wash", preco_padrao: 50 },
          { id: "d5", nome: "Handyman", preco_padrao: 50 }
        ];
        localStorage.setItem("local_servicos_adicionais", JSON.stringify(defaults));
        setServicosAdicionais(defaults);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("servicos_adicionais")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      setServicosAdicionais(data || []);
    } catch (e) {
      console.error("Erro ao carregar servicos adicionais:", e);
    }
  };

  useEffect(() => {
    loadUserInfo();
    fetchServices();
  }, []);

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "em_aberto" | "pago" }) => setStatus(id, status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success(v.status === "pago" ? "Marcado como pago" : "Revertido para Em Aberto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAgendamento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      toast.success("Agendamento removido");
    },
  });

  const handleRemoveFolga = async (dateStr: string) => {
    try {
      await deleteFolga(dateStr);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["folgas"] });
      toast.success("Folga removida!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover folga.");
    }
  };

  const signOut = async () => {
    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      localStorage.removeItem("dev_mode");
      localStorage.removeItem("dev_is_pro");
      localStorage.removeItem("dev_avatar");
      localStorage.removeItem("dev_display_name");
      navigate({ to: "/auth" });
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

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
          setAvatarUrl(base64);
          toast.success("Foto de perfil atualizada!");
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${userData.user.id}/avatar.${fileExt}`;

      // Try Supabase Storage first
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // Fallback to base64 in user_metadata
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const { error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: base64 }
          });
          if (updateError) {
            toast.error(updateError.message);
          } else {
            setAvatarUrl(base64);
            toast.success("Foto de perfil atualizada!");
          }
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Foto de perfil atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar foto de perfil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Display Name Save Logic
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Digite um nome.");
      return;
    }
    setSavingName(true);
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        localStorage.setItem("dev_display_name", displayName.trim());
        toast.success("Nome atualizado!");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });
      if (error) throw error;
      toast.success("Nome atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar o nome.");
    } finally {
      setSavingName(false);
    }
  };

  // Password Change Logic
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

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar a senha.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Dynamic services CRUD Handlers
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
      const list = [...servicosAdicionais];
      const newService = {
        id: "local-" + Math.random().toString(36).substring(2, 9),
        nome: novoServicoNome.trim(),
        preco_padrao: preco
      };
      list.push(newService);
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(list));
      setServicosAdicionais(list);
      setNovoServicoNome("");
      setNovoServicoPreco("");
      toast.success("Serviço adicionado!");
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
        grupo_id: group ? group.id : null
      });

      if (error) throw error;
      toast.success("Serviço adicionado com sucesso!");
      setNovoServicoNome("");
      setNovoServicoPreco("");
      fetchServices();
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar serviço.");
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
      const list = servicosAdicionais.map(s => s.id === id ? { ...s, nome: editandoServicoNome.trim(), preco_padrao: preco } : s);
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(list));
      setServicosAdicionais(list);
      setEditandoServicoId(null);
      toast.success("Serviço atualizado!");
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
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar serviço.");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço adicional?")) return;

    if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
      const list = servicosAdicionais.filter(s => s.id !== id);
      localStorage.setItem("local_servicos_adicionais", JSON.stringify(list));
      setServicosAdicionais(list);
      toast.success("Serviço excluído!");
      return;
    }

    try {
      const { error } = await supabase
        .from("servicos_adicionais")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Serviço excluído com sucesso!");
      fetchServices();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir serviço.");
    }
  };

  // Toggle Pro plan directly for testing
  const toggleProSimulated = async () => {
    const nextProState = !isPro;
    try {
      if (import.meta.env.DEV && localStorage.getItem("dev_mode") === "true") {
        localStorage.setItem("dev_is_pro", nextProState ? "true" : "false");
        setIsPro(nextProState);
        toast.success(nextProState ? "Modo Pro ativado localmente!" : "Modo Pro desativado.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: { is_pro: nextProState }
      });
      if (error) throw error;
      setIsPro(nextProState);
      toast.success(nextProState ? "Modo Pro ativado com sucesso!" : "Modo Pro desativado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao alternar Modo Pro.");
    }
  };

  const getInitials = (emailStr?: string) => {
    if (!emailStr) return "U";
    return emailStr.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-16 md:pb-0">
      
      {/* Desktop Navigation Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card p-6 gap-6 shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
            <CalendarClock className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground truncate">AgendaPro</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {isPro ? "Plano Pro" : "Plano Gratuito"}
            </p>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex flex-col gap-1.5 flex-1">
          <button
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "agenda" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Calendar className="h-4.5 w-4.5" />
            <span>Agenda</span>
          </button>
          
          <button
            onClick={() => setActiveTab("financeiro")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "financeiro" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <BarChart3 className="h-4.5 w-4.5" />
            <span>Financeiro</span>
          </button>
          
          <button
            onClick={() => setActiveTab("clientes")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "clientes" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            <span>Clientes</span>
          </button>

          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === "configuracoes" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <Settings className="h-4.5 w-4.5" />
            <span>Configurações</span>
          </button>
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="pt-4 border-t flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-9 w-9 rounded-xl object-cover border" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                {getInitials(user?.email)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user?.email || "Carregando..."}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 h-9 border border-border">
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="text-destructive font-medium">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Layout Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3.5 border-b bg-card w-full sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-primary">
              <CalendarClock className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground truncate">AgendaPro</span>
          </div>
          
          <div className="flex items-center gap-3">
            {isPro ? (
              <Badge variant="outline" className="text-[9px] px-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 font-bold">PRO</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] px-1.5 font-bold">GRÁTIS</Badge>
            )}
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-7 w-7 rounded-lg object-cover border" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary">
                {getInitials(user?.email)}
              </div>
            )}
          </div>
        </header>

        {/* Content viewport area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          
          {/* ═══════════════ TAB 1: AGENDA (Calendar Only) ═══════════════ */}
          {activeTab === "agenda" && (
            <div className="space-y-4">
              {/* Compact toolbar: action buttons only */}
              <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-2">
                <NovoAgendamentoDialog
                  trigger={
                    <Button
                      size="default"
                      className="gradient-primary text-primary-foreground shadow-elevated hover:opacity-95 cursor-pointer w-full h-10 px-4 py-2 text-sm sm:h-9 sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Novo Agendamento</span>
                    </Button>
                  }
                />
                <MarcarFolgaDialog
                  trigger={
                    <Button
                      size="default"
                      variant="outline"
                      className="gap-2 cursor-pointer w-full h-10 px-4 py-2 text-sm sm:h-9 sm:w-auto border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <Palmtree className="h-4 w-4" />
                      <span>Marcar Folga</span>
                    </Button>
                  }
                />
              </div>

              {/* Calendar as the main and only view */}
              <CalendarView
                items={items}
                folgas={folgas}
                onToggleStatus={(id, status) => toggle.mutate({ id, status })}
                onDeleteAgendamento={(id) => remove.mutate(id)}
                onRemoveFolga={handleRemoveFolga}
              />
            </div>
          )}

          {/* ═══════════════ TAB 2: FINANCEIRO ═══════════════ */}
          {activeTab === "financeiro" && (
            <div className="space-y-6">
              {/* Stats Summary Panel (moved from Agenda) */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Total a Receber"
                  value={currency(stats.aReceber)}
                  icon={<Wallet className="h-5 w-5" />}
                  accent="warning"
                />
                <StatCard
                  label="Total Recebido"
                  value={currency(stats.recebido)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent="success"
                />
                <StatCard
                  label="Total de Agendamentos"
                  value={String(stats.total)}
                  icon={<ListChecks className="h-5 w-5" />}
                  accent="primary"
                />
              </section>

              {/* Detailed reports */}
              <RelatoriosView items={realItems} />

              {/* Service History List (moved from Agenda) */}
              <Card className="shadow-card border border-border">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" />
                    Histórico de Serviços
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Lista detalhada de todos os agendamentos com filtros e busca.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                      <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="all" className="flex-1 sm:flex-none">Todos</TabsTrigger>
                        <TabsTrigger value="em_aberto" className="flex-1 sm:flex-none">Em Aberto</TabsTrigger>
                        <TabsTrigger value="pago" className="flex-1 sm:flex-none">Pagos</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="relative w-full sm:w-64">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar cliente…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full h-9"
                      />
                    </div>
                  </div>

                  {/* Cobrar button */}
                  <div className="flex justify-end">
                    <CobrancaDialog
                      items={realItems}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-green-500/30 text-green-600 hover:text-green-700 hover:bg-green-50 cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Cobrar via WhatsApp</span>
                        </Button>
                      }
                    />
                  </div>

                  {/* Paginated list */}
                  {isLoading ? (
                    <p className="text-center text-muted-foreground py-12">Carregando…</p>
                  ) : filtered.length === 0 ? (
                    <div className="py-12 text-center">
                      <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="mt-3 font-medium">Nenhum agendamento encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedItems.map((a) => (
                        <AgendamentoRow
                          key={a.id}
                          a={a}
                          onToggle={(status) => toggle.mutate({ id: a.id, status })}
                          onDelete={() => {
                            if (confirm(`Excluir agendamento de ${a.cliente}?`)) remove.mutate(a.id);
                          }}
                        />
                      ))}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-4 pb-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="cursor-pointer"
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground font-medium">
                            Página {page} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="cursor-pointer"
                          >
                            Próxima
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: Clientes */}
          {activeTab === "clientes" && (
            <ClientesView items={realItems} />
          )}

          {/* TAB 4: Configurações */}
          {activeTab === "configuracoes" && (
            <div className="space-y-6">
              
              {/* Account management card */}
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
                  {/* Photo Profile update */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 bg-muted/20 border rounded-xl">
                    <div className="relative self-center sm:self-auto">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/20" />
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
                      <span className="text-[10px] text-muted-foreground block">JPG, PNG ou WebP. Máximo 2MB.</span>
                      <div className="flex justify-center sm:justify-start pt-1">
                        <label className="h-8 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Escolher Imagem</span>
                          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <form onSubmit={handleSaveName} className="space-y-3 border-t pt-4">
                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <UserCircle className="h-4.5 w-4.5 text-primary" />
                      Nome de Exibição
                    </span>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Seu nome..."
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-9 text-xs flex-1"
                      />
                      <Button type="submit" size="sm" disabled={savingName} className="h-9 cursor-pointer">
                        {savingName && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </form>

                  {/* Password Reset form */}
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
                      <Button type="submit" size="sm" disabled={updatingPassword} className="cursor-pointer">
                        {updatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Atualizar Senha
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Dynamic services CRUD Management Card */}
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
                  
                  {/* Add form */}
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
                    <Button type="button" onClick={handleAddService} className="sm:self-end h-9 cursor-pointer gap-1">
                      <Plus className="h-4 w-4" />
                      Cadastrar
                    </Button>
                  </div>

                  {/* List/Table */}
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
                                <Button size="sm" onClick={() => handleUpdateService(s.id)} className="h-8 cursor-pointer">Salvar</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditandoServicoId(null)} className="h-8 cursor-pointer">Cancelar</Button>
                              </div>
                            ) : (
                              <>
                                <div className="min-w-0">
                                  <span className="font-bold text-foreground">{s.nome}</span>
                                </div>
                                <div className="flex items-center gap-3.5">
                                  <span className="font-bold text-amber-600">{currency(s.preco_padrao)}</span>
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
                                      onClick={() => handleDeleteService(s.id)}
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

              {/* Invite Code Shared Management */}
              <GrupoSetup onGroupChange={() => qc.invalidateQueries({ queryKey: ["agendamentos"] })} />

              {/* Freemium settings Simulation card */}
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
                          <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-50/10 font-bold">Plano Pro Ativo</Badge>
                          <span className="text-xs font-normal text-muted-foreground">Acesso ilimitado</span>
                        </>
                      ) : (
                        <>
                          <Badge variant="secondary" className="font-bold">Plano Gratuito</Badge>
                          <span className="text-xs font-normal text-muted-foreground">Recursos limitados</span>
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={toggleProSimulated}
                    className="h-9 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm shrink-0"
                  >
                    {isPro ? "Mudar para Plano Gratuito (Testar)" : "Assinar Plano Pro (Simular)"}
                  </Button>
                </CardContent>
              </Card>

              {/* Mobile Sair Button */}
              <div className="block md:hidden">
                <Button onClick={signOut} className="w-full bg-destructive/10 text-destructive hover:bg-destructive/15 h-10 gap-2 border-none">
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Sair da Conta</span>
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Fixed Bottom Navigation Bar (Mobile-only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur-md pb-safe-bottom z-20 flex items-center justify-around h-16 shadow-lg">
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === "agenda" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Calendar className="h-5.5 w-5.5" />
          <span>Agenda</span>
        </button>
        
        <button
          onClick={() => setActiveTab("financeiro")}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === "financeiro" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-5.5 w-5.5" />
          <span>Financeiro</span>
        </button>
        
        <button
          onClick={() => setActiveTab("clientes")}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === "clientes" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="h-5.5 w-5.5" />
          <span>Clientes</span>
        </button>

        <button
          onClick={() => setActiveTab("configuracoes")}
          className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === "configuracoes" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Settings className="h-5.5 w-5.5" />
          <span>Ajustes</span>
        </button>
      </nav>

      <ProPlanModal
        open={showProModal}
        onOpenChange={setShowProModal}
        onSuccess={() => {
          setIsPro(true);
          loadUserInfo();
        }}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "success" | "warning";
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-amber-600",
  };

  return (
    <Card className="shadow-card border border-border">
      <CardContent className="p-4 sm:p-5 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accentClasses[accent]}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

interface AgendamentoRowProps {
  a: Agendamento;
  onToggle: (status: "em_aberto" | "pago") => void;
  onDelete: () => void;
}

function AgendamentoRow({ a, onToggle, onDelete }: AgendamentoRowProps) {
  const isPago = a.status === "pago";

  return (
    <Card className="shadow-card border border-border hover:border-muted-foreground/20 transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-base text-foreground">{a.cliente}</h3>
              <Badge
                variant="outline"
                className={`text-[9px] font-bold px-1.5 ${
                  isPago ? "border-success text-success bg-success/5" : "border-warning text-amber-600 bg-warning/5"
                }`}
              >
                {isPago ? "Pago" : "Em aberto"}
              </Badge>
            </div>
            
            <div className="grid gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {format(parseISO(a.data_servico), "dd/MM/yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {a.hora_inicio.slice(0, 5)} - {a.hora_fim.slice(0, 5)}
              </span>
              {a.descricao && (
                <span className="flex items-center gap-1.5 truncate max-w-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {a.descricao}
                </span>
              )}
            </div>

            {a.servicos_adicionais && a.servicos_adicionais.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {a.servicos_adicionais.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] font-normal px-2 py-0.5 border bg-muted/40">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t pt-3 sm:border-0 sm:pt-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-muted-foreground font-medium block">Valor</span>
              <span className="font-extrabold text-lg text-foreground">{currency(a.valor)}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {isPago ? (
                <Button size="sm" variant="ghost" onClick={() => onToggle("em_aberto")} className="h-8 w-8 p-0 cursor-pointer">
                  <Undo2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => onToggle("pago")} className="h-8 w-8 p-0 bg-success text-success-foreground hover:bg-success/90 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <NovoAgendamentoDialog
                    agendamento={a}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    }
                  />
                  <FotosDialog
                    agendamento={a}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2">
                        <Camera className="h-4 w-4 text-blue-500" />
                        Fotos
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
