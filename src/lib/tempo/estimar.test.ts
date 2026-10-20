import { describe, expect, it } from "vitest";
import { duracaoFixa, estimarDuracao, formatarDuracao, mesclarParametros, PARAMETROS_TEMPO_PADRAO, repsPrevistas, segundosDaCadencia, type ExercicioTempo, type ParametrosTempo } from "./estimar";

// Parâmetros "limpos" para conferir a conta à mão: sem preparação inicial nem transição.
const P: Partial<ParametrosTempo> = { preparacaoInicialSeg: 0, transicaoSeg: 0 };
const series = (n: number, reps = "12", descansoSeg?: number | null) => Array.from({ length: n }, () => ({ reps, descansoSeg }));
const ex = (id: string, extra: Partial<ExercicioTempo> = {}): ExercicioTempo => ({ id, series: series(4), ...extra });

describe("estimativa de duração — básico", () => {
  it("exercício de 4 séries: 4 × 12 reps × 3 s + 3 descansos de 90 s (sem descanso final)", () => {
    const r = estimarDuracao([ex("a")], P);
    expect(r.execucaoSeg).toBe(4 * 36);
    expect(r.descansoSeg).toBe(3 * 90);
    expect(r.totalSeg).toBe(144 + 270);
    expect(r.series).toBe(4);
    expect(r.estimativas[0]).toMatch(/3 s por repetição/);
  });

  it("descansos diferentes por série valem sobre o padrão (o da última série não conta sem próximo exercício)", () => {
    const r = estimarDuracao([ex("a", { series: [{ reps: "10", descansoSeg: 60 }, { reps: "10", descansoSeg: 120 }, { reps: "10", descansoSeg: 999 }] })], P);
    expect(r.descansoSeg).toBe(180);
  });

  it("descanso após o último set: específico do exercício > padrão de 2 min; último exercício não tem descanso final", () => {
    const padrao = estimarDuracao([ex("a", { series: series(1) }), ex("b", { series: series(1) })], P);
    expect(padrao.descansoSeg).toBe(120);
    const especifico = estimarDuracao([ex("a", { series: series(1), descansoAposSeg: 180 }), ex("b", { series: series(1), descansoAposSeg: 999 })], P);
    expect(especifico.descansoSeg).toBe(180);
  });

  it("alterar repetições e cadência recalcula a execução", () => {
    expect(estimarDuracao([ex("a", { series: series(1, "8") })], P).execucaoSeg).toBe(24);
    expect(estimarDuracao([ex("a", { series: series(1, "8"), cadencia: "3-1-2" })], P).execucaoSeg).toBe(48);
    expect(estimarDuracao([ex("a", { series: series(1, "8"), cadencia: "3-1-2" })], P).estimativas).toEqual([]);
  });

  it("exercícios por tempo (isometria, cardio) usam a duração prescrita", () => {
    expect(estimarDuracao([ex("a", { series: series(3, "40s"), tecnica: "isometria" })], P).execucaoSeg).toBe(120);
    expect(estimarDuracao([ex("a", { series: series(1, "20min @ 6,5km/h") })], P).execucaoSeg).toBe(1200);
  });

  it("incluir e excluir exercícios muda o total; transição e preparação inicial contam por padrão", () => {
    const um = estimarDuracao([ex("a")]);
    const dois = estimarDuracao([ex("a"), ex("b")]);
    expect(um.transicaoSeg).toBe(PARAMETROS_TEMPO_PADRAO.preparacaoInicialSeg);
    expect(dois.transicaoSeg).toBe(PARAMETROS_TEMPO_PADRAO.preparacaoInicialSeg + PARAMETROS_TEMPO_PADRAO.transicaoSeg);
    expect(dois.totalSeg - um.totalSeg).toBe(144 + 270 + 120 + 45);
  });

  it("transição dentro do descanso não é contada duas vezes", () => {
    const r = estimarDuracao([ex("a", { series: series(1) }), ex("b", { series: series(1) })], { ...P, transicaoSeg: 45, transicaoDentroDoDescanso: true });
    expect(r.transicaoSeg).toBe(0);
    const longa = estimarDuracao([ex("a", { series: series(1), descansoAposSeg: 30 }), ex("b", { series: series(1) })], { ...P, transicaoSeg: 45, transicaoDentroDoDescanso: true });
    expect(longa.transicaoSeg).toBe(15);
  });

  it("aquecimento: execução + descanso próprio antes das séries de trabalho", () => {
    const r = estimarDuracao([ex("a", { series: series(1), aquecimento: 2 })], P);
    expect(r.execucaoSeg).toBe(3 * 36);
    expect(r.descansoSeg).toBe(2 * 60);
    expect(r.series).toBe(1);
  });
});

