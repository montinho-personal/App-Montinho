import { describe, expect, it } from "vitest";
import { gruposDoTreino, proximoNoBloco, rodadaDoBloco, rotulosDosExercicios } from "./blocos";

const itens = [
  { id: "a", bloco: null, tecnica: "normal" },
  { id: "b", bloco: "A1", tecnica: "biset" },
  { id: "c", bloco: "A1", tecnica: "biset" },
  { id: "d", bloco: "", tecnica: "piramide" },
  { id: "e", bloco: "A2", tecnica: "biset" },
];

describe("bi-set no treino do aluno", () => {
  it("agrupa o bloco e numera com letras (3A/3B ficam juntos)", () => {
    const g = gruposDoTreino(itens);
    expect(g.map((x) => x.ids)).toEqual([["a"], ["b", "c"], ["d"], ["e"]]);
    expect(g[1].tecnica).toBe("biset");
    expect(g[3].tecnica).toBeNull(); // bloco de um só não é bi-set
    expect(rotulosDosExercicios(g)).toEqual({ a: "1", b: "2A", c: "2B", d: "3", e: "4" });
  });

  it("alterna os exercícios na rodada e só descansa no fim dela", () => {
    const g = gruposDoTreino(itens)[1];
    expect(proximoNoBloco(g, "b", { b: { feitas: 1, planejadas: 3 }, c: { feitas: 0, planejadas: 3 } })).toEqual({ proximo: "c", fimDaRodada: false });
    expect(proximoNoBloco(g, "c", { b: { feitas: 1, planejadas: 3 }, c: { feitas: 1, planejadas: 3 } })).toEqual({ proximo: "b", fimDaRodada: true });
    expect(proximoNoBloco(g, "c", { b: { feitas: 3, planejadas: 3 }, c: { feitas: 3, planejadas: 3 } })).toEqual({ proximo: null, fimDaRodada: true });
    expect(rodadaDoBloco(g, { b: { feitas: 2, planejadas: 3 }, c: { feitas: 1, planejadas: 3 } })).toEqual({ atual: 2, total: 3, concluido: false });
  });

  it("fora de ordem (fez o B antes do A): vai para o A sem descanso", () => {
    const g = gruposDoTreino(itens)[1];
    expect(proximoNoBloco(g, "c", { b: { feitas: 0, planejadas: 3 }, c: { feitas: 1, planejadas: 3 } })).toEqual({ proximo: "b", fimDaRodada: false });
  });

  it("se um exercício tem menos séries, a rodada segue com o outro", () => {
    const g = gruposDoTreino(itens)[1];
    expect(proximoNoBloco(g, "b", { b: { feitas: 3, planejadas: 3 }, c: { feitas: 2, planejadas: 2 } })).toEqual({ proximo: null, fimDaRodada: true });
  });
});
