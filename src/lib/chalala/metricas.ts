// Métricas agregadas do compartilhamento (painel do personal). Intenção de
// compartilhar ≠ publicação confirmada: os rótulos deixam isso explícito.

export type EventoAgregavel = { aluno_id: string | null; tipo: string; modelo: string | null; formato: string | null; origem: string | null };

export type MetricasChalala = {
  conclusoes: number;
  editores: number;
  cardsGerados: number;
  downloads: number;
  compartilhamentos: number;
  cancelados: number;
  visitas: number;
  alunosQueGeraram: number;
  porModelo: Array<{ modelo: string; cards: number }>;
  porFormato: Array<{ formato: string; cards: number }>;
  /** % das telas de conclusão em que o aluno abriu o editor (null sem base). */
  taxaAbertura: number | null;
};

export function agregarEventos(eventos: EventoAgregavel[]): MetricasChalala {
  const conta = (t: string) => eventos.filter((e) => e.tipo === t).length;
  const gerados = eventos.filter((e) => e.tipo === "card_gerado");
  const agrupar = (chave: "modelo" | "formato") => {
    const m = new Map<string, number>();
    for (const e of gerados) m.set(e[chave] ?? "—", (m.get(e[chave] ?? "—") ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const conclusoes = conta("conclusao_vista");
  return {
    conclusoes,
    editores: conta("editor_aberto"),
    cardsGerados: gerados.length,
    downloads: conta("download"),
    compartilhamentos: conta("compartilhar_nativo"),
    cancelados: conta("compartilhar_cancelado"),
    visitas: conta("visita_link"),
    alunosQueGeraram: new Set(gerados.map((e) => e.aluno_id).filter(Boolean)).size,
    porModelo: agrupar("modelo").map(([modelo, cards]) => ({ modelo, cards })),
    porFormato: agrupar("formato").map(([formato, cards]) => ({ formato, cards })),
    taxaAbertura: conclusoes ? Math.min(100, Math.round((eventos.filter((e) => e.tipo === "editor_aberto" && e.origem === "conclusao").length / conclusoes) * 100)) : null,
  };
}
