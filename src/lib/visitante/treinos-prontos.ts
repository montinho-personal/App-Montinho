// Treinos prontos do Montinho (vitrine do visitante) — nomes de marketing +
// parâmetros. O conteúdo de cada um sai do mesmo gerador com base científica
// (src/lib/visitante/gerar-treino.ts), então segue sempre o mesmo método.
// `aprovado`: só aparece no app real depois que o Montinho aprova o nome
// (na demonstração aparecem todos, para ele ver).
import { gerarOpcoes, normalizarParametros, type OpcaoPlano, type ParametrosPlano } from "./gerar-treino";

export type TreinoPronto = {
  slug: string;
  nome: string;
  emoji: string;
  chamada: string;
  descricao: string;
  parametros: ParametrosPlano;
  opcao: "A" | "B";
  /** Desafio sugerido: N dias seguindo o treino. */
  desafioDias: number;
  aprovado: boolean;
};

const T = (slug: string, nome: string, emoji: string, chamada: string, descricao: string, p: Partial<ParametrosPlano>, opcao: "A" | "B", desafioDias: number, aprovado = false): TreinoPronto => ({
  slug, nome, emoji, chamada, descricao, parametros: normalizarParametros(p), opcao, desafioDias, aprovado,
});

export const TREINOS_PRONTOS: TreinoPronto[] = [
  T("operacao-musa-do-bumbum", "Operação Musa do Bumbum", "🍑", "Glúteo em destaque, 2× na semana", "Glúteo é o primeiro exercício dos dias de inferiores e ganha mais volume, sem abandonar o resto do corpo.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "gluteo" }, "A", 28),
  T("projeto-calca-apertada", "Projeto Calça Apertada", "👖", "Pernas e glúteo para quem está começando", "Três treinos por semana, dois focados em pernas e glúteo, com máquinas fáceis de aprender.", { nivel: "iniciante", dias: 3, minutos: 45, foco: "gluteo" }, "B", 21),
  T("comeco-sem-medo", "Começo Sem Medo", "🌱", "O primeiro treino de quem nunca treinou", "Corpo todo 3× na semana, exercícios simples e poucos aparelhos. O jeito mais seguro de começar.", { nivel: "iniciante", dias: 3, minutos: 45, foco: "geral" }, "A", 21),
  T("sofa-nunca-mais", "Sofá Nunca Mais", "🛋️", "Só 2 dias por semana. Sem desculpa.", "Dois treinos de corpo todo, curtos e completos, para sair do zero e criar o hábito.", { nivel: "iniciante", dias: 2, minutos: 40, foco: "geral" }, "A", 21),
  T("sem-tempo-irmao", "Sem Tempo, Irmão", "⏱️", "30 minutos e acabou", "Corpo todo em 30 minutos, 3× na semana. Para a semana corrida não virar semana perdida.", { nivel: "intermediario", dias: 3, minutos: 30, foco: "geral" }, "A", 21),
  T("em-casa-sem-desculpa", "Em Casa, Sem Desculpa", "🏠", "Treino com halteres e peso do corpo", "Três treinos para fazer em casa, com halteres, elástico e o peso do corpo.", { nivel: "iniciante", dias: 3, minutos: 40, foco: "geral", local: "casa" }, "A", 21),
  T("missao-braco-de-respeito", "Missão Braço de Respeito", "💪", "Bíceps e tríceps em destaque", "Superiores e inferiores 2× na semana, com braços como prioridade nos dias de cima.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "bracos" }, "A", 28),
  T("costas-em-v-de-vitoria", "Costas em V de Vitória", "🦅", "Largura e espessura nas costas", "Puxadas e remadas em primeiro lugar, 2× na semana.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "costas" }, "A", 28),
  T("peitoral-de-respeito", "Peitoral de Respeito", "🛡️", "Peito em destaque, sem esquecer o resto", "Quatro treinos diferentes, com um dia de peito, ombros e tríceps bem completo.", { nivel: "intermediario", dias: 4, minutos: 55, foco: "peito" }, "B", 28),
  T("perna-de-aco", "Perna de Aço", "🦵", "Quadríceps, posteriores e panturrilha", "Pernas como prioridade, com um dia só de quadríceps e outro de glúteo e posteriores.", { nivel: "intermediario", dias: 4, minutos: 60, foco: "pernas" }, "B", 28),
  T("shape-de-verao-sem-desculpa", "Shape de Verão Sem Desculpa", "☀️", "5 dias por semana, corpo todo", "Superiores e inferiores com um dia de corpo todo: mais frequência para quem já treina.", { nivel: "intermediario", dias: 5, minutos: 55, foco: "geral" }, "A", 28),
];

export const prontosVisiveis = (demo: boolean) => TREINOS_PRONTOS.filter((t) => demo || t.aprovado);
export const prontoPorSlug = (slug: string) => TREINOS_PRONTOS.find((t) => t.slug === slug) ?? null;

/** O plano do treino pronto (os treinos A, B, C… com os exercícios da biblioteca). */
export function planoDoPronto(t: TreinoPronto, disponiveis: Iterable<string>): OpcaoPlano | null {
  return gerarOpcoes(t.parametros, disponiveis).find((o) => o.id === t.opcao) ?? null;
}

/** Marca guardada nas observações dos treinos criados a partir do pronto (para o desafio). */
export const marcaDoPronto = (t: Pick<TreinoPronto, "nome">) => `Treino pronto do Montinho: ${t.nome}.`;
export function prontoDaMarca(observacoes: string | null | undefined): TreinoPronto | null {
  const m = (observacoes ?? "").match(/^Treino pronto do Montinho: (.+)\.$/);
  return m ? TREINOS_PRONTOS.find((t) => t.nome === m[1]) ?? null : null;
}

/** Prontos que combinam com o pedido (mesmo foco e dias próximos), para o “Monte com IA”. */
export function prontosParecidos(p: ParametrosPlano, lista: TreinoPronto[]): TreinoPronto[] {
  return lista
    .filter((t) => t.parametros.local === p.local && (t.parametros.foco === p.foco || (p.foco === "geral" && t.parametros.foco === "geral")))
    .sort((a, b) => Math.abs(a.parametros.dias - p.dias) - Math.abs(b.parametros.dias - p.dias))
    .slice(0, 2);
}

/** Desafio: treinos feitos desde o início, dentro dos N dias. Meta = dias por semana × semanas. */
export function progressoDesafio(t: Pick<TreinoPronto, "desafioDias" | "parametros">, inicio: string, hoje: string, datasTreinos: string[]): { feitos: number; meta: number; diaAtual: number; terminou: boolean; concluido: boolean } {
  const dia = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
  const diaAtual = Math.max(1, dia(hoje) - dia(inicio) + 1);
  const fim = dia(inicio) + t.desafioDias - 1;
  const feitos = datasTreinos.filter((d) => dia(d) >= dia(inicio) && dia(d) <= fim).length;
  const meta = Math.round((t.desafioDias / 7) * t.parametros.dias);
  return { feitos, meta, diaAtual: Math.min(diaAtual, t.desafioDias), terminou: diaAtual > t.desafioDias, concluido: feitos >= meta };
}
