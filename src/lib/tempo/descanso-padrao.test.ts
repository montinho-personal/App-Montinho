import { describe, expect, it } from "vitest";
import { aplicarDescansoPadrao } from "./descanso-padrao";

describe("usar o descanso padrão", () => {
  it("limpa descansos individuais; dentro do bi-set mantém o 0 entre os exercícios", () => {
    const rows = [
      { nome: "Leg press", bloco: "", descansoApos: "", seriesConfig: { modo: "detalhado" as const, series: [{ ordem: 1, reps: "20", ie: null, descanso_seg: 75 }, { ordem: 2, reps: "15", ie: null, descanso_seg: 75 }] } },
      { nome: "Prancha", bloco: "", descansoApos: "60", seriesConfig: { modo: "iguais" as const, series: 1, reps: "60s", ie: null, descanso_seg: 60 } },
      { nome: "Crucifixo inverso", bloco: "B1", descansoApos: "0", seriesConfig: { modo: "iguais" as const, series: 4, reps: "10", ie: null, descanso_seg: 0 } },
      { nome: "Rosca martelo", bloco: "B1", descansoApos: "", seriesConfig: { modo: "iguais" as const, series: 4, reps: "10", ie: null, descanso_seg: 60 } },
    ];
    const r = aplicarDescansoPadrao(rows);
    expect(r[0].seriesConfig).toMatchObject({ series: [{ descanso_seg: null }, { descanso_seg: null }] });
    expect(r[1]).toMatchObject({ descansoApos: "", seriesConfig: { descanso_seg: null } });
    expect(r[2]).toBe(rows[2]);
    expect(r[3]).toMatchObject({ descansoApos: "", seriesConfig: { descanso_seg: null } });
  });
});

import { descansoDaRodada, estimarDuracao, PARAMETROS_TEMPO_PADRAO } from "./estimar";

describe("descanso da rodada do bi-set", () => {
  it("vazio, 0 e 60 s antigos viram 1min30; valores maiores são mantidos", () => {
    expect(descansoDaRodada(null, PARAMETROS_TEMPO_PADRAO)).toBe(90);
    expect(descansoDaRodada(0, PARAMETROS_TEMPO_PADRAO)).toBe(90);
    expect(descansoDaRodada(60, PARAMETROS_TEMPO_PADRAO)).toBe(90);
    expect(descansoDaRodada(120, PARAMETROS_TEMPO_PADRAO)).toBe(120);
  });
  it("a estimativa de tempo usa 1min30 entre as rodadas", () => {
    const ex = (id: string, d: number | null) => ({ id, nome: id, series: [{ reps: "10", descansoSeg: d }, { reps: "10", descansoSeg: d }], aquecimento: 0, cadencia: null, tecnica: "biset" as const, tecnicaExtras: null, tecnicaSeries: null, bloco: "A1", unilateral: false, descansoAposSeg: 0 });
    const com60 = estimarDuracao([ex("a", 0), ex("b", 60)]);
    const com90 = estimarDuracao([ex("a", 0), ex("b", 90)]);
    expect(com60.descansoSeg).toBe(com90.descansoSeg);
  });
});
