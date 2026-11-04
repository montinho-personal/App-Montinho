// ============================================================================
// “🎯 Falta para a meta” no montador (pedido do Montinho, 04/11/2026: “ficar
// sinalizado os músculos que não atingiram a meta de volume semanal, para o
// treinador se orientar na hora de montar”). Regras PURAS, a partir do MESMO
// resultado da Tabela de Volume (calcularVolumeSemanal): nada de conta nova.
//  • quais músculos estão abaixo da faixa e quanto falta (prioritários primeiro);
//  • em qual treino encaixar (o que já trabalha o músculo, o foco da estratégia,
//    o mais leve) e quais exercícios sugerir (favoritos e mais usados primeiro).
// Só orienta: o personal decide; nada é colocado sem o toque dele.
// ============================================================================
import { partesDoAbdomen } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { LinhaVolume, ResultadoVolume } from "@/lib/volume/calcular";

export type FaltaMeta = {
  grupo: GrupoMuscular;
  label: string;
  /** Quanto falta para o mínimo da faixa (pode ter vírgula com o volume ponderado). */
  falta: number;
  valor: number;
  min: number;
  max: number;
  prioritario: boolean;
};

const rotulo = (l: LinhaVolume, linhas: LinhaVolume[]) => {
  if (l.somaDasPartes) return "Ombros";
  if (l.parteDe === "abdomen") return l.label;
  if (l.grupo === "abdomen" && linhas.some((x) => x.parteDe === "abdomen")) return "Abdômen";
  return l.label;
};

const arred = (n: number) => Math.round(n * 100) / 100;

/** Músculos com meta e abaixo do mínimo, prioritários primeiro, depois quem está mais longe (em %). */
export function faltandoNaMeta(resultado: ResultadoVolume, prioridades: string[] = []): FaltaMeta[] {
  return resultado.linhas
    .filter((l) => l.status === "abaixo" && l.meta && l.diferenca != null && l.diferenca < 0)
    .map((l) => ({
      grupo: l.grupo,
      label: rotulo(l, resultado.linhas),
      falta: arred(-l.diferenca!),
      valor: arred(l.meta!.min + l.diferenca!),
      min: l.meta!.min,
      max: l.meta!.max,
      prioritario: prioridades.includes(l.grupo),
    }))
    .sort((a, b) => Number(b.prioritario) - Number(a.prioritario) || a.valor / a.min - b.valor / b.min || b.falta - a.falta);
}

/** Músculos acima do máximo da faixa (só aviso neutro: “passou da faixa”). */
export function acimaDaMeta(resultado: ResultadoVolume): Array<{ grupo: GrupoMuscular; label: string; passou: number }> {
  return resultado.linhas
    .filter((l) => l.status === "acima" && l.meta && l.diferenca != null && l.diferenca > 0)
    .map((l) => ({ grupo: l.grupo, label: rotulo(l, resultado.linhas), passou: arred(l.diferenca!) }));
}

/** O exercício (pelo grupo principal e nome) trabalha este músculo/linha da tabela? */
export function serveAoGrupo(grupoDoExercicio: GrupoMuscular | null | undefined, nome: string, alvo: GrupoMuscular): boolean {
  if (!grupoDoExercicio) return false;
  if (alvo === "abdomen_supra" || alvo === "abdomen_infra") return grupoDoExercicio === "abdomen" && partesDoAbdomen(nome).some((p) => p.parte === alvo);
  if (alvo === "ombros") return grupoDoExercicio === "ombros" || grupoDoExercicio.startsWith("ombro_");
  return grupoDoExercicio === alvo;
}

/** Séries para o exercício sugerido: cobre o que falta, de 2 a 4. */
export const seriesSugeridas = (falta: number) => Math.min(4, Math.max(2, Math.ceil(falta)));

export type TreinoParaEncaixe = { key: string; letra: string; nome: string; ativo: boolean; series: number; grupos: GrupoMuscular[]; nomes: string[]; foco?: string | null };

/** Em qual treino encaixar: já trabalha o músculo → foco da estratégia cita → nome cita → o mais leve. */
export function treinosParaEncaixar(treinos: TreinoParaEncaixe[], alvo: GrupoMuscular, label: string): Array<TreinoParaEncaixe & { motivo: string | null }> {
  const l = label.toLowerCase().split(" ")[0];
  const pontos = (t: TreinoParaEncaixe) => {
    const ja = t.grupos.some((g, i) => serveAoGrupo(g, t.nomes[i] ?? "", alvo));
    const foco = !!t.foco && t.foco.toLowerCase().includes(l);
    const nome = t.nome.toLowerCase().includes(l);
    return { p: (ja ? 4 : 0) + (foco ? 3 : 0) + (nome ? 2 : 0), motivo: ja ? `já tem ${label.toLowerCase()}` : foco ? "foco da estratégia" : nome ? "pelo nome do treino" : null };
  };
  return treinos
    .filter((t) => t.ativo)
    .map((t) => ({ ...t, ...pontos(t) }))
    .sort((a, b) => b.p - a.p || a.series - b.series || a.letra.localeCompare(b.letra))
    .map(({ p, ...t }) => (void p, t));
}

/** Exercícios da biblioteca para o músculo: favoritos, mais usados, e os que já estão no treino por último. */
export function exerciciosParaGrupo<I extends { id: string; nome: string; grupo: GrupoMuscular; contaVolume?: boolean }>(
  itens: I[],
  alvo: GrupoMuscular,
  opts: { favoritos?: Set<string>; uso?: Map<string, number>; jaNoTreino?: Set<string>; limite?: number } = {},
): I[] {
  const fav = opts.favoritos ?? new Set<string>();
  const uso = opts.uso ?? new Map<string, number>();
  const ja = opts.jaNoTreino ?? new Set<string>();
  return itens
    .filter((i) => i.contaVolume !== false && serveAoGrupo(i.grupo, i.nome, alvo))
    .sort((a, b) => Number(ja.has(a.id)) - Number(ja.has(b.id)) || Number(fav.has(b.id)) - Number(fav.has(a.id)) || (uso.get(b.id) ?? 0) - (uso.get(a.id) ?? 0) || a.nome.localeCompare(b.nome))
    .slice(0, opts.limite ?? 8);
}
