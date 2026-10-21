import { describe, expect, it } from "vitest";
import type { Tecnica } from "@/lib/volume/calcular";
import { aplicarMetodo, aplicarMetodoEmVarios, proximoBloco } from "./metodo";
import { configIgual } from "@/lib/series";
import { METODOS } from "@/lib/volume/tecnicas";
import { TECNICAS } from "@/lib/validacao/schemas";

const linha = (bloco = "", tecnica = "normal" as const) => ({ tecnica, bloco, seriesConfig: configIgual(4, "12", null) });

describe("método do exercício no montador", () => {
  it("todos os métodos do catálogo são aceitos pela validação", () => {
    for (const m of METODOS) expect(TECNICAS).toContain(m.v);
    expect(METODOS.map((m) => m.l)).toEqual(expect.arrayContaining(["Tradicional", "Pirâmide crescente", "Pirâmide decrescente", "Bi-set", "Tri-set", "Super-set", "Combinado", "Pré-exaustão", "Rest-pause", "Drop-set", "Cluster", "Myo-reps", "3/7", "Super slow", "Negativo"]));
  });

  it("bi-set liga este exercício e o seguinte; tri-set liga 3", () => {
    const r = aplicarMetodo([linha(), linha(), linha(), linha()], 0, "biset", "A");
    expect(r.map((x) => [x.tecnica, x.bloco])).toEqual([["biset", "A1"], ["biset", "A1"], ["normal", ""], ["normal", ""]]);
    const t = aplicarMetodo(r, 2, "triset", "A");
    expect(t.map((x) => x.bloco)).toEqual(["A1", "A1", "A2", "A2"]);
    expect(proximoBloco(t, "A")).toBe("A3");
  });

  it("pirâmide passa para série a série com reps sugeridas", () => {
    const c = aplicarMetodo([linha()], 0, "piramide", "A")[0];
    expect(c.seriesConfig.modo === "detalhado" && c.seriesConfig.series.map((s) => s.reps)).toEqual(["20", "15", "12", "10"]);
    const d = aplicarMetodo([linha()], 0, "piramide_decrescente", "A")[0];
    expect(d.seriesConfig.modo === "detalhado" && d.seriesConfig.series.map((s) => s.reps)).toEqual(["10", "12", "15", "20"]);
  });

  it("sair do bi-set desfaz o bloco deste exercício", () => {
    const r = aplicarMetodo(aplicarMetodo([linha(), linha()], 0, "biset", "B"), 0, "dropset", "B");
    expect(r[0]).toMatchObject({ tecnica: "dropset", bloco: "" });
  });

  describe("vários selecionados", () => {
    const L = (key: string, bloco = "", tecnica: Tecnica = "normal") => ({ key, tecnica, bloco, seriesConfig: configIgual(4, "12", null) });
    it("bi-set com 2 exercícios separados: junta em sequência no lugar do primeiro", () => {
      const r = aplicarMetodoEmVarios([L("a"), L("b"), L("c"), L("d")], ["b", "d"], "biset", "A");
      expect(r.map((x) => [x.key, x.tecnica, x.bloco])).toEqual([["a", "normal", ""], ["b", "biset", "A1"], ["d", "biset", "A1"], ["c", "normal", ""]]);
    });
    it("tirar um exercício de um bi-set antigo desfaz o bloco de quem ficou sozinho", () => {
      const r = aplicarMetodoEmVarios([L("a", "A1", "biset"), L("b", "A1", "biset"), L("c"), L("d")], ["b", "c", "d"], "triset", "A");
      expect(r.find((x) => x.key === "a")).toMatchObject({ tecnica: "normal", bloco: "" });
      expect(r.filter((x) => x.tecnica === "triset").map((x) => x.key)).toEqual(["b", "c", "d"]);
    });
    it("método que não é de bloco vale para cada selecionado", () => {
      const r = aplicarMetodoEmVarios([L("a"), L("b"), L("c")], ["a", "c"], "dropset", "A");
      expect(r.map((x) => x.tecnica)).toEqual(["dropset", "normal", "dropset"]);
    });
  });
});
