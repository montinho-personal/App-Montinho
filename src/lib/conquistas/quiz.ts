// ============================================================================
// Autoconhecimento (pedido do Montinho, 29/10/2026): troféus por respostas
// CERTAS no “Mito ou verdade?” da tela Conhecimento — regras PURAS. Vale a
// primeira resposta de cada pergunta (refazer não muda). 1, 10, 30 e 50.
// O de 50 só aparece quando o app tiver 50 perguntas ou mais.
// ============================================================================
export const MARCOS_QUIZ = [1, 10, 30, 50] as const;
export type CodigoQuiz = "quiz_1" | "quiz_10" | "quiz_30" | "quiz_50";
export const CODIGOS_QUIZ: CodigoQuiz[] = MARCOS_QUIZ.map((n) => `quiz_${n}` as CodigoQuiz);

export type RespostaQuiz = { conteudo_id: string; acertou: boolean | null; em: string | null };
export type TrofeuQuiz = { codigo: CodigoQuiz; data: string; descricao: string; evidencia: Record<string, unknown> };

/** Marcos que existem com o número de perguntas do app (não mostra o que ninguém consegue). */
export const marcosQuizLigados = (totalPerguntas: number) => MARCOS_QUIZ.filter((n) => n <= totalPerguntas);

export function certasDoQuiz(respostas: RespostaQuiz[]): Array<{ conteudo: string; em: string }> {
  const vistos = new Set<string>();
  return respostas
    .filter((r) => r.acertou === true && r.em)
    .sort((a, b) => (a.em! < b.em! ? -1 : 1))
    .filter((r) => (vistos.has(r.conteudo_id) ? false : (vistos.add(r.conteudo_id), true)))
    .map((r) => ({ conteudo: r.conteudo_id, em: r.em! }));
}

export function trofeusDoQuiz(respostas: RespostaQuiz[]): TrofeuQuiz[] {
  const certas = certasDoQuiz(respostas);
  return MARCOS_QUIZ.filter((n) => certas.length >= n).map((n) => ({
    codigo: `quiz_${n}` as CodigoQuiz,
    data: certas[n - 1].em,
    descricao: n === 1 ? "Primeira resposta certa no “Mito ou verdade?”." : `${n} respostas certas no “Mito ou verdade?”.`,
    evidencia: { certas: n },
  }));
}
