// ============================================================================
// Missão de Hoje (Fase 1, aprovada pelo Montinho em 29/10/2026): o cartão
// principal do Início responde “o que fazer hoje, por que vale e como começar”.
// NÃO é um sistema de prescrição: só reorganiza o que o Início já sabe (próximo
// treino de `estadoSemana`, meta da semana, pausa, Pulso). PURO e testado.
//
// Prioridade (o Início já trata antes: treino de hoje feito → DiaConcluido;
// treino em andamento → Continuar; protocolo livre → LivreMetasCard):
//   pausa combinada → meta da semana cumprida (descanso) → primeiro treino →
//   retomada (7+ dias) → normal.
// A musculação não tem “dia de descanso” marcado: o descanso que a missão
// respeita é a meta da semana já cumprida (não empurra treino a mais).
// ============================================================================

export type VarianteMissao = "normal" | "primeiro" | "retomada" | "descanso" | "pausa";

export type EntradaMissao = {
  proximo: { letra: string | null; nome: string; exercicios: number; minutos: number | null } | null;
  /** Nenhum treino válido no app ainda (mesma regra do carimbo). */
  primeiroTreino: boolean;
  /** Dias desde o último treino concluído (null = nunca). */
  diasSemTreino: number | null;
  /** Mesmo sinal do cartão antigo: 7+ dias sem treinar. */
  retomada: boolean;
  /** Semana atual em pausa combinada com o personal. */
  pausada: boolean;
  meta: number | null;
  pontos: number;
  /** Desconforto/dor contado hoje no Pulso ou no fim do último treino (2 dias). */
  desconforto: boolean;
  /** Uma linha discreta já pronta, na ordem de preferência (a 1ª que existir entra). */
  linhas?: Array<string | null | undefined>;
};

export type Missao = {
  variante: VarianteMissao;
  rotulo: string;
  titulo: string;
  porque: string;
  /** Botão principal; null = sem chamada para treinar (descanso/pausa). */
  cta: string | null;
  /** Linha discreta embaixo do botão (no máximo 1). */
  linha: string | null;
  /** Aviso de cuidado (desconforto). */
  cuidado: string | null;
  /** Os 3 passos do primeiro treino. */
  passos: string[] | null;
};

export const PASSOS_PRIMEIRO = ["Toque em Começar", "Anote o peso e as repetições", "Toque no ✓ em cada série"];
export const CUIDADO_DESCONFORTO = "Sentiu algo? Conte ao Montinho antes de treinar. Antes de começar, o app pergunta como você está e ajusta o treino.";

const tituloDoTreino = (p: NonNullable<EntradaMissao["proximo"]>) => (p.letra ? `Treino ${p.letra} · ${p.nome}` : p.nome);

function porqueNormal(e: EntradaMissao): string {
  if (e.meta && e.meta > 0) {
    const falta = Math.max(0, Math.ceil(e.meta - e.pontos));
    if (falta === 1) return "Falta 1 treino para cumprir a meta da semana.";
    if (falta > 1 && e.pontos > 0) return `Faltam ${falta} treinos para a meta da semana. Um de cada vez.`;
  }
  return "Você está construindo a sua constância. Cada treino conta.";
}

export function missaoDeHoje(e: EntradaMissao): Missao | null {
  const linha = e.linhas?.find((l): l is string => !!l && l.trim().length > 0) ?? null;
  const cuidado = e.desconforto ? CUIDADO_DESCONFORTO : null;
  if (e.pausada) {
    return { variante: "pausa", rotulo: "Pausa combinada", titulo: "Você está em pausa combinada com o Montinho.", porque: "Descanse sem culpa. Quando a pausa acabar, sua missão volta a aparecer aqui.", cta: null, linha: null, cuidado: null, passos: null };
  }
  if (!e.proximo) return null;
  if (!e.primeiroTreino && e.meta && e.meta > 0 && e.pontos >= e.meta) {
    return { variante: "descanso", rotulo: "Meta da semana cumprida", titulo: "Meta da semana cumprida! Hoje pode descansar.", porque: "O descanso também faz parte da evolução. Quando quiser, seus treinos continuam aqui.", cta: null, linha, cuidado: null, passos: null };
  }
  if (e.primeiroTreino) {
    return { variante: "primeiro", rotulo: "Sua missão de hoje", titulo: "Hoje começa sua Jornada do Chalalá.", porque: "Seu primeiro passo é simples: começar seu treino e registrar sua evolução. Cada treino feito ajuda a construir o hábito.", cta: "Começar minha jornada", linha: null, cuidado, passos: PASSOS_PRIMEIRO };
  }
  if (e.retomada) {
    return { variante: "retomada", rotulo: "Bom ter você de volta!", titulo: tituloDoTreino(e.proximo), porque: "Sua evolução não recomeça do zero. Hoje, o importante é retomar o ritmo com segurança, no seu tempo.", cta: "Ver meu próximo passo", linha: null, cuidado: cuidado ?? "Ficou um tempo parado ou sentiu algo? Se precisar, fale com o Montinho antes de voltar.", passos: null };
  }
  return { variante: "normal", rotulo: "Sua missão de hoje", titulo: tituloDoTreino(e.proximo), porque: porqueNormal(e), cta: "Começar meu treino", linha, cuidado, passos: null };
}

/** Próxima missão no fim do treino: a letra seguinte, ou o recado de meta cumprida. */
export function proximaMissao(p: { proximo: { letra: string | null; nome: string } | null; meta: number | null; pontos: number }): { titulo: string; texto: string } | null {
  if (!p.proximo) return null;
  const nome = tituloDoTreino({ ...p.proximo, exercicios: 0, minutos: null });
  if (p.meta && p.meta > 0 && p.pontos >= p.meta) return { titulo: "Meta da semana cumprida!", texto: `Descanse. Quando voltar, sua próxima missão é o ${nome}.` };
  return { titulo: `Seu próximo treino: ${nome}`, texto: "Você já está construindo a próxima conquista. Nos vemos na próxima sessão!" };
}
