// ============================================================================
// Perfil do ranking (pedido do Montinho, 29/10/2026): ao tocar no nome, os
// troféus da pessoa, os fatores de desempate (na MESMA ordem do ranking) e o
// “cutucar”. Contas puras; os dados vêm de ranking_perfil() (0117).
// ============================================================================
import { CATEGORIA_EMOJI, CONTEUDO, nomeDaConquista } from "@/lib/conquistas/conteudo";
import { ORDEM } from "@/lib/conquistas/vitrine";
import type { CodigoConquista } from "@/lib/conquistas/regras";
import { FORA_DO_RANKING } from "./trofeus";

export type PerfilRanking = {
  ref: string;
  nome: string;
  eu: boolean;
  visitante: boolean;
  trofeus: Array<{ codigo: string; em: string }>;
  desempate: { pct_semana: number | null; carimbos: number; semanas_seguidas: number; pct_4sem: number | null };
  cutuquei_hoje: boolean;
};

export type TrofeuDoPerfil = { codigo: string; nome: string; selo: string; categoria: string; em: string; contaNoRanking: boolean };

const SELO = new Map(ORDEM.map((o) => [o.codigo as string, o.selo]));

/** Troféus mais recentes primeiro; os que não contam no ranking (recorde, retomadas…) marcados. */
export function trofeusDoPerfil(p: Pick<PerfilRanking, "trofeus">): TrofeuDoPerfil[] {
  const fora = new Set<string>(FORA_DO_RANKING);
  return [...p.trofeus]
    .sort((a, b) => (a.em < b.em ? 1 : -1))
    .map((t) => {
      const c = CONTEUDO[t.codigo as CodigoConquista];
      return { codigo: t.codigo, nome: nomeDaConquista(t.codigo), selo: SELO.get(t.codigo) ?? "🏅", categoria: c ? CATEGORIA_EMOJI[c.categoria] : "🏅", em: t.em, contaNoRanking: !fora.has(t.codigo) };
    });
}

export type FatorDesempate = { ordem: number; rotulo: string; valor: string; ajuda: string };

/** Os fatores, na ordem do desempate aprovado (troféus → semana passada → carimbos → semanas seguidas → 4 semanas). */
export function fatoresDeDesempate(p: Pick<PerfilRanking, "trofeus" | "desempate">): FatorDesempate[] {
  const fora = new Set<string>(FORA_DO_RANKING);
  const noRanking = new Set(p.trofeus.map((t) => t.codigo).filter((c) => !fora.has(c))).size;
  const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n)}%`);
  const d = p.desempate;
  return [
    { ordem: 1, rotulo: "Troféus", valor: `${noRanking} 🏆`, ajuda: "Quem tem mais troféus fica na frente." },
    { ordem: 2, rotulo: "Meta da semana passada", valor: pct(d.pct_semana), ajuda: "Empate? Vence quem cumpriu melhor a meta de treinos da semana passada." },
    { ordem: 3, rotulo: "Carimbos", valor: `${d.carimbos}`, ajuda: "Treinos concluídos desde o começo." },
    { ordem: 4, rotulo: "Semanas seguidas", valor: `${d.semanas_seguidas}`, ajuda: "Semanas seguidas cumprindo a meta." },
    { ordem: 5, rotulo: "Meta nas últimas 4 semanas", valor: pct(d.pct_4sem), ajuda: "Quanto cumpriu da meta no último mês." },
  ];
}

/** Cutucadas: emoji → recado (o mesmo texto do aviso no celular, 0117). */
export const CUTUCADAS = [
  { emoji: "🔥", texto: "Bora treinar!" },
  { emoji: "💪", texto: "Tô chegando aí!" },
  { emoji: "😈", texto: "Vou te passar no ranking!" },
  { emoji: "⏰", texto: "Cadê você? Bora!" },
  { emoji: "👀", texto: "Tô de olho em você!" },
] as const;
export type EmojiCutucada = (typeof CUTUCADAS)[number]["emoji"];
export const textoDaCutucada = (emoji: string) => CUTUCADAS.find((c) => c.emoji === emoji)?.texto ?? "Bora treinar!";
