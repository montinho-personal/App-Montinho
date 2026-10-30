// Quem tocou em “Ver 👀” do cartão “Você sabia?” do Montinho no Ranking
// (pedido do Montinho, 30/10/2026: “quero que isso seja rastreável”). Regra
// pura: junta os eventos internos `montinho_ranking_aberto` e os
// compartilhamentos do card “vou passar/passei o Montinho” (ref
// `montinho:ranking`) por pessoa. Só o personal vê.

export type EventoCliqueMontinho = { aluno_id: string | null; tipo: string; ref?: string | null; created_at: string };
export type PessoaCliqueMontinho = { alunoId: string; nome: string; visitante: boolean; vezes: number; primeira: string; ultima: string; compartilhou: boolean };
export type ResumoCliquesMontinho = { pessoas: number; vezes: number; compartilharam: number; lista: PessoaCliqueMontinho[] };

export const REF_CARD_MONTINHO = "montinho:ranking";
const ENVIOU = new Set(["compartilhar_nativo", "download"]);

export function quemViuOMontinho(eventos: EventoCliqueMontinho[], pessoas: Record<string, { nome: string; visitante: boolean }>): ResumoCliquesMontinho {
  const por = new Map<string, PessoaCliqueMontinho>();
  const pegar = (id: string, quando: string) => {
    const p = por.get(id) ?? { alunoId: id, nome: pessoas[id]?.nome ?? "Pessoa sem ficha", visitante: pessoas[id]?.visitante ?? false, vezes: 0, primeira: quando, ultima: quando, compartilhou: false };
    if (quando < p.primeira) p.primeira = quando;
    if (quando > p.ultima) p.ultima = quando;
    por.set(id, p);
    return p;
  };
  let vezes = 0;
  for (const e of eventos) {
    if (!e.aluno_id) continue;
    if (e.tipo === "montinho_ranking_aberto") {
      pegar(e.aluno_id, e.created_at).vezes++;
      vezes++;
    } else if (ENVIOU.has(e.tipo) && e.ref === REF_CARD_MONTINHO) pegar(e.aluno_id, e.created_at).compartilhou = true;
  }
  const lista = [...por.values()].sort((a, b) => (a.ultima < b.ultima ? 1 : -1));
  return { pessoas: lista.filter((p) => p.vezes > 0).length, vezes, compartilharam: lista.filter((p) => p.compartilhou).length, lista };
}
