// ============================================================================
// Modo Visitante — "este mês × mês passado" (puro, sem rede).
// Só o que foi registrado: treinos, séries válidas, carga levantada e tempo.
// Sem rótulos de "ideal" ou de resultado físico (ver TEXTO_LIMITE).
// ============================================================================

export type SessaoMes = {
  iniciado_em: string;
  status: string;
  duracao_seg: number | null;
  exercicios: Array<{ series: Array<{ tipo: string; carga_kg: number | null; reps: number | null }> }>;
};

export type ResumoMes = { treinos: number; series: number; cargaTotalKg: number; minutos: number };
export type ComparacaoMeses = { atual: ResumoMes; anterior: ResumoMes; rotuloAtual: string; rotuloAnterior: string };

export const TEXTO_LIMITE = "Estes números mostram o seu desempenho registrado. Ganho de músculo ou perda de gordura não dá para medir só pela carga.";
export const TEXTO_SEMANA_FRACA = "Toda semana conta. Bora pela próxima?";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Ano-mês no horário de Brasília (UTC−3). */
function anoMes(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 7);
}

function resumir(sessoes: SessaoMes[]): ResumoMes {
  let series = 0;
  let carga = 0;
  let seg = 0;
  for (const s of sessoes) {
    seg += s.duracao_seg ?? 0;
    for (const e of s.exercicios)
      for (const x of e.series) {
        if (x.tipo === "aquecimento") continue;
        series++;
        carga += (x.carga_kg ?? 0) * (x.reps ?? 0);
      }
  }
  return { treinos: sessoes.length, series, cargaTotalKg: Math.round(carga), minutos: Math.round(seg / 60) };
}

export function compararMeses(sessoes: SessaoMes[], agora: Date = new Date()): ComparacaoMeses {
  const atual = anoMes(agora.toISOString());
  const [a, m] = atual.split("-").map(Number);
  const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
  const feitas = sessoes.filter((s) => s.status !== "em_andamento" && s.exercicios.some((e) => e.series.length > 0));
  return {
    atual: resumir(feitas.filter((s) => anoMes(s.iniciado_em) === atual)),
    anterior: resumir(feitas.filter((s) => anoMes(s.iniciado_em) === anterior)),
    rotuloAtual: MESES[m - 1],
    rotuloAnterior: MESES[(m + 10) % 12],
  };
}

/** Diferença em texto neutro: "+3", "−2", "igual". */
export function diferenca(atual: number, anterior: number): string {
  const d = atual - anterior;
  if (d === 0) return "igual";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toLocaleString("pt-BR")}`;
}
