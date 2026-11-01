import { describe, expect, it } from "vitest";
import { proximoDoTopo, sequenciaNoTopo, trofeusDoTopo, type DiaTopo } from "./topo-ranking";

const serie = (inicio: string, quem: string[]): DiaTopo[] => quem.map((alunoId, i) => ({ dia: new Date(Date.parse(`${inicio}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), alunoId }));

describe("Topo do Ranking", () => {
  it("chegar ao topo dá o troféu; voltar depois de perder dá outro", () => {
    const d = serie("2026-11-01", ["a", "a", "b", "a"]);
    const t = trofeusDoTopo(d, "a").filter((x) => x.codigo === "topo_ranking");
    expect(t.map((x) => x.referencia)).toEqual(["2026-11-01", "2026-11-04"]);
  });
  it("5 dias seguidos = Topo Firme; 4 não", () => {
    expect(trofeusDoTopo(serie("2026-11-01", ["a", "a", "a", "a"]), "a").some((x) => x.codigo === "topo_5_dias")).toBe(false);
    const t = trofeusDoTopo(serie("2026-11-01", ["a", "a", "a", "a", "a"]), "a");
    expect(t.find((x) => x.codigo === "topo_5_dias")?.dia).toBe("2026-11-05");
  });
  it("um dia sem registro quebra a sequência", () => {
    const d = [...serie("2026-11-01", ["a", "a", "a"]), ...serie("2026-11-05", ["a", "a", "a"])];
    expect(trofeusDoTopo(d, "a").some((x) => x.codigo === "topo_5_dias")).toBe(false);
  });
  it("sequência de hoje e o que falta", () => {
    const d = serie("2026-11-01", ["b", "a", "a", "a"]);
    expect(sequenciaNoTopo(d, "a", "2026-11-04")).toEqual({ dias: 3, desde: "2026-11-02" });
    expect(sequenciaNoTopo(d, "b", "2026-11-04")).toEqual({ dias: 0, desde: null });
    expect(proximoDoTopo(3, new Set())).toEqual({ titulo: "Topo Firme", faltam: 2 });
    expect(proximoDoTopo(7, new Set(["topo_5_dias"]))).toEqual({ titulo: "Topo Inabalável", faltam: 3 });
  });
});
