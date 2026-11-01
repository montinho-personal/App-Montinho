import { describe, expect, it } from "vitest";
import { chegadasAoTopo, proximoDoTopo, sequenciaNoTopo, trofeusDoTopo, type DiaTopo } from "./topo-ranking";

const serie = (inicio: string, quem: string[]): DiaTopo[] => quem.map((alunoId, i) => ({ dia: new Date(Date.parse(`${inicio}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), alunoId }));

describe("Topo do Ranking", () => {
  it("cada chegada ao 1º lugar vira um aviso (voltar depois de perder = nova chegada)", () => {
    expect(chegadasAoTopo(serie("2026-11-01", ["a", "a", "b", "a"]))).toEqual([
      { alunoId: "a", desde: "2026-11-01", dias: 2 },
      { alunoId: "b", desde: "2026-11-03", dias: 1 },
      { alunoId: "a", desde: "2026-11-04", dias: 1 },
    ]);
  });
  it("chegar ao topo não dá troféu; 5 dias seguidos = Topo Firme", () => {
    expect(trofeusDoTopo(serie("2026-11-01", ["a", "a", "a", "a"]), "a")).toEqual([]);
    expect(trofeusDoTopo(serie("2026-11-01", ["a", "a", "a", "a", "a"]), "a")).toEqual([{ codigo: "topo_5_dias", dia: "2026-11-05" }]);
  });
  it("um dia sem registro quebra a sequência", () => {
    const d = [...serie("2026-11-01", ["a", "a", "a"]), ...serie("2026-11-05", ["a", "a", "a"])];
    expect(trofeusDoTopo(d, "a")).toEqual([]);
    expect(chegadasAoTopo(d)).toHaveLength(2);
  });
  it("sequência de hoje e o que falta", () => {
    const d = serie("2026-11-01", ["b", "a", "a", "a"]);
    expect(sequenciaNoTopo(d, "a", "2026-11-04")).toEqual({ dias: 3, desde: "2026-11-02" });
    expect(sequenciaNoTopo(d, "b", "2026-11-04")).toEqual({ dias: 0, desde: null });
    expect(proximoDoTopo(3, new Set())).toEqual({ titulo: "Topo Firme", faltam: 2 });
    expect(proximoDoTopo(7, new Set(["topo_5_dias"]))).toEqual({ titulo: "Topo Inabalável", faltam: 3 });
  });
});
