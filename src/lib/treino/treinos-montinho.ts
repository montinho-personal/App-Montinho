// ============================================================================
// Treinos do Montinho (pedido do Montinho, 11/11/2026): os treinos que ele mesmo
// montou e fez (ex.: “Missão Gomos & Gêmeos”) ficam guardados e aparecem para os
// alunos como “treinos que o Montinho já fez”, com o foco e uma narrativa.
// Regras PURAS: montar os itens a partir do treino feito, o foco e o texto.
// Nunca vai carga junto (só exercícios, séries, reps e técnica).
// ============================================================================
import { GRUPO_LABEL } from "@/lib/grupos";
import { infoTecnica } from "@/lib/treino/tecnica-aluno";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { TreinoBase } from "@/lib/treino/treino-base";

export type ItemTreinoMontinho = { biblioteca_id: string | null; nome: string; grupo: string | null; series: number; reps: string; tecnica: string; tecnica_config: Record<string, unknown> | null; bloco: string | null };
export type TreinoMontinho = { id: string; titulo: string; foco: string | null; narrativa: string | null; itens: ItemTreinoMontinho[]; sessao_id: string | null; feito_em: string | null; publicado: boolean; created_at: string };

type ExercicioFeito = { biblioteca_id?: string | null; nome: string; grupo_muscular?: string | null; status?: string | null; prescricao?: unknown; series: Array<{ tipo: string }> };

/** Os exercícios do treino feito, na ordem, com a meta (séries × reps) e a técnica — sem carga. */
export function itensDaSessao(exercicios: ExercicioFeito[]): ItemTreinoMontinho[] {
  return exercicios.flatMap((e) => {
    const p = (e.prescricao ?? {}) as { series?: number; reps?: string | null; tecnica?: string | null; tecnica_config?: Record<string, unknown> | null; bloco?: string | null };
    const feitas = e.series.filter((s) => s.tipo !== "aquecimento").length;
    if (e.status === "pulado" && !feitas) return [];
    const series = Math.max(1, Math.min(10, p.series || feitas));
    if (!p.series && !feitas) return [];
    return [{ biblioteca_id: e.biblioteca_id ?? null, nome: e.nome, grupo: e.grupo_muscular ?? null, series, reps: p.reps || "10-12", tecnica: p.tecnica || "normal", tecnica_config: p.tecnica_config ?? null, bloco: p.bloco ?? null }];
  });
}

const rotuloGrupo = (g: string) => (GRUPO_LABEL as Record<string, string>)[g as GrupoMuscular] ?? g;
const juntar = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);

/** Os músculos que mais recebem séries (até 3), ex.: “Abdômen e panturrilha”. */
export function focoDoTreino(itens: ItemTreinoMontinho[]): string {
  const soma = new Map<string, number>();
  for (const i of itens) if (i.grupo) soma.set(i.grupo, (soma.get(i.grupo) ?? 0) + i.series);
  const top = [...soma.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => rotuloGrupo(g).toLowerCase());
  if (!top.length) return "Treino completo";
  const t = juntar(top);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Técnicas usadas no treino (nomes, sem repetir). */
export function tecnicasDoTreino(itens: ItemTreinoMontinho[]): string[] {
  const nomes = new Set<string>();
  for (const i of itens) {
    if (i.bloco) nomes.add("Bi-set");
    const n = i.tecnica && i.tecnica !== "normal" ? infoTecnica(i.tecnica)?.nome : null;
    if (n) nomes.add(n);
  }
  return [...nomes];
}

export const totalDeSeries = (itens: ItemTreinoMontinho[]) => itens.reduce((a, i) => a + i.series, 0);

/** Texto automático (o Montinho edita): o que é, o foco, as técnicas e o convite. Sem pronome de gênero. */
export function narrativaAutomatica(itens: ItemTreinoMontinho[]): string {
  const foco = focoDoTreino(itens).toLowerCase();
  const tecs = tecnicasDoTreino(itens);
  const partes = [
    `Esse é um treino que eu mesmo fiz: ${itens.length} exercício${itens.length === 1 ? "" : "s"} e ${totalDeSeries(itens)} séries, com foco em ${foco}.`,
    tecs.length ? `Tem ${juntar(tecs.map((t) => t.toLowerCase()))} para levar o músculo além do ponto em que você pararia.` : "Séries bem feitas, do primeiro ao último exercício, com execução caprichada.",
    "Use as cargas que funcionam para você e siga a meta de séries e repetições. Bora fazer o mesmo treino que eu fiz? É impossível dar errado! 💪",
  ];
  return partes.join(" ");
}

/** Linha curta de cada exercício para a lista: “4 × 10–12 · Pirâmide”. */
export function resumoItem(i: ItemTreinoMontinho): string {
  const tec = i.tecnica && i.tecnica !== "normal" ? infoTecnica(i.tecnica)?.nome : null;
  return `${i.series} × ${i.reps.replace("-", "–")}${tec ? ` · ${tec}` : ""}`;
}

/** Vira a base do treino livre (o mesmo caminho do “Escolher um treino para hoje”). */
export function baseDoTreinoMontinho(t: Pick<TreinoMontinho, "id" | "titulo" | "itens">): TreinoBase {
  const itens = t.itens.map((i, k) => {
    const prox = t.itens[k + 1];
    const junto = !!i.bloco && !!prox && prox.bloco === i.bloco;
    return { biblioteca_id: i.biblioteca_id, nome: i.nome, series: i.series, reps: i.reps, tecnica: i.bloco ? null : i.tecnica, tecnicaConfig: i.bloco ? null : i.tecnica_config, juntoComProximo: junto };
  });
  return { chave: `montinho:${t.id}`, titulo: t.titulo, subtitulo: "", itens };
}
