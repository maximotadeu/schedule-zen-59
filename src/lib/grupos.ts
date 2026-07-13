import { supabase } from "@/integrations/supabase/client";

export interface Grupo {
  id: string;
  nome: string;
  codigo_convite: string;
  dono_id: string;
  created_at: string;
}

function isDevMode(): boolean {
  return import.meta.env.DEV && localStorage.getItem("dev_mode") === "true";
}

function getLocalGrupo(): Grupo | null {
  const data = localStorage.getItem("local_grupo");
  return data ? JSON.parse(data) : null;
}

function setLocalGrupo(grupo: Grupo | null) {
  if (grupo) {
    localStorage.setItem("local_grupo", JSON.stringify(grupo));
  } else {
    localStorage.removeItem("local_grupo");
  }
}

export async function getGrupo(): Promise<Grupo | null> {
  if (isDevMode()) {
    return getLocalGrupo();
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  try {
    // Check if the user is owner of a group
    const { data: ownGroup } = await supabase
      .from("grupos")
      .select("*")
      .eq("dono_id", userData.user.id)
      .maybeSingle();

    if (ownGroup) return ownGroup as unknown as Grupo;

    // Check if the user is member of a group
    const { data: memberOf } = await supabase
      .from("grupo_membros")
      .select("grupo_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (memberOf && memberOf.grupo_id) {
      const { data: group } = await supabase
        .from("grupos")
        .select("*")
        .eq("id", memberOf.grupo_id)
        .maybeSingle();

      if (group) return group as unknown as Grupo;
    }
  } catch (e) {
    console.error("Erro ao buscar grupo do Supabase. Certifique-se de aplicar as migrations.", e);
  }

  return null;
}

export async function createGrupo(nome: string): Promise<Grupo> {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cleanName = nome
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const code = `${cleanName || "AGENDA"}-${randomSuffix}`;

  if (isDevMode()) {
    const novo: Grupo = {
      id: "local-group-id",
      nome,
      codigo_convite: code,
      dono_id: "mock-user-id",
      created_at: new Date().toISOString(),
    };
    setLocalGrupo(novo);
    return novo;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");

  // Insert group
  const { data: group, error: groupError } = await supabase
    .from("grupos")
    .insert({
      nome,
      codigo_convite: code,
      dono_id: userData.user.id,
    })
    .select()
    .single();

  if (groupError) throw groupError;

  // Insert the owner into members table
  const { error: memberError } = await supabase.from("grupo_membros").insert({
    grupo_id: group.id,
    user_id: userData.user.id,
  });

  if (memberError) throw memberError;

  // Associate all current user's agendamentos with this group
  await supabase
    .from("agendamentos")
    .update({ grupo_id: group.id })
    .eq("user_id", userData.user.id)
    .is("grupo_id", null);

  return group as unknown as Grupo;
}

export async function joinGrupo(codigo: string): Promise<Grupo> {
  const cleanCode = codigo.trim().toUpperCase();

  if (isDevMode()) {
    const mockGroup: Grupo = {
      id: "local-group-id",
      nome: "Grupo Compartilhado (Local)",
      codigo_convite: cleanCode,
      dono_id: "other-user-id",
      created_at: new Date().toISOString(),
    };
    setLocalGrupo(mockGroup);
    return mockGroup;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");

  // Find the group with code
  const { data: group, error: findError } = await supabase
    .from("grupos")
    .select("*")
    .eq("codigo_convite", cleanCode)
    .maybeSingle();

  if (findError) throw findError;
  if (!group) throw new Error("Código de convite inválido ou grupo não encontrado");

  // Insert membership
  const { error: joinError } = await supabase.from("grupo_membros").insert({
    grupo_id: group.id,
    user_id: userData.user.id,
  });

  if (joinError && !joinError.message.includes("duplicate key")) throw joinError;

  // Associate all current user's agendamentos with this group
  await supabase
    .from("agendamentos")
    .update({ grupo_id: group.id })
    .eq("user_id", userData.user.id)
    .is("grupo_id", null);

  return group as unknown as Grupo;
}

export async function leaveGrupo(grupoId: string): Promise<void> {
  if (isDevMode()) {
    setLocalGrupo(null);
    return;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");

  // Delete membership
  const { error: leaveError } = await supabase
    .from("grupo_membros")
    .delete()
    .eq("grupo_id", grupoId)
    .eq("user_id", userData.user.id);

  if (leaveError) throw leaveError;

  // Check if the user is owner
  const { data: ownGroup } = await supabase
    .from("grupos")
    .select("id")
    .eq("id", grupoId)
    .eq("dono_id", userData.user.id)
    .maybeSingle();

  if (ownGroup) {
    const { error: deleteGroupError } = await supabase.from("grupos").delete().eq("id", grupoId);

    if (deleteGroupError) throw deleteGroupError;
  }
}
