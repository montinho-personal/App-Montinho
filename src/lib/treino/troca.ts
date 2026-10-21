// ============================================================================
// Troca de exercício pelo ALUNO durante o treino (PURO, testado).
//
// Usa as mesmas regras de substituição do montador (aprovada pelo personal,
// sugestão do catálogo ou mesmo padrão + mesmo músculo; rejeitadas nunca
// voltam; equipamento indisponível sai). Séries, repetições e descanso
// continuam os do treino: só o exercício muda, e o peso/reps são registrados
// normalmente.
//
// “Montagem lenta” = só o que se carrega com ANILHAS (onde se perde tempo):
// leg press/hack e os levantamentos com barra ou Smith (agachamento, supino,
// terra, stiff, remada curvada, elevação pélvica…). Halteres NÃO: são rápidos
// e viram boa troca. Barras de braço (rosca, tríceps) costumam ser prontas.
// Com tempo curto, opções rápidas (halter, máquina, polia) aparecem primeiro.
// ============================================================================

import { sugerirSubstituicoes, type ContextoAluno } from "@/lib/biblioteca/substituicao";
import type { Equivalencia, ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type OpcaoTroca = {
  id: string;
  nome: string;
  grupo: GrupoMuscular;
  rapido: boolean;
  /** Frase curta do porquê (ex.: “Mesmo padrão: empurrar horizontal”). */
  motivo: string;
  alerta: string | null;
  video: { provider: string; id: string } | null;
};

export type TrocasDoExercicio = { lento: boolean; opcoes: OpcaoTroca[] };

const CARREGADO_COM_ANILHA = /leg press|hack|cavalinho|remada t\b|t-bar|belt squat/i;
const LEVANTAMENTO_COM_ANILHAS = /agachamento|supino|terra|stiff|remada curvada|levantamento|hip thrust|eleva[cç][aã]o p[eé]lvica|afundo|b[uú]lgaro|good morning/i;

export function montagemLenta(i: Pick<ItemBiblioteca, "nome" | "equipamento">): boolean {
  if (CARREGADO_COM_ANILHA.test(i.nome)) return true;
  const comBarra = i.equipamento.some((e) => e === "barra" || e === "smith");
  const comHalter = i.equipamento.some((e) => e === "halter" || e === "kettlebell");
  return comBarra && !comHalter && LEVANTAMENTO_COM_ANILHAS.test(i.nome);
}

export function montagemRapida(i: Pick<ItemBiblioteca, "nome" | "equipamento">): boolean {
  return !montagemLenta(i) && i.equipamento.some((e) => e === "maquina" || e === "polia" || e === "cabo" || e === "halter" || e === "kettlebell" || e === "peso_corporal" || e === "elastico");
}

/** Texto para o aluno (os motivos do montador falam com o personal). */
function motivoParaAluno(origem: "aprovada" | "curada" | "regra", motivos: string[]): string {
  if (origem === "aprovada") return "Troca aprovada pelo seu personal";
  return motivos.find((m) => m.startsWith("Mesmo padrão")) ?? motivos.find((m) => m.startsWith("Mesmo músculo")) ?? "Alternativa para o mesmo músculo";
}

export function opcoesDeTroca(origem: ItemBiblioteca, itens: ItemBiblioteca[], equivalencias: Equivalencia[], ctx: ContextoAluno = {}, limite = 5): TrocasDoExercicio {
  const lento = montagemLenta(origem);
  const { sugestoes } = sugerirSubstituicoes(origem, itens, equivalencias, ctx, 12);
  const opcoes = sugestoes
    // Para o aluno: só trocas que mantêm o músculo principal.
    .filter((s) => s.item.grupo === origem.grupo)
    .map((s, ordem) => ({ s, ordem, rapido: montagemRapida(s.item) }))
    .sort((a, b) => (lento ? Number(b.rapido) - Number(a.rapido) : 0) || a.ordem - b.ordem)
    .slice(0, limite)
    .map(({ s, rapido }) => ({
      id: s.item.id,
      nome: s.item.nome,
      grupo: s.item.grupo,
      rapido,
      motivo: motivoParaAluno(s.origem, s.motivos),
      alerta: s.alertas[0] ?? null,
      video: s.item.midia?.verificada ? { provider: s.item.midia.provider, id: s.item.midia.id } : null,
    }));
  return { lento, opcoes };
}
