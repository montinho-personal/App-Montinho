// ============================================================================
// Strava — regras PURAS: qual atividade do relógio é o treino do app e como
// mostrar o resumo. Testado em combinar.test.ts.
// ============================================================================

/** Atividade como vem da lista do Strava (só o que usamos). */
export type AtividadeStrava = {
  id: number;
  name: string;
  /** Início em UTC (ISO). */
  start_date: string;
  elapsed_time: number;
  moving_time?: number;
  has_heartrate?: boolean;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  sport_type?: string;
};

export type JanelaTreino = { inicio: string; fim: string | null; duracaoSeg: number | null };

/** Fim do treino do app: finalizado_em, ou início + duração, ou início + 2 h. */
export function fimDoTreino(t: JanelaTreino): number {
  const ini = Date.parse(t.inicio);
  if (t.fim) return Date.parse(t.fim);
  return ini + (t.duracaoSeg && t.duracaoSeg > 0 ? t.duracaoSeg : 2 * 3600) * 1000;
}

/** Busca no Strava: de 2 h antes do início até 3 h depois do fim (relógio às vezes começa antes ou termina depois). */
export function janelaDeBusca(t: JanelaTreino): { after: number; before: number } {
  return { after: Math.floor(Date.parse(t.inicio) / 1000) - 2 * 3600, before: Math.floor(fimDoTreino(t) / 1000) + 3 * 3600 };
}

/**
 * A atividade que é este treino: a que mais se sobrepõe ao horário do treino
 * no app (pelo menos 10 min juntos, ou começou até 30 min antes/depois).
 * Empate: a que tem batimento. Nenhuma = null (o relógio pode sincronizar depois).
 */
export function escolherAtividade(t: JanelaTreino, atividades: AtividadeStrava[]): AtividadeStrava | null {
  const ini = Date.parse(t.inicio);
  const fim = fimDoTreino(t);
  let melhor: { a: AtividadeStrava; nota: number } | null = null;
  for (const a of atividades) {
    const aIni = Date.parse(a.start_date);
    const aFim = aIni + a.elapsed_time * 1000;
    const junto = Math.max(0, Math.min(fim, aFim) - Math.max(ini, aIni)) / 1000;
    const pertoDoInicio = Math.abs(aIni - ini) <= 30 * 60 * 1000;
    if (junto < 600 && !pertoDoInicio) continue;
    const nota = junto + (a.has_heartrate ? 1 : 0);
    if (!melhor || nota > melhor.nota) melhor = { a, nota };
  }
  return melhor?.a ?? null;
}

export type CardioResumo = { fc_media: number | null; fc_max: number | null; duracao_seg: number | null; calorias: number | null };

const minutos = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
};

/** “❤️ Média 132 bpm · máx. 171 bpm · 58 min · 420 kcal” (só o que o relógio mandou). */
export function textoCardio(c: CardioResumo): string {
  const partes: string[] = [];
  if (c.fc_media) partes.push(`Média ${Math.round(c.fc_media)} bpm`);
  if (c.fc_max) partes.push(`máx. ${Math.round(c.fc_max)} bpm`);
  if (c.duracao_seg) partes.push(minutos(c.duracao_seg));
  if (c.calorias) partes.push(`${c.calorias.toLocaleString("pt-BR")} kcal`);
  return partes.length ? partes.join(" · ") : "O relógio não mandou batimento nem calorias nesta atividade.";
}
