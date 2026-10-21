// ============================================================================
// Orientações prontas de execução (texto do personal, não alterar).
// Reaproveitam a “nota para o aluno” do exercício: no montador o personal
// escolhe uma orientação e o texto entra na nota (pode ser ajustado ali, ex.:
// trocar “subida/descida” conforme a biomecânica). No app do aluno, cada
// orientação reconhecida aparece como um bloco com título.
// ============================================================================

export type Orientacao = { id: string; titulo: string; texto: string };

export const ORIENTACOES: Orientacao[] = [
  {
    id: "aquecimento",
    titulo: "Aquecimento",
    texto: "Antes de começar, faça 2 séries de aquecimento com uma carga leve, preparando os músculos e as articulações para as séries principais. Não precisa chegar à falha no aquecimento.",
  },
  {
    id: "iso-2-primeiras-5",
    titulo: "Isometria nas 2 primeiras séries — 5 repetições",
    texto: "Nas 2 primeiras séries, faça as 5 primeiras repetições segurando o peso por 3 segundos no ponto de maior contração muscular. Depois, complete as repetições restantes com movimentos rápidos e explosivos na subida, mantendo o controle na descida.",
  },
  {
    id: "iso-todas-5",
    titulo: "Isometria em todas as séries — 5 repetições",
    texto: "Em todas as séries, faça as 5 primeiras repetições segurando o peso por 3 segundos no ponto de maior contração muscular. Depois, complete as repetições restantes com movimentos rápidos e explosivos na subida, mantendo o controle na descida.",
  },
  {
    id: "iso-todas-10",
    titulo: "Isometria em todas as séries — 10 repetições",
    texto: "Em todas as séries, faça as 10 primeiras repetições segurando o peso por 3 segundos no ponto de maior contração muscular. Depois, complete as repetições restantes com movimentos rápidos e explosivos na subida, mantendo o controle na descida.",
  },
  {
    id: "falha-todas",
    titulo: "Todas as séries até a falha",
    texto: "Leve todas as séries até a falha muscular, ou seja, até o ponto em que você não consegue completar mais uma repetição com a execução correta. Não vale roubar o movimento só para conseguir mais repetições.",
  },
];

/** Limite da nota do exercício (o mesmo da validação do plano). */
export const LIMITE_NOTA = 1500;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Orientações que já estão na nota (comparação exata do texto). */
export function orientacoesNaNota(nota: string | null | undefined): string[] {
  const n = norm(nota ?? "");
  return ORIENTACOES.filter((o) => n.includes(norm(o.texto))).map((o) => o.id);
}

/** Acrescenta a orientação ao fim da nota (parágrafo próprio); não duplica. */
export function adicionarOrientacao(nota: string | null | undefined, id: string): string {
  const o = ORIENTACOES.find((x) => x.id === id);
  const atual = (nota ?? "").trim();
  if (!o || orientacoesNaNota(atual).includes(id)) return atual;
  return atual ? `${atual}\n\n${o.texto}` : o.texto;
}

/** Remove a orientação da nota (o resto da nota fica como está). */
export function removerOrientacao(nota: string | null | undefined, id: string): string {
  const o = ORIENTACOES.find((x) => x.id === id);
  if (!o) return (nota ?? "").trim();
  return paragrafos(nota)
    .filter((p) => norm(p) !== norm(o.texto))
    .join("\n\n");
}

function paragrafos(nota: string | null | undefined): string[] {
  return (nota ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Separa a nota em blocos para o aluno: orientações com título e o texto livre do personal. */
export function blocosDaNota(nota: string | null | undefined): Array<{ titulo: string | null; texto: string }> {
  return paragrafos(nota).map((p) => {
    const o = ORIENTACOES.find((x) => norm(x.texto) === norm(p));
    return { titulo: o?.titulo ?? null, texto: p };
  });
}
