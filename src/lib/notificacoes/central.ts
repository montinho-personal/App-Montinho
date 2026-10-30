// ============================================================================
// Central de notificações do aluno (o 🔔 da barra de cima, pedido do Montinho
// em 30/10/2026: “igual Instagram, mas inteligente e estratégico”). Regras
// PURAS: junta o que o app já sabe (recados do personal, convites e cutucadas,
// troféus, Tribo, revisão do Mito ou verdade, avisos que foram para o celular,
// feriado que vale troféu) numa lista só, com o que PEDE AÇÃO primeiro.
// “Lido” fica no aparelho (lista de ids vistos): nada é gravado no banco.
// ============================================================================

import type { RecadoPersonagem } from "./personagens";

export type TipoItem = "acao" | "recado" | "social" | "trofeu" | "lembrete" | "aviso";

export type ItemCentral = {
  id: string;
  tipo: TipoItem;
  emoji: string;
  titulo: string;
  texto?: string | null;
  href: string;
  /** ISO: quando aconteceu (ou o dia do lembrete). */
  quando: string;
  /** Recado de personagem (Colombo, Oogway, Fênix, Montinho): vira cartão com respostas rápidas. */
  personagem?: RecadoPersonagem;
};

/** Itens mais velhos que isso saem da lista. */
export const DIAS_NA_CENTRAL = 21;
/** Na 1ª vez no aparelho, só o que é dos últimos dias conta como novo (não vira “30 novas”). */
export const DIAS_NOVO_SEM_HISTORICO = 3;
export const MAX_ITENS = 40;

const ORDEM_TIPO: Record<TipoItem, number> = { acao: 0, recado: 1, social: 2, trofeu: 3, lembrete: 4, aviso: 5 };
const dias = (n: number) => n * 86_400_000;

/**
 * Lista final: o que pede ação no topo (convite para responder, revisão do
 * dia…); o resto do mais recente para o mais antigo. Sem repetidos, sem
 * itens velhos e sem nada “do futuro”.
 */
export function montarCentral(itens: ItemCentral[], agora: string): ItemCentral[] {
  const limite = Date.parse(agora) - dias(DIAS_NA_CENTRAL);
  const vistos = new Set<string>();
  return itens
    .filter((i) => {
      const t = Date.parse(i.quando);
      if (!Number.isFinite(t) || vistos.has(i.id)) return false;
      vistos.add(i.id);
      return i.tipo === "acao" || (t >= limite && t <= Date.parse(agora) + 60_000);
    })
    .sort((a, b) => Number(b.tipo === "acao") - Number(a.tipo === "acao") || (a.quando < b.quando ? 1 : a.quando > b.quando ? -1 : ORDEM_TIPO[a.tipo] - ORDEM_TIPO[b.tipo]))
    .slice(0, MAX_ITENS);
}

/** É novo para quem ainda não viu? Sem nada guardado no aparelho, só os dos últimos dias contam. */
export function ehNova(i: ItemCentral, vistos: Set<string> | null, agora: string): boolean {
  if (vistos?.has(i.id)) return false;
  if (vistos && vistos.size) return true;
  return i.tipo === "acao" || Date.parse(i.quando) >= Date.parse(agora) - dias(DIAS_NOVO_SEM_HISTORICO);
}

export function contarNovas(itens: ItemCentral[], vistos: Set<string> | null, agora: string): number {
  return itens.filter((i) => ehNova(i, vistos, agora)).length;
}

/** Número da bolinha vermelha: até 9, depois “9+”. */
export const textoContador = (n: number) => (n <= 0 ? "" : n > 9 ? "9+" : String(n));

/** Ids vistos a guardar no aparelho: os atuais + os anteriores, sem passar de 300. */
export function juntarVistos(antes: string[], agoraVistos: string[]): string[] {
  return [...new Set([...agoraVistos, ...antes])].slice(0, 300);
}

/** Quanto tempo atrás, curto (“agora”, “5 min”, “3 h”, “ontem”, “4 d”). */
export function haQuanto(quando: string, agora: string): string {
  const min = Math.max(0, Math.round((Date.parse(agora) - Date.parse(quando)) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `${d} d`;
}

/** Recado curto para a lista (uma linha e pouco). */
export const curto = (t: string | null | undefined, max = 110) => {
  const s = (t ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};
