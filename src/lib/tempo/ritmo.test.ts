import { describe, expect, it } from "vitest";
import { calcularRitmo, decorridoSeg, offsetRelogio, previstoAte } from "./ritmo";
import { descansoAposSerie, estimarPrescricao } from "./prescricao";

// Plano: 2 exercícios de 3 séries; fim previsto do 1º aos 600 s, do 2º aos 1200 s.
const plano = { totalSeg: 1200, series: 6, marcos: [{ id: "a", fimSeg: 600, seriesAteAqui: 3 }, { id: "b", fimSeg: 1200, seriesAteAqui: 6 }] };
const T0 = Date.UTC(2026, 9, 20, 10, 0, 0);
const min = (m: number) => T0 + m * 60_000;

describe("ritmo do treino", () => {
  it("previsto interpola dentro do exercício", () => {
    expect(previstoAte(plano, 0)).toBe(0);
    expect(previstoAte(plano, 3)).toBe(600);
    expect(previstoAte(plano, 4)).toBe(800);
    expect(previstoAte(plano, 6)).toBe(1200);
  });

  it("dentro do previsto: 3 séries em 10 min", () => {
    const r = calcularRitmo({ plano, inicioMs: T0, agoraMs: min(10), seriesFeitas: 3 });
    expect(r.estado).toBe("dentro");
    expect(r.restanteSeg).toBe(600);
    expect(r.terminoPrevistoSeg).toBe(1200);
  });

  it("adiantado: 3 séries em 5 min", () => {
    expect(calcularRitmo({ plano, inicioMs: T0, agoraMs: min(5), seriesFeitas: 3 }).estado).toBe("adiantado");
  });

  it("atrasado: 3 séries em 16 min — e a previsão de término se atualiza (não mostra horário impossível)", () => {
    const r = calcularRitmo({ plano, inicioMs: T0, agoraMs: min(16), seriesFeitas: 3 });
    expect(r.estado).toBe("atrasado");
    expect(r.terminoPrevistoSeg).toBe(16 * 60 + 600);
  });

  it("diferenças pequenas (poucos segundos) não mudam o estado", () => {
    expect(calcularRitmo({ plano, inicioMs: T0, agoraMs: min(10) + 90_000, seriesFeitas: 3 }).estado).toBe("dentro");
  });

  it("pausa não conta como tempo de treino (encerrada e em andamento)", () => {
    expect(decorridoSeg(T0, min(30), { totalMs: 10 * 60_000, desde: null })).toBe(20 * 60);
    const r = calcularRitmo({ plano, inicioMs: T0, agoraMs: min(25), seriesFeitas: 3, pausas: { totalMs: 0, desde: min(10) } });
    expect(r.decorridoSeg).toBe(600);
    expect(r.pausado).toBe(true);
    expect(r.estado).toBe("dentro");
  });

  it("fechou o navegador / bloqueou a tela: recalcula pelo horário de início, sem contador acumulado", () => {
    expect(calcularRitmo({ plano, inicioMs: T0, agoraMs: min(40), seriesFeitas: 3 }).decorridoSeg).toBe(2400);
  });

  it("relógio do aparelho atrasado não gera tempo negativo; offset corrige", () => {
    expect(decorridoSeg(T0, T0 - 120_000)).toBe(0);
    expect(offsetRelogio(T0, T0 - 300_000)).toBe(300_000);
    expect(offsetRelogio(T0, T0 - 800)).toBe(0);
  });

  it("início: sem séries ainda, não acusa atraso antes de 10 min", () => {
    expect(calcularRitmo({ plano, inicioMs: T0, agoraMs: min(6), seriesFeitas: 0 }).estado).toBe("inicio");
  });

  it("séries registradas depois do treino (todas de uma vez) não quebram o cálculo", () => {
    const r = calcularRitmo({ plano, inicioMs: T0, agoraMs: min(90), seriesFeitas: 6 });
    expect(r.restanteSeg).toBe(0);
    expect(r.estado).toBe("atrasado");
  });
});

describe("descanso durante a execução", () => {
  const ex = { id: "e", nome: "Supino", series: 4, reps: "10", descanso_seg: null, series_aquecimento: 1, tecnica: "normal" as const, bloco: null, unilateral: false };
  it("aquecimento, entre séries (padrão 90 s), após o exercício (120 s) e nada após o último exercício", () => {
    expect(descansoAposSerie(ex, 1, false)).toBe(60);
    expect(descansoAposSerie(ex, 2, false)).toBe(90);
    expect(descansoAposSerie(ex, 4, false)).toBe(120);
    expect(descansoAposSerie(ex, 4, true)).toBeNull();
  });
  it("descanso da série e do exercício prevalecem; tempos do treino idem", () => {
    const det = { ...ex, series_aquecimento: 0, series_config: { modo: "detalhado", series: [{ ordem: 1, reps: "10", ie: null, descanso_seg: 150 }, { ordem: 2, reps: "8", ie: null, descanso_seg: null }] }, descanso_apos_seg: 200 };
    expect(descansoAposSerie(det, 1, false)).toBe(150);
    expect(descansoAposSerie(det, 2, false)).toBe(200);
    expect(descansoAposSerie({ ...ex, series_aquecimento: 0 }, 1, false, { descansoEntreSeriesSeg: 75 })).toBe(75);
  });
  it("estima a prescrição salva com os tempos do treino", () => {
    const r = estimarPrescricao([{ ...ex, series_aquecimento: 0 }], { preparacaoInicialSeg: 0 });
    expect(r.series).toBe(4);
    expect(r.totalSeg).toBe(4 * 30 + 3 * 90);
  });
});
