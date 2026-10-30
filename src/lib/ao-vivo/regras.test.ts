import { describe, expect, it } from "vitest";
import { estadoAoVivo, haQuanto, limparRecado, RECADOS_PRONTOS, outrasAtividadesAoVivo } from "./regras";

const agora = Date.parse("2026-10-26T15:00:00Z");
const antes = (min: number) => new Date(agora - min * 60_000).toISOString();

describe("treinando agora", () => {
  it("treinando, parado ou esquecido pela última série", () => {
    expect(estadoAoVivo(antes(2), agora)).toBe("treinando");
    expect(estadoAoVivo(antes(8), agora)).toBe("parado");
    expect(estadoAoVivo(antes(90), agora)).toBe("esquecido");
  });
  it("há quanto tempo, no jeito do Brasil", () => {
    expect(haQuanto(antes(0), agora)).toBe("agora");
    expect(haQuanto(antes(12), agora)).toBe("há 12 min");
    expect(haQuanto(antes(65), agora)).toBe("há 1 h 05");
  });
  it("recado limpo e com limite; prontos curtos", () => {
    expect(limparRecado("  bora   lá \n ")).toBe("bora lá");
    expect(limparRecado("x".repeat(300))).toHaveLength(200);
    for (const r of RECADOS_PRONTOS) expect(r.length).toBeLessThanOrEqual(60);
  });
});

describe("cardio e mobilidade ao vivo", () => {
  it("mostra o que começou há menos de 90 min, mais recente primeiro, com o nome", () => {
    const agora = Date.parse("2026-10-30T12:00:00Z");
    const r = outrasAtividadesAoVivo(
      [
        { id: "c1", tipo: "cardio", alunoId: "a", atividade: "🏃 Esteira", iniciadoEm: "2026-10-30T11:50:00Z" },
        { id: "m1", tipo: "mobilidade", alunoId: "b", atividade: "🧘 Mobilidade de Superiores", iniciadoEm: "2026-10-30T11:55:00Z" },
        { id: "c2", tipo: "cardio", alunoId: "a", atividade: "🏃 Esteira", iniciadoEm: "2026-10-30T10:00:00Z" },
      ],
      { a: { nome: "Ana", visitante: false }, b: { nome: "Bia", visitante: true } },
      agora,
    );
    expect(r.map((x) => [x.id, x.nome])).toEqual([["m1", "Bia"], ["c1", "Ana"]]);
  });
  it("tocou em Começar duas vezes: uma linha por pessoa em cada tipo", () => {
    const agora = Date.parse("2026-10-30T12:00:00Z");
    const r = outrasAtividadesAoVivo(
      [
        { id: "c1", tipo: "cardio", alunoId: "a", atividade: "🏃 Esteira", iniciadoEm: "2026-10-30T11:40:00Z" },
        { id: "c2", tipo: "cardio", alunoId: "a", atividade: "🚴 Bike", iniciadoEm: "2026-10-30T11:50:00Z" },
        { id: "m1", tipo: "mobilidade", alunoId: "a", atividade: "🧘 Mobilidade de Inferiores", iniciadoEm: "2026-10-30T11:45:00Z" },
      ],
      { a: { nome: "Ana", visitante: false } },
      agora,
    );
    expect(r.map((x) => x.id)).toEqual(["c2", "m1"]);
  });
});
