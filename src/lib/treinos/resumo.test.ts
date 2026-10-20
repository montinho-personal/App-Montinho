import { describe, expect, it } from "vitest";
import { resumoDoTreino } from "./resumo";

describe("resumo do treino no plano", () => {
  it("soma séries válidas (sem aquecimento e sem itens fora do volume) e ordena os grupos", () => {
    const r = resumoDoTreino([
      { series: 4, series_aquecimento: 1, grupo_muscular: "quadriceps" },
      { series: 4, grupo_muscular: "gluteo" },
      { series: 4, grupo_muscular: "quadriceps" },
      { series: 2, grupo_muscular: "cardio", conta_volume: false },
      { series: 3, grupo_muscular: null },
    ]);
    expect(r.validas).toBe(14);
    expect(r.grupos).toEqual([{ grupo: "quadriceps", series: 7 }, { grupo: "gluteo", series: 4 }]);
  });
});
