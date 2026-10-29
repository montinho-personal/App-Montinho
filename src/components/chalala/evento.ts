// Envia um evento de métrica (fire-and-forget). Nunca bloqueia a interface.
type Evento = {
  tipo: "conclusao_vista" | "editor_aberto" | "modelo_escolhido" | "card_gerado" | "download" | "compartilhar_nativo" | "compartilhar_cancelado" | "vitrine_vista" | "explicacao_aberta" | "colecao_vista" | "conhecimento_aberto" | "quiz_respondido" | "sugestao_vista" | "sugestao_aberta" | "descoberta_salva" | "descoberta_compartilhada" | "chalala_workout_started" | "chalala_progression_shown" | "chalala_reps_evolution_shown" | "chalala_record_unlocked" | "chalala_advanced_technique_shown" | "chalala_workout_completed" | "chalala_push_permission_granted" | "chalala_push_permission_revoked" | "chalala_vai_que_ta_facil";
  /** Exercício do incentivo (id técnico), para não repetir em 14 dias. */
  ref?: string;
  /** Modelo do card — ou, no Desbloqueia, o id da descoberta. */
  modelo?: string;
  formato?: string;
  origem?: "conclusao" | "historico" | "mensal" | "reconhecimento" | "vitrine" | "colecao" | "medalha" | "album" | "biblioteca" | "treino" | "fim_treino" | "inicio" | "conquistas" | "personal" | "contexto" | "tribo";
};

export function enviarEvento(e: Evento): void {
  try {
    void fetch("/api/chalala/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e), keepalive: true }).catch(() => undefined);
  } catch {
    // sem rede: métrica é dispensável
  }
}

/**
 * Envio de card (compartilhar/baixar): espera o servidor gravar e devolve os
 * troféus de compartilhamento que acabaram de sair (para comemorar na hora).
 * Sem rede ou erro: lista vazia — o troféu é comemorado depois, no Início.
 */
export async function enviarEventoComTrofeus(e: Evento): Promise<Array<{ id: string; codigo: string; titulo: string; descricao: string | null; conquistado_em: string; dados: Record<string, unknown> }>> {
  try {
    const r = await fetch("/api/chalala/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) });
    if (!r.ok) return [];
    const j = (await r.json()) as { novas?: Array<{ id: string; codigo: string; titulo: string; descricao: string | null; conquistado_em: string; dados: Record<string, unknown> }> };
    return j.novas ?? [];
  } catch {
    return [];
  }
}

/** Marca troféus como vistos (a comemoração não repete). */
export function marcarVistas(ids: string[]): void {
  if (!ids.length) return;
  fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => undefined);
}
