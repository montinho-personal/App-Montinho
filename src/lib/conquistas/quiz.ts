// ============================================================================
// Autoconhecimento (pedido do Montinho, 29/10/2026): troféus por respostas
// CERTAS no “Mito ou verdade?” da tela Conhecimento — regras PURAS. Vale a
// primeira resposta de cada pergunta (refazer não muda). 1, 10, 30 e 50.
// O de 50 só aparece quando o app tiver 50 perguntas ou mais.
// No ritmo do álbum (pedido do Montinho, 04/11/2026): a Biblioteca deixa ler e
// responder tudo, mas a resposta só conta para os troféus quando a pergunta já
// saiu no álbum da pessoa (`liberadaEm`). Respondeu antes? Conta no dia em que
// ela sair — assim quem faz todas no 1º dia não dispara no ranking.
// ============================================================================
export const MARCOS_QUIZ = [1, 10, 30, 50] as const;
export type CodigoQuiz = "quiz_1" | "quiz_10" | "quiz_30" | "quiz_50";
export const CODIGOS_QUIZ: CodigoQuiz[] = MARCOS_QUIZ.map((n) => `quiz_${n}` as CodigoQuiz);

export type RespostaQuiz = {
  conteudo_id: string;
  acertou: boolean | null;
  em: string | null;
  /** AAAA-MM-DD em que a pergunta saiu no álbum; null = ainda não saiu (não conta). Sem o campo = conta. */
  liberadaEm?: string | null;
};

/** Quando a resposta passa a valer: a hora da resposta ou, se veio antes, o dia em que a pergunta saiu (9h de Brasília). */
export function quandoConta(r: RespostaQuiz): string | null {
  if (!r.em) return null;
  if (r.liberadaEm === undefined) return r.em;
  if (r.liberadaEm === null) return null;
  const meiaNoite = `${r.liberadaEm}T03:00:00.000Z`;
  return Date.parse(r.em) < Date.parse(meiaNoite) ? `${r.liberadaEm}T12:00:00.000Z` : r.em;
}
export type TrofeuQuiz = { codigo: CodigoQuiz; data: string; descricao: string; evidencia: Record<string, unknown> };

/** Marcos que existem com o número de perguntas do app (não mostra o que ninguém consegue). */
export const marcosQuizLigados = (totalPerguntas: number) => MARCOS_QUIZ.filter((n) => n <= totalPerguntas);

export function certasDoQuiz(respostas: RespostaQuiz[]): Array<{ conteudo: string; em: string }> {
  const vistos = new Set<string>();
  return respostas
    .filter((r) => r.acertou === true)
    .map((r) => ({ conteudo: r.conteudo_id, em: quandoConta(r) }))
    .filter((r): r is { conteudo: string; em: string } => !!r.em)
    .sort((a, b) => Date.parse(a.em) - Date.parse(b.em))
    .filter((r) => (vistos.has(r.conteudo) ? false : (vistos.add(r.conteudo), true)));
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
