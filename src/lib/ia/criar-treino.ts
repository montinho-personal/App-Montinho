// “Criar com IA” (montador do personal): a IA monta um treino a partir do
// pedido do personal e do contexto do aluno (objetivo, nível, restrições da
// anamnese, prioridades, foco do dia e o que já está nos outros treinos).
// Ela só ESCOLHE exercícios da biblioteca (por número); o app confere os
// limites e o personal vê a prévia, troca o que quiser e só então aplica.
// Só no servidor, só com a camada de IA ligada. Mesmo formato do ditado.
import { organizarComIA, type ItemParaIA, type ResultadoInterpretacao } from "./interpretar-treino";

export type ContextoCriar = {
  letra: string;
  objetivo: string | null;
  nivel: string | null;
  sexo: string | null;
  idade: number | null;
  restricoes: string[];
  prioridades: string[];
  focoDoDia: string | null;
  duracaoMin: number | null;
  /** Exercícios que já estão nos outros treinos (para equilibrar e não repetir à toa). */
  outrosTreinos: Array<{ letra: string; exercicios: string[] }>;
};

const INSTRUCOES = `Você é assistente de um personal trainer brasileiro e monta UM treino de musculação (o dia indicado) para um aluno dele, num app de acompanhamento.
Regras:
- Use SOMENTE exercícios da BIBLIOTECA abaixo, devolvendo o NÚMERO de cada um (numero nunca null; nome_livre sempre null).
- Siga o pedido do personal antes de tudo (músculos, quantidade de exercícios, métodos, tempo). O que ele não disser, decida com boas práticas de prescrição: multiarticulares antes dos isolados, volume coerente com o nível, 4 a 8 exercícios em geral, 3 a 4 séries.
- RESPEITE as restrições do aluno (lesões, dores, cirurgias): evite os exercícios que agravam a região e prefira variações mais seguras (máquinas, amplitude controlada). Nunca ignore uma restrição.
- Considere as prioridades musculares e o foco do dia. Evite repetir à toa os mesmos exercícios dos outros treinos.
- Preencha séries, repetições ("12", "8-12" ou pirâmide "15/12/10/8") e descanso em segundos. Carga: sempre null.
- Métodos (bi-set, drop-set, rest-pause, pirâmide…) só quando o pedido pedir ou fizer muito sentido; bi-set/tri-set usam o mesmo número de bloco.
- Em "falado", escreva em poucas palavras por que escolheu o exercício (ex.: "multiarticular de base para glúteo").
- Devolva um único treino em "treinos", com nome curto (ex.: "Glúteo e posterior").`;

export function mensagemCriar(pedido: string, c: ContextoCriar): string {
  const linhas = [
    `Treino a montar: ${c.letra}${c.focoDoDia ? ` (foco: ${c.focoDoDia})` : ""}`,
    `Pedido do personal: """${pedido.slice(0, 2000)}"""`,
    "ALUNO:",
    `- Objetivo: ${c.objetivo ?? "não informado"} · Nível: ${c.nivel ?? "não informado"}${c.sexo ? ` · Sexo: ${c.sexo}` : ""}${c.idade ? ` · Idade: ${c.idade}` : ""}`,
    `- Restrições: ${c.restricoes.length ? c.restricoes.join(" | ") : "nenhuma informada"}`,
    `- Prioridades musculares: ${c.prioridades.length ? c.prioridades.join(", ") : "nenhuma"}`,
    `- Tempo por treino: ${c.duracaoMin ? `${c.duracaoMin} min` : "não informado"}`,
    ...(c.outrosTreinos.length ? ["OUTROS TREINOS DO ALUNO:", ...c.outrosTreinos.map((t) => `- ${t.letra}: ${t.exercicios.join(", ") || "vazio"}`)] : []),
  ];
  return linhas.join("\n");
}

export async function criarTreinoComIA(pedido: string, contexto: ContextoCriar, itens: ItemParaIA[]): Promise<ResultadoInterpretacao | null> {
  if (!pedido.trim() || !itens.length) return null;
  const r = await organizarComIA(INSTRUCOES, mensagemCriar(pedido, contexto), itens, "criar-treino");
  // Só o primeiro treino e só exercícios da biblioteca.
  if (!r?.treinos.length) return r;
  const t = r.treinos[0];
  return { metodoGeral: r.metodoGeral, treinos: [{ ...t, exercicios: t.exercicios.filter((e) => e.bibliotecaId) }] };
}
