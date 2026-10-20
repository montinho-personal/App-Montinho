// ============================================================================
// Convite para a “+ Série extra” (PURO, testado).
//
// Quando o aluno termina as séries de um exercício, o app olha os treinos
// concluídos dos últimos dias:
//   • ficou série DESTE exercício para trás (ou ele foi adiado/pulado)?
//     → convite para repor 1–2 séries agora;
//   • senão, ficou série do MESMO GRUPO MUSCULAR para trás?
//     → convite para repor pelo grupo;
//   • senão → incentivo leve para uma série a mais.
// Nunca convida quando o aluno chegou com desconforto ou cansado.
// ============================================================================

export const REGRAS_SERIE_EXTRA = { dias: 8, maxSugeridas: 2 };

export type ExercicioPassado = {
  exercicioId: string | null;
  nome: string;
  grupo: string | null;
  /** Séries válidas planejadas. */
  planejadas: number;
  /** Séries válidas registradas. */
  feitas: number;
};
export type SessaoPassada = { data: string; exercicios: ExercicioPassado[] };

export type Deficit = { exercicio: number; grupo: number };

const faltou = (e: ExercicioPassado) => Math.max(0, e.planejadas - e.feitas);

/** Séries que ficaram para trás nos últimos `dias` (exercício: só a última vez que apareceu). */
export function deficitRecente(sessoes: SessaoPassada[], alvo: { id: string; nome: string; grupo: string | null }, agoraMs: number, dias = REGRAS_SERIE_EXTRA.dias): Deficit {
  const desde = agoraMs - dias * 86_400_000;
  const recentes = sessoes.filter((s) => Date.parse(s.data) >= desde).sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  const nome = alvo.nome.trim().toLowerCase();
  const eh = (e: ExercicioPassado) => e.exercicioId === alvo.id || e.nome.trim().toLowerCase() === nome;
  let exercicio = 0;
  for (const s of recentes) {
    const e = s.exercicios.find(eh);
    if (e) {
      exercicio = faltou(e);
      break;
    }
  }
  // Grupo: o que faltou menos o que já foi reposto (séries a mais) na janela.
  const saldo = alvo.grupo ? recentes.reduce((n, s) => n + s.exercicios.filter((e) => e.grupo === alvo.grupo).reduce((m, e) => m + e.planejadas - e.feitas, 0), 0) : 0;
  const grupo = Math.max(0, saldo);
  return { exercicio, grupo };
}

export type ConviteSerieExtra = { tom: "repor" | "bonus"; titulo: string; texto: string; sugeridas: number };

const series = (n: number) => `${n} série${n > 1 ? "s" : ""}`;

export function conviteSerieExtra(d: Deficit, o: { rotuloGrupo: string | null; cuidado?: boolean }): ConviteSerieExtra | null {
  const R = REGRAS_SERIE_EXTRA;
  if (o.cuidado) return null;
  if (d.exercicio > 0) {
    const n = Math.min(R.maxSugeridas, d.exercicio);
    return {
      tom: "repor",
      titulo: `Bora repor? +${series(n)}`,
      texto: `Da última vez ficaram ${series(d.exercicio)} deste exercício para trás. Se estiver com tempo, faça +${n} agora: já ajuda a recuperar o volume da semana.`,
      sugeridas: n,
    };
  }
  if (d.grupo > 0 && o.rotuloGrupo) {
    const n = Math.min(R.maxSugeridas, d.grupo);
    return {
      tom: "repor",
      titulo: `Bora repor? +${series(n)}`,
      texto: `Nos últimos treinos ficaram ${series(d.grupo)} de ${o.rotuloGrupo} para trás. Se estiver com tempo, faça +${n} agora: já ajuda a recuperar o volume da semana.`,
      sugeridas: n,
    };
  }
  return {
    tom: "bonus",
    titulo: "Volume da semana em dia 💪",
    texto: "Se estiver se sentindo bem e com tempo, uma série a mais só soma: mais estímulo para o músculo, mantendo a boa execução.",
    sugeridas: 1,
  };
}
