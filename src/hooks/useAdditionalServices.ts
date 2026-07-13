import { useState, useEffect, useCallback } from "react";
import type { ServicoAdicional } from "@/lib/services-utils";
import { supabase } from "@/integrations/supabase/client";

function isDevModeActive(): boolean {
  return import.meta.env.DEV && localStorage.getItem("dev_mode") === "true";
}

const DEV_DEFAULTS: ServicoAdicional[] = [
  { id: "d1", nome: "Limpeza de Churrasqueira", preco_padrao: 15 },
  { id: "d2", nome: "Janelas", preco_padrao: 30 },
  { id: "d3", nome: "Lawn mowing", preco_padrao: 40 },
  { id: "d4", nome: "Pressure wash", preco_padrao: 50 },
  { id: "d5", nome: "Handyman", preco_padrao: 50 },
];

export function useAdditionalServices() {
  const [servicos, setServicos] = useState<ServicoAdicional[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    if (isDevModeActive()) {
      const stored = localStorage.getItem("local_servicos_adicionais");
      if (stored) {
        setServicos(JSON.parse(stored));
      } else {
        localStorage.setItem("local_servicos_adicionais", JSON.stringify(DEV_DEFAULTS));
        setServicos(DEV_DEFAULTS);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("servicos_adicionais")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      setServicos((data as ServicoAdicional[]) || []);
    } catch (e) {
      console.error("Erro ao carregar serviços adicionais:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { servicos, loading, refetch: fetch };
}
