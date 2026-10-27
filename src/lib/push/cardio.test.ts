import { describe, expect, it } from "vitest";
import { mensagemCardio, nomeDoCardio } from "./cardio";

describe("lembrete de cardio", () => {
  it("convite do dia com nome, minutos e modalidade", () => {
    const m = mensagemCardio("abc", { nome: "Ana", modalidade: "esteira", duracao_min: 30, falta_min: 90, dias_restantes: 5 });
    expect(m.url).toBe("/aluno/cardio");
    expect(m.corpo).toMatch(/^Ana, /);
    expect(m.corpo).toMatch(/30 min(utinhos)? de esteira/);
  });
  it("fim de semana com minutos faltando", () => {
    const m = mensagemCardio("x", { nome: "Ana", modalidade: "bike", duracao_min: 20, falta_min: 40, dias_restantes: 1 });
    expect(m.titulo).toBe("⏳ Faltam 40 min para fechar a semana");
    expect(m.corpo).toMatch(/Hoje é o último dia/);
  });
  it("prescrição livre e sem nome", () => {
    expect(nomeDoCardio("livre")).toBe("o cardio que você escolher");
    const m = mensagemCardio("y", { modalidade: "livre", duracao_min: 15, dias_restantes: 6 });
    expect(m.corpo.charAt(0)).toBe(m.corpo.charAt(0).toUpperCase());
    expect(m.corpo).not.toMatch(/caloria|queimar/i);
  });
});
