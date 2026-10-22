// ============================================================================
// Painel de leads (Modo Visitante) — contas puras: funil, convites para o
// WhatsApp e planilha (CSV). Nada aqui faz rede.
// ============================================================================

export type StatusLead = "novo" | "em_conversa" | "interessado" | "sem_interesse" | "virou_aluno";
export const STATUS_LEAD: Record<StatusLead, string> = {
  novo: "Novo",
  em_conversa: "Em conversa",
  interessado: "Interessado",
  sem_interesse: "Sem interesse",
  virou_aluno: "Virou aluno",
};

export type Lead = {
  id: string;
  nome: string;
  email: string | null;
  cadastroEm: string;
  convite: string | null;
  origem: string | null;
  desafio: string | null;
  acessoFim: string | null;
  onboarding: boolean;
  objetivo: string | null;
  treinosFeitos: number;
  ultimoTreino: string | null;
  whatsapp: { ref: string; em: string } | null;
  status: StatusLead;
  anotacao: string | null;
  convertido: boolean;
};

export type EtapaFunil = { etapa: string; total: number; pct: number | null };

/** Funil: entrou → respondeu → 1º treino → 3+ treinos → tocou no WhatsApp → virou aluno. */
export function funil(leads: Lead[]): EtapaFunil[] {
  const n = leads.length;
  const etapas: Array<[string, number]> = [
    ["Entraram pelo convite", n],
    ["Responderam as boas-vindas", leads.filter((l) => l.onboarding).length],
    ["Fizeram o 1º treino", leads.filter((l) => l.treinosFeitos >= 1).length],
    ["Fizeram 3 treinos ou mais", leads.filter((l) => l.treinosFeitos >= 3).length],
    ["Tocaram no WhatsApp", leads.filter((l) => l.whatsapp).length],
    ["Viraram alunos", leads.filter((l) => l.convertido || l.status === "virou_aluno").length],
  ];
  return etapas.map(([etapa, total]) => ({ etapa, total, pct: n ? Math.round((total / n) * 100) : null }));
}

export type EventoCtaPainel = { cta: string; tipo: "exibido" | "clicado" | "dispensado" };
export type ResumoCta = { cta: string; exibidos: number; clicados: number; dispensados: number; taxa: number | null };

/** Desempenho de cada convite: quantas vezes apareceu, foi tocado e dispensado. */
export function resumoCtas(eventos: EventoCtaPainel[]): ResumoCta[] {
  const m = new Map<string, ResumoCta>();
  for (const e of eventos) {
    const r = m.get(e.cta) ?? { cta: e.cta, exibidos: 0, clicados: 0, dispensados: 0, taxa: null };
    if (e.tipo === "exibido") r.exibidos++;
    else if (e.tipo === "clicado") r.clicados++;
    else r.dispensados++;
    m.set(e.cta, r);
  }
  return [...m.values()].map((r) => ({ ...r, taxa: r.exibidos ? Math.round((r.clicados / r.exibidos) * 100) : null })).sort((a, b) => b.clicados - a.clicados || b.exibidos - a.exibidos);
}

const celula = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  // Evita fórmula ao abrir no Excel/Planilhas (=, +, -, @).
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};
const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

/** Planilha dos leads (separador “;”, como o Excel em português abre direto). */
export function csvLeads(leads: Lead[]): string {
  const cab = ["Nome", "E-mail", "Status", "Cadastro", "Convite", "Origem", "Desafio", "Acesso até", "Objetivo", "Treinos feitos", "Último treino", "Tocou no WhatsApp", "Anotação"];
  const linhas = leads.map((l) =>
    [l.nome, l.email, STATUS_LEAD[l.status], dataBR(l.cadastroEm), l.convite, l.origem, l.desafio, dataBR(l.acessoFim), l.objetivo, l.treinosFeitos, dataBR(l.ultimoTreino), l.whatsapp ? `${l.whatsapp.ref} em ${dataBR(l.whatsapp.em)}` : "", l.anotacao].map(celula).join(";")
  );
  return `﻿${[cab.join(";"), ...linhas].join("\r\n")}\r\n`;
}

/** Endereço de recebimento aceito: https, sem servidor local ou rede interna. */
export function urlWebhookValida(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) return false; // IP direto (inclui IPv6)
  return h.includes(".");
}
