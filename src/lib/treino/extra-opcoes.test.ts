import { describe, expect, it } from "vitest";
import { descricaoDosItens, duracaoEstimada, juntarOpcoes } from "./extra-opcoes";

const item = (nome: string, series = 4) => ({ biblioteca_id: nome.toLowerCase().replace(/\s/g, "-"), nome, series, reps: "10-12" });

describe("opções de treino extra", () => {
  it("até 3, sem vazias nem repetidas (mesma lista em outra ordem conta como igual)", () => {
    const r = juntarOpcoes([
      { chave: "meta", titulo: "Abaixo da meta", motivo: "", itens: [item("Cadeira extensora"), item("Cadeira flexora")] },
      null,
      { chave: "prioridade", titulo: "Prioridade", motivo: "", itens: [item("Cadeira flexora"), item("Cadeira extensora")] },
      { chave: "vazia", titulo: "Vazia", motivo: "", itens: [] },
      { chave: "full", titulo: "Full body", motivo: "", itens: [item("Supino"), item("Remada")] },
      { chave: "pequenos", titulo: "Pequenos", motivo: "", itens: [item("Rosca")] },
      { chave: "quarta", titulo: "Quarta", motivo: "", itens: [item("Prancha")] },
    ]);
    expect(r.map((o) => o.chave)).toEqual(["meta", "full", "pequenos"]);
  });
  it("limita séries por exercício e estima a duração", () => {
    const r = juntarOpcoes([{ chave: "x", titulo: "x", motivo: "", itens: [item("Rosca", 9)] }]);
    expect(r[0].itens[0].series).toBe(5);
    expect(duracaoEstimada([item("A"), item("B")])).toBe(25); // 8 × 2,5 + 5 = 25
    expect(duracaoEstimada([item("A", 1)])).toBe(10);
    expect(descricaoDosItens([item("Cadeira extensora")])).toBe("Cadeira extensora: 4 × 10-12.");
  });
});

import { faixasSugeridas } from "./extra-opcoes";
describe("faixas de repetições sugeridas", () => {
  it("as mais usadas primeiro, depois o padrão, sem repetir nem lixo", () => {
    const h = [...Array(5).fill("20/15/12/10"), ...Array(3).fill("8-12"), "12", "12", "/", "60s", "60s", "7"];
    const r = faixasSugeridas(h);
    expect(r.slice(0, 3)).toEqual(["20/15/12/10", "8-12", "12"]);
    expect(r).toContain("10-12");
    expect(r).not.toContain("/");
    expect(r).not.toContain("7"); // usado 1 vez só
    expect(new Set(r).size).toBe(r.length);
  });
});
