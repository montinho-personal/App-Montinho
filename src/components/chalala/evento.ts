// Envia um evento de métrica (fire-and-forget). Nunca bloqueia a interface.
type Evento = {
  tipo: "conclusao_vista" | "editor_aberto" | "modelo_escolhido" | "card_gerado" | "download" | "compartilhar_nativo" | "compartilhar_cancelado" | "vitrine_vista" | "explicacao_aberta" | "colecao_vista" | "conhecimento_aberto" | "quiz_respondido" | "sugestao_vista" | "sugestao_aberta" | "descoberta_salva" | "descoberta_compartilhada" | "chalala_workout_started" | "chalala_progression_shown" | "chalala_reps_evolution_shown" | "chalala_record_unlocked" | "chalala_advanced_technique_shown" | "chalala_workout_completed" | "chalala_push_permission_granted" | "chalala_push_permission_revoked" | "chalala_vai_que_ta_facil";
  /** Exercício do incentivo (id técnico), para não repetir em 14 dias. */
  ref?: string;
  /** Modelo do card — ou, no Desbloqueia, o id da descoberta. */
  modelo?: string;
  formato?: string;
  origem?: "conclusao" | "historico" | "mensal" | "reconhecimento" | "vitrine" | "colecao" | "medalha" | "album" | "biblioteca" | "treino" | "fim_treino" | "inicio" | "conquistas" | "personal" | "contexto";
};

export function enviarEvento(e: Evento): void {
  try {
    void fetch("/api/chalala/eventos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e), keepalive: true }).catch(() => undefined);
  } catch {
    // sem rede: métrica é dispensável
  }
}
