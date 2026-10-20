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
