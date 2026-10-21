import { describe, expect, it } from "vitest";
import { ajustarNumeroSeries, configIgual, totalSeries } from "./series";

describe("ajustar o número de séries", () => {
  it("iguais: muda só a quantidade (mantém reps e descanso)", () => {
    const c = { ...configIgual(3, "10-12", 8), descanso_seg: 75 };
    expect(ajustarNumeroSeries(c, 4)).toEqual({ ...c, series: 4 });
  });
  it("pirâmide: acrescenta repetindo a última série e corta do fim", () => {
    const c = { modo: "detalhado" as const, series: [{ ordem: 1, reps: "20", ie: null, descanso_seg: 90 }, { ordem: 2, reps: "15", ie: null, descanso_seg: 90 }, { ordem: 3, reps: "12", ie: null, descanso_seg: 60 }] };
    const mais = ajustarNumeroSeries(c, 4);
    expect(totalSeries(mais)).toBe(4);
    expect(mais.modo === "detalhado" && mais.series[3]).toEqual({ ordem: 4, reps: "12", ie: null, descanso_seg: 60 });
    const menos = ajustarNumeroSeries(c, 2);
    expect(menos.modo === "detalhado" && menos.series.map((s) => s.reps)).toEqual(["20", "15"]);
    expect(totalSeries(ajustarNumeroSeries(c, 99))).toBe(30);
  });
});
