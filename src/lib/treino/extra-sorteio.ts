// “O Montinho sorteia” no treino extra (pedido do Montinho, 24/10/2026): o
// sorteio sai dos treinos prontos da vitrine (Shape de Verão, Rainha do
// Agachamento…). Cada treino A, B, C… de um pronto é uma opção; a pessoa vê
// os exercícios e aceita ou sorteia de novo. Regras puras: sem músculo
// treinado nas últimas 48 h e dentro do limite de séries extras da semana.
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { OpcaoPlano } from "@/lib/visitante/gerar-treino";
import { LIMITES_EXTRA_LIVRE } from "./extra-gerado";

export type ItemSorteio = { slug: string; grupo: GrupoMuscular; series: number; reps: string };
export type CandidatoSorteio = {
  /** slug do pronto + letra do treino (ex.: "rainha-do-agachamento:A"). */
  chave: string;
  slug: string;
  nome: string;
  emoji: string;
  chamada: string;
  letra: string;
  nomeTreino: string;
  itens: ItemSorteio[];
  /** Ficou mais curto que o original (músculo descansando ou limite de séries). */
  encurtado: boolean;
};

/** Menos que isso não vale como treino sorteado. */
export const MINIMO_EXERCICIOS_SORTEIO = 3;

/** Cabe no limite de séries: primeiro tira séries (até 2 por exercício), depois exercícios do fim. */
export function ajustarAoLimite(itens: ItemSorteio[], limite: number): ItemSorteio[] {
  let out = itens.slice(0, LIMITES_EXTRA_LIVRE.maxExercicios).map((i) => ({ ...i, series: Math.min(i.series, LIMITES_EXTRA_LIVRE.maxSeries) }));
  const total = () => out.reduce((n, i) => n + i.series, 0);
  for (const teto of [3, 2]) {
    if (total() <= limite) return out;
    out = out.map((i) => ({ ...i, series: Math.min(i.series, teto) }));
  }
  while (out.length && total() > limite) out = out.slice(0, -1);
  return out;
}

type Pronto = { slug: string; nome: string; emoji: string; chamada: string };

/** Todas as opções que valem hoje (um treino de um pronto = uma opção). */
export function candidatosDoSorteio(prontos: Array<{ pronto: Pronto; plano: OpcaoPlano }>, recentes48h: GrupoMuscular[], seriesDisponiveis: number): CandidatoSorteio[] {
  const out: CandidatoSorteio[] = [];
  for (const { pronto, plano } of prontos) {
    for (const t of plano.treinos) {
      const original = t.exercicios.map((x) => ({ slug: x.slug, grupo: x.grupo, series: x.series, reps: x.reps }));
      const descansados = original.filter((x) => !recentes48h.includes(x.grupo));
      const itens = ajustarAoLimite(descansados, seriesDisponiveis);
      if (itens.length < MINIMO_EXERCICIOS_SORTEIO) continue;
      const encurtado = itens.length < original.length || itens.some((x, i) => x.series < (descansados[i]?.series ?? x.series));
      out.push({ chave: `${pronto.slug}:${t.letra}`, slug: pronto.slug, nome: pronto.nome, emoji: pronto.emoji, chamada: pronto.chamada, letra: t.letra, nomeTreino: t.nome, itens, encurtado });
    }
  }
  return out;
}

/**
 * Sorteia uma opção que a pessoa ainda não viu nesta rodada. Viu todas? Recomeça.
 * Prefere um pronto diferente do último que saiu, para o sorteio não repetir o nome.
 */
export function sortearCandidato(cands: CandidatoSorteio[], vistos: string[], rnd: () => number = Math.random): { escolhido: CandidatoSorteio | null; recomecou: boolean } {
  if (!cands.length) return { escolhido: null, recomecou: false };
  const visto = new Set(vistos);
  let livres = cands.filter((c) => !visto.has(c.chave));
  const recomecou = livres.length === 0;
  if (recomecou) livres = cands;
  const ultimoSlug = vistos.at(-1)?.split(":")[0];
  const outros = livres.filter((c) => c.slug !== ultimoSlug);
  const lista = outros.length ? outros : livres;
  return { escolhido: lista[Math.min(lista.length - 1, Math.floor(rnd() * lista.length))], recomecou };
}

export const tituloDoSorteio = (c: Pick<CandidatoSorteio, "nome" | "letra">) => `Extra sorteado: ${c.nome} · Treino ${c.letra}`;
