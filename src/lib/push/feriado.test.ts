import { describe, expect, it } from "vitest";
import { mensagemFeriado, trofeusEmJogoFeriado } from "./feriado";

describe("aviso do feriado", () => {
  it("cita os 3 troféus com o nome do feriado", () => {
    const m = mensagemFeriado("x1", { nome: "Ana", feriado: "Finados", emoji: "🕯️", ganhos: [] });
    expect(m.corpo).toContain("Finados Pago");
    expect(m.corpo).toContain("Finados de Fôlego");
    expect(m.corpo).toContain("Finados Completo");
    expect(m.corpo.startsWith("Ana,")).toBe(true);
    expect(m.url).toBe("/aluno#feriado");
  });
  it("só o que falta; tudo ganho = parabéns", () => {
    expect(trofeusEmJogoFeriado({ feriado: "Natal", ganhos: ["feriado_musculacao"] })).toEqual(["Natal de Fôlego", "Natal Completo"]);
    expect(mensagemFeriado("x", { feriado: "Natal", ganhos: ["feriado_musculacao", "feriado_cardio", "feriado_combo"] }).titulo).toContain("Natal completo");
  });
});
