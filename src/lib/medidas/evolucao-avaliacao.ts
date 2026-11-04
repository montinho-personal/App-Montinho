// ============================================================================
// Evolução na avaliação física de 7 dobras (pedido do Montinho, 04/11/2026):
// “quando o aluno evoluir nas avaliações físicas, precisa receber uma
// notificação parabenizando e botão para compartilhar. A evolução considera
// % de gordura diminuiu ou massa magra aumentou. Pensar na lógica de quem quer
// emagrecer e quem quer crescer.”
//
// Regra (pura): compara com a avaliação de 7 dobras ANTERIOR (a mesma do
// relatório). Evoluiu = % de gordura caiu 0,5 ponto ou mais OU massa magra
// subiu 0,5 kg ou mais. O OBJETIVO só muda a ordem e a manchete:
//   • emagrecer → gordura primeiro (+ massa gorda, cintura, soma das dobras);
//   • crescer   → massa magra primeiro;
//   • os dois juntos → “recomposição corporal”.
// Nunca comemora peso subindo ou descendo por si só, e nunca fala do que piorou.
// ============================================================================
import type { Evolucao } from "@/lib/supabase/types";
import { ehAvaliacao7Dobras, relatorioAvaliacao, type RelatorioAvaliacao } from "./relatorio-avaliacao";

export type FocoObjetivo = "emagrecer" | "crescer" | "geral";

/** Diferenças mínimas para contar (abaixo disso é variação da própria medida). */
export const LIMIARES_EVOLUCAO = { gorduraPontos: 0.5, massaMagraKg: 0.5, massaGordaKg: 0.5, somaDobrasMm: 3, cinturaCm: 1 } as const;

export type ItemEvolucao = { chave: "gordura" | "massa_magra" | "massa_magra_mantida" | "massa_gorda" | "soma_dobras" | "cintura"; emoji: string; texto: string };
export type EvolucaoAvaliacao = { evoluiu: boolean; foco: FocoObjetivo; manchete: string; itens: ItemEvolucao[]; id: string; anteriorId: string; data: string; anteriorData: string };

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Objetivo do cadastro → foco. Sem objetivo claro = geral (gordura primeiro). */
export function focoDoObjetivo(objetivo: string | null | undefined): FocoObjetivo {
  const t = sem(objetivo ?? "");
  const emagrecer = /emagrec|perd(a|er) de (peso|gordura)|perder (peso|gordura)|secar|defini|reduzir gordura|queima/.test(t);
  const crescer = /hipertrof|ganh(o|ar) de (massa|peso)|ganhar massa|massa muscular|crescer|volume|forca/.test(t);
  if (emagrecer && !crescer) return "emagrecer";
  if (crescer && !emagrecer) return "crescer";
  return "geral";
}

export function evolucaoDoRelatorio(rel: RelatorioAvaliacao, foco: FocoObjetivo): EvolucaoAvaliacao | null {
  if (!rel.anterior) return null;
  const linha = (rotulo: string) => rel.comparacao.find((l) => l.rotulo === rotulo) ?? null;
  const g = linha("% de gordura");
  const mm = linha("Massa magra");
  const mg = linha("Massa gorda");
  const soma = linha("Soma das 7 dobras");
  const cint = rel.circunferencias.find((l) => l.rotulo === "Cintura") ?? null;

  const caiuGordura = g?.diferenca != null && g.diferenca <= -LIMIARES_EVOLUCAO.gorduraPontos;
  const subiuMagra = mm?.diferenca != null && mm.diferenca >= LIMIARES_EVOLUCAO.massaMagraKg;
  const evoluiu = caiuGordura || subiuMagra;

  const iGordura: ItemEvolucao | null = caiuGordura ? { chave: "gordura", emoji: "🔥", texto: `% de gordura caiu ${fmt(-g!.diferenca!)} ${-g!.diferenca! === 1 ? "ponto" : "pontos"} (${fmt(g!.anterior!)}% → ${fmt(g!.atual!)}%)` } : null;
  const iMagra: ItemEvolucao | null = subiuMagra ? { chave: "massa_magra", emoji: "💪", texto: `Massa magra subiu ${fmt(mm!.diferenca!)} kg (${fmt(mm!.anterior!)} → ${fmt(mm!.atual!)} kg)` } : null;
  // Gordura caiu e a massa magra ficou praticamente igual: também é vitória (não perdeu músculo).
  const iMantida: ItemEvolucao | null = caiuGordura && !subiuMagra && mm?.diferenca != null && Math.abs(mm.diferenca) < LIMIARES_EVOLUCAO.massaMagraKg ? { chave: "massa_magra_mantida", emoji: "🛡️", texto: `Massa magra preservada (${fmt(mm.anterior!)} → ${fmt(mm.atual!)} kg) enquanto a gordura caiu` } : null;
  const iGorda: ItemEvolucao | null = mg?.diferenca != null && mg.diferenca <= -LIMIARES_EVOLUCAO.massaGordaKg ? { chave: "massa_gorda", emoji: "📉", texto: `${fmt(-mg.diferenca)} kg a menos de gordura no corpo` } : null;
  const iSoma: ItemEvolucao | null = soma?.diferenca != null && soma.diferenca <= -LIMIARES_EVOLUCAO.somaDobrasMm ? { chave: "soma_dobras", emoji: "📏", texto: `Soma das dobras ${fmt(-soma.diferenca)} mm menor (${fmt(soma.anterior!)} → ${fmt(soma.atual!)} mm)` } : null;
  const iCintura: ItemEvolucao | null = foco !== "crescer" && cint?.diferenca != null && cint.diferenca <= -LIMIARES_EVOLUCAO.cinturaCm ? { chave: "cintura", emoji: "🎯", texto: `Cintura ${fmt(-cint.diferenca)} cm menor` } : null;

  const ordem = foco === "crescer" ? [iMagra, iGordura, iMantida, iGorda, iSoma] : [iGordura, iMagra, iMantida, iGorda, iCintura, iSoma];
  const itens = evoluiu ? ordem.filter((x): x is ItemEvolucao => x != null) : [];

  let manchete = "";
  if (caiuGordura && subiuMagra) manchete = "Recomposição corporal: menos gordura e mais massa magra!";
  else if (subiuMagra) manchete = "Você ganhou massa magra!";
  else if (caiuGordura) manchete = foco === "crescer" ? "Mais definição: seu % de gordura caiu!" : "Seu % de gordura caiu!";

  return { evoluiu, foco, manchete, itens, id: rel.id, anteriorId: rel.anterior.id, data: rel.data, anteriorData: rel.anterior.data };
}

/** A avaliação de 7 dobras mais recente (ou a do `id`) comparada com a anterior. */
export function evolucaoDaAvaliacao(medidas: Evolucao[], objetivo: string | null | undefined, id?: string): EvolucaoAvaliacao | null {
  const alvo = id ?? [...medidas].filter(ehAvaliacao7Dobras).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.created_at < b.created_at ? 1 : -1))[0]?.id;
  if (!alvo) return null;
  const rel = relatorioAvaliacao(medidas, alvo);
  return rel ? evolucaoDoRelatorio(rel, focoDoObjetivo(objetivo)) : null;
}
