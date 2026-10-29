import { describe, expect, it } from "vitest";
import { mensagemMobilidade, trofeuEmJogo } from "./mobilidade";

describe("lembrete da mobilidade", () => {
  it("cita o troféu que falta, na ordem", () => {
    expect(trofeuEmJogo({ protocolo: "superiores", trofeus: [] })).toBe("Ombros Livres");
    expect(trofeuEmJogo({ protocolo: "inferiores", protocolos: ["superiores", "inferiores"], trofeus: ["mobilidade_inferiores", "mobilidade_superiores"] })).toBe("Corpo Todo Solto");
    expect(trofeuEmJogo({ protocolo: "inferiores", trofeus: ["mobilidade_inferiores"] })).toBe("Desafio 7 Dias: Inferiores");
    expect(trofeuEmJogo({ protocolo: "inferiores", trofeus: ["mobilidade_inferiores", "mobilidade_7_inferiores"] })).toBeNull();
  });
  it("leva para o protocolo certo e menciona o prêmio", () => {
    const m = mensagemMobilidade("abc", { nome: "Ana", protocolo: "inferiores", trofeus: [] });
    expect(m.url).toBe("/aluno/mobilidade/inferiores");
    expect(m.corpo).toContain("Quadril Livre");
    expect(m.corpo.charAt(0)).toBe(m.corpo.charAt(0).toUpperCase());
  });
});