describe("estimativa de duração — técnicas", () => {
  it("drop set: 2 drops na última série = 2 × (60% das reps) + troca de carga, sem descanso", () => {
    const r = estimarDuracao([ex("a", { series: series(3), tecnica: "dropset", tecnicaExtras: 2, tecnicaSeries: 1 })], P);
    expect(r.execucaoSeg).toBe(Math.round(3 * 36 + 2 * 12 * 0.6 * 3));
    expect(r.transicaoSeg).toBe(20);
    expect(r.descansoSeg).toBe(180);
  });

  it("rest-pause: cada mini-série soma pausa curta + poucas reps", () => {
    const r = estimarDuracao([ex("a", { series: series(2), tecnica: "rest_pause", tecnicaExtras: 2, tecnicaSeries: 1 })], P);
    expect(r.execucaoSeg).toBe(2 * 36 + 2 * 12);
    expect(r.descansoSeg).toBe(90 + 2 * 15);
  });

  it("cluster: pausas internas entram como descanso (não é fórmula linear)", () => {
    const r = estimarDuracao([ex("a", { series: series(2), tecnica: "cluster" })], P);
    expect(r.descansoSeg).toBe(90 + 2 * 2 * 20);
  });

  it("superset: alterna sem descanso entre os exercícios do bloco; descanso só após cada rodada", () => {
    const r = estimarDuracao([ex("a", { series: series(3), tecnica: "superset", bloco: "S1" }), ex("b", { series: series(3), tecnica: "superset", bloco: "S1" })], P);
    expect(r.execucaoSeg).toBe(6 * 36);
    expect(r.descansoSeg).toBe(2 * 90);
    expect(r.transicaoSeg).toBe(3 * 15);
    expect(r.marcos.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("estimativa de duração — utilidades", () => {
  it("interpreta repetições, durações e cadências", () => {
    expect(repsPrevistas("10-12")).toEqual({ n: 11, estimada: false });
    expect(repsPrevistas("até a falha")).toEqual({ n: 12, estimada: true });
    expect(duracaoFixa("1:30")).toBe(90);
    expect(duracaoFixa("12")).toBeNull();
    expect(segundosDaCadencia("2-0-X-0")).toBe(3); // X (explosivo) = 1 s
    expect(segundosDaCadencia(null)).toBeNull();
  });

  it("unilateral dobra a execução", () => {
    expect(estimarDuracao([ex("a", { series: series(1, "10"), unilateral: true })], P).execucaoSeg).toBe(60);
  });

  it("parâmetros: níveis mais específicos prevalecem e valores inválidos são ignorados", () => {
    const p = mesclarParametros({ descansoEntreSeriesSeg: 120 }, { descansoEntreSeriesSeg: 75, segundosPorRep: -1 });
    expect(p.descansoEntreSeriesSeg).toBe(75);
    expect(p.segundosPorRep).toBe(3);
  });

  it("treino vazio = 0 e formatação em português", () => {
    expect(estimarDuracao([]).totalSeg).toBe(0);
    expect(formatarDuracao(3480)).toBe("58 min");
    expect(formatarDuracao(3900)).toBe("1 h 05 min");
  });
});
