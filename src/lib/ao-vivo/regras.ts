// “Treinando agora” (pedido do Montinho, 26/10/2026): quem está com treino em
// andamento, ao vivo, e o recado do personal no meio do treino. Regras puras.

/** Recados prontos (um toque). O personal também pode escrever o dele. */
export const RECADOS_PRONTOS = [
  "Bora! Tô de olho no seu treino 👀🔥",
  "Capricha nessa série! 💪",
  "Vai que tá fácil! 😎",
  "Foco na execução, sem pressa 🎯",
  "Respeita o descanso ⏱️",
  "Sobe o peso, você aguenta! ⬆️",
  "Bebe uma água 💧",
  "Orgulho de você! Chalalá! 🎉",
] as const;

/** Aviso de um toque: o personal está acompanhando o treino ao vivo. */
export const RECADO_ACOMPANHANDO = "Tô acompanhando seu treino ao vivo! Tô de olho 👀🔥";

export const LIMITES_RECADO = { maxCaracteres: 200 };

/** Sem série há mais que isso: “parado”. Sem nada há mais que `esquecido`: fora da lista (treino esquecido aberto). */
export const MINUTOS_AO_VIVO = { parado: 8, esquecido: 90 };

export type EstadoAoVivo = "treinando" | "parado" | "esquecido";

export const minutosDesde = (iso: string, agoraMs: number) => Math.max(0, Math.floor((agoraMs - Date.parse(iso)) / 60_000));

/** Estado pela última atividade (última série marcada ou, sem série, o início). */
export function estadoAoVivo(ultimaAtividade: string, agoraMs: number): EstadoAoVivo {
  const min = minutosDesde(ultimaAtividade, agoraMs);
  return min >= MINUTOS_AO_VIVO.esquecido ? "esquecido" : min >= MINUTOS_AO_VIVO.parado ? "parado" : "treinando";
}

/** “agora”, “há 3 min”, “há 1 h 05”. */
export function haQuanto(iso: string, agoraMs: number): string {
  const m = minutosDesde(iso, agoraMs);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/** Texto do recado: sem espaços sobrando, com limite. Vazio = inválido. */
export function limparRecado(t: string): string {
  return t.replace(/\s+/g, " ").trim().slice(0, LIMITES_RECADO.maxCaracteres);
}

/**
 * Cardio e mobilidade ao vivo (pedido do Montinho, 30/10/2026): começados no app
 * (“▶ Começar” do cronômetro de cardio ou da mobilidade) e ainda não terminados.
 * Depois de 90 minutos sem terminar, somem (esquecidos abertos).
 */
export type TipoOutraAtividade = "cardio" | "mobilidade";
export type OutraAtividadeAoVivo = { id: string; tipo: TipoOutraAtividade; alunoId: string; nome: string; visitante: boolean; atividade: string; iniciadoEm: string };

export function outrasAtividadesAoVivo(
  itens: Array<Omit<OutraAtividadeAoVivo, "nome" | "visitante">>,
  pessoas: Record<string, { nome: string; visitante: boolean }>,
  agoraMs: number,
): OutraAtividadeAoVivo[] {
  return itens
    .filter((i) => minutosDesde(i.iniciadoEm, agoraMs) < MINUTOS_AO_VIVO.esquecido && Date.parse(i.iniciadoEm) <= agoraMs + 60_000)
    .map((i) => ({ ...i, nome: pessoas[i.alunoId]?.nome ?? "Aluno", visitante: pessoas[i.alunoId]?.visitante ?? false }))
    .sort((a, b) => (a.iniciadoEm < b.iniciadoEm ? 1 : -1))
    // Tocou em “Começar” duas vezes: fica só o mais recente de cada pessoa em cada tipo.
    .filter((i, idx, todos) => todos.findIndex((x) => x.alunoId === i.alunoId && x.tipo === i.tipo) === idx);
}
