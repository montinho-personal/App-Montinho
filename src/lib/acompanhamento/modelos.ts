// ============================================================================
// Modelos de mensagem do WhatsApp que o PERSONAL edita (Central de aderência e
// Montinho Pulso). Curtos, humanos, sem cobrança e sem dado de saúde por padrão.
// Marcadores: {nome} (primeiro nome), {dias} (dias sem treinar), {semanas}
// (semanas seguidas com a meta). Nada é enviado sozinho: o texto vira rascunho.
// ============================================================================

export type ModeloId = "ausencia" | "queda" | "retorno" | "pouco_tempo" | "progresso" | "renovacao" | "apoio" | "cuidado";

export const MODELOS_INFO: Record<ModeloId, { titulo: string; quando: string }> = {
  ausencia: { titulo: "Ausência", quando: "Dias sem registrar treino" },
  queda: { titulo: "Queda de frequência", quando: "Frequência abaixo do próprio histórico" },
  retorno: { titulo: "Retorno", quando: "Voltou a treinar depois de um tempo" },
  pouco_tempo: { titulo: "Pouco tempo", quando: "Contou no Pulso que falta tempo ou a rotina está corrida" },
  progresso: { titulo: "Progresso", quando: "Semanas seguidas com a meta ou melhora no Pulso" },
  renovacao: { titulo: "Renovação", quando: "Perto de renovar o plano (use quando quiser)" },
  apoio: { titulo: "Apoio", quando: "Pouca vontade ou cansaço contados no Pulso" },
  cuidado: { titulo: "Cuidado", quando: "Relatou desconforto no Pulso (sem citar saúde)" },
};

export const MODELOS_PADRAO: Record<ModeloId, string> = {
  ausencia: "Oi, {nome}! Senti sua falta nos treinos. Está tudo bem? Se a rotina apertou, posso adaptar o treino para caber no seu tempo.",
  queda: "Oi, {nome}! Percebi que as últimas semanas ficaram mais corridas. Quer que a gente ajuste a meta ou o treino para ficar mais viável?",
  retorno: "Bom ter você de volta, {nome}! Vamos reorganizar a rotina juntos, no seu ritmo.",
  pouco_tempo: "Oi, {nome}! Vi que a rotina está corrida. Quer que eu ajuste o treino para caber melhor no seu tempo?",
  progresso: "Parabéns, {nome}! {semanas} semanas seguidas cumprindo a meta. Essa constância faz toda a diferença. Chalalá! 💪",
  renovacao: "Oi, {nome}! Olha o quanto você evoluiu até aqui! Bora seguir juntos no próximo ciclo? Me chama que eu te explico como renovar.",
  apoio: "Oi, {nome}! Como você está? Estou aqui se quiser conversar sobre os treinos. 💛",
  cuidado: "Oi, {nome}! Passando para saber como você está. Me conta como foram os últimos treinos?",
};

export const MODELO_IDS = Object.keys(MODELOS_PADRAO) as ModeloId[];
export type ModelosMensagem = Record<ModeloId, string>;

const MARCADORES = /\{(nome|dias|semanas)\}/g;
export const TAMANHO_MAX = 500;

/** Modelos do personal por cima dos padrões (vazio ou inválido = padrão). */
export function mesclarModelos(m: Partial<Record<string, unknown>> | null | undefined): ModelosMensagem {
  const out = { ...MODELOS_PADRAO };
  for (const id of MODELO_IDS) {
    const v = m?.[id];
    if (typeof v === "string" && v.trim() && v.length <= TAMANHO_MAX) out[id] = v.trim();
  }
  return out;
}

/** Marcadores desconhecidos no texto (ex.: {apelido}); vazio = tudo certo. */
export function marcadoresInvalidos(texto: string): string[] {
  return [...texto.matchAll(/\{([^}]*)\}/g)].map((x) => x[0]).filter((x) => !/^\{(nome|dias|semanas)\}$/.test(x));
}

/** Preenche o modelo. Marcador sem valor some com o espaço em volta. */
export function preencherModelo(texto: string, vars: { nome?: string | null; dias?: number | null; semanas?: number | null }): string {
  const primeiro = (vars.nome ?? "").trim().split(/\s+/)[0] ?? "";
  return texto
    .replace(MARCADORES, (_, k: "nome" | "dias" | "semanas") => {
      const v = k === "nome" ? primeiro : vars[k];
      return v === null || v === undefined || v === "" ? "" : String(v);
    })
    .replace(/\s+([,!?.])/g, "$1")
    .replace(/,([!?.])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}
