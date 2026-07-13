import { type Agendamento } from "./agendamentos";

export interface ServicoAdicional {
  id: string;
  nome: string;
  preco_padrao: number;
}

export const SERVICOS_ADICIONAIS_MAP: Record<string, { label: string; preco: number }> = {
  "BBQ cleaning": { label: "Churrasqueira", preco: 15 },
  Churrasqueira: { label: "Churrasqueira", preco: 15 },
  "Window cleaning": { label: "Janelas", preco: 30 },
  Janelas: { label: "Janelas", preco: 30 },
  "Pressure wash": { label: "Pressure wash", preco: 50 },
  "Lawn mowing": { label: "Jardim", preco: 40 },
  Handyman: { label: "Manutenção", preco: 50 },
};

export function getAdditionalServiceInfo(serviceName: string): { label: string; preco: number } {
  const normalized = serviceName.trim();

  const priceMatch = normalized.match(/^(.*?)\s*\(\$?([\d.,]+)\)$/);
  if (priceMatch) {
    const label = priceMatch[1].trim();
    const preco = Number(priceMatch[2].replace(",", "."));
    return { label, preco };
  }

  if (SERVICOS_ADICIONAIS_MAP[normalized]) {
    return SERVICOS_ADICIONAIS_MAP[normalized];
  }

  const match = normalized.match(/\$?(\d+)/);
  if (match) {
    return { label: normalized, preco: Number(match[1]) };
  }
  return { label: normalized, preco: 15 };
}

export function getAgendamentoTotalValue(item: Agendamento): number {
  let total = Number(item.valor);
  if (item.servicos_adicionais && item.servicos_adicionais.length > 0) {
    item.servicos_adicionais.forEach((s) => {
      total += getAdditionalServiceInfo(s).preco;
    });
  }
  return total;
}
