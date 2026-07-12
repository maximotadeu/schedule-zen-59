import { supabase } from "@/integrations/supabase/client";

export type Status = "em_aberto" | "pago";

export interface Agendamento {
  id: string;
  user_id: string;
  cliente: string;
  data_servico: string;
  hora_inicio: string;
  hora_fim: string;
  descricao: string | null;
  valor: number;
  status: Status;
  data_pagamento: string | null;
  servicos_adicionais: string[];
  created_at: string;
  updated_at: string;
}

export type NovoAgendamento = {
  cliente: string;
  data_servico: string;
  hora_inicio: string;
  hora_fim: string;
  descricao?: string;
  valor: number;
  status?: Status;
  servicos_adicionais?: string[];
};

function isDevMode(): boolean {
  return import.meta.env.DEV && localStorage.getItem("dev_mode") === "true";
}

const DEFAULT_MOCK_AGENDAMENTOS: Agendamento[] = [
  {
    id: "mock-1",
    user_id: "mock-user-id",
    cliente: "João da Silva",
    data_servico: new Date().toISOString().split("T")[0],
    hora_inicio: "09:00:00",
    hora_fim: "10:00:00",
    descricao: "Corte de cabelo e barba",
    valor: 50.00,
    status: "em_aberto",
    data_pagamento: null,
    servicos_adicionais: ["Barba"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    user_id: "mock-user-id",
    cliente: "Maria Souza",
    data_servico: new Date().toISOString().split("T")[0],
    hora_inicio: "11:00:00",
    hora_fim: "12:00:00",
    descricao: "Penteado e maquiagem",
    valor: 150.00,
    status: "pago",
    data_pagamento: new Date().toISOString(),
    servicos_adicionais: ["Maquiagem"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-3",
    user_id: "mock-user-id",
    cliente: "Pedro Santos",
    data_servico: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    hora_inicio: "14:00:00",
    hora_fim: "15:00:00",
    descricao: "Manicure",
    valor: 30.00,
    status: "em_aberto",
    data_pagamento: null,
    servicos_adicionais: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

function getLocalAgendamentos(): Agendamento[] {
  const data = localStorage.getItem("local_agendamentos");
  if (!data) {
    localStorage.setItem("local_agendamentos", JSON.stringify(DEFAULT_MOCK_AGENDAMENTOS));
    return DEFAULT_MOCK_AGENDAMENTOS;
  }
  return JSON.parse(data);
}

function saveLocalAgendamentos(list: Agendamento[]) {
  localStorage.setItem("local_agendamentos", JSON.stringify(list));
}

export async function listAgendamentos(): Promise<Agendamento[]> {
  if (isDevMode()) {
    const list = getLocalAgendamentos();
    return list.sort((a, b) => {
      const dateDiff = a.data_servico.localeCompare(b.data_servico);
      if (dateDiff !== 0) return dateDiff;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  }
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("data_servico", { ascending: true })
    .order("hora_inicio", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Agendamento[];
}

export async function createAgendamento(input: NovoAgendamento) {
  if (isDevMode()) {
    const list = getLocalAgendamentos();
    const novo: Agendamento = {
      id: "local-" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
      user_id: "mock-user-id",
      cliente: input.cliente,
      data_servico: input.data_servico,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      descricao: input.descricao ?? null,
      valor: input.valor,
      status: input.status ?? "em_aberto",
      data_pagamento: input.status === "pago" ? new Date().toISOString() : null,
      servicos_adicionais: input.servicos_adicionais ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.push(novo);
    saveLocalAgendamentos(list);
    return;
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Não autenticado");
  const { error } = await supabase.from("agendamentos").insert({
    ...input,
    user_id: userData.user.id,
  });
  if (error) throw error;
}

export async function updateAgendamento(id: string, input: NovoAgendamento) {
  if (isDevMode()) {
    const list = getLocalAgendamentos();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        cliente: input.cliente,
        data_servico: input.data_servico,
        hora_inicio: input.hora_inicio,
        hora_fim: input.hora_fim,
        descricao: input.descricao ?? null,
        valor: input.valor,
        servicos_adicionais: input.servicos_adicionais ?? [],
        updated_at: new Date().toISOString(),
      };
      saveLocalAgendamentos(list);
    }
    return;
  }
  const { error } = await supabase
    .from("agendamentos")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setStatus(id: string, status: Status) {
  if (isDevMode()) {
    const list = getLocalAgendamentos();
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      list[idx].data_pagamento = status === "em_aberto" ? null : new Date().toISOString();
      list[idx].updated_at = new Date().toISOString();
      saveLocalAgendamentos(list);
    }
    return;
  }
  const { error } = await supabase
    .from("agendamentos")
    .update({ status, data_pagamento: status === "em_aberto" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAgendamento(id: string) {
  if (isDevMode()) {
    const list = getLocalAgendamentos();
    const filtered = list.filter(item => item.id !== id);
    saveLocalAgendamentos(filtered);
    return;
  }
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  if (error) throw error;
}

export const currency = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });
