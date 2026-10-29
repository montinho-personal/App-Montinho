import { describe, expect, it } from "vitest";
import { estadoDoDia, fraseDoDia } from "./dia";

describe("Início do dia", () => {
  it("sem treino hoje, segue como sempre", () => {
    expect(estadoDoDia({ treinoHoje: false, cardioHoje: true, cardioPendente: false })).toBe("a_fazer");
  });
  it("treino feito com cardio pendente destaca o cardio", () => {
    expect(estadoDoDia({ treinoHoje: true, cardioHoje: false, cardioPendente: true })).toBe("falta_cardio");
  });
  it("treino e cardio feitos, ou sem cardio para hoje = dia completo", () => {
    expect(estadoDoDia({ treinoHoje: true, cardioHoje: true, cardioPendente: true })).toBe("completo");
    expect(estadoDoDia({ treinoHoje: true, cardioHoje: false, cardioPendente: false })).toBe("completo");
  });
  it("frase fixa no mesmo dia", () => {
    expect(fraseDoDia("2026-10-29", false)).toBe(fraseDoDia("2026-10-29", false));
  });
});
