// Texto da notificação de treino em aberto (puro, testado).

export const MINUTOS_SEM_ATIVIDADE = 30;

export type LembreteDevido = {
  sessao_id: string;
  treino_id: string | null;
  nome_treino: string | null;
  series_feitas: number;
  series_planejadas: number;
};

export type MensagemPush = { titulo: string; corpo: string; url: string; tag: string };

export function mensagemTreinoAberto(l: LembreteDevido): MensagemPush {
  const nome = l.nome_treino?.trim() || "Seu treino";
  const progresso =
    l.series_planejadas > 0 ? `Você registrou ${l.series_feitas} de ${l.series_planejadas} séries.` : l.series_feitas ? `Você registrou ${l.series_feitas} séries.` : "";
  return {
    titulo: `${nome} ainda está em aberto`,
    corpo: [progresso, "Toque para conferir e finalizar."].filter(Boolean).join(" "),
    url: l.treino_id ? `/aluno/treino/${l.treino_id}?sessao=${l.sessao_id}` : `/aluno/livre/${l.sessao_id}`,
    tag: `treino-aberto-${l.sessao_id}`,
  };
}
