// ============================================================================
// Ritmo do treino: compara o tempo real com o previsto para a etapa atual.
// Tudo é calculado a partir de horários persistidos (início da sessão, pausas)
// — nunca de um contador que dependa da aba continuar aberta.
// ============================================================================

import type { ResultadoTempo } from "./estimar";

export type EstadoRitmo = "inicio" | "dentro" | "adiantado" | "atrasado";

export type Pausas = { totalMs: number; desde: number | null };

export type EntradaRitmo = {
  plano: Pick<ResultadoTempo, "totalSeg" | "marcos" | "series">;
  /** Início da sessão (ms, horário do servidor). */
  inicioMs: number;
  /** Agora (ms) já corrigido pela diferença entre relógio do aparelho e servidor. */
  agoraMs: number;
  pausas?: Pausas;
  seriesFeitas: number;
  /** Tolerância: o maior entre minutos fixos e fração do previsto. */
  toleranciaMin?: number;
  toleranciaFracao?: number;
};

export type Ritmo = {
  decorridoSeg: number;
  previstoTotalSeg: number;
  /** Tempo previsto para ter chegado ao ponto atual (séries feitas). */
  esperadoAgoraSeg: number;
  /** Previsto para o que falta, a partir de agora. */
  restanteSeg: number;
  /** Quando deve terminar, em segundos desde o início (decorrido + restante). */
  terminoPrevistoSeg: number;
  diferencaSeg: number;
  estado: EstadoRitmo;
  pausado: boolean;
};

export const MENSAGEM_RITMO: Record<EstadoRitmo, string> = {
  inicio: "Bom treino! A previsão se ajusta conforme você registra as séries.",
  dentro: "Seu treino está seguindo o ritmo previsto.",
  adiantado: "Você está alguns minutos à frente da previsão.",
  atrasado: "Seu treino está um pouco mais longo que o previsto. Continue respeitando os descansos e a execução.",
};

/** Tempo previsto (s) até concluir `n` séries de trabalho, interpolando dentro de cada exercício. */
export function previstoAte(plano: EntradaRitmo["plano"], n: number): number {
  if (n <= 0 || !plano.marcos.length) return 0;
  let antFim = 0;
  let antSeries = 0;
  for (const m of plano.marcos) {
    if (m.seriesAteAqui === antSeries) continue; // exercícios do mesmo bloco repetem o marco
    if (n <= m.seriesAteAqui) {
      const frac = (n - antSeries) / (m.seriesAteAqui - antSeries);
      return antFim + frac * (m.fimSeg - antFim);
    }
    antFim = m.fimSeg;
    antSeries = m.seriesAteAqui;
  }
  return plano.totalSeg;
}

/** Tempo efetivo de treino em segundos (sem pausas; nunca negativo). */
export function decorridoSeg(inicioMs: number, agoraMs: number, pausas?: Pausas): number {
  const pausaAtual = pausas?.desde ? Math.max(0, agoraMs - pausas.desde) : 0;
  const ms = agoraMs - inicioMs - (pausas?.totalMs ?? 0) - pausaAtual;
  return Math.max(0, Math.round(ms / 1000));
}

export function calcularRitmo(e: EntradaRitmo): Ritmo {
  const dec = decorridoSeg(e.inicioMs, e.agoraMs, e.pausas);
  const total = e.plano.totalSeg;
  const feitas = Math.max(0, Math.min(e.seriesFeitas, e.plano.series));
  const esperado = Math.round(previstoAte(e.plano, feitas));
  const restante = Math.max(0, Math.round(total - esperado));
  const tol = Math.max((e.toleranciaMin ?? 3) * 60, (e.toleranciaFracao ?? 0.1) * Math.max(esperado, 1));
  // Ainda não registrou nada: compara com o tempo da primeira série sem acusar atraso cedo demais.
  const diferenca = dec - esperado;
  let estado: EstadoRitmo;
  if (feitas === 0 && dec < 10 * 60) estado = "inicio";
  else if (diferenca > tol) estado = "atrasado";
  else if (diferenca < -tol) estado = "adiantado";
  else estado = "dentro";
  return {
    decorridoSeg: dec,
    previstoTotalSeg: total,
    esperadoAgoraSeg: esperado,
    restanteSeg: restante,
    terminoPrevistoSeg: dec + restante,
    diferencaSeg: diferenca,
    estado,
    pausado: !!e.pausas?.desde,
  };
}

/** Diferença entre o relógio do servidor e o do aparelho (ms), para corrigir "agora". */
export function offsetRelogio(servidorMs: number, aparelhoMs: number): number {
  const d = servidorMs - aparelhoMs;
  return Math.abs(d) > 2000 ? d : 0; // ignora diferenças pequenas (latência)
}

/** Horário atual do servidor (ms) — passado ao cliente para corrigir o relógio do aparelho. */
export function agoraServidorMs(): number {
  return Date.now();
}
