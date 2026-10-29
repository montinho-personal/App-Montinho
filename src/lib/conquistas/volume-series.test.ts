import { describe, expect, it } from "vitest";
import { totalDeSeries, trofeusDeSeries } from "./volume-series";

let n = 0;
const s = (dia: number, series: number, o: Record<string, unknown> = {}) => ({ id: `s${++n}`, iniciado_em: `2026-0${1 + Math.floor(dia / 28)}-${String((dia % 28) + 1).padStart(2, "0")}T13:00:00Z`, status: "concluida" as const, series_planejadas: 20, series_concluidas: series, ...o });

describe("Volume total de séries", () => {
  it("500 e 1.000 séries: a data é a do treino que cruzou o marco", () => {
    const sessoes = Array.from({ length: 50 }, (_, i) => s(i, 20));
    const t = trofeusDeSeries(sessoes);
    expect(t.map((x) => x.codigo)).toEqual(["series_500", "series_1000"]);
    expect(t[0].sessaoId).toBe(sessoes[24].id);
    expect(t[1].sessaoId).toBe(sessoes[49].id);
  });
  it("499 séries ainda não dão o troféu", () => {
    expect(trofeusDeSeries([s(1, 250), s(2, 249)])).toEqual([]);
    expect(totalDeSeries([s(1, 250), s(2, 249)])).toBe(499);
  });
  it("conta extra e treino que terminou antes do fim; não conta importado, fora da aderência nem em andamento", () => {
    const base = [s(1, 400)];
    expect(trofeusDeSeries([...base, s(2, 100, { modo: "extra" })]).map((x) => x.codigo)).toEqual(["series_500"]);
    expect(trofeusDeSeries([...base, s(2, 100, { status: "abandonada" })]).map((x) => x.codigo)).toEqual(["series_500"]);
    expect(trofeusDeSeries([...base, s(2, 100, { origem: "importado" })])).toEqual([]);
    expect(trofeusDeSeries([...base, s(2, 100, { conta_aderencia: false })])).toEqual([]);
    expect(trofeusDeSeries([...base, s(2, 100, { status: "em_andamento" })])).toEqual([]);
  });
});
