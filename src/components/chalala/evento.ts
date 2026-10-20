// Envia um evento de métrica (fire-and-forget). Nunca bloqueia a interface.
type Evento = {
  tipo: "conclusao_vista" | "editor_aberto" | "modelo_escolhido" | "card_gerado" | "download" | "compartilhar_nativo" | "compartilhar_cancelado" | "vitrine_vista" | "explicacao_aberta" | "colecao_vista" | "conhecimento_aberto" | "quiz_respondido" | "sugestao_vista" | "sugestao_aberta" | "descoberta_salva" | "descoberta_compartilhada";
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
